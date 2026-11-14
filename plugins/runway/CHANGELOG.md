# Changelog

## Runway mod

### 0.1.2

- Saves only the limits whose reset time is a date. Before, the mod also saved a limit with no
  reset time, which no session could show from the saved reading.
- The band of a session shows its own limits as before. A reading that is already saved stays
  until a new reading replaces it, until the account has no limits any more, or until its own
  reset times pass.

### 0.1.1

- Deletes the saved limits reading at the start of a session when it has no limit left in its
  window. Before, such a reading could stay in the mod's storage with no end.
- The band shows the same as before.

### 0.1.0

- First release: one band above the prompt.
- Shows the 5-hour and 7-day limits against the clock, with a forecast of when a limit ends.
- Shows the context window, a chart of recent prompts and the prompts left.
- Shows the time before the prompt cache goes cold.
- Shows the session cost, the last prompt's share and the agents that run.
- Puts the most urgent part first and drops the least urgent parts on a narrow window.
