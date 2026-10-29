import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { DeviceClicks } from '../../api/types';
import { CHART_COLORS } from '../../lib/chart-colors';
import { formatNumber } from '../../lib/format';

const DEVICE_LABELS: Record<string, string> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
  bot: 'Bot',
  unknown: 'Unknown',
};

interface DeviceChartProps {
  data: DeviceClicks[];
}

export function DeviceChart({ data }: DeviceChartProps) {
  const total = data.reduce((sum, row) => sum + row.clicks, 0);

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No device data yet.</p>;
  }

  return (
    <div className="grid items-center gap-3 sm:grid-cols-2">
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="clicks"
              nameKey="deviceType"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((row, index) => (
                <Cell
                  key={row.deviceType}
                  fill={CHART_COLORS[index % CHART_COLORS.length] ?? '#64748b'}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                formatNumber(Number(value)),
                DEVICE_LABELS[String(name)] ?? String(name),
              ]}
              contentStyle={{
                borderRadius: 8,
                borderColor: '#e2e8f0',
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2">
        {data.map((row, index) => (
          <li key={row.deviceType} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] ?? '#64748b' }}
                aria-hidden="true"
              />
              <span className="truncate text-slate-700">
                {DEVICE_LABELS[row.deviceType] ?? row.deviceType}
              </span>
            </span>
            <span className="shrink-0 font-medium text-slate-900">
              {formatNumber(row.clicks)}
              <span className="ml-1 text-xs font-normal text-slate-500">
                ({Math.round((row.clicks / total) * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
