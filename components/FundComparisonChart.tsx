'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const FUND_COLORS: Record<string, string> = {
  hodl_index: '#1f77b4',     // Blue
  btc_ltc: '#ff7f0e',        // Orange
  defi_core: '#2ca02c',      // Green
  ai_infra: '#d62728',       // Red
};

const periods = [
  { label: '1W', value: '1W', days: 7 },
  { label: '1M', value: '1M', days: 30 },
  { label: '3M', value: '3M', days: 90 },
  { label: '1Y', value: '1Y', days: 365 },
  { label: 'All', value: 'All', days: Infinity },
];

type FundChartPoint = {
  date: string;
  [fundId: string]: string | number;
};

const FundPerformanceMulti = () => {
  const [data, setData] = useState<FundChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('1M');

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/nav-chart-multi')
      .then((res) => res.json())
      .then((json) => {
        const filtered = filterByPeriod(json, selectedPeriod);
        setData(filtered);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('❌ Error fetching multi NAV chart:', err);
        setIsLoading(false);
      });
  }, [selectedPeriod]);

  const filterByPeriod = (rows: FundChartPoint[], period: string) => {
    const days = periods.find((p) => p.value === period)?.days || Infinity;
    if (days === Infinity) return rows;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return rows.filter((row) => new Date(row.date) >= cutoff);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="glass-card p-3 text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="text-xs">
            <span className="font-medium" style={{ color: entry.color }}>
              {entry.name}
            </span>
            : ${entry.value.toLocaleString()}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="neo-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium">Fund Comparison</h3>
        <div className="flex overflow-x-auto space-x-1 p-1 bg-secondary/50 rounded-full">
          {periods.map((p) => (
            <button
              key={p.value}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors relative ${
                selectedPeriod === p.value
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setSelectedPeriod(p.value)}
            >
              {selectedPeriod === p.value && (
                <motion.div
                  layoutId="multiChartPeriodSelector"
                  className="absolute inset-0 bg-primary rounded-full"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 350 }}>
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `$${(v / 1_000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              {Object.entries(FUND_COLORS).map(([fundId, color]) => (
                <Line
                  key={fundId}
                  dataKey={fundId}
                  stroke={color}
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive
                  type="monotone"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default FundPerformanceMulti;
