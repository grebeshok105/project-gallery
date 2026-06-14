import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function relativeDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const day = 86_400_000;
  if (diff < day) return "сегодня";
  if (diff < 2 * day) return "вчера";
  if (diff < 7 * day) return `${Math.floor(diff / day)} дн. назад`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))} нед. назад`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))} мес. назад`;
  return d.toLocaleDateString("ru-RU");
}

const PALETTE = [
  "#4f8ff7", "#3ecf8e", "#ffb454", "#ff5c7c",
  "#4cc9f0", "#f72585", "#b5179e", "#90be6d",
];

export function colorFor(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

// ===================== фоны для карточек без обложки =====================
const BG_MODULES = import.meta.glob("../assets/backgrounds/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const BACKGROUNDS: string[] = Object.values(BG_MODULES);

/// Детерминированный фон по ключу (id/title) — один и тот же проект всегда получает один фон.
export function backgroundFor(key: string | number): string | null {
  if (BACKGROUNDS.length === 0) return null;
  const s = String(key);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return BACKGROUNDS[Math.abs(h) % BACKGROUNDS.length];
}

// ===================== темы =====================
export const THEME_PRESETS = [
  { id: "midnight", label: "Полночь" },
  { id: "graphite", label: "Графит" },
  { id: "slate", label: "Сланец" },
  { id: "warm", label: "Тёплая" },
] as const;

export const ACCENT_PRESETS = [
  { id: "blue", label: "Синий", rgb: "110 168 254" },
  { id: "violet", label: "Фиолет", rgb: "139 142 255" },
  { id: "emerald", label: "Изумруд", rgb: "52 211 153" },
  { id: "amber", label: "Янтарь", rgb: "231 184 92" },
  { id: "rose", label: "Роза", rgb: "251 113 133" },
] as const;

/// Применяет тему и акцент к <html> через data-атрибуты.
export function applyTheme(theme: string, accent: string) {
  const el = document.documentElement;
  if (theme && theme !== "midnight") el.setAttribute("data-theme", theme);
  else el.removeAttribute("data-theme");
  if (accent && accent !== "blue") el.setAttribute("data-accent", accent);
  else el.removeAttribute("data-accent");
}

// ===================== звуки =====================
let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  return audioCtx;
}

/// Короткий синтетический звук через WebAudio.
export function playSound(kind: "unlock" | "toast" = "toast") {
  const ac = ctx();
  if (!ac) return;
  const now = ac.currentTime;
  const notes = kind === "unlock" ? [523.25, 659.25, 783.99] : [659.25];
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.09;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + 0.24);
  });
}
