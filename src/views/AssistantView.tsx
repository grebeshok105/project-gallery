import { useRef, useState } from "react";
import { Send, Loader2, Sparkles, Bot, Wrench } from "lucide-react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";

const SUGGESTIONS = [
  "Наведи порядок: напиши короткие описания всем проектам без описания",
  "Придумай 3 личных цели-достижения под мои проекты и добавь их",
  "Предложи теги для проектов, где их мало, и проставь",
  "Какие проекты пора пометить завершёнными? Покажи и обнови статусы",
];

interface Turn {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
}

export function AssistantView() {
  const { config, refresh, refreshAchievements } = useStore();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ready = !!config?.llm_model;

  function scrollDown() {
    setTimeout(
      () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
      50
    );
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;

    const history: ChatMessage[] = turns.map((t) => ({
      role: t.role,
      content: t.content,
    }));
    setTurns((t) => [...t, { role: "user", content }]);
    setInput("");
    setBusy(true);
    scrollDown();

    try {
      const res = await api.llmAgentChat([...history, { role: "user", content }]);
      setTurns((t) => [
        ...t,
        { role: "assistant", content: res.reply, actions: res.actions },
      ]);
      if (res.actions.length > 0) {
        await Promise.all([refresh(), refreshAchievements()]);
      }
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", content: "Ошибка: " + String(e) }]);
    } finally {
      setBusy(false);
      scrollDown();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <Sparkles className="h-5 w-5 text-accent" />
        <h1 className="text-lg font-semibold text-slate-100">Агент-помощник</h1>
        <span className="ml-auto truncate text-xs text-slate-500">
          {config?.llm_model?.split("/").pop() || "модель не задана"}
        </span>
      </div>

      {!ready && (
        <div className="mx-5 mt-4 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          Чтобы агент заработал, задай модель и API-ключ в разделе «Настройки».
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {turns.length === 0 ? (
          <div className="mx-auto max-w-xl space-y-5 pt-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <Bot className="h-9 w-9 text-accent" />
              <p className="max-w-sm text-sm text-slate-400">
                Агент видит твои проекты и достижения и может их менять: писать
                описания, ставить статусы, заводить и отмечать цели.
              </p>
            </div>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="rounded-xl border border-line bg-bg-card px-4 py-3 text-left text-sm text-slate-400 transition-colors hover:border-accent/40 hover:text-slate-100 disabled:opacity-50"
                  onClick={() => send(s)}
                  disabled={!ready}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((t, i) => <Bubble key={i} turn={t} />)
        )}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Агент работает...
          </div>
        )}
      </div>

      <div className="border-t border-line px-5 py-4">
        <div className="flex items-end gap-2">
          <textarea
            className="input max-h-32 min-h-[46px] resize-none"
            placeholder={ready ? "Попроси агента сделать что-нибудь..." : "Сначала настрой LLM"}
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
            className="btn-primary h-[46px] px-4"
            onClick={() => send()}
            disabled={!ready || busy || !input.trim()}
            aria-label="Отправить"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ turn }: { turn: Turn }) {
  const isUser = turn.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%] space-y-2">
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-accent text-white"
              : "border border-line bg-bg-card text-slate-200"
          }`}
        >
          {turn.content}
        </div>
        {turn.actions && turn.actions.length > 0 && (
          <div className="flex flex-col gap-1">
            {turn.actions.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-ok">
                <Wrench className="h-3.5 w-3.5" /> {a}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
