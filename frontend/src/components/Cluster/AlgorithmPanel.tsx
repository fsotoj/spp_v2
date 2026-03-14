import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { OptimalKPanel } from './OptimalKPanel';
import type { OptimalKPoint } from '../../services/clusterService';

export type Algorithm = 'kmeans' | 'kmedoids';

interface AlgorithmPanelProps {
    algorithm: Algorithm;
    onAlgorithmChange: (a: Algorithm) => void;
    k: number;
    onKChange: (k: number) => void;
    canFindOptimal: boolean;
    isFindingOptimal: boolean;
    onFindOptimal: () => void;
    optimalKData: OptimalKPoint[] | null;
}

const ALGORITHMS: { value: Algorithm; labelKey: string; descKey: string }[] = [
    { value: 'kmeans', labelKey: 'cluster.kmeans', descKey: 'cluster.kmeansDesc' },
    { value: 'kmedoids', labelKey: 'cluster.kmedoids', descKey: 'cluster.kmedoidsDesc' },
];

export function AlgorithmPanel({
    algorithm,
    onAlgorithmChange,
    k,
    onKChange,
    canFindOptimal,
    isFindingOptimal,
    onFindOptimal,
    optimalKData,
}: AlgorithmPanelProps) {
    const { t } = useTranslation();

    return (
        <div>
            <label className="block text-xs font-bold text-spp-gray uppercase tracking-wider mb-2">
                {t('cluster.algorithm')}
            </label>

            <div className="flex flex-col gap-1.5 mb-3">
                {ALGORITHMS.map(a => (
                    <button
                        key={a.value}
                        onClick={() => onAlgorithmChange(a.value)}
                        className={`flex flex-col text-left px-3 py-2 rounded-xl border-2 transition-all ${algorithm === a.value
                            ? 'border-brand-400 bg-brand-50 text-brand-700'
                            : 'border-slate-200 bg-spp-bgLight text-spp-gray hover:border-slate-300 hover:bg-slate-50'
                            }`}
                    >
                        <span className="text-[11px] font-bold uppercase tracking-wider">{t(a.labelKey)}</span>
                        <span className="text-[10px] mt-0.5 leading-tight opacity-75">{t(a.descKey)}</span>
                    </button>
                ))}
            </div>

            <div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <span>{t('cluster.kParam')}</span>
                    <span className="text-brand-600 font-black text-sm tabular-nums">{k}</span>
                </div>
                <input
                    type="range"
                    min={2}
                    max={8}
                    value={k}
                    onChange={e => onKChange(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 focus:outline-none"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 tabular-nums">
                    <span>2</span>
                    <span>8</span>
                </div>
            </div>

            <button
                onClick={onFindOptimal}
                disabled={!canFindOptimal || isFindingOptimal}
                className={`mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-all ${canFindOptimal && !isFindingOptimal
                    ? 'border-spp-purple text-spp-purple hover:bg-spp-purple hover:text-white'
                    : 'border-slate-200 text-slate-300 cursor-not-allowed'
                    }`}
            >
                <Sparkles size={12} />
                {isFindingOptimal ? t('cluster.findingOptimal') : t('cluster.findOptimalK')}
            </button>

            {optimalKData && optimalKData.length > 0 && (
                <OptimalKPanel
                    data={optimalKData}
                    onApply={onKChange}
                    currentK={k}
                />
            )}
        </div>
    );
}
