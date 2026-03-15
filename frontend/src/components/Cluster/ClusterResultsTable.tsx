import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { CLUSTER_COLORS, CLUSTER_LABELS, type ClusterAssignment, type StateVector } from '../../services/clusterService';
import type { VariableDict } from '../../api/hooks';

interface ClusterResultsTableProps {
    assignments: ClusterAssignment[];
    stateVectors: StateVector[];
    variables: string[];
    variableMeta: VariableDict[];
    lang: string;
    medoidIds?: number[];
    rawClusterMeans?: number[][];
}

export function ClusterResultsTable({
    assignments,
    stateVectors,
    variables,
    variableMeta,
    lang,
    medoidIds,
    rawClusterMeans,
}: ClusterResultsTableProps) {
    const { t } = useTranslation();
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    // Start all clusters collapsed whenever a new result comes in
    useEffect(() => {
        const labels = new Set(
            assignments.map(a => a.cluster).filter(Boolean) as string[]
        );
        setCollapsed(labels);
    }, [assignments]);

    const toggleCluster = (label: string) =>
        setCollapsed(prev => {
            const next = new Set(prev);
            next.has(label) ? next.delete(label) : next.add(label);
            return next;
        });

    const vectorMap = useMemo(() => {
        const m = new Map<number, StateVector>();
        stateVectors.forEach(v => m.set(v.stateId, v));
        return m;
    }, [stateVectors]);

    const medoidSet = new Set(medoidIds ?? []);

    const getVarLabel = (v: string) => {
        const meta = variableMeta.find(m => m.variable === v);
        if (!meta) return v;
        return lang === 'de' ? (meta.pretty_name_de || meta.pretty_name || v)
            : lang === 'es' ? (meta.pretty_name_es || meta.pretty_name || v)
                : lang === 'pt' ? (meta.pretty_name_pt || meta.pretty_name || v)
                    : (meta.pretty_name || v);
    };

    const grouped = useMemo(() => {
        const groups: Record<string, ClusterAssignment[]> = {};
        const excluded: ClusterAssignment[] = [];
        assignments.forEach(a => {
            if (a.cluster === null) { excluded.push(a); return; }
            if (!groups[a.cluster]) groups[a.cluster] = [];
            groups[a.cluster].push(a);
        });
        return { groups, excluded };
    }, [assignments]);

    const handleExport = () => {
        const header = ['State', 'Country', 'Cluster', ...variables];
        const rows = assignments.map(a => {
            const sv = vectorMap.get(a.stateId);
            return [
                sv?.stateName ?? a.stateId,
                sv?.countryName ?? '',
                a.cluster ?? 'excluded',
                ...variables.map((_v, vi) => sv?.rawMeans[vi] ?? ''),
            ].join(',');
        });
        const csv = [header.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cluster_results.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    if (assignments.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm px-4">
                {t('cluster.noData')}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 shrink-0">
                <span className="text-xs font-bold text-spp-gray uppercase tracking-wider">
                    {t('cluster.results')}
                </span>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-spp-gray hover:text-spp-textDark transition-colors"
                >
                    <Download size={13} />
                    {t('cluster.exportCsv')}
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-xs table-auto">
                    <thead className="sticky top-0 bg-spp-bgMuted z-10">
                        <tr>
                            <th className="text-left px-3 py-2 text-spp-gray font-bold uppercase tracking-wider border-b border-slate-200">
                                {t('cluster.cluster')}
                            </th>
                            <th className="text-left px-3 py-2 text-spp-gray font-bold uppercase tracking-wider border-b border-slate-200">
                                {t('popup.state')}
                            </th>
                            {variables.map(v => (
                                <th key={v} className="text-right px-3 py-2 text-spp-gray font-bold uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">
                                    {getVarLabel(v)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {CLUSTER_LABELS.filter(l => grouped.groups[l]).map(label => {
                            const ci = CLUSTER_LABELS.indexOf(label);
                            const color = CLUSTER_COLORS[ci];
                            const isCollapsed = collapsed.has(label);
                            const count = grouped.groups[label].length;

                            const clusterLabelCell = (rowSpan?: number) => (
                                <td
                                    className="px-3 py-1.5 font-black align-top cursor-pointer select-none"
                                    rowSpan={rowSpan}
                                    onClick={() => toggleCluster(label)}
                                    title={isCollapsed ? t('cluster.expandCluster') : t('cluster.collapseCluster')}
                                    style={{ color, borderLeft: `3px solid ${color}` }}
                                >
                                    <span className="flex items-center gap-1">
                                        {label}
                                        <span className="text-[9px] font-normal opacity-50">{isCollapsed ? '▶' : '▼'}</span>
                                    </span>
                                    {rawClusterMeans?.[ci] && (
                                        <div className="mt-1.5 space-y-0.5">
                                            {variables.map((v, vi) => {
                                                const lbl = getVarLabel(v);
                                                const short = lbl.length > 14 ? lbl.slice(0, 13) + '…' : lbl;
                                                return (
                                                    <div key={vi} className="text-[9px] font-normal leading-tight">
                                                        <span className="text-slate-300">{short}: </span>
                                                        <span className="text-slate-400 tabular-nums">
                                                            {!isNaN(rawClusterMeans[ci][vi])
                                                                ? rawClusterMeans[ci][vi].toFixed(2)
                                                                : '–'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </td>
                            );

                            if (isCollapsed) {
                                return (
                                    <tr key={`${label}-collapsed`} className="border-b border-slate-200 hover:bg-brand-50/30 transition-colors">
                                        {clusterLabelCell()}
                                        <td colSpan={1 + variables.length} className="px-3 py-1.5 text-[11px] text-slate-400 italic">
                                            {count} {t('cluster.statesCollapsed')}
                                        </td>
                                    </tr>
                                );
                            }

                            return grouped.groups[label].map((a, ri) => {
                                const sv = vectorMap.get(a.stateId);
                                const isMedoid = medoidSet.has(a.stateId);
                                return (
                                    <tr key={a.stateId} className="border-b border-slate-100 hover:bg-brand-50/30 transition-colors">
                                        {ri === 0 ? clusterLabelCell(count) : null}
                                        <td className="px-3 py-1.5 text-spp-textDark font-medium">
                                            {sv?.stateName ?? a.stateId}
                                            {isMedoid && (
                                                <span className="ml-1 text-[9px] font-black text-spp-gray uppercase">★</span>
                                            )}
                                            <span className="block text-[10px] text-slate-400">{sv?.countryName}</span>
                                        </td>
                                        {variables.map((v, vi) => (
                                            <td key={v} className="px-3 py-1.5 text-right text-spp-gray tabular-nums">
                                                {sv?.rawMeans[vi] != null
                                                    ? Number(sv.rawMeans[vi]).toFixed(2)
                                                    : '–'}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            });
                        })}
                        {grouped.excluded.length > 0 && (
                            <>
                                <tr className="border-b border-slate-200">
                                    <td colSpan={2 + variables.length} className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                                        {t('cluster.excludedStates')} ({grouped.excluded.length})
                                    </td>
                                </tr>
                                {grouped.excluded.map(a => {
                                    const sv = vectorMap.get(a.stateId);
                                    return (
                                        <tr key={a.stateId} className="border-b border-slate-100 opacity-50">
                                            <td className="px-3 py-1.5 text-slate-400">–</td>
                                            <td className="px-3 py-1.5 text-slate-400">
                                                {sv?.stateName ?? a.stateId}
                                                <span className="block text-[10px]">{sv?.countryName}</span>
                                            </td>
                                            {variables.map((_, vi) => (
                                                <td key={vi} className="px-3 py-1.5 text-right text-slate-300">–</td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
