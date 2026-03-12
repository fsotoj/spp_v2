import { useMemo } from 'react';
import { X, BarChart3, ListFilter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TYPE_KEYS = ['binary', 'gender', 'chamber', 'system', 'renewal', 'ordinal'];

interface SelectionEntry {
    id: number;
    stateName: string;
    val: any;
}

interface NumericEntry extends SelectionEntry {
    num: number;
}

interface StatsNumeric {
    type: 'numeric';
    withData: SelectionEntry[];
    withoutData: SelectionEntry[];
    numVals: NumericEntry[];
    avg?: number;
    minEntry?: NumericEntry;
    maxEntry?: NumericEntry;
}

interface StatsCategorical {
    type: 'categorical' | 'special';
    withData: SelectionEntry[];
    withoutData: SelectionEntry[];
    mode?: [string, number];
}

type Stats = StatsNumeric | StatsCategorical;

interface MapSelectionPanelProps {
    selectionStateIds: number[];
    obsData: Record<number, any>;
    variable: string;
    vType: string;
    activeVarMeta: any;
    year: number;
    allStates: { id: number; name: string }[];
    prettyName: string | null;
    onClear: () => void;
    onFilterToSelection?: () => void;
}

export function MapSelectionPanel({
    selectionStateIds,
    obsData,
    variable,
    vType,
    activeVarMeta,
    year,
    allStates,
    prettyName,
    onClear,
    onFilterToSelection,
}: MapSelectionPanelProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const TYPE_MAPS: Record<string, Record<string, string>> = {
        binary: { '0': t('popup.no'), '1': t('popup.yes') },
        gender: { '0': t('popup.male'), '1': t('popup.female'), '2': t('popup.other') },
        chamber: { '1': t('popup.unicameral'), '2': t('popup.bicameral') },
        system: {
            '1': t('popup.proportionalRepresentation'),
            '2': t('popup.simpleMajority'),
            '3': t('popup.mixedPRMajority'),
            '4': t('popup.mixedPRDistricts'),
        },
        renewal: { '1': t('popup.staggeredEvery2Years'), '2': t('popup.fullRenewal') },
        ordinal: { '1': t('popup.left'), '2': t('popup.centerLeft'), '3': t('popup.centerRight'), '4': t('popup.right') },
    };

    const cleanVar = variable.replace(/_[12]$/, '');
    const isNumericType = ['continuous', 'discrete', 'percentage'].includes(vType);
    const isSpecialType = TYPE_KEYS.includes(vType);
    const isGraphable = activeVarMeta?.viewable_graph === 1;

    const stats: Stats = useMemo(() => {
        const entries: SelectionEntry[] = selectionStateIds.map(id => ({
            id,
            stateName: allStates.find(s => s.id === id)?.name ?? String(id),
            val: obsData[id]?.[variable] ?? null,
        }));

        const withData = entries.filter(e => e.val != null && e.val !== '');
        const withoutData = entries.filter(e => e.val == null || e.val === '');

        if (isNumericType || isSpecialType) {
            const numVals: NumericEntry[] = withData
                .map(e => ({ ...e, num: Number(e.val) }))
                .filter(e => !isNaN(e.num));

            if (numVals.length === 0) return { type: 'numeric', withData, withoutData, numVals: [] };

            const avg = numVals.reduce((a, b) => a + b.num, 0) / numVals.length;
            const minEntry = numVals.reduce((a, b) => b.num < a.num ? b : a);
            const maxEntry = numVals.reduce((a, b) => b.num > a.num ? b : a);

            return { type: 'numeric', withData, withoutData, numVals, avg, minEntry, maxEntry };
        }

        const freq: Record<string, number> = {};
        for (const e of withData) {
            const v = String(e.val);
            freq[v] = (freq[v] || 0) + 1;
        }
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        const type = isSpecialType ? 'special' : 'categorical';
        return { type, withData, withoutData, mode: sorted[0] as [string, number] | undefined };
    }, [selectionStateIds, obsData, cleanVar, isNumericType, isSpecialType, allStates]);

    const formatVal = (v: number) => {
        if (vType === 'percentage') return `${v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
        if (vType === 'continuous') return v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
        return Math.round(v).toLocaleString();
    };

    const toTitleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

    const hasStats = stats.type === 'numeric'
        ? (stats as StatsNumeric).numVals.length > 0
        : !!(stats as StatsCategorical).mode;

    return (
        <div className="w-full bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/50 font-sans text-slate-700 overflow-hidden">

            {/* Header */}
            <div className="popup-header px-4 pt-3 pb-2">
                <span className="text-xs font-black uppercase text-brand-600 tracking-tight">
                    {selectionStateIds.length} {t('selection.statesSelected')}
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 tabular-nums">{year}</span>
                    <button
                        onClick={onClear}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        title={t('selection.clearSelection')}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Variable label */}
            <div className="px-4 pb-2">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">
                    {prettyName || variable}
                </p>
            </div>

            {/* Stats body */}
            <div className="px-4 pb-3 space-y-2">

                {stats.type === 'numeric' && (stats as StatsNumeric).numVals.length > 0 && (() => {
                    const s = stats as StatsNumeric;
                    return (
                        <>
                            <div className="flex justify-between items-center bg-brand-50 rounded-lg px-3 py-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('selection.average')}</span>
                                <span className="text-sm font-black text-brand-600 tabular-nums">{formatVal(s.avg!)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('selection.max')}</p>
                                    <p className="text-xs font-black text-slate-700 tabular-nums">{formatVal(s.maxEntry!.num)}</p>
                                    <p className="text-[9px] text-slate-400 truncate" title={s.maxEntry!.stateName}>{toTitleCase(s.maxEntry!.stateName)}</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('selection.min')}</p>
                                    <p className="text-xs font-black text-slate-700 tabular-nums">{formatVal(s.minEntry!.num)}</p>
                                    <p className="text-[9px] text-slate-400 truncate" title={s.minEntry!.stateName}>{toTitleCase(s.minEntry!.stateName)}</p>
                                </div>
                            </div>
                        </>
                    );
                })()}

                {(stats.type === 'categorical' || stats.type === 'special') && (stats as StatsCategorical).mode && (() => {
                    const s = stats as StatsCategorical;
                    const modeKey = s.mode![0];
                    const modeCount = s.mode![1];
                    const modeLabel = stats.type === 'special' && TYPE_MAPS[vType]
                        ? (TYPE_MAPS[vType][modeKey] ?? modeKey)
                        : modeKey;
                    return (
                        <div className="flex justify-between items-center bg-brand-50 rounded-lg px-3 py-2 gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">{t('selection.mode')}</span>
                            <span className="text-xs font-black text-brand-600 text-right">
                                {modeLabel}
                                <span className="text-[10px] font-medium text-slate-400 ml-1">({modeCount})</span>
                            </span>
                        </div>
                    );
                })()}

                {!hasStats && (
                    <p className="text-[10px] text-slate-400 italic text-center py-1">{t('popup.noActiveData')}</p>
                )}

                {stats.withoutData.length > 0 && hasStats && (
                    <p className="text-[9px] text-slate-300">
                        {stats.withoutData.length} {t('selection.noDataStates')}
                    </p>
                )}
            </div>

            {/* Action buttons */}
            <div className="px-4 pb-4 flex flex-col gap-2">
                {onFilterToSelection && (
                    <button
                        className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all duration-200 active:scale-95"
                        onClick={onFilterToSelection}
                        title={t('selection.filterToSelection')}
                    >
                        <ListFilter size={14} />
                        {t('selection.filterToSelection')}
                    </button>
                )}
                {isGraphable && hasStats && (
                    <button
                        className="w-full flex items-center justify-center gap-2 py-2 bg-spp-orange text-white rounded-lg text-xs font-bold hover:bg-spp-purple hover:shadow-md transition-all duration-300 transform active:scale-95"
                        onClick={() => {
                            const ids = selectionStateIds.join(',');
                            navigate(`/graph?stateId=${ids}&variable=${cleanVar}&year=${year}`);
                        }}
                    >
                        <BarChart3 size={14} />
                        {t('selection.openInGraph')}
                    </button>
                )}
            </div>
        </div>
    );
}
