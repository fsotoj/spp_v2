import { useMemo } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
} from 'recharts';
import type { TimeSeriesRow } from '../../api/hooks';

// ── Country base colors (mirrors legacy) ─────────────────────────────────────
const COUNTRY_COLORS: Record<string, string> = {
    ARGENTINA: '#74ACDF',
    BRAZIL: '#3CB371',
    MEXICO: '#E03C31',
};

// Qualitative palette for by-state coloring (Set1-inspired, extended)
const STATE_PALETTE = [
    '#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
    '#a65628', '#f781bf', '#999999', '#66c2a5', '#fc8d62',
    '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494',
    '#b3b3b3', '#1b9e77', '#d95f02', '#7570b3', '#e7298a',
];

// ── Value formatter ───────────────────────────────────────────────────────────
export function formatValue(value: number | null | undefined, type: string | null): string {
    if (value == null || isNaN(value)) return '—';
    if (type === 'percentage') return `${value.toFixed(2)}%`;
    if (type === 'continuous') return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // discrete / fallback
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// ── Color assignment ──────────────────────────────────────────────────────────
export function buildColorMap(
    entries: { stateId: number; stateName: string; countryName: string }[],
    colorBy: 'state' | 'country',
): Record<number, string> {
    const map: Record<number, string> = {};
    if (colorBy === 'country') {
        entries.forEach(e => {
            map[e.stateId] = COUNTRY_COLORS[e.countryName.toUpperCase()] ?? '#94a3b8';
        });
    } else {
        entries.forEach((e, i) => {
            map[e.stateId] = STATE_PALETTE[i % STATE_PALETTE.length];
        });
    }
    return map;
}

// ── Y-axis formatter ──────────────────────────────────────────────────────────
function makeYFormatter(type: string | null) {
    return (v: number) => {
        if (type === 'percentage') return `${v}%`;
        if (type === 'continuous') return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
        return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    };
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ChartSeries {
    stateId: number;
    stateName: string;
    countryName: string;
    color: string;
    hasData: boolean;
}

interface LineChartPanelProps {
    rows: TimeSeriesRow[];
    variable: string;
    varType: string | null;
    series: ChartSeries[];
    highlightedStateId: number | null;
    soloStateId: number | null;
    forceYZero: boolean;
    prettyName: string;
    activeYear?: number | null;
    onActiveDataChange?: (year: number | null, values: Record<number, number | null>) => void;
    onChartClick?: (year: number, values: Record<number, number | null>) => void;
    varDescription?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LineChartPanel({
    rows,
    variable,
    varType,
    series,
    highlightedStateId,
    soloStateId,
    forceYZero,
    prettyName,
    activeYear,
    onActiveDataChange,
    onChartClick,
    varDescription,
}: LineChartPanelProps) {
    // Pivot rows into { year, [stateName]: value, ... } format for Recharts
    const chartData = useMemo(() => {
        const byYear = new Map<number, Record<string, number | null>>();
        for (const row of rows) {
            const val = row[variable] as number | null | undefined;
            if (val == null) continue;
            if (!byYear.has(row.year)) byYear.set(row.year, { year: row.year });
            byYear.get(row.year)![row.state_id] = val;
        }
        return Array.from(byYear.values()).sort((a, b) => (a.year as number) - (b.year as number));
    }, [rows, variable]);

    const activeSeries = series.filter(s => s.hasData);

    const yDomain: [number | string, number | string] = forceYZero
        ? [0, 'auto']
        : ['auto', 'auto'];

    if (chartData.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                No data available for the current selection.
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            {/* Chart title + description */}
            <div className="px-12 pt-3 pb-1 shrink-0 text-center">
                <p className="text-xs font-bold text-spp-gray uppercase tracking-wider">{prettyName}</p>
                {varDescription && (
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{varDescription}</p>
                )}
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
                        onMouseMove={(state: any) => {
                            if (!onActiveDataChange) return;
                            if (state.isTooltipActive && state.activeLabel != null) {
                                const values: Record<number, number | null> = {};
                                state.activePayload?.forEach((p: any) => {
                                    values[Number(p.dataKey)] = p.value ?? null;
                                });
                                onActiveDataChange(Number(state.activeLabel), values);
                            }
                        }}
                        onMouseLeave={() => onActiveDataChange?.(null, {})}
                        onClick={(state: any) => {
                            if (!onChartClick) return;
                            if (state.activeLabel != null && state.activePayload?.length) {
                                const values: Record<number, number | null> = {};
                                state.activePayload.forEach((p: any) => {
                                    values[Number(p.dataKey)] = p.value ?? null;
                                });
                                onChartClick(Number(state.activeLabel), values);
                            }
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                            dataKey="year"
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis
                            domain={yDomain}
                            tickFormatter={makeYFormatter(varType)}
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            tickLine={false}
                            axisLine={false}
                            width={56}
                        />
                        {forceYZero && <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />}

                        {/* Invisible tooltip — required for Recharts to populate activePayload on onMouseMove */}
                        <Tooltip content={() => null} />
                        {activeYear != null && (
                            <ReferenceLine x={activeYear} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
                        )}

                        {activeSeries.map(s => {
                            const isHighlighted = soloStateId != null
                                ? s.stateId === soloStateId
                                : highlightedStateId === null || s.stateId === highlightedStateId;
                            return (
                                <Line
                                    key={s.stateId}
                                    type="monotone"
                                    dataKey={s.stateId}
                                    name={s.stateName}
                                    stroke={s.color}
                                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                                    dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                    opacity={isHighlighted ? 1 : 0.18}
                                    connectNulls={false}
                                    isAnimationActive={false}
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
