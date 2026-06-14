import { useRef, useState } from "react";
import { ArrowUp, CircleNotch, Sparkle, Robot, Wrench } from "@phosphor-icons/react";
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
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const history: ChatMessage[] = turns.map((t) => ({ role: t.role, content: t.content }));
    setTurns((t) => [...t, { role: "user", content }]);
    setInput("");
    setBusy(true);
    scrollDown();
    try {
      const res = await api.llmAgentChat([...history, { role: "user", content }]);
      setTurns((t) => [...t, { role: "assistant", content: res.reply, actions: res.actions }]);
      if (res.actions.length > 0) await Promise.all([refresh(), refreshAchievements()]);
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", content: "Ошибка: " + String(e) }]);
    } finally {
      setBusy(false);
      scrollDown();
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <div className="flex items-center gap-2.5 px-6 pt-8">
        <Sparkle weight="duotone" className="h-5 w-5 text-accent" />
        <h1 className="text-xl font-semibold tracking-tight text-fg">Агент</h1>
        <span className="ml-auto font-mono text-[11px] text-fg-faint">
          {config?.llm_model?.split("/").pop() || "модель не задана"}
        </span>
      </div>

      {!ready && (
        <div className="mx-6 mt-4 rounded-2xl border border-warn/25 bg-warn/[0.07] px-4 py-3 text-sm text-warn">
          Чтобы агент заработал, задай модель и API-ключ в разделе «Настройки».
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
        {turns.length === 0 ? (
          <div className="space-y-6 pt-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="bezel">
                <div className="bezel-core flex h-14 w-14 items-center justify-center">
                  <Robot weight="duotone" className="h-7 w-7 text-accent" />
                </div>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-fg-muted">
                Агент видит твои проекты и достижения и может их менять: писать
                описания, ставить статусы, заводить и отмечать цели.
              </p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="bezel text-left transition-transform duration-500 ease-spring hover:-translate-y-0.5 disabled:opacity-40"
                  onClick={() => send(s)}
                  disabled={!ready}
                >
                  <div className="bezel-core px-4 py-3.5 text-[13px] leading-snug text-fg-muted">
                    {s}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((t, i) => <Bubble key={i} turn={t} />)
        )}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-fg-dim">
            <CircleNotch className="h-4 w-4 animate-spin" /> Агент работает...
          </div>
        )}
      </div>

      <div className="px-6 pb-6">
        <div className="bezel">
          <div className="bezel-core flex items-end gap-2 p-2">
            <textarea
              className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-fg placeholder:text-fg-faint outline-none"
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
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fg text-ink transition-all duration-500 ease-spring hover:bg-white active:scale-95 disabled:opacity-30"
              onClick={() => send()}
              disabled={!ready || busy || !input.trim()}
              aria-label="Отправить"
            >
              <ArrowUp weight="bold" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ turn }: { turn: Turn }) {
  const isUser = turn.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[82%] space-y-2">
        <div
          className={`whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-fg text-ink"
              : "border border-white/[0.06] bg-ink-raised text-fg shadow-inner-hi"
          }`}
        >
          {turn.content}
        </div>
        {turn.actions && turn.actions.length > 0 && (
          <div className="flex flex-col gap-1 pl-1">
            {turn.actions.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-ok">
                <Wrench weight="fill" className="h-3.5 w-3.5" /> {a}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
