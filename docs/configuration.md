# Configuration

What the mod needs, what it keeps, and the values it uses. The mod has no options: you install it
and the band shows.

## Supported Claude Code versions

- The mod supports Claude Code **2.1.323 and later**. It was written and tested against the type
  file of that build.
- The mod API is early access, so a later build can change it. The mod uses only what the type file
  declares, and `claude plugin validate plugins/runway` checks this.

## Install

```bash
claude plugin marketplace add tmathura/claude-runway
claude plugin install runway@tmathura-runway
```

To try a checkout without an install: `claude --plugin-dir plugins/runway`.

## Surfaces

The band draws in the terminal, the desktop app and VS Code. A run with no person at the prompt
(`claude -p`) has no band, and the mod starts no timer in it.

## Accounts

| Account | Parts |
| --- | --- |
| A subscription, with usage limits | All parts. The cost has `≈`, because it is what the API would charge and not a bill. |
| An API key, Bedrock or Vertex, with no usage limits | No `5h` and `7d` parts. The other parts draw. |

Claude Code does not report how long the prompt cache lasts. The mod takes 60 minutes when the
account has a `five_hour` or `seven_day` limit, and 5 minutes on any other account.

## What the mod keeps

| What | Where | How long |
| --- | --- | --- |
| The view of the session: the limits, the context, the context after each of the last 8 prompts, the cache counts of the last turn, the cost marks, the agents count | The session's state in Claude Code (`$.state`) | The session. `/clear` and a resume reset all but the limits and the agents count |
| The latest limits reading: for each window its name, the share used and the reset time | The mod's local storage in Claude Code (`$.store`, key `limits`) | Until the next reading replaces it. The mod deletes it when an answer shows that the account has no limits any more. A saved reading whose reset time has passed is not shown, and it stays until a new reading replaces it |

The mod keeps numbers, times, the model id and window names only. It reads no file, and it makes
no network request.

## Fixed values

| Value | Is |
| --- | --- |
| Redraw | Every 30 seconds, and at each event |
| Cells in a limit bar | 8 |
| Prompts in the context chart | The last 8 |
| Start of a limit forecast | One tenth of the window has passed and 5% is used |

The limits at which a part turns yellow or red are in the
[mod's README](../plugins/runway/README.md#the-states).
