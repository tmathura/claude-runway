// A stand-in for the type file that Claude Code writes beside a mod it loads. It lets `tsc` read
// the mod's state contract on a machine without Claude Code. `claude plugin validate` checks the
// hooks file against the real one.
declare module "claude-code" {
  export interface PluginState {}
  export type Shaped<T> = { shape: string; value: T };
}
