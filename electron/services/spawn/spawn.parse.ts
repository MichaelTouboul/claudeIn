import type { StreamEvent } from "../../types/spawn.types";

export function parseStreamLine(line: string): StreamEvent | null {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export function extractText(event: StreamEvent): string | null {
  if (event.message?.content) {
    return event.message.content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text!)
      .join("");
  }
  if (event.content) {
    return event.content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text!)
      .join("");
  }
  return null;
}
