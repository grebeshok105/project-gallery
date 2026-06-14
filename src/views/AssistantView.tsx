import { useEffect, useRef, useState } from "react";
import { ArrowUp, CircleNotch, Sparkle, Robot, Wrench, Plus, Trash, ChatCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { ChatMessage, ChatSession } from "@/lib/types";
import { cn, relativeDate } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SUGGESTIONS = [
  "Наведи порядок: напиши короткие описания всем проектам без описания",
  "Придумай 3 личных цели-достижения под мои проекты и добавь их",
  "Проставь языки и теги проектам, где их не хватает",
  "Какие проекты пора пометить завершёнными? Покажи и обнови статусы",
];

interface Turn {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
}

export function AssistantView() {
  const { config, refresh, refreshAchievements } = useStore();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [chatId, setChatId] = useState<number | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ready = !!config?.llm_model;

  async function loadChats() {
    setChats(await api.listChats());
  }
  useEffect(() => {
    void loadChats();
  }, []);

  function scrollDown() {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
  }

  async function openChat(id: number) {
    setChatId(id);
    const msgs = await api.listChatMessages(id);
    setTurns(msgs.map((m) => ({ role: m.role, content: m.content, actions: m.actions })));
    scrollDown();
  }

  function newChat() {
    setChatId(null);
    setTurns([]);
  }

  async function del(id: number) {
    await api.deleteChat(id);
    if (id === chatId) newChat();
    await loadChats();
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;

    let cid = chatId;
    if (cid === null) {
      cid = await api.createChat(content.slice(0, 40));
      setChatId(cid);
    }

    const history: ChatMessage[] = turns.map((t) => ({ role: t.role, content: t.content }));
    setTurns((t) => [...t, { role: "user", content }]);
    setInput("");
    setBusy(true);
    scrollDown();
    try {
      const res = await api.llmAgentChat([...history, { role: "user", content }], cid);
      setTurns((t) => [...t, { role: "assistant", content: res.reply, actions: res.actions }]);
      if (res.actions.length > 0) await Promise.all([refresh(), refreshAchievements()]);
      await loadChats();
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", content: "Ошибка: " + String(e) }]);
    } finally {
      setBusy(false);
      scrollDown();
    }
  }

  return (
    <div className="flex h-full">
      {/* chat history rail */}
      <div className="flex w-60 shrink-0 flex-col gap-2 border-r border-white/[0.05] p-3">
        <button className="btn-soft w-full justify-start" onClick={newChat}>
          <Plus className="h-4 w-4" /> Новый чат
        </button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {chats.length === 0 && (
            <div className="px-2 py-6 text-center text-xs text-fg-faint">История пуста</div>
          )}
          {chats.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors cursor-pointer",
                c.id === chatId ? "bg-white/[0.06] text-fg" : "text-fg-dim hover:bg-white/[0.03] hover:text-fg"
              )}
              onClick={() => openChat(c.id)}
            >
              <ChatCircle weight="duotone" className="h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate">{c.title}</div>
                <div className="font-mono text-[10px] text-fg-faint">{relativeDate(c.updated_at)}</div>
              </div>
              <button
                className="shrink-0 text-fg-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  void del(c.id);
                }}
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* conversation */}
      <div className="mx-auto flex h-full max-w-3xl flex-1 flex-col">
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
                  Агент видит твои проекты и достижения и меняет их: описания, языки,
                  теги, статусы, цели. История чатов сохраняется слева.
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
    </div>
  );
}

function Bubble({ turn }: { turn: Turn }) {
  const isUser = turn.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[82%] space-y-2">
        <div
          className={cn(
            "rounded-3xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "whitespace-pre-wrap bg-fg text-ink"
              : "border border-white/[0.06] bg-ink-raised text-fg shadow-inner-hi"
          )}
        >
          {isUser ? (
            turn.content
          ) : (
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.content}</ReactMarkdown>
            </div>
          )}
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
