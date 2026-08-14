"""
Retail AI Assistant engine.

Routing logic (kept simple and explainable rather than a black box):
1. If the message looks like a question about business data/numbers
   ("top selling", "revenue", "how many orders", etc.) -> answer using
   a structured query against the transactions table.
2. Otherwise, treat it as a product question -> search the product
   catalog by keyword/category match and recommend matches.
3. If GROQ_API_KEY is set, the retrieved structured data or matched
   products are passed to the LLM as context to produce a natural,
   conversational answer (RAG-style: retrieve first, generate second).
   If no key is set, a clear templated response is returned instead so
   the endpoint still works with zero paid/external dependencies.
"""
import httpx
from sqlalchemy.orm import Session

from app import models
from app.config import get_settings
from app.services import analytics_engine

settings = get_settings()

STRUCTURED_KEYWORDS = [
    "revenue", "sales", "top selling", "top product", "how many order",
    "total order", "kpi", "best category", "best seller", "performance",
    "how much did we", "growth", "trend",
]


def _detect_intent(message: str) -> str:
    lowered = message.lower()
    if any(keyword in lowered for keyword in STRUCTURED_KEYWORDS):
        return "structured_query"
    return "product_recommendation"


def _answer_structured_query(db: Session) -> tuple[str, list[str]]:
    kpis = analytics_engine.get_kpi_summary(db)
    categories = analytics_engine.get_category_breakdown(db)

    if kpis["total_transactions"] == 0:
        return "I don't have any sales data loaded yet, so I can't answer that.", []

    top_category = categories[0]["category"] if categories else "N/A"
    summary = (
        f"Total revenue is {kpis['total_revenue']:.2f} across {kpis['total_transactions']} "
        f"transactions (average order value {kpis['average_order_value']:.2f}). "
        f"The top-performing category is '{top_category}'."
    )
    sources = [f"transactions ({kpis['date_range_start']} to {kpis['date_range_end']})"]
    return summary, sources


STOPWORDS = {
    "a", "an", "the", "me", "i", "my", "for", "to", "of", "in", "on", "is",
    "are", "some", "any", "please", "want", "need", "show", "find", "give",
    "recommend", "recommendation", "recommendations", "looking", "with",
}


def _answer_product_recommendation(db: Session, message: str) -> tuple[str, list[str]]:
    lowered = message.lower()
    keywords = [w.strip(".,!?") for w in lowered.split() if w.strip(".,!?") not in STOPWORDS and len(w) > 2]

    products = db.query(models.Product).all()

    def is_match(p: models.Product) -> bool:
        haystack = f"{p.name} {p.category} {p.description}".lower()
        return any(keyword in haystack for keyword in keywords)

    matches = [p for p in products if is_match(p)] if keywords else []
    if not matches:
        matches = products[:3]  # graceful fallback: show something rather than nothing

    if not matches:
        return "I don't have any products in the catalog yet to recommend.", []

    lines = [f"{p.name} ({p.category}) — {p.price:.2f}" for p in matches[:5]]
    reply = "Here are some products you might like:\n" + "\n".join(lines)
    sources = [f"product catalog ({len(matches)} matches)"]
    return reply, sources


def _polish_with_llm(user_message: str, draft_answer: str) -> str:
    """Optional: rewrite the templated draft into a more natural reply using Groq.
    Falls back silently to the draft if no API key is configured or the call fails,
    so the assistant never breaks due to an external service issue."""
    if not settings.GROQ_API_KEY:
        return draft_answer

    try:
        response = httpx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            json={
                "model": settings.GROQ_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful retail shopping assistant. Rewrite the given "
                            "factual draft answer conversationally in 2-3 sentences. Do not "
                            "invent any numbers or products not present in the draft."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Customer asked: {user_message}\n\nFactual draft answer:\n{draft_answer}",
                    },
                ],
                "temperature": 0.4,
                "max_tokens": 200,
            },
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        # Any network/API failure -> fall back to the deterministic draft answer.
        return draft_answer


def handle_chat_message(db: Session, message: str) -> dict:
    intent = _detect_intent(message)

    if intent == "structured_query":
        draft, sources = _answer_structured_query(db)
    else:
        draft, sources = _answer_product_recommendation(db, message)

    reply = _polish_with_llm(message, draft)
    return {"reply": reply, "intent": intent, "sources": sources}
