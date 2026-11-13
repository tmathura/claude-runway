import { isNumber, money } from "./format";
import type { Agents, LastTurn, Part, Run } from "./view";

export function costPart(usd: number | null, last: LastTurn | null, isSubscription: boolean): Part | null {
  if (!isNumber(usd) || usd <= 0) {
    return null;
  }

  // On a subscription the figure is what the API would charge, not a bill.
  const runs: Run[] = [{ text: `${isSubscription ? "≈ " : ""}${money(usd)}`, style: "plain" }];

  const added: string[] = [];
  if (last && isNumber(last.usd) && last.usd >= 0.005) {
    added.push(`+${money(last.usd)}`);
  }
  if (last && isNumber(last.fiveHourPoints) && last.fiveHourPoints >= 0.1) {
    added.push(`+${last.fiveHourPoints.toFixed(1)}% 5h`);
  }
  if (added.length > 0) {
    runs.push({ text: ` (${added.join(" · ")})`, style: "dim" });
  }

  return { id: "cost", tone: "calm", runs };
}

export function agentsPart(agents: Agents): Part | null {
  if (!isNumber(agents.running) || agents.running <= 0) {
    return null;
  }

  const runs: Run[] = [
    { text: `${agents.running} ${agents.running === 1 ? "agent" : "agents"} running`, style: "plain" }
  ];
  if (isNumber(agents.total) && agents.total > agents.running) {
    runs.push({ text: ` · ${agents.total} total`, style: "dim" });
  }

  return { id: "agents", tone: "calm", runs };
}
