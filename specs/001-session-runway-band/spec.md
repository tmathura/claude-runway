# Feature Specification: Show what a session has left in one band above the prompt

**Feature Branch**: `feature/1-session-runway-band`
**Created**: 2026-11-13
**Status**: Draft
**Input**: GitHub issue #1, "Show what a session has left in one band above the prompt".

## Clarifications

### Session 2026-11-13 (owner's brief)

- The owner asked for a mod with the same functions as `token-weather-usage` in
  `augiefra/claude-mods`, written as our own code, with a flavour of its own. The owner was away and
  gave the decisions to the agent. The decisions are in [research.md](research.md).
- Our flavour is the question "when does it run out?". Each part gives a forecast, the most urgent
  part comes first, and a narrow band drops the least urgent parts.
- Left out of this version, with the reasons in research §2: the one-click approval pill, French and
  Russian labels, dollar figures from a price table, hover cards, and the saved 7-day history.

### Session 2026-11-13 (while building)

- The state contract holds the view types, the mod's imports have no suffix, and a hook has no
  `try`. None of these changes what the band shows. The reasons and the rejected first choices are
  in research §5 and §7.

### Session 2026-11-13 (code review round 1)

- `/clear` and a resume start a new conversation in the same process: the band keeps the limits and
  drops the context history, the cache reading and the cost marks. See the Edge Cases.
- An account that stops having limits loses the limit parts at the next measure.
- The decisions for each finding are in research §8.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the usage limits against the clock (Priority: P1)

A person on a subscription works in a session. Above the prompt they see, for the 5-hour window and
for the 7-day window, the share used, a bar that compares it with the time that has passed, and the
time until the reset. When their pace would reach a limit before its reset, the band says when the
limit ends.

**Why this priority**: reaching a limit stops all work. It is the reason the owner asked for a mod.

**Independent Test**: give the mod a reading of 60% used with 4 of 5 hours left, and read
"ends in" with a time shorter than the time to the reset.

**Acceptance Scenarios**:

1. **Given** 34% of the 5-hour limit is used and half of the window has passed, **When** the band
   draws, **Then** it shows `5h`, a bar, `34%` and the time left, with no forecast.
2. **Given** 60% is used and one fifth of the window has passed, **When** the band draws, **Then** it
   shows when the limit ends at this pace, in the warning colour.
3. **Given** the limit is at 100%, **When** the band draws, **Then** it says the limit is reached and
   when it resets, in the alert colour.
4. **Given** an account with no usage limits, **When** the band draws, **Then** the limit parts are
   absent and the other parts draw.

---

### User Story 2 - See the context window and how long it lasts (Priority: P2)

The person sees the tokens in the context, the share of the window, a small chart of the context
after each recent prompt, what the last prompt added, and how many prompts fit before the window is
full.

**Why this priority**: a full context forces a compaction in the middle of a task.

**Independent Test**: give the mod five turns that each add 20k tokens to a 200k window, and read
the prompts left.

**Acceptance Scenarios**:

1. **Given** 120k tokens in a 200k window that grows 20k a prompt, **When** the band draws, **Then**
   it shows `ctx 120k`, `60%`, a chart, `+20k` and `~4 left`.
2. **Given** only one turn so far, **When** the band draws, **Then** it shows the tokens and the
   share, with no chart and no forecast.
3. **Given** the context is at 92%, **When** the band draws, **Then** the part is in the alert colour.

---

### User Story 3 - See when the prompt cache goes cold (Priority: P2)

After each answer the person sees the time before the prompt cache lapses. When it has lapsed, the
band says the cache is cold and how many tokens the next message writes again.

**Why this priority**: a message sent after the cache lapsed costs much more of the limit, and
nothing in Claude Code shows it.

**Independent Test**: give the mod a turn that ended 55 minutes ago on a subscription, and read
`cache 5m` in the warning colour.

**Acceptance Scenarios**:

1. **Given** a turn ended 8 minutes ago on a subscription, **When** the band draws, **Then** it shows
   `cache 52m`.
2. **Given** the turn ended 61 minutes ago, **When** the band draws, **Then** it shows `cache cold`
   and the tokens to write again, in the alert colour.
3. **Given** a turn is running, **When** the band draws, **Then** it shows `cache warm`.
4. **Given** the model was changed after the last answer, **When** the band draws, **Then** it says
   the model changed.
5. **Given** the session was compacted, **When** the band draws, **Then** it says `cache compacted`
   until the next answer.

---

### User Story 4 - See the cost and the agents (Priority: P3)

The person sees the session cost, what the last prompt added in dollars and in points of the 5-hour
limit, and the number of agents that run.

**Why this priority**: useful, but nothing stops when these are not seen.

**Independent Test**: give the mod a session cost of $41.07 after a turn that started at $40.49.

**Acceptance Scenarios**:

1. **Given** the cost went from $40.49 to $41.07 in the last turn on a subscription, **When** the
   band draws, **Then** it shows `≈ $41.07 (+$0.58)`.
2. **Given** two agents run, **When** the band draws, **Then** it shows `2 agents running`.
3. **Given** no agent runs, **When** the band draws, **Then** the agents part is absent.

---

### User Story 5 - The most urgent part first, in one row (Priority: P2)

A part in the alert state comes first, then the parts in the warning state, then the calm parts. When
the row is too narrow, the band drops whole parts, the least urgent first.

**Why this priority**: it is what makes the band readable at a glance, and it is our own flavour.

**Independent Test**: give the mod a calm 5-hour limit and a cold cache, and read the cache first.

**Acceptance Scenarios**:

1. **Given** the cache is cold and every other part is calm, **When** the band draws, **Then** the
   cache part is the first part.
2. **Given** a row of 40 columns and six parts, **When** the band draws, **Then** the row is 40
   columns or less and no part is cut.

### Edge Cases

- No reading yet (a new session before its first answer): the band draws nothing, or only the limits
  that another session saved.
- A reset time in the past: that limit part is absent, because its figure is old.
- A window name the mod does not know (a gateway's `spend_limit`): ignored.
- A figure that is absent, zero, negative or not a number: that part is absent. No hook throws.
- A survey holds the band: the mod yields to it.
- A turn of a subagent ends: it does not count as a prompt of the main thread.
- `/clear` or a resume: the limits stay; the context history, the cache reading and the cost marks
  start again; the band goes on redrawing.
- A compaction made ahead of time, or one that was skipped: the cache part does not change.
- The limits leave the account (a change to an API key): the limit parts and the saved reading go.
- A run with no person at the prompt: no timer is started.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The mod MUST draw one row above the prompt, from the parts below that have a reading.
- **FR-002**: For each of the windows `five_hour` and `seven_day` that has a reading, the mod MUST
  show its label (`5h`, `7d`), a bar of 8 cells, the share used as a whole percentage, and the time
  until the reset.
- **FR-003**: The bar MUST show the share used and the share of the window's time that has passed,
  so that a reader sees which one is ahead.
- **FR-004**: When at least one tenth of the window has passed, at least 5% is used, and the pace
  would reach 100% before the reset, the mod MUST show the time until the limit ends.
- **FR-005**: The mod MUST show the context tokens and the share of the window. With two or more
  main-thread turns it MUST also show a chart of the last 8 and the change of the last turn. With
  two or more turns that grew the context it MUST show the prompts left.
- **FR-006**: The mod MUST show the time before the prompt cache lapses, counted from the end of the
  last main-thread turn: 60 minutes on an account with usage limits, 5 minutes on any other. It MUST
  show the states cold, warm (a turn runs), model changed and compacted.
- **FR-007**: When less than 90% of the last turn's input was read from the cache, the mod MUST show
  that share.
- **FR-008**: The mod MUST show the session cost, with `≈` on an account with usage limits, and what
  the last main-thread turn added in dollars and in points of the 5-hour limit.
- **FR-009**: The mod MUST show the number of agents that run, and nothing when none runs.
- **FR-010**: Each part MUST have one of three states: calm, warning or alert. The states are in
  [research.md](research.md) §4.
- **FR-011**: The parts MUST be ordered alert, warning, calm. Inside one state the order is 5h, 7d,
  context, cache, cost, agents.
- **FR-012**: The row MUST fit the width that Claude Code gives. The mod MUST drop whole parts until
  it fits: the calm parts first, then warning, then alert; inside one state in the order agents,
  cost, cache, context, 7d, 5h.
- **FR-013**: A part with no reading MUST be absent. With no part, the mod MUST draw nothing.
- **FR-014**: The mod MUST redraw at least every 30 seconds, so that the times stay right.
- **FR-015**: The mod MUST save the latest limits reading, so that a new session shows the limits
  before its first answer. A saved reading whose reset time has passed, or that has none, MUST NOT
  be shown. When Claude Code says the limits left the account, the mod MUST drop the limit parts and
  the saved reading.
- **FR-016**: Every hook MUST pass its event on unchanged. No hook may throw on a bad reading.
- **FR-017**: The mod MUST use only `Box` and `Text` elements, so that one tree draws on every
  surface.

### Key Entities

- **Limit reading**: a window name, the share used, and the reset time.
- **View**: what the band draws from, for one session: the limit readings, the context reading, the
  context after each recent turn, the cache reading of the last turn, the cost marks and the agents
  count.
- **Part**: one piece of the row: its name, its state, and its runs of text with a style each.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person reads the time left of both limits, the context and the cache in one look at
  the row, with no command typed.
- **SC-002**: The shares shown for the limits and the context are the same as `/usage` and
  `/context` show at that moment.
- **SC-003**: The row never takes more than one line, at any width from 20 columns up.
- **SC-004**: With every reading absent, the mod draws nothing and logs no error.

## Assumptions

- The reading of the limits comes with a reset time. Without it, the part shows the share only.
- The prompt cache lasts 60 minutes on a subscription and 5 minutes on an API key. Claude Code does
  not give this figure to a mod, so it is inferred from the account type.
- The cost on a subscription is an API-price equivalent, not a bill.
- Claude Code 2.1.323 or later, the build whose type file the mod was written against.
