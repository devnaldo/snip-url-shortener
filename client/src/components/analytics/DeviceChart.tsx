import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { DeviceClicks } from '../../api/types';
import { formatNumber } from '../../lib/format';
import { useChartPalette } from '../../lib/use-chart-palette';

const DEVICE_LABELS: Record<string, string> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
  bot: 'Bot',
  unknown: 'Unknown',
};

const MONO = "'IBM Plex Mono', ui-monospace, monospace";

interface DeviceChartProps {
  data: DeviceClicks[];
}

export function DeviceChart({ data }: DeviceChartProps) {
  const palette = useChartPalette();
  const total = data.reduce((sum, row) => sum + row.clicks, 0);

  if (total === 0) {
    return (
      <p className="py-8 text-center font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-subtle">
        No device data yet
      </p>
    );
  }

  return (
    <div className="grid items-center gap-4 sm:grid-cols-2">
      <div className="relative h-[172px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="clicks"
              nameKey="deviceType"
              innerRadius={46}
              outerRadius={70}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke={palette.surface}
              strokeWidth={2}
            >
              {data.map((row, index) => (
                <Cell
                  key={row.deviceType}
                  fill={palette.series[index % palette.series.length] ?? palette.muted}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                formatNumber(Number(value)),
                DEVICE_LABELS[String(name)] ?? String(name),
              ]}
              contentStyle={{
                borderRadius: 4,
                borderColor: palette.line,
                backgroundColor: palette.surface,
                color: palette.ink,
                fontSize: 11,
                fontFamily: MONO,
                boxShadow: palette.tooltipShadow,
              }}
              itemStyle={{ color: palette.ink }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-terminal text-xl leading-none text-ink">{formatNumber(total)}</span>
          <span className="mt-1 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-subtle">
            clicks
          </span>
        </div>
      </div>

      <ul className="space-y-2.5">
        {data.map((row, index) => (
          <li key={row.deviceType} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0"
                style={{
                  backgroundColor: palette.series[index % palette.series.length] ?? palette.muted,
                }}
              />
              <span className="truncate text-muted">
                {DEVICE_LABELS[row.deviceType] ?? row.deviceType}
              </span>
            </span>
            <span className="shrink-0 text-ink">
              {formatNumber(row.clicks)}
              <span className="ml-1.5 text-[0.625rem] text-subtle">
                {Math.round((row.clicks / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
