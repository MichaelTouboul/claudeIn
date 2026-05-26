import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { DollarSign, Zap, TrendingUp, Clock } from "lucide-react";

type Summary = {
  tokens_in_today: string;
  tokens_out_today: string;
  cost_today: number;
  tokens_in_7d: string;
  tokens_out_7d: string;
  cost_7d: number;
  tokens_in_30d: string;
  tokens_out_30d: string;
  cost_30d: number;
  tokens_in_all: string;
  tokens_out_all: string;
  cost_all: number;
};

type DayData = {
  day: string;
  tokens_in: string;
  tokens_out: string;
  cost_usd: number;
  events_count: string;
};

type AgentData = {
  agent_name: string;
  tokens_in: string;
  tokens_out: string;
  cost_usd: number;
  events_count: string;
  active_days: string;
  last_seen: string;
};

type ToolData = {
  tool_name: string;
  tokens_in: string;
  tokens_out: string;
  cost_usd: number;
  call_count: string;
};

const COLORS = ["#06b6d4", "#3b82f6", "#22c55e", "#eab308", "#f97316", "#a855f7", "#ec4899", "#ef4444"];
const PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDay(day: string): string {
  return new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function BigStat({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.name.includes("$") ? `$${p.value.toFixed(4)}` : formatTokens(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function CostDashboard() {
  const [period, setPeriod] = useState(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dailyData, setDailyData] = useState<DayData[]>([]);
  const [agentData, setAgentData] = useState<AgentData[]>([]);
  const [toolData, setToolData] = useState<ToolData[]>([]);

  const refresh = useCallback(async () => {
    const [s, d, a, t] = await Promise.all([
      window.api.getCostsSummary(),
      window.api.getCostsByDay(period),
      window.api.getCostsByAgent(period),
      window.api.getCostsByTool(period),
    ]);
    setSummary(s as Summary);
    setDailyData(d as DayData[]);
    setAgentData(a as AgentData[]);
    setToolData(t as ToolData[]);
  }, [period]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const chartDaily = dailyData.map((d) => ({
    day: formatDay(d.day),
    "Tokens In": parseInt(d.tokens_in),
    "Tokens Out": parseInt(d.tokens_out),
    "$ Cost": d.cost_usd,
  }));

  const chartAgents = agentData.map((a) => ({
    name: a.agent_name,
    tokens: parseInt(a.tokens_in) + parseInt(a.tokens_out),
    cost: a.cost_usd,
    events: parseInt(a.events_count),
  }));

  const chartTools = toolData.map((t, i) => ({
    name: t.tool_name,
    value: parseInt(t.tokens_in) + parseInt(t.tokens_out),
    cost: t.cost_usd,
    calls: parseInt(t.call_count),
    fill: COLORS[i % COLORS.length],
  }));

  const periodSummary =
    period === 7
      ? { tokens_in: summary?.tokens_in_7d, tokens_out: summary?.tokens_out_7d, cost: summary?.cost_7d }
      : period === 30
        ? { tokens_in: summary?.tokens_in_30d, tokens_out: summary?.tokens_out_30d, cost: summary?.cost_30d }
        : { tokens_in: summary?.tokens_in_all, tokens_out: summary?.tokens_out_all, cost: summary?.cost_all };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Token & Cost Dashboard</h2>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setPeriod(p.days)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p.days
                  ? "bg-cyan-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top stats */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <BigStat
            icon={<DollarSign size={16} />}
            label="Cost today"
            value={`$${summary.cost_today.toFixed(2)}`}
            sub={`${formatTokens(parseInt(summary.tokens_in_today) + parseInt(summary.tokens_out_today))} tokens`}
            color="text-green-400"
          />
          <BigStat
            icon={<DollarSign size={16} />}
            label={`Cost ${period}d`}
            value={`$${(periodSummary.cost || 0).toFixed(2)}`}
            sub={`${formatTokens((parseInt(periodSummary.tokens_in || "0")) + parseInt(periodSummary.tokens_out || "0"))} tokens`}
            color="text-cyan-400"
          />
          <BigStat
            icon={<Zap size={16} />}
            label="Tokens in (period)"
            value={formatTokens(parseInt(periodSummary.tokens_in || "0"))}
            sub="Input tokens"
            color="text-blue-400"
          />
          <BigStat
            icon={<TrendingUp size={16} />}
            label="Tokens out (period)"
            value={formatTokens(parseInt(periodSummary.tokens_out || "0"))}
            sub="Output tokens"
            color="text-yellow-400"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Tokens per day - area chart */}
        <div className="col-span-2 bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Tokens per day</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartDaily}>
              <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={formatTokens} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Tokens In" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
              <Area type="monotone" dataKey="Tokens Out" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tool breakdown - pie chart */}
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Tokens by tool</h3>
          {chartTools.length === 0 ? (
            <p className="text-gray-600 text-xs text-center py-16">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={chartTools}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  strokeWidth={0}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {chartTools.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Cost per day - bar chart */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Cost per day (USD)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartDaily}>
            <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="$ Cost" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Agent breakdown table */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Cost by agent</h3>
        {agentData.length === 0 ? (
          <p className="text-gray-600 text-xs">No data yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase">
                <th className="text-left py-2">Agent</th>
                <th className="text-right py-2">Events</th>
                <th className="text-right py-2">Tokens In</th>
                <th className="text-right py-2">Tokens Out</th>
                <th className="text-right py-2">Total Tokens</th>
                <th className="text-right py-2">Cost</th>
                <th className="text-right py-2">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {agentData.map((a, i) => {
                const total = parseInt(a.tokens_in) + parseInt(a.tokens_out);
                const maxTotal = Math.max(
                  ...agentData.map((x) => parseInt(x.tokens_in) + parseInt(x.tokens_out))
                );
                return (
                  <tr key={a.agent_name} className="border-t border-gray-800 hover:bg-gray-800/30">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-gray-200 font-medium">{a.agent_name}</span>
                      </div>
                    </td>
                    <td className="text-right text-gray-400">{a.events_count}</td>
                    <td className="text-right text-cyan-400">{formatTokens(parseInt(a.tokens_in))}</td>
                    <td className="text-right text-blue-400">{formatTokens(parseInt(a.tokens_out))}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 rounded-full"
                            style={{ width: `${(total / maxTotal) * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-300 w-16 text-right">{formatTokens(total)}</span>
                      </div>
                    </td>
                    <td className="text-right text-green-400 font-mono">${a.cost_usd.toFixed(4)}</td>
                    <td className="text-right text-gray-600 text-xs">
                      {new Date(a.last_seen).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
