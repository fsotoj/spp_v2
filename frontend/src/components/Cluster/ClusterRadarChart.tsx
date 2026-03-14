import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend,
    ResponsiveContainer, Tooltip,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { CLUSTER_COLORS, CLUSTER_LABELS } from '../../services/clusterService';
import type { VariableDict } from '../../api/hooks';

interface ClusterRadarChartProps {
    centroids: number[][];
    variables: string[];
    variableMeta: VariableDict[];
    lang: string;
    medoidIds?: number[];
    stateNames?: Record<number, string>;
    algorithmType: 'kmeans' | 'kmedoids';
}

export function ClusterRadarChart({
    centroids,
    variables,
    variableMeta,
    lang,
    medoidIds,
    stateNames,
    algorithmType,
}: ClusterRadarChartProps) {
    const { t } = useTranslation();

    const getLabel = (variable: string) => {
        const meta = variableMeta.find(v => v.variable === variable);
        if (!meta) return variable;
        return lang === 'de' ? (meta.pretty_name_de || meta.pretty_name || variable)
            : lang === 'es' ? (meta.pretty_name_es || meta.pretty_name || variable)
                : lang === 'pt' ? (meta.pretty_name_pt || meta.pretty_name || variable)
                    : (meta.pretty_name || variable);
    };

    // Recharts RadarChart needs data where each entry = one axis (variable),
    // with a key per cluster
    const data = variables.map((variable, vi) => {
        const entry: Record<string, any> = {
            variable: getLabel(variable),
        };
        centroids.forEach((centroid, ci) => {
            entry[CLUSTER_LABELS[ci]] = centroid[vi];
        });
        return entry;
    });

    if (centroids.length === 0 || variables.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                {t('cluster.noData')}
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            <p className="text-xs font-bold text-spp-gray uppercase tracking-wider px-4 pt-3">
                {t('cluster.radarTitle')}
                {algorithmType === 'kmedoids' && medoidIds && stateNames && (
                    <span className="normal-case font-normal ml-2 text-slate-400">
                        {t('cluster.medoidHint')}
                    </span>
                )}
            </p>
            {algorithmType === 'kmedoids' && medoidIds && stateNames && (
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 px-4 pb-1">
                    {medoidIds.map((id, ci) => (
                        <span key={id} className="text-[10px]" style={{ color: CLUSTER_COLORS[ci] }}>
                            <strong>{CLUSTER_LABELS[ci]}:</strong> {stateNames[id] ?? id}
                        </span>
                    ))}
                </div>
            )}
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis
                            dataKey="variable"
                            tick={{ fontSize: 10, fill: '#4D4D4D' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--color-spp-bgLight, #fff)',
                                border: '1px solid #FFA92A33',
                                borderRadius: 12,
                                fontSize: 12,
                            }}
                            formatter={(value: number) => value.toFixed(3)}
                        />
                        {centroids.map((_, ci) => (
                            <Radar
                                key={CLUSTER_LABELS[ci]}
                                name={`${t('cluster.cluster')} ${CLUSTER_LABELS[ci]}`}
                                dataKey={CLUSTER_LABELS[ci]}
                                stroke={CLUSTER_COLORS[ci]}
                                fill={CLUSTER_COLORS[ci]}
                                fillOpacity={0.15}
                                strokeWidth={2}
                            />
                        ))}
                        <Legend
                            wrapperStyle={{ fontSize: 11 }}
                            formatter={(value) => value}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
