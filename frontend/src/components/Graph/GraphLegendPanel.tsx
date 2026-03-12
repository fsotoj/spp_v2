import { useMemo } from 'react';
import { Pin, PinOff } from 'lucide-react';
import type { ChartSeries } from './LineChartPanel';
import { formatValue } from './LineChartPanel';

interface GraphLegendPanelProps {
    series: ChartSeries[];
    highlightedStateId: number | null;
    onHoverState: (id: number | null) => void;
    activeYear?: number | null;
    activeValues?: Record<number, number | null>;
    varType?: string | null;
    isPinned?: boolean;
    onUnpin?: () => void;
}

export function GraphLegendPanel({ series, highlightedStateId, onHoverState, activeYear, activeValues, varType, isPinned, onUnpin }: GraphLegendPanelProps) {
    const hasLiveData = activeYear != null && activeValues != null && Object.keys(activeValues).length > 0;

    // Group series by country, preserving insertion order; sort by active value when live
    const groups = useMemo(() => {
        const map = new Map<string, ChartSeries[]>();
        for (const s of series) {
            const key = s.countryName || 'Other';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(s);
        }
        const entries = Array.from(map.entries());
        if (hasLiveData && activeValues) {
            entries.forEach(([, states]) => {
                states.sort((a, b) => {
                    const av = activeValues[a.stateId] ?? -Infinity;
                    const bv = activeValues[b.stateId] ?? -Infinity;
                    return bv - av;
                });
            });
        }
        return entries;
    }, [series, hasLiveData, activeValues]);

    const withData = (s: ChartSeries) => s.hasData;
    const noData = (s: ChartSeries) => !s.hasData;

    const LegendRow = ({ s }: { s: ChartSeries }) => {
        const isActive = highlightedStateId === null || s.stateId === highlightedStateId;
        const hasD = withData(s);
        const liveVal = hasLiveData && activeValues ? activeValues[s.stateId] : undefined;
        return (
            <div
                className={`flex items-center gap-2 px-1 py-1 rounded transition-all ${hasD ? 'cursor-pointer hover:bg-slate-50' : 'opacity-30'} ${!isActive ? 'opacity-25' : ''}`}
                onMouseEnter={() => hasD && onHoverState(s.stateId)}
                onMouseLeave={() => hasD && onHoverState(null)}
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
    };

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
                        {isPinned && (
                            <button
                                onClick={onUnpin}
                                className="text-brand-400 hover:text-brand-600 transition-colors"
                                title="Unpin year"
                            >
                                <PinOff size={11} />
                            </button>
                        )}
                        {!isPinned && <Pin size={11} className="text-slate-300" />}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-3">
                {groups.map(([country, states]) => {
                    const active = states.filter(withData);
                    const inactive = states.filter(noData);
                    return (
                        <div key={country}>
                            {/* Country label */}
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-1 mb-0.5">
                                {country.charAt(0) + country.slice(1).toLowerCase()}
                            </p>
                            {active.map(s => <LegendRow key={s.stateId} s={s} />)}
                            {inactive.map(s => <LegendRow key={s.stateId} s={s} />)}
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
