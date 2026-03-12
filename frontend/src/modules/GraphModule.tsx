import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SidebarPortal } from '../components/Layout';
import {
    useCountries, useStatesGeo, useVariables, useObservationsTimeSeries,
} from '../api/hooks';
import { GraphSidebar } from '../components/Graph/GraphSidebar';
import { GraphLegendPanel } from '../components/Graph/GraphLegendPanel';
import { LineChartPanel, buildColorMap } from '../components/Graph/LineChartPanel';
import type { ChartSeries } from '../components/Graph/LineChartPanel';

// ── Constants ─────────────────────────────────────────────────────────────────

const GLOBAL_YEAR_MIN = 1983;
const GLOBAL_YEAR_MAX = 2024;

// Default states to pre-select (matched by name)
const DEFAULT_STATE_NAMES = ['CAPITAL FEDERAL', 'DISTRITO FEDERAL', 'CDMX'];

// Map dataset label → API dataset string (mirrors MapModule logic)
function deriveDataset(datasetLabel: string | null | undefined): string {
    if (!datasetLabel) return 'SEED';
    if (datasetLabel === 'Democracy Indices') return 'SDI';
    if (datasetLabel === 'Executive Elections') return 'SEED';
    if (datasetLabel === 'Legislative Elections') return 'SLED_SNAPSHOT';
    if (datasetLabel === 'Executive') return 'SED';
    return 'SEED';
}

// ── Module ────────────────────────────────────────────────────────────────────

export function GraphModule() {
    const { t, i18n } = useTranslation();
    const lang = i18n.language.slice(0, 2);

    // ── Selector state ──
    const [variable, setVariable] = useState('perc_voter_sub_exe');
    const [selectedStateIds, setSelectedStateIds] = useState<number[]>([]);
    const [expandedCountries, setExpandedCountries] = useState<number[]>([]);
    const [yearMin, setYearMin] = useState(2000);
    const [yearMax, setYearMax] = useState(GLOBAL_YEAR_MAX);
    const [colorBy, setColorBy] = useState<'state' | 'country'>('country');
    const [forceYZero, setForceYZero] = useState(false);
    const [highlightedStateId, setHighlightedStateId] = useState<number | null>(null);
    const [soloStateId, setSoloStateId] = useState<number | null>(null);
    const [hoverYear, setHoverYear] = useState<number | null>(null);
    const [hoverValues, setHoverValues] = useState<Record<number, number | null>>({});
    const [pinnedYear, setPinnedYear] = useState<number | null>(null);
    const [pinnedValues, setPinnedValues] = useState<Record<number, number | null>>({});

    const displayYear = pinnedYear ?? hoverYear;
    const displayValues = pinnedYear != null ? pinnedValues : hoverValues;

    // ── Metadata ──
    const { data: countries } = useCountries();
    const { data: allStates } = useStatesGeo();
    const { data: allVariables } = useVariables();

    // Default: pre-select CAPITAL FEDERAL, DISTRITO FEDERAL, CDMX on first load
    useEffect(() => {
        if (!allStates || !countries || selectedStateIds.length > 0) return;
        const defaults = allStates.filter(s =>
            DEFAULT_STATE_NAMES.includes(s.name.toUpperCase())
        );
        if (defaults.length === 0) return;
        setSelectedStateIds(defaults.map(s => s.id));
    }, [allStates, countries]);

    // ── Variable tree (viewable_graph only) ──
    interface TreeGroup {
        dbName: string;
        displayName: string;
        vars: any[];
        subgroups?: TreeGroup[];
    }

    const graphVariables = useMemo(() => {
        if (!allVariables) return [];
        return allVariables.filter(v => v.viewable_graph === 1);
    }, [allVariables]);

    const groupedVariables = useMemo(() => {
        const lowerLabel = lang === 'es' ? 'Cámara Baja' : lang === 'de' ? 'Unterhaus' : 'Lower Chamber';
        const upperLabel = lang === 'es' ? 'Cámara Alta' : lang === 'de' ? 'Oberhaus' : 'Upper Chamber';

        const groups: Record<string, TreeGroup> = {};

        graphVariables.forEach(v => {
            const db = v.dataset;
            if (!db || db === 'Other' || db === 'Others') return;

            const displayDataset =
                lang === 'de' ? (v.dataset_de || db)
                    : lang === 'es' ? (v.dataset_es || db)
                        : db;

            if (db === 'Legislative Elections') {
                if (!groups[db]) {
                    groups[db] = {
                        dbName: db,
                        displayName: displayDataset,
                        vars: [],
                        subgroups: [
                            { dbName: lowerLabel, displayName: lowerLabel, vars: [] },
                            { dbName: upperLabel, displayName: upperLabel, vars: [] },
                        ],
                    };
                }
                groups[db].subgroups![0].vars.push({ ...v, variable: `${v.variable}_1` });
                groups[db].subgroups![1].vars.push({ ...v, variable: `${v.variable}_2` });
            } else {
                if (!groups[db]) {
                    groups[db] = { dbName: db, displayName: displayDataset, vars: [] };
                }
                groups[db].vars.push(v);
            }
        });

        return Object.keys(groups).sort().map(k => groups[k]);
    }, [graphVariables, lang]);

    // Ensure selected variable exists in the graph variable set; reset if not
    useEffect(() => {
        if (graphVariables.length === 0) return;
        const cleanVar = variable.replace(/_[12]$/, '');
        if (!graphVariables.find(v => v.variable === cleanVar)) {
            setVariable(graphVariables[0].variable);
        }
    }, [graphVariables, variable]);

    // ── Active variable metadata ──
    const activeVarMeta = useMemo(() => {
        const cleanVar = variable.replace(/_[12]$/, '');
        return allVariables?.find(v => v.variable === cleanVar) ?? null;
    }, [allVariables, variable]);

    const activeDataset = useMemo(() => deriveDataset(activeVarMeta?.dataset), [activeVarMeta]);

    const prettyName = useMemo(() => {
        if (!activeVarMeta) return variable;
        return lang === 'de'
            ? (activeVarMeta.pretty_name_de || activeVarMeta.pretty_name || variable)
            : lang === 'es'
                ? (activeVarMeta.pretty_name_es || activeVarMeta.pretty_name || variable)
                : (activeVarMeta.pretty_name || variable);
    }, [activeVarMeta, variable, lang]);

    // ── Data fetch ──
    const { data: tsRows = [], isFetching } = useObservationsTimeSeries(
        activeDataset,
        selectedStateIds,
        yearMin,
        yearMax,
    );

    // ── Series (one entry per selected state) ──
    const stateColorEntries = useMemo(() => {
        if (!allStates || !countries) return [];
        return selectedStateIds.map(id => {
            const state = allStates.find(s => s.id === id);
            const country = countries.find(c => c.id === state?.country_id);
            return {
                stateId: id,
                stateName: state?.name ?? String(id),
                countryName: country?.name ?? '',
            };
        });
    }, [selectedStateIds, allStates, countries]);

    const colorMap = useMemo(
        () => buildColorMap(stateColorEntries, colorBy),
        [stateColorEntries, colorBy],
    );

    const stateIdsWithData = useMemo(() => {
        const set = new Set(tsRows.map(r => r.state_id));
        return set;
    }, [tsRows]);

    const series: ChartSeries[] = useMemo(() =>
        stateColorEntries.map(e => ({
            stateId: e.stateId,
            stateName: e.stateName,
            countryName: e.countryName,
            color: colorMap[e.stateId] ?? '#94a3b8',
            hasData: stateIdsWithData.has(e.stateId),
        })),
        [stateColorEntries, colorMap, stateIdsWithData],
    );

    // ── Variable description (full sentence, mirrors MapModule) ──
    const varDescription = useMemo(() => {
        if (!activeVarMeta) return null;
        const label = lang === 'de'
            ? (activeVarMeta.description_for_ui_de || activeVarMeta.pretty_name_de || activeVarMeta.description_for_ui || activeVarMeta.pretty_name || variable)
            : lang === 'es'
                ? (activeVarMeta.description_for_ui_es || activeVarMeta.pretty_name_es || activeVarMeta.description_for_ui || activeVarMeta.pretty_name || variable)
                : (activeVarMeta.description_for_ui || activeVarMeta.pretty_name || variable);
        const dataset = activeVarMeta.dataset || '';
        let chamberText = '';
        if (activeVarMeta.dataset === 'Legislative Elections') {
            if (variable.endsWith('_1')) chamberText = ` (${t('map.lowerChamber')})`;
            else if (variable.endsWith('_2')) chamberText = ` (${t('map.upperChamber')})`;
        }
        const suffix = lang === 'es'
            ? `de la base de datos Subnational ${dataset}`
            : lang === 'de'
                ? `aus der Subnational ${dataset} Datenbank`
                : `from the Subnational ${dataset} database`;
        return `${t('map.youAreSeeing')} ${label}${chamberText}; ${suffix}`;
    }, [activeVarMeta, variable, lang, t]);

    // ── Year range constraints: clamp min ≤ max ──
    const handleYearMinChange = (y: number) => setYearMin(Math.min(y, yearMax));
    const handleYearMaxChange = (y: number) => setYearMax(Math.max(y, yearMin));

    return (
        <div className="w-full h-full flex animate-in fade-in duration-500 ease-out fill-mode-forwards">
            <SidebarPortal>
                <GraphSidebar
                    countries={countries}
                    allStates={allStates}
                    selectedStateIds={selectedStateIds}
                    onToggleState={(id) => {
                        setSelectedStateIds(prev =>
                            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
                        );
                        if (soloStateId === id) setSoloStateId(null);
                    }}
                    onToggleCountry={(ids, force) => {
                        if (force) {
                            setSelectedStateIds(prev => Array.from(new Set([...prev, ...ids])));
                        } else {
                            setSelectedStateIds(prev => prev.filter(id => !ids.includes(id)));
                        }
                    }}
                    expandedCountries={expandedCountries}
                    setExpandedCountries={setExpandedCountries}
                    groupedVariables={groupedVariables}
                    variable={variable}
                    onSelectVariable={setVariable}
                    lang={lang}
                    yearMin={yearMin}
                    yearMax={yearMax}
                    onYearMinChange={handleYearMinChange}
                    onYearMaxChange={handleYearMaxChange}
                    globalYearMin={GLOBAL_YEAR_MIN}
                    globalYearMax={GLOBAL_YEAR_MAX}
                    colorBy={colorBy}
                    onToggleColorBy={() => setColorBy(p => p === 'country' ? 'state' : 'country')}
                    forceYZero={forceYZero}
                    onToggleForceYZero={() => setForceYZero(p => !p)}
                    isFetching={isFetching}
                />
            </SidebarPortal>

            {/* ── Main area: chart + right legend panel ── */}
            <div className="w-full h-full flex flex-col md:flex-row overflow-hidden bg-spp-bgMuted">

                {/* Chart area */}
                <div className="flex-1 relative overflow-hidden min-w-0">
                    {selectedStateIds.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                            Select states from the sidebar to begin.
                        </div>
                    ) : (
                        <LineChartPanel
                            rows={tsRows}
                            variable={variable}
                            varType={activeVarMeta?.type ?? null}
                            series={series}
                            highlightedStateId={highlightedStateId}
                            soloStateId={soloStateId}
                            forceYZero={forceYZero}
                            prettyName={prettyName}
                            activeYear={displayYear}
                            varDescription={varDescription}
                            onActiveDataChange={(year, values) => {
                                setHoverYear(year);
                                setHoverValues(values);
                            }}
                            onChartClick={(year, values) => {
                                if (pinnedYear === year) {
                                    setPinnedYear(null);
                                    setPinnedValues({});
                                } else {
                                    setPinnedYear(year);
                                    setPinnedValues(values);
                                }
                            }}
                        />
                    )}
                </div>

                {/* Right legend panel — only shown when there are series */}
                {series.length > 0 && (
                    <aside className="w-full md:w-56 h-[35vh] md:h-full shrink-0 p-2 md:p-4 border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50 relative z-10 overflow-hidden flex flex-col">
                        <GraphLegendPanel
                            series={series}
                            highlightedStateId={highlightedStateId}
                            onHoverState={setHighlightedStateId}
                            soloStateId={soloStateId}
                            onSoloState={setSoloStateId}
                            colorBy={colorBy}
                            activeYear={displayYear}
                            activeValues={displayValues}
                            varType={activeVarMeta?.type ?? null}
                            isPinned={pinnedYear != null}
                            onUnpin={() => { setPinnedYear(null); setPinnedValues({}); }}
                        />
                    </aside>
                )}
            </div>
        </div>
    );
}
