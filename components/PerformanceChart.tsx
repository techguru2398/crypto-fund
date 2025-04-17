import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface PerformanceData {
  date: string;
  value: number;
}

interface PerformanceChartProps {
  title?: string;
  period?: '1W' | '1M' | '3M' | '1Y' | 'All';
  height?: number;
  fundId?: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  title = 'Fund Performance',
  period = '1Y',
  height = 300,
  fundId = 'hodl_index',
}) => {
  const [chartData, setChartData] = useState<PerformanceData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(period);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch NAV series data from the API endpoint
    setIsLoading(true);
    fetch(`/api/nav-chart?fundId=${fundId}`)
      .then((res) => res.json())
      .then((json) => {
        // Map API data { date, nav } to chart data with { date, value }
        const mappedData = json.nav_series.map((item: any) => ({
          date: item.date,
          value: item.nav
        }));
        setChartData(mappedData);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching NAV chart data:', error);
        setIsLoading(false);
      });
  }, [selectedPeriod, fundId]); // Reloads if the period selection changes (currently not used by the API)

  const periods = [
    { label: '1W', value: '1W' },
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '1Y', value: '1Y' },
    { label: 'All', value: 'All' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-primary font-bold">
            ${payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="neo-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium">{title}</h3>
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
                  layoutId="periodSelector"
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

      <div style={{ height: `${height}px` }}>
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                dy={10}
              />
              <YAxis 
                hide={true} 
                domain={['dataMin - 100', 'dataMax + 100']} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)" 
                animationDuration={1500}
                activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default PerformanceChart;
