export type Limit = { kind: string; percentUsed: number; resetsAt?: string };
export type ContextReading = { window: number; tokens?: number; percent?: number };
export type CacheReading = {
  at: number;
  read: number;
  written: number;
  fresh: number;
  model: string | null;
};
export type CostMark = { usd: number | null; fiveHour: number | null };
export type LastTurn = { usd: number | null; fiveHourPoints: number | null };
export type Agents = { running: number; total: number };

export type View = {
  limits: Limit[];
  context: ContextReading | null;
  history: number[];
  cache: CacheReading | null;
  isCompacted: boolean;
  usd: number | null;
  mark: CostMark | null;
  last: LastTurn | null;
  agents: Agents;
};

declare module "claude-code" {
  interface PluginState {
    runway: { view: Shaped<View> };
  }
}
