import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { CLUSTER_COLORS, CLUSTER_LABELS, type PCAPoint, type ClusterAssignment } from '../../services/clusterService';

interface PCAScatterChartProps {
    points: PCAPoint[];
    assignments: ClusterAssignment[];
    stateNames: Record<number, string>;
    medoidIds?: number[];
}

interface PlotPoint {
    stateId: number;
    name: string;
    pc1: number;
    pc2: number;
    cluster: string | null;
    isMedoid: boolean;
}

const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isMedoid) {
        return (
            <g>
                <circle cx={cx} cy={cy} r={8} fill={props.fill} stroke="#ffffff" strokeWidth={2} />
                <circle cx={cx} cy={cy} r={11} fill="none" stroke={props.fill} strokeWidth={2} />
            </g>
        );
    }
    return <circle cx={cx} cy={cy} r={5} fill={props.fill} fillOpacity={0.8} stroke="#ffffff" strokeWidth={1} />;
};

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d: PlotPoint = payload[0].payload;
    return (
        <div className="bg-spp-bgLight border border-brand-100 rounded-xl shadow-sm px-3 py-2 text-xs">
            <p className="font-bold text-spp-textDark">{d.name}</p>
            {d.cluster && (
                <p className="text-spp-gray">
                    Cluster {d.cluster}{d.isMedoid ? ' ★' : ''}
                </p>
            )}
            <p className="text-slate-400 tabular-nums">PC1: {d.pc1.toFixed(3)}</p>
            <p className="text-slate-400 tabular-nums">PC2: {d.pc2.toFixed(3)}</p>
        </div>
    );
};

export function PCAScatterChart({ points, assignments, stateNames, medoidIds }: PCAScatterChartProps) {
    const { t } = useTranslation();

    const clusterMap = new Map<number, string | null>();
    assignments.forEach(a => clusterMap.set(a.stateId, a.cluster));

    const medoidSet = new Set(medoidIds ?? []);

    const plotData: PlotPoint[] = points.map(p => ({
        stateId: p.stateId,
        name: stateNames[p.stateId] ?? String(p.stateId),
        pc1: p.pc1,
        pc2: p.pc2,
        cluster: clusterMap.get(p.stateId) ?? null,
        isMedoid: medoidSet.has(p.stateId),
    }));

    // Group by cluster for separate <Scatter> elements (needed for legend)
    const usedLabels = [...new Set(plotData.map(p => p.cluster).filter(Boolean))] as string[];

    if (points.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                {t('cluster.noData')}
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            <p className="text-xs font-bold text-spp-gray uppercase tracking-wider px-4 pt-3 mb-1">
                {t('cluster.scatterTitle')}
                <span className="normal-case font-normal text-slate-400 ml-2">{t('cluster.scatterHint')}</span>
            </p>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                            type="number"
                            dataKey="pc1"
                            name="PC1"
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            label={{ value: 'PC1', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: '#94a3b8' }}
                        />
                        <YAxis
                            type="number"
                            dataKey="pc2"
                            name="PC2"
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            label={{ value: 'PC2', angle: -90, position: 'insideTopLeft', offset: 5, fontSize: 10, fill: '#94a3b8' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {usedLabels.map(label => {
                            const ci = CLUSTER_LABELS.indexOf(label);
                            const color = CLUSTER_COLORS[ci] ?? '#94a3b8';
                            const groupData = plotData.filter(p => p.cluster === label);
                            return (
                                <Scatter
                                    key={label}
                                    name={`${t('cluster.cluster')} ${label}`}
                                    data={groupData}
                                    fill={color}
                                    shape={<CustomDot />}
                                >
                                    {groupData.map(p => (
                                        <Cell key={p.stateId} fill={color} />
                                    ))}
                                </Scatter>
                            );
                        })}
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
