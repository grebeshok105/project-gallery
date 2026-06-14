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
