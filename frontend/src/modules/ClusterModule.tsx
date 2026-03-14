import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { SidebarPortal } from '../components/Layout';
import { useCountries, useStatesGeo, useVariables, useObservationsRaw } from '../api/hooks';
import { YearRangeSlider } from '../components/shared/YearRangeSlider';
import { ResizeHandle } from '../components/shared/ResizeHandle';
import { GeographyTreeGroup } from '../components/Map/GeographyTreeGroup';
import { ClusterVariablePicker } from '../components/Cluster/ClusterVariablePicker';
import { AlgorithmPanel, type Algorithm } from '../components/Cluster/AlgorithmPanel';
import { ClusterMap } from '../components/Cluster/ClusterMap';
import { ClusterRadarChart } from '../components/Cluster/ClusterRadarChart';
import { PCAScatterChart } from '../components/Cluster/PCAScatterChart';
import { ClusterResultsTable } from '../components/Cluster/ClusterResultsTable';
import {
    averageObsByState,
    buildAndNormalizeVectors,
    runKMeans,
    runKMedoids,
    computePCA,
    computeOptimalK,
    type ClusterResult,
    type StateVector,
    type PCAPoint,
    type KMeansResult,
    type OptimalKPoint,
} from '../services/clusterService';
import type { VariableDict } from '../api/hooks';

// ─── Constants ────────────────────────────────────────────────────────────────

const GLOBAL_YEAR_MIN = 1983;
const GLOBAL_YEAR_MAX = 2024;

function deriveDataset(label: string | null | undefined): string {
    if (!label) return 'SEED';
    if (label === 'Democracy Indices') return 'SDI';
    if (label === 'Executive Elections') return 'SEED';
    if (label === 'Legislative Elections') return 'SLED_SNAPSHOT';
    if (label === 'Executive') return 'SED';
    return 'SEED';
}

// ─── Module ───────────────────────────────────────────────────────────────────

export function ClusterModule() {
    const { t, i18n } = useTranslation();
    const lang = i18n.language.slice(0, 2);

    // ── Selector state ──────────────────────────────────────────────────────
    const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
    const [yearMin, setYearMin] = useState(2010);
    const [yearMax, setYearMax] = useState(GLOBAL_YEAR_MAX);
    const [selectedStateIds, setSelectedStateIds] = useState<number[]>([]);
    const [expandedCountries, setExpandedCountries] = useState<number[]>([]);
    const [algorithm, setAlgorithm] = useState<Algorithm>('kmeans');
    const [k, setK] = useState(4);

    // ── Result state ────────────────────────────────────────────────────────
    const [result, setResult] = useState<ClusterResult | null>(null);
    const [stateVectors, setStateVectors] = useState<StateVector[]>([]);
    const [pcaPoints, setPcaPoints] = useState<PCAPoint[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [optimalKData, setOptimalKData] = useState<OptimalKPoint[] | null>(null);
    const [isFindingOptimal, setIsFindingOptimal] = useState(false);

    // ── Resize state ─────────────────────────────────────────────────────────
    const [chartWidth, setChartWidth] = useState(420);   // chart panel px width
    const [tableHeight, setTableHeight] = useState(256); // results table px height

    const onChartResize = useCallback((delta: number) => {
        setChartWidth(w => Math.max(200, Math.min(700, w - delta)));
    }, []);

    const onTableResize = useCallback((delta: number) => {
        setTableHeight(h => Math.max(100, Math.min(520, h - delta)));
    }, []);

    // ── Metadata ────────────────────────────────────────────────────────────
    const { data: countries } = useCountries();
    const { data: allStates } = useStatesGeo();
    const { data: allVariables } = useVariables();

    // Initialize: select all Mexico states by default
    useEffect(() => {
        if (!allStates || !countries || selectedStateIds.length > 0) return;
        const mexico = countries.find(c => c.name === 'MEXICO' || c.id === 3);
        if (mexico) {
            const ids = allStates.filter(s => s.country_id === mexico.id).map(s => s.id);
            setSelectedStateIds(ids);
            setExpandedCountries([mexico.id]);
        }
    }, [allStates, countries]);

    // ── Cluster-eligible variables (viewable_map + numeric/ordinal) ─────────
    const clusterVariables = useMemo<VariableDict[]>(() => {
        if (!allVariables) return [];
        return allVariables.filter(v =>
            v.viewable_map === 1 &&
            (v.type === 'continuous' || v.type === 'discrete' ||
             v.type === 'ordinal' || v.type === 'percentage')
        );
    }, [allVariables]);

    // ── Derive datasets needed for selected variables ─────────────────────
    const activeDataset = useMemo(() => {
        if (selectedVariables.length === 0) return 'SEED';
        const datasets = new Set(
            selectedVariables.map(varCode => {
                const cleanCode = varCode.replace(/_[12]$/, '');
                const meta = allVariables?.find(v => v.variable === cleanCode);
                return deriveDataset(meta?.dataset);
            })
        );
        return Array.from(datasets).join(',');
    }, [selectedVariables, allVariables]);

    // ── Fetch raw observations ───────────────────────────────────────────
    const canFetch = selectedVariables.length >= 2 && selectedStateIds.length > 0;
    const { data: rawRows = [], isFetching } = useObservationsRaw(
        activeDataset,
        yearMin,
        yearMax,
        canFetch,
    );

    // ── Lookup maps ──────────────────────────────────────────────────────
    const stateNames = useMemo(() => {
        const m: Record<number, string> = {};
        allStates?.forEach(s => { m[s.id] = s.name; });
        return m;
    }, [allStates]);

    const countryNames = useMemo(() => {
        const stateToCountry: Record<number, string> = {};
        allStates?.forEach(s => {
            const country = countries?.find(c => c.id === s.country_id);
            stateToCountry[s.id] = country?.name ?? '';
        });
        return stateToCountry;
    }, [allStates, countries]);

    const variableMeta = useMemo(() =>
        allVariables ?? [], [allVariables]);

    // ── Find optimal k ───────────────────────────────────────────────────
    const runOptimalK = () => {
        if (selectedVariables.length < 2 || selectedStateIds.length === 0 || rawRows.length === 0) return;
        setIsFindingOptimal(true);
        setTimeout(() => {
            try {
                const averaged = averageObsByState(rawRows, selectedVariables);
                const vectors = buildAndNormalizeVectors(
                    averaged, selectedStateIds, stateNames, countryNames, selectedVariables
                );
                setOptimalKData(computeOptimalK(vectors));
            } finally {
                setIsFindingOptimal(false);
            }
        }, 0);
    };

    // ── Run analysis ─────────────────────────────────────────────────────
    const runAnalysis = () => {
        if (selectedVariables.length < 2 || selectedStateIds.length === 0 || rawRows.length === 0) return;

        setIsRunning(true);
        setTimeout(() => {
            try {
                const averaged = averageObsByState(rawRows, selectedVariables);
                const vectors = buildAndNormalizeVectors(
                    averaged, selectedStateIds, stateNames, countryNames, selectedVariables
                );
                setStateVectors(vectors);

                let res: ClusterResult;
                if (algorithm === 'kmedoids') {
                    res = runKMedoids(vectors, k);
                } else {
                    res = runKMeans(vectors, k);
                }
                setResult(res);

                if (algorithm === 'kmedoids') {
                    setPcaPoints(computePCA(vectors));
                } else {
                    setPcaPoints([]);
                }
            } finally {
                setIsRunning(false);
            }
        }, 0);
    };

    // ── Derived display data ─────────────────────────────────────────────
    const assignments = result?.assignments ?? [];

    const kmeansResult = (result?.type === 'kmeans' || result?.type === 'kmedoids')
        ? result as KMeansResult : null;

    const clusterK = kmeansResult
        ? Math.max(...(kmeansResult.assignments.map(a => a.cluster ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].indexOf(a.cluster) + 1 : 0)), 0)
        : k;

    // ── Validation ───────────────────────────────────────────────────────
    const canRun = selectedVariables.length >= 2 && selectedStateIds.length > 0 && !isFetching && !isRunning;

    const validationMsg = selectedVariables.length < 2
        ? t('cluster.selectAtLeast2')
        : selectedStateIds.length === 0
            ? t('cluster.noGeography')
            : null;

    return (
        <div className="w-full h-full flex animate-in fade-in duration-500 ease-out fill-mode-forwards">
            <SidebarPortal>
                <div className="flex flex-col gap-5 p-6 pb-24 bg-spp-bgMuted">

                    {/* Variables */}
                    <ClusterVariablePicker
                        variables={clusterVariables}
                        selected={selectedVariables}
                        onToggle={varCode => {
                            setSelectedVariables(prev =>
                                prev.includes(varCode)
                                    ? prev.filter(v => v !== varCode)
                                    : [...prev, varCode]
                            );
                            setResult(null);
                            setOptimalKData(null);
                        }}
                        lang={lang}
                    />

                    {/* Year range */}
                    <div>
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                            <span>{t('map.year')}</span>
                            <span className="text-spp-purple font-black text-sm tabular-nums">
                                {yearMin} – {yearMax}
                            </span>
                        </div>
                        <YearRangeSlider
                            yearMin={yearMin}
                            yearMax={yearMax}
                            globalYearMin={GLOBAL_YEAR_MIN}
                            globalYearMax={GLOBAL_YEAR_MAX}
                            onYearMinChange={y => { setYearMin(y); setResult(null); }}
                            onYearMaxChange={y => { setYearMax(y); setResult(null); }}
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1 tabular-nums">
                            <span>{GLOBAL_YEAR_MIN}</span>
                            <span>{GLOBAL_YEAR_MAX}</span>
                        </div>
                    </div>

                    {/* Geography */}
                    <div>
                        <label className="block text-xs font-bold text-spp-gray uppercase tracking-wider mb-2">
                            {t('map.geography')}
                        </label>
                        <div className="bg-spp-bgLight border border-slate-200 rounded-lg overflow-hidden shadow-inner flex flex-col">
                            {countries?.map(country => (
                                <GeographyTreeGroup
                                    key={country.id}
                                    country={country}
                                    allStates={allStates || []}
                                    selectedStateIds={selectedStateIds}
                                    onToggleState={id => {
                                        setSelectedStateIds(prev =>
                                            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
                                        );
                                        setResult(null);
                                    }}
                                    onToggleCountry={(ids, force) => {
                                        setSelectedStateIds(prev =>
                                            force
                                                ? Array.from(new Set([...prev, ...ids]))
                                                : prev.filter(id => !ids.includes(id))
                                        );
                                        setResult(null);
                                    }}
                                    isExpanded={expandedCountries.includes(country.id)}
                                    onToggleExpand={() =>
                                        setExpandedCountries(prev =>
                                            prev.includes(country.id)
                                                ? prev.filter(id => id !== country.id)
                                                : [...prev, country.id]
                                        )
                                    }
                                />
                            ))}
                        </div>
                    </div>

                    {/* Algorithm */}
                    <AlgorithmPanel
                        algorithm={algorithm}
                        onAlgorithmChange={a => { setAlgorithm(a); setResult(null); setOptimalKData(null); }}
                        k={k}
                        onKChange={v => { setK(v); setResult(null); }}
                        canFindOptimal={canRun && rawRows.length > 0}
                        isFindingOptimal={isFindingOptimal}
                        onFindOptimal={runOptimalK}
                        optimalKData={optimalKData}
                    />

                    {/* Run button */}
                    <div>
                        {validationMsg && (
                            <p className="text-[11px] text-slate-400 mb-2">{validationMsg}</p>
                        )}
                        <button
                            onClick={runAnalysis}
                            disabled={!canRun}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${canRun
                                ? 'bg-brand-400 hover:bg-brand-500 text-spp-textDark shadow-sm'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            <Play size={14} fill="currentColor" />
                            {isRunning ? t('cluster.running') : t('cluster.runButton')}
                        </button>
                        {isFetching && (
                            <p className="text-xs text-brand-600 font-medium animate-pulse mt-2">
                                {t('map.fetchingData')}
                            </p>
                        )}
                    </div>
                </div>
            </SidebarPortal>

            {/* ── Main area ── */}
            <div className="w-full h-full flex flex-col overflow-hidden bg-spp-bgMuted">

                {/* Map + Chart row */}
                <div className="flex flex-row flex-1 min-h-0 overflow-hidden">

                    {/* Map */}
                    <div className="flex-1 min-h-0 relative overflow-hidden">
                        {allStates && countries ? (
                            <ClusterMap
                                geoData={allStates}
                                countries={countries}
                                selectedStateIds={selectedStateIds}
                                assignments={assignments}
                                clusterK={clusterK}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                                {t('map.fetchingData')}
                            </div>
                        )}
                    </div>

                    {/* Horizontal drag handle */}
                    <ResizeHandle direction="horizontal" onDelta={onChartResize} />

                    {/* Chart panel */}
                    <div
                        className="shrink-0 border-l border-slate-200 bg-spp-bgLight flex flex-col overflow-hidden"
                        style={{ width: chartWidth }}
                    >
                        {result === null ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 px-8 text-center">
                                <span className="text-3xl opacity-30">∿</span>
                                <p className="text-sm">{t('cluster.noData')}</p>
                            </div>
                        ) : kmeansResult && algorithm === 'kmedoids' ? (
                            <PCAScatterChart
                                points={pcaPoints}
                                assignments={assignments}
                                stateNames={stateNames}
                                medoidIds={kmeansResult.medoidIds}
                            />
                        ) : kmeansResult ? (
                            <ClusterRadarChart
                                centroids={kmeansResult.centroids}
                                variables={selectedVariables}
                                variableMeta={variableMeta}
                                lang={lang}
                                medoidIds={kmeansResult.medoidIds}
                                stateNames={stateNames}
                                algorithmType={kmeansResult.type}
                            />
                        ) : null}
                    </div>
                </div>

                {/* Results table */}
                {result && (
                    <>
                    <ResizeHandle direction="vertical" onDelta={onTableResize} />
                    <div
                        className="shrink-0 border-t border-slate-200 bg-spp-bgLight overflow-hidden"
                        style={{ height: tableHeight }}
                    >
                        <ClusterResultsTable
                            assignments={assignments}
                            stateVectors={stateVectors}
                            variables={selectedVariables}
                            variableMeta={variableMeta}
                            lang={lang}
                            medoidIds={kmeansResult?.medoidIds}
                        />
                    </div>
                    </>
                )}
            </div>
        </div>
    );
}
