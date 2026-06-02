/**
 * Local-activity snapshot computed from Claude Code transcripts
 * (`~/.claude/projects/*​/*.jsonl`). Honest, machine-local view — NOT plan usage.
 */

export interface ActivityToday {
  messages: number;
  sessions: number;
  tokens: number;
}

export interface ActivityByModel {
  model: string;
  tokens: number;
  messages: number;
}

export interface ActivityByDay {
  date: string; // YYYY-MM-DD
  messages: number;
  tokens: number;
}

export interface ActivitySnapshot {
  today: ActivityToday;
  byModel: ActivityByModel[]; // over the window, sorted desc by tokens
  byDay: ActivityByDay[]; // ascending by date, for a mini history
}
