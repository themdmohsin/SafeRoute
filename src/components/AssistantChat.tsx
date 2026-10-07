import React, { useState } from 'react';
import { apiRequest } from '../lib/api';

type Message = { role: 'user' | 'assistant'; text: string };

export default function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || loading) return;
    setMessages((current) => [...current, { role: 'user', text }]);
    setQuestion('');
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest<{ answer: string }>('/assistant/ask', {
        method: 'POST',
        body: { question: text },
      });
      setMessages((current) => [...current, { role: 'assistant', text: result.answer }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Assistant request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed z-50 right-4 bottom-24">
      {open && (
        <section className="mb-3 w-[min(22rem,calc(100vw-2rem))] h-[min(28rem,calc(100vh-10rem))] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" aria-label="SafeRoute assistant">
          <header className="bg-primary text-white px-4 py-3 font-semibold">Ask SafeRoute</header>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && <p className="text-sm text-slate-500">Ask about recent hazards, areas, or routes.</p>}
            {messages.map((message, index) => (
              <p key={index} className={`text-sm rounded-xl p-2.5 whitespace-pre-wrap ${message.role === 'user' ? 'bg-blue-50 ml-5' : 'bg-slate-100 mr-5'}`}>{message.text}</p>
            ))}
            {loading && <p className="text-sm text-slate-500">Checking recent hazard data…</p>}
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          </div>
          <form onSubmit={send} className="p-3 border-t flex gap-2">
            <input aria-label="Ask a question" value={question} onChange={(event) => setQuestion(event.target.value)} className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" placeholder="Which area has fewer hazards?" />
            <button disabled={loading || !question.trim()} className="rounded-lg bg-primary text-white px-3 disabled:opacity-50">Send</button>
          </form>
        </section>
      )}
      <button onClick={() => setOpen((value) => !value)} className="ml-auto flex items-center gap-2 rounded-full bg-primary text-white shadow-lg px-4 py-3 font-semibold" aria-expanded={open}>
        <span className="material-symbols-outlined">{open ? 'close' : 'smart_toy'}</span>{open ? 'Close' : 'Ask AI'}
      </button>
    </div>
  );
}
