const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export const formatINR = (n: number) => `₹${inr.format(Math.round(n * 100) / 100)}`;
export const formatNum = (n: number) => inr.format(n);

const pad = (n: number) => String(n).padStart(2, "0");

/** Local YYYY-MM-DD for a Date or ISO string. */
export function toDateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const todayKey = () => toDateKey(new Date());

export function addDays(key: string, days: number): string {
  const d = new Date(key + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(d: string): string {
  if (!d) return "—";
  const date = d.length === 10 ? new Date(d + "T00:00:00") : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  let h = date.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(date.getMinutes())} ${ampm}`;
}

export const formatDateTime = (iso: string) => `${formatDate(iso)}, ${formatTime(iso)}`;

export function formatShortDate(key: string): string {
  const date = new Date(key + "T00:00:00");
  return `${pad(date.getDate())} ${MONTHS[date.getMonth()]}`;
}

export function maskMobile(m: string) {
  return m.length === 10 ? `${m.slice(0, 5)} ${m.slice(5)}` : m;
}

/** Combine a YYYY-MM-DD with the current clock time into an ISO string. */
export function dateKeyToIso(key: string): string {
  const now = new Date();
  const d = new Date(key + "T00:00:00");
  d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
  return d.toISOString();
}
