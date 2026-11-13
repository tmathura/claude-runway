const MINUTE = 60_000;

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

export function span(ms: number): string {
  if (!isNumber(ms) || ms < MINUTE) {
    return "<1m";
  }

  const minutes = Math.floor(ms / MINUTE);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return rest > 0 ? `${hours}h${rest}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

export function count(tokens: number): string {
  const n = isNumber(tokens) ? Math.max(0, Math.round(tokens)) : 0;

  if (n < 1000) {
    return String(n);
  }
  if (n < 9950) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  if (n < 999_500) {
    return `${Math.round(n / 1000)}k`;
  }
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function signed(tokens: number): string {
  return tokens < 0 ? `-${count(-tokens)}` : `+${count(tokens)}`;
}

export function money(usd: number): string {
  return usd < 100 ? `$${usd.toFixed(2)}` : `$${Math.round(usd)}`;
}
