# Runway mod for Claude Code

A Claude Code mod that shows, in one band above the prompt, how much runway a session has left: the
usage limits, the context window and the prompt cache, with the session cost and the running agents.

```
5h ▰▰▰▱▱▱▱▱ 36% 2h30m │ 7d ▰▰▱▱▱▱▱▱ 20% 5d │ ctx 80k 40% ▁▃▅▆█ +20k ~6 left │ cache 52m │ ≈ $2.08 (+$0.58 · +1.5% 5h)
```

## What you get

- The 5-hour and 7-day usage limits against the clock, and when a limit ends at your present pace.
- The context window, a chart of the last prompts, and how many prompts fit before it is full.
- The time before the prompt cache goes cold.
- The session cost, what the last prompt added, and the agents that run.
- The most urgent part comes first: an alert, then a warning, then the rest. A narrow window drops the least urgent parts.
- It only watches: it changes nothing, sends nothing and reads no text of your session.

## Requirements

- Claude Code 2.1.323 or later. The mod API is early access, so a later build can change it.
- The terminal, the desktop app or VS Code, on macOS, Linux or Windows.
- An account with usage limits for the `5h` and `7d` parts. Every other part works on any account.

## Install

```
claude plugin marketplace add tmathura/claude-runway
claude plugin install runway@tmathura-runway
```

The mod has no options. The band shows after the first answer of a session.

## Usage

What each part means, the colours and the privacy notes are in
[plugins/runway/README.md](plugins/runway/README.md). How to update the mod, turn it off, or find
out why the band does not show is in [docs/operations.md](docs/operations.md).

## FAQ

### Does it use tokens or my limits?

No. It reads the figures that Claude Code already has. It sends no message and makes no network
request.

### Does it see my prompts or my code?

No. It reads token counts, limits, cost, the model id and the state of each agent. It does not read
the text of a prompt, an answer or a tool call.

### Why are the figures estimates?

The limits, the context and the cost are the figures that Claude Code reports. The forecasts and
the cache time are estimates: [plugins/runway/README.md](plugins/runway/README.md#what-the-figures-are)
says how each one is made.

## Development

See [CLAUDE.md](CLAUDE.md) for the layout and the commands, and
[docs/development.md](docs/development.md) for the workflow. How the mod is built is in
[docs/architecture.md](docs/architecture.md). What it needs and keeps is in
[docs/configuration.md](docs/configuration.md).

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
