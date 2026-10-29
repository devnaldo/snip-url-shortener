import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BrowserClicks } from '../../api/types';
import { formatNumber, truncateMiddle } from '../../lib/format';

interface BrowserChartProps {
  data: BrowserClicks[];
}

export function BrowserChart({ data }: BrowserChartProps) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No browser data yet.</p>;
  }

  const height = Math.max(160, data.length * 36);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="browser"
            width={92}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#475569' }}
            tickFormatter={(value) => truncateMiddle(String(value), 14)}
          />
          <Tooltip
            formatter={(value) => [formatNumber(Number(value)), 'Clicks']}
            contentStyle={{
              borderRadius: 8,
              borderColor: '#e2e8f0',
              fontSize: 12,
            }}
          />
          <Bar dataKey="clicks" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
