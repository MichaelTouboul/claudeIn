export const colorMap: Record<string, string> = {
  cyan: "bg-accent", blue: "bg-blue-500", green: "bg-active",
  yellow: "bg-yellow-500", orange: "bg-orange-500", red: "bg-danger",
  purple: "bg-purple-500", pink: "bg-pink-500",
};

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function progressColor(percent: number): string {
  if (percent >= 90) return "bg-danger/20";
  if (percent >= 70) return "bg-yellow-500/20";
  return "bg-accent/15";
}
