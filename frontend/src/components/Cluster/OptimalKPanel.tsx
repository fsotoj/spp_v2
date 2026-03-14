import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import type { OptimalKPoint } from '../../services/clusterService';

interface OptimalKPanelProps {
    data: OptimalKPoint[];
    onApply: (k: number) => void;
    currentK: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-spp-bgLight border border-brand-100 rounded-xl shadow-sm px-3 py-2 text-xs">
            <p className="font-bold text-spp-textDark mb-1">k = {label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{ color: p.color ?? p.fill }}>
                    {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
                </p>
            ))}
        </div>
    );
};

export function OptimalKPanel({ data, onApply, currentK }: OptimalKPanelProps) {
    const { t } = useTranslation();

    if (data.length === 0) return null;

    const bestSilhouette = data.reduce((best, d) => d.silhouette > best.silhouette ? d : best, data[0]);
    const maxWCSS = Math.max(...data.map(d => d.wcss));
    // Normalise WCSS to 0–1 for overlay
    const chartData = data.map(d => ({
        ...d,
        wcssNorm: maxWCSS > 0 ? d.wcss / maxWCSS : 0,
    }));

    return (
        <div className="mt-3 bg-spp-bgLight border border-slate-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-spp-bgMuted">
                <span className="text-[11px] font-bold text-spp-gray uppercase tracking-wider">
                    {t('cluster.optimalKTitle')}
                </span>
                <div className="flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-brand-500" />
                    <span className="text-[11px] font-black text-brand-600">
                        {t('cluster.suggestedK', { k: bestSilhouette.k })}
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="px-1 pt-2 pb-1" style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                            dataKey="k"
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            label={{ value: 'k', position: 'insideBottomRight', offset: -2, fontSize: 10, fill: '#94a3b8' }}
                        />
                        <YAxis
                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 1]}
                            tickCount={3}
                        />
                        <Tooltip content={<CustomTooltip />} />

                        {/* Elbow: WCSS normalised */}
                        <Line
                            type="monotone"
                            dataKey="wcssNorm"
                            name={t('cluster.wcss')}
                            stroke="#94a3b8"
                            strokeWidth={1.5}
                            dot={false}
                            strokeDasharray="4 2"
                        />

                        {/* Silhouette bars */}
                        <Bar
                            dataKey="silhouette"
                            name={t('cluster.silhouette')}
                            fill="#FFA92A"
                            fillOpacity={0.7}
                            radius={[3, 3, 0, 0]}
                            maxBarSize={24}
                        />

                        {/* Reference line at optimal k */}
                        <ReferenceLine
                            x={bestSilhouette.k}
                            stroke="#722464"
                            strokeWidth={1.5}
                            strokeDasharray="3 2"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Legend + action */}
            <div className="flex items-center justify-between px-3 pb-2.5 gap-2">
                <div className="flex items-center gap-3 text-[10px] text-spp-gray">
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-4 h-2 rounded-sm bg-brand-400 opacity-70" />
                        {t('cluster.silhouette')}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-4 border-t border-dashed border-slate-400" />
                        {t('cluster.wcss')}
                    </span>
                </div>
                <button
                    onClick={() => onApply(bestSilhouette.k)}
                    disabled={currentK === bestSilhouette.k}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${currentK === bestSilhouette.k
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : 'bg-spp-purple text-white hover:opacity-90'
                        }`}
                >
                    {currentK === bestSilhouette.k
                        ? t('cluster.kApplied')
                        : t('cluster.applyK', { k: bestSilhouette.k })}
                </button>
            </div>
        </div>
    );
}
