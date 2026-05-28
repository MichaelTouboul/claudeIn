import { DollarSign, TrendingUp,Zap } from "lucide-react";
import { useCallback,useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CostsByAgent, CostsByDay, CostsByTool, CostsSummary } from '@/types/costs.types';

import { BigStat } from './BigStat/BigStat';
import { CustomTooltip } from './CustomTooltip/CustomTooltip';
import { COLORS, formatDay, formatTokens,PERIODS } from './utils';

export function CostDashboard() {
  const [period, setPeriod] = useState(30);
  const [summary, setSummary] = useState<CostsSummary | null>(null);
  const [dailyData, setDailyData] = useState<CostsByDay[]>([]);
  const [agentData, setAgentData] = useState<CostsByAgent[]>([]);
  const [toolData, setToolData] = useState<CostsByTool[]>([]);

  const refresh = useCallback(async () => {
    const [s, d, a, t] = await Promise.all([
      window.api.getCostsSummary(),
      window.api.getCostsByDay(period),
      window.api.getCostsByAgent(period),
      window.api.getCostsByTool(period),
    ]);
    setSummary(s);
    setDailyData(d);
    setAgentData(a);
    setToolData(t);
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
        <div className="flex gap-1 bg-surface-2 rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setPeriod(p.days)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p.days
                  ? "bg-accent text-white"
                  : "text-fg-muted hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top stats */}
      {summary ? (
        <div className="grid grid-cols-4 gap-4">
          <BigStat
            icon={<DollarSign size={16} />}
            label="Cost today"
            value={`$${summary.cost_today.toFixed(2)}`}
            sub={`${formatTokens(parseInt(summary.tokens_in_today) + parseInt(summary.tokens_out_today))} tokens`}
            color="text-active"
          />
          <BigStat
            icon={<DollarSign size={16} />}
            label={`Cost ${period}d`}
            value={`$${(periodSummary.cost || 0).toFixed(2)}`}
            sub={`${formatTokens((parseInt(periodSummary.tokens_in || "0")) + parseInt(periodSummary.tokens_out || "0"))} tokens`}
            color="text-accent"
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
      ) : null}

      <div className="grid grid-cols-3 gap-6">
        {/* Tokens per day - area chart */}
        <div className="col-span-2 bg-surface-2/30 border border-border/50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-fg-muted mb-4">Tokens per day</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartDaily}>
              <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={formatTokens} />
              <Tooltip content={CustomTooltip} />
              <Area type="monotone" dataKey="Tokens In" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
              <Area type="monotone" dataKey="Tokens Out" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tool breakdown - pie chart */}
        <div className="bg-surface-2/30 border border-border/50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-fg-muted mb-4">Tokens by tool</h3>
          {chartTools.length === 0 ? (
            <p className="text-fg-subtle text-xs text-center py-16">No data yet</p>
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
                <Tooltip content={CustomTooltip} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Cost per day - bar chart */}
      <div className="bg-surface-2/30 border border-border/50 rounded-xl p-4">
        <h3 className="text-sm font-medium text-fg-muted mb-4">Cost per day (USD)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartDaily}>
            <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 10 }} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
            <Tooltip content={CustomTooltip} />
            <Bar dataKey="$ Cost" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Agent breakdown table */}
      <div className="bg-surface-2/30 border border-border/50 rounded-xl p-4">
        <h3 className="text-sm font-medium text-fg-muted mb-4">Cost by agent</h3>
        {agentData.length === 0 ? (
          <p className="text-fg-subtle text-xs">No data yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-fg-muted text-xs uppercase">
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
                  <tr key={a.agent_name} className="border-t border-border hover:bg-surface-2/30">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-fg font-medium">{a.agent_name}</span>
                      </div>
                    </td>
                    <td className="text-right text-fg-muted">{a.events_count}</td>
                    <td className="text-right text-accent">{formatTokens(parseInt(a.tokens_in))}</td>
                    <td className="text-right text-blue-400">{formatTokens(parseInt(a.tokens_out))}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full"
                            style={{ width: `${(total / maxTotal) * 100}%` }}
                          />
                        </div>
                        <span className="text-fg w-16 text-right">{formatTokens(total)}</span>
                      </div>
                    </td>
                    <td className="text-right text-active font-mono">${a.cost_usd.toFixed(4)}</td>
                    <td className="text-right text-fg-subtle text-xs">
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
