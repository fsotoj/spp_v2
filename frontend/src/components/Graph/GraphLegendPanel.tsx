import { useMemo } from 'react';
import { Pin, PinOff } from 'lucide-react';
import type { ChartSeries } from './LineChartPanel';
import { formatValue } from './LineChartPanel';

interface GraphLegendPanelProps {
    series: ChartSeries[];
    highlightedStateId: number | null;
    onHoverState: (id: number | null) => void;
    soloStateId: number | null;
    onSoloState: (id: number | null) => void;
    colorBy: 'state' | 'country';
    activeYear?: number | null;
    activeValues?: Record<number, number | null>;
    varType?: string | null;
    isPinned?: boolean;
    onUnpin?: () => void;
}

export function GraphLegendPanel({
    series,
    highlightedStateId,
    onHoverState,
    soloStateId,
    onSoloState,
    colorBy,
    activeYear,
    activeValues,
    varType,
    isPinned,
    onUnpin,
}: GraphLegendPanelProps) {
    const hasLiveData = activeYear != null && activeValues != null && Object.keys(activeValues).length > 0;

    // Flat sorted list: by value desc when live, alphabetically otherwise; no-data rows always last
    const sortedSeries = useMemo(() => {
        const withData = series.filter(s => s.hasData);
        const noData = series.filter(s => !s.hasData);
        if (hasLiveData && activeValues) {
            withData.sort((a, b) => {
                const av = activeValues[a.stateId] ?? -Infinity;
                const bv = activeValues[b.stateId] ?? -Infinity;
                return bv - av;
            });
        } else {
            withData.sort((a, b) => a.stateName.localeCompare(b.stateName));
        }
        return [...withData, ...noData];
    }, [series, hasLiveData, activeValues]);

    // Country color strip — only meaningful in country color mode
    const countryColors = useMemo(() => {
        const seen = new Map<string, string>();
        for (const s of series) {
            if (s.hasData && !seen.has(s.countryName)) {
                seen.set(s.countryName, s.color);
            }
        }
        return Array.from(seen.entries());
    }, [series]);

    const isSoloActive = soloStateId != null;

    return (
        <div className="flex-1 w-full flex flex-col bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden min-h-0">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
                <h3 className="font-black text-[10px] text-brand-600 uppercase tracking-[0.12em]">
                    States
                </h3>
                {hasLiveData && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-spp-purple tabular-nums">{activeYear}</span>
                        {isPinned ? (
                            <button
                                onClick={onUnpin}
                                className="text-brand-400 hover:text-brand-600 transition-colors"
                                title="Unpin year"
                            >
                                <PinOff size={11} />
                            </button>
                        ) : (
                            <Pin size={11} className="text-slate-300" />
                        )}
                    </div>
                )}
            </div>

            {/* Country color strip */}
            {colorBy === 'country' && countryColors.length > 1 && (
                <div className="px-3 pt-2 pb-1 flex flex-wrap gap-x-3 gap-y-1 shrink-0">
                    {countryColors.map(([country, color]) => (
                        <div key={country} className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                {country.charAt(0) + country.slice(1).toLowerCase()}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Flat state list */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-0.5">
                {sortedSeries.map(s => {
                    const hasD = s.hasData;
                    const liveVal = hasLiveData && activeValues ? activeValues[s.stateId] : undefined;
                    const isSolo = soloStateId === s.stateId;
                    const faded = !hasD || (isSoloActive && !isSolo) || (!isSoloActive && highlightedStateId !== null && highlightedStateId !== s.stateId);

                    return (
                        <div
                            key={s.stateId}
                            className={`flex items-center gap-2 px-1 py-1 rounded transition-all
                                ${hasD ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'}
                                ${isSolo ? 'bg-brand-50' : ''}
                                ${faded ? 'opacity-25' : 'opacity-100'}
                            `}
                            onMouseEnter={() => hasD && onHoverState(s.stateId)}
                            onMouseLeave={() => hasD && onHoverState(null)}
                            onClick={() => hasD && onSoloState(isSolo ? null : s.stateId)}
                        >
                            <svg width="18" height="10" className="shrink-0">
                                {hasD ? (
                                    <>
                                        <line x1="0" y1="5" x2="18" y2="5" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" />
                                        <circle cx="9" cy="5" r="2.5" fill={s.color} />
                                    </>
                                ) : (
                                    <line x1="0" y1="5" x2="18" y2="5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
                                )}
                            </svg>
                            <span
                                className={`text-[10px] font-semibold truncate flex-1 leading-tight ${hasD ? 'text-slate-700' : 'text-slate-400'}`}
                                title={s.stateName}
                            >
                                {s.stateName.charAt(0) + s.stateName.slice(1).toLowerCase()}
                            </span>
                            {hasLiveData && liveVal !== undefined && (
                                <span className="text-[10px] font-black text-spp-textDark tabular-nums shrink-0 ml-1">
                                    {formatValue(liveVal, varType ?? null)}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="hidden md:block px-4 py-2 border-t border-slate-100 bg-spp-bgMuted shrink-0">
                <div className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">SPP</div>
            </div>
        </div>
    );
}
