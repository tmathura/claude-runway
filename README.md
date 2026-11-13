# claude-runway

A Claude Code mod that shows, in one band above the prompt, how much runway a session has left: the
usage limits, the context window and the prompt cache, with the session cost and the running agents.

```
5h ▰▰▰▱▱▱▱▱ 36% 2h30m │ 7d ▰▰▱▱▱▱▱▱ 20% 5d │ ctx 80k 40% ▁▃▅▆█ +20k ~6 left │ cache 52m │ ≈ $2.08 (+$0.58 · +1.5% 5h)
```

- It tells you when a limit ends at your present pace, not only how much is used.
- The most urgent part comes first: an alert, then a warning, then the rest.
- It only watches: it changes nothing, sends nothing and reads no text of your session.

What each part means, the colours and the privacy notes are in
[plugins/runway/README.md](plugins/runway/README.md).

## Install

```
claude plugin marketplace add tmathura/claude-runway
claude plugin install runway@tmathura-runway
```

It needs Claude Code 2.1.323 or later.

## Development

See [CLAUDE.md](CLAUDE.md) for the layout and the commands, and
[docs/development.md](docs/development.md) for the workflow.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
