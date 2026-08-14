import React, { useRef, useState } from 'react';
import { Card } from '../components/common/Card.jsx';
import TracePanel, { TraceSteps } from '../components/common/TracePanel.jsx';
import { sendAssistantMessage } from '../api/assistant.js';

const SUGGESTIONS = [
  'Which category drove the most revenue this week?',
  'Recommend a product to bundle with our top seller',
  'What is our current average order value?'
];

const WELCOME = {
  role: 'assistant',
  reply:
    "I'm the retail workspace assistant — ask about business metrics or ask for product recommendations. I answer from structured data first, then optionally polish the wording with Groq.",
  intent: null,
  trace: null
};

export default function RetailAssistant() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  async function handleSend(text) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: message }]);
    setSending(true);
    try {
      const { data, source } = await sendAssistantMessage({ message, history: messages });
      setMessages((m) => [...m, { role: 'assistant', ...data, source }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', reply: `Something went wrong: ${err.message}`, isError: true }]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }));
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Retail AI Assistant</span>
          <h1>Retail Assistant</h1>
          <p className="page-subtitle">
            POST /api/v1/assistant/chat — structured retrieval first, Groq Llama 3.3 70B polish when configured.
          </p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 300px' }}>
        <Card bodyClassName="tight">
          <div ref={listRef} className="flex-col gap-4" style={{ height: 460, overflowY: 'auto', padding: '8px 2px' }}>
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {sending && <MessageBubble message={{ role: 'assistant', reply: 'Routing intent and retrieving context…', isTyping: true }} />}
          </div>
          <form
            className="flex gap-2 mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              className="input"
              placeholder="Ask about KPIs, categories, or request a product recommendation…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={sending}>Send</button>
          </form>
        </Card>

        <div className="flex-col gap-4">
          <Card title="Try asking">
            <div className="flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="btn btn-secondary btn-sm" style={{ textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => handleSend(s)}>
                  {s}
                </button>
              ))}
            </div>
          </Card>
          <Card title="How this works">
            <ol style={{ paddingLeft: 18, margin: 0, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>Intent router classifies the query as a structured lookup or product recommendation.</li>
              <li>Retrieval pulls exact SQL metrics or catalog matches — never invented.</li>
              <li>A deterministic draft is built from retrieved rows, usable with zero API keys.</li>
              <li>If GROQ_API_KEY is set, Groq rewrites the draft conversationally without adding facts.</li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : ''}`}>
      <div
        style={{
          maxWidth: '78%',
          background: isUser ? 'var(--accent)' : 'var(--bg-sunken)',
          color: isUser ? '#fff' : 'var(--text-primary)',
          border: isUser ? 'none' : '1px solid var(--border)',
          borderRadius: 8,
          padding: '10px 13px',
          fontSize: 13
        }}
      >
        <div>{isUser ? message.text : message.reply}</div>
        {!isUser && message.intent && (
          <div className="flex gap-2 items-center mt-2">
            <span className="badge badge-accent">{message.intent.replace('_', ' ')}</span>
            {message.source === 'mock' && <span className="badge badge-warning">demo data</span>}
          </div>
        )}
        {!isUser && message.retrieved_context?.length > 0 && (
          <div className="mt-2 flex-col gap-1">
            {message.retrieved_context.map((c) => (
              <div key={c.source} className="text-xs text-muted num">• {c.summary}</div>
            ))}
          </div>
        )}
        {!isUser && message.trace && (
          <div className="mt-3">
            <TracePanel title="Response trace">
              <TraceSteps
                steps={[
                  { label: 'Query', value: message.trace.query },
                  { label: 'Intent router', value: message.trace.intent_router.replace('_', ' ') },
                  { label: 'Retrieval', value: message.trace.retrieval },
                  { label: 'Draft', value: message.trace.draft },
                  {
                    label: message.trace.llm_polish.used ? 'Groq polish' : 'Groq polish (fallback)',
                    value: message.trace.llm_polish.used
                      ? message.trace.llm_polish.provider
                      : message.trace.llm_polish.reason
                  }
                ]}
              />
            </TracePanel>
          </div>
        )}
      </div>
    </div>
  );
}
