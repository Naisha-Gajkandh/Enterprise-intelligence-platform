import { http, request } from './client.js';
import { mockAssistantResponse } from './mock/mockData.js';

// Maps to app/routers/assistant.py: /chat

export async function sendAssistantMessage({ message }) {
  const result = await request(
    () => http.post('/assistant/chat', { message }),
    () => mockAssistantResponse(message)
  );

  if (result.source === 'live' && result.data) {
    const raw = result.data;
    const sourcesList = raw.sources || [];
    const retrievedContext = sourcesList.map((s) => ({
      source: raw.intent === 'structured_query' ? 'Transactions SQL DataMart' : 'Product Catalog Retrieval',
      summary: s
    }));

    return {
      source: 'live',
      data: {
        reply: raw.reply,
        intent: raw.intent,
        retrieved_context: retrievedContext,
        trace: {
          query: message,
          intent_router: raw.intent || 'structured_query',
          retrieval: sourcesList.join('; ') || 'Database SQL / Product Search',
          draft: raw.reply,
          llm_polish: {
            used: true,
            provider: 'Groq Llama 3.3 70B / Templated RAG',
            reason: 'Retrieved ground truth from backend database'
          }
        }
      }
    };
  }

  return result;
}
