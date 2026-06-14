import { useRef, useState } from "react";
import { Send, Loader2, Sparkles, Bot } from "lucide-react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";

const SYSTEM: ChatMessage = {
  role: "system",
  content:
    "Ты — ассистент в личной галерее проектов. Помогаешь придумывать идеи pet-проектов, фич, названий, формулировок. Отвечай по-русски, конкретно и кратко.",
};

const SUGGESTIONS = [
  "Придумай 5 идей для нового pet-проекта на Rust",
  "Какие фичи добавить в Minecraft-мод про супергероев?",
  "Помоги придумать название для проекта-галереи",
  "Что почитать, чтобы прокачаться в Tauri?",
];

export function AssistantView() {
  const { config } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ready = !!config?.llm_model;

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const answer = await api.llmChat([SYSTEM, ...next]);
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: "Ошибка: " + String(e) }]);
    } finally {
      setBusy(false);
      setTimeout(
        () => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight),
        50
      );
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line p-4">
        <Sparkles className="h-5 w-5 text-accent-soft" />
        <h1 className="text-xl font-bold text-slate-100">AI-ассистент</h1>
        {config && (
          <span className="ml-auto truncate text-xs text-slate-500">
            {config.llm_model || "модель не задана"} · {config.llm_base_url}
          </span>
        )}
      </div>

      {!ready && (
        <div className="m-4 rounded-xl border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
          Чтобы пользоваться ассистентом, задай базовый URL, модель и API-ключ в
          разделе «Настройки».
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-lg space-y-3 pt-10 text-center">
            <Bot className="mx-auto h-10 w-10 text-accent-soft" />
            <p className="text-slate-400">
              Спроси что угодно про свои проекты или попроси идей.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="card p-3 text-left text-sm text-slate-300 hover:border-accent/40 disabled:opacity-50"
                  onClick={() => send(s)}
                  disabled={!ready}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => <Bubble key={i} m={m} />)
        )}
        {busy && (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Думаю...
          </div>
        )}
      </div>

      <div className="border-t border-line p-4">
        <div className="flex items-end gap-2">
          <textarea
            className="input max-h-32 min-h-[44px] resize-none"
            placeholder={ready ? "Напиши сообщение..." : "Сначала настрой LLM"}
            value={input}
            disabled={!ready}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button
            className="btn-primary h-[44px]"
            onClick={() => send()}
            disabled={!ready || busy || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const isUser = m.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-accent text-white"
            : "card text-slate-200"
        }`}
      >
        {m.content}
      </div>
    </div>
  );
}
