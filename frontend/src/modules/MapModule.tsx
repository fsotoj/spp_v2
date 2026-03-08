import { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Play, Pause, Camera, BarChart3 } from 'lucide-react';
import { useStatesGeo, useVariables, usePartyColors, useObservations, useCountries } from '../api/hooks';
import { toPng } from 'html-to-image';
import { SidebarPortal } from '../components/Layout';
import { useTranslation } from 'react-i18next';

import { VariableTreeGroup } from '../components/Map/VariableTreeGroup';
import { GeographyTreeGroup } from '../components/Map/GeographyTreeGroup';
import { VariableDescriptionOverlay } from '../components/Map/VariableDescriptionOverlay';
import { MapBoundsController } from '../components/Map/MapBoundsController';
import { MapGeoJSONLayer } from '../components/Map/MapGeoJSONLayer';

/**
 * @module MapModule
 * Provides a comprehensive subnational data visualization dashboard.
 * Features include:
 * - Hierarchical variable and geography selection.
 * - Temporal animation (Play/Pause) for year-based data.
 * - Dynamic choropleth mapping with Leaflet.
 * - Interactive legend with category-based filtering.
 * - Auto-scaling and auto-centering based on geography selection.
 */

// ── Components ──────────────────────────────────────────────────────────────

/**
 * Main dashboard container component.
 * Manages global state for variables, geography, and time.
 */
export function MapModule() {
    const { t, i18n } = useTranslation();
    const lang = i18n.language.slice(0, 2);
    const [dataset, setDataset] = useState('SEED');
    const [variable, setVariable] = useState('perc_voter_sub_exe');
    const [year, setYear] = useState(2015);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedStateIds, setSelectedStateIds] = useState<number[]>([]);
    const [expandedCountries, setExpandedCountries] = useState<number[]>([]);
    const dashboardRef = useRef<HTMLDivElement>(null);

    /**
     * Temporal playback animation effect.
     * Increments the year state every second when isPlaying is true.
     * Loops back to 1983 after reaching 2024.
     */
    useEffect(() => {
        let interval: any;
        if (isPlaying) {
            interval = setInterval(() => {
                setYear(prev => {
                    if (prev >= 2024) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying]);

    // Fetch Metadata
    const { data: geoData } = useStatesGeo();
    const { data: allVariables } = useVariables();
    const { data: partyColors } = usePartyColors();
    const { data: countries } = useCountries();

    // Initialize with Mexico states once geography is loaded
    useEffect(() => {
        if (geoData && selectedStateIds.length === 0) {
            // Default to Mexico (country_id 3)
            setSelectedStateIds(geoData.filter(s => s.country_id === 3).map(s => s.id));
        }
    }, [geoData]);

    const mapVariables = useMemo(() => {
        if (!allVariables) return [];
        return allVariables.filter(v => v.viewable_map === 1);
    }, [allVariables]);

    interface TreeGroup {
        dbName: string;
        displayName: string;
        vars: any[];
        subgroups?: TreeGroup[];
    }

    // Group the valid variables by database (dataset)
    const groupedVariables = useMemo(() => {
        const groups: Record<string, TreeGroup> = {};
        mapVariables.forEach(v => {
            const db = v.dataset;
            if (!db || db === 'Other' || db === 'Others') return;

            const pickDataset = (v: any) =>
                lang === 'de' ? (v.dataset_de || db)
                : lang === 'es' ? (v.dataset_es || db)
                : db;

            if (db === 'Legislative Elections') {
                if (!groups[db]) {
                    groups[db] = {
                        dbName: db, displayName: pickDataset(v), vars: [], subgroups: [
                            { dbName: t('map.lowerChamber'), displayName: t('map.lowerChamber'), vars: [] },
                            { dbName: t('map.upperChamber'), displayName: t('map.upperChamber'), vars: [] }
                        ]
                    };
                }
                groups[db].subgroups![0].vars.push({ ...v, variable: `${v.variable}_1` });
                groups[db].subgroups![1].vars.push({ ...v, variable: `${v.variable}_2` });
            } else {
                if (!groups[db]) {
                    groups[db] = { dbName: db, displayName: pickDataset(v), vars: [] };
                }
                groups[db].vars.push(v);
            }
        });

        const sortedGroups: TreeGroup[] = [];
        Object.keys(groups).sort().forEach(k => { sortedGroups.push(groups[k]); });
        return sortedGroups;
    }, [mapVariables, t, lang]);

    const activeVarMeta = useMemo(() => {
        const cleanVar = variable.replace(/_[12]$/, '');
        return allVariables?.find(v => v.variable === cleanVar);
    }, [allVariables, variable]);

    /**
     * Variable Description Overlay (mimics R server logic)
     */
    const variableDescription = useMemo(() => {
        if (!activeVarMeta) return null;

        let chamberText = "";
        if (activeVarMeta.dataset === "Legislative Elections") {
            if (variable.endsWith('_1')) chamberText = ` (${t('map.lowerChamber')})`;
            else if (variable.endsWith('_2')) chamberText = ` (${t('map.upperChamber')})`;
        }

        const label = lang === 'de'
            ? (activeVarMeta.description_for_ui_de || activeVarMeta.pretty_name_de || activeVarMeta.description_for_ui || activeVarMeta.pretty_name || variable)
            : lang === 'es'
            ? (activeVarMeta.description_for_ui_es || activeVarMeta.pretty_name_es || activeVarMeta.description_for_ui || activeVarMeta.pretty_name || variable)
            : (activeVarMeta.description_for_ui || activeVarMeta.pretty_name || variable);
        const datasetLabel = lang === 'de'
            ? (activeVarMeta.dataset_de || activeVarMeta.dataset || '')
            : lang === 'es'
            ? (activeVarMeta.dataset_es || activeVarMeta.dataset || '')
            : (activeVarMeta.dataset || '');
        const addIndices = lang === 'de'
            ? (activeVarMeta.add_indices_de || activeVarMeta.add_indices)
            : lang === 'es'
            ? (activeVarMeta.add_indices_es || activeVarMeta.add_indices)
            : activeVarMeta.add_indices;

        return (
            <VariableDescriptionOverlay
                label={label}
                dataset={datasetLabel}
                chamberText={chamberText}
                addIndices={addIndices}
            />
        );
    }, [activeVarMeta, variable, lang]);

    const activeDataset = useMemo(() => {
        if (!activeVarMeta) return dataset;
        const db = activeVarMeta.dataset;
        const ds = (db === 'Democracy Indices') ? 'SDI' :
            (db === 'Executive Elections') ? 'SEED' :
                (db === 'Legislative Elections') ? 'SLED_SNAPSHOT' :
                    (db === 'Executive') ? 'SED' : dataset;

        const combined = Array.from(new Set([ds, 'SED', 'SEED', 'SLED_SNAPSHOT'])).join(',');
        console.log(`[DatasetDebug] Variable: ${variable} -> Requesting Combined Datasets: ${combined}`);
        return combined;
    }, [activeVarMeta, variable, dataset]);

    useEffect(() => {
        const cleanVar = variable.replace(/_[12]$/, '');
        if (mapVariables.length > 0 && !mapVariables.find(v => v.variable === cleanVar)) {
            setVariable(mapVariables[0].variable);
            setDataset(activeDataset);
        }
    }, [mapVariables, variable, activeDataset]);

    const { data: obsData, isFetching: isFetchingObs } = useObservations(activeDataset, year, year);

    /**
     * Optimizes GeoJSON rendering by pre-parsing geometry strings into objects.
     * This prevents expensive JSON.parse calls on every animation frame/year change.
     */
    const parsedGeoJSON = useMemo(() => {
        if (!geoData) return [];
        return geoData.map(state => {
            try {
                return {
                    id: state.id,
                    name: state.name,
                    geometry: JSON.parse(state.geometry)
                };
            } catch (e) {
                console.error('[MapModule] Error parsing geometry for state:', state.name, e);
                return null;
            }
        }).filter(v => v !== null);
    }, [geoData]);

    const mergedGeoJSON = useMemo(() => {
        if (parsedGeoJSON.length === 0 || !obsData || !activeVarMeta) return null;

        return parsedGeoJSON.map((state: any) => {
            if (!selectedStateIds.includes(state.id)) return null;

            const props: Record<string, any> = { name: state.name, state_id: state.id };
            if (obsData[state.id]) {
                Object.assign(props, obsData[state.id]);
            }

            return {
                type: 'Feature',
                geometry: state.geometry,
                properties: props,
            };
        }).filter((f: any) => f !== null);
    }, [parsedGeoJSON, obsData, activeVarMeta, variable, activeDataset, selectedStateIds]);

    return (
        <div ref={dashboardRef} className="relative w-full h-full flex overflow-hidden">
            <SidebarPortal>
                <div className="flex flex-col gap-6 p-6 pb-20 bg-spp-bgMuted">
                    <div>
                        <label className="block text-xs font-bold text-spp-gray uppercase tracking-wider mb-2">{t('map.variables')}</label>
                        <div className="bg-spp-bgLight border border-slate-200 rounded-lg text-sm overflow-hidden flex flex-col shadow-inner">
                            {groupedVariables.map((group) => (
                                <VariableTreeGroup
                                    key={group.dbName}
                                    group={group}
                                    activeVariable={variable}
                                    onSelect={(v) => setVariable(v)}
                                    lang={lang}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            <div className="flex items-center gap-2">
                                <span>{t('map.year')}</span>
                                <button
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    className={`flex items-center justify-center p-1 rounded-full transition-all ${isPlaying ? 'bg-brand-100 text-brand-600 shadow-sm' : 'hover:bg-slate-100 text-slate-400'}`}
                                    title={isPlaying ? t('map.pauseAnimation') : t('map.playAnimation')}
                                >
                                    {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                </button>
                            </div>
                            <span className="text-brand-600 font-black text-sm tabular-nums">{year}</span>
                        </div>
                        <input
                            type="range"
                            min="1983"
                            max="2024"
                            value={year}
                            onChange={e => setYear(Number(e.target.value))}
                            onMouseDown={() => setIsPlaying(false)}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-spp-gray uppercase tracking-wider mb-2">{t('map.geography')}</label>
                        <div className="bg-spp-bgLight border border-slate-200 rounded-lg overflow-hidden shadow-inner flex flex-col">
                            {countries?.map(country => (
                                <GeographyTreeGroup
                                    key={country.id}
                                    country={country}
                                    allStates={geoData || []}
                                    selectedStateIds={selectedStateIds}
                                    onToggleState={(id: number) => {
                                        if (selectedStateIds.includes(id)) {
                                            setSelectedStateIds(selectedStateIds.filter(sid => sid !== id));
                                        } else {
                                            setSelectedStateIds([...selectedStateIds, id]);
                                        }
                                    }}
                                    onToggleCountry={(ids: number[], force: boolean) => {
                                        if (force === false) {
                                            setSelectedStateIds(selectedStateIds.filter(id => !ids.includes(id)));
                                        } else {
                                            setSelectedStateIds(Array.from(new Set([...selectedStateIds, ...ids])));
                                        }
                                    }}
                                    isExpanded={expandedCountries.includes(country.id)}
                                    onToggleExpand={() => {
                                        if (expandedCountries.includes(country.id)) {
                                            setExpandedCountries(expandedCountries.filter(id => id !== country.id));
                                        } else {
                                            setExpandedCountries([...expandedCountries, country.id]);
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        {/* Reset / Screenshot row */}
                        <div className="flex gap-2">
                            <button
                                disabled
                                className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-not-allowed border border-dashed border-slate-300"
                                title="Statistical plotting feature coming soon for academic papers"
                            >
                                <BarChart3 size={14} />
                                Make a plot
                            </button>
                            <button
                                onClick={async () => {
                                    if (!dashboardRef.current) return;
                                    try {
                                        // Optional: Hide controls before snapshot? 
                                        // The user might want the description and legend but maybe not the buttons.
                                        // For now, let's keep it simple.
                                        const dataUrl = await toPng(dashboardRef.current, {
                                            cacheBust: true,
                                            filter: (node) => {
                                                // Filter out the buttons/controls if desired
                                                return !node.classList?.contains('pointer-events-none');
                                            }
                                        });
                                        const link = document.createElement('a');
                                        link.download = `SPP_Snapshot_${variable}_${year}.png`;
                                        link.href = dataUrl;
                                        link.click();
                                    } catch (err) {
                                        console.error('Screenshot failed:', err);
                                    }
                                }}
                                className="flex items-center justify-center gap-2 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border border-brand-100"
                                title="Take Dashboard Screenshot"
                            >
                                <Camera size={14} />
                                {t('map.screenshot')}
                            </button>
                        </div>
                    </div>

                    {isFetchingObs && (
                        <div className="text-xs text-brand-600 font-medium flex items-center animate-pulse">
                            {t('map.fetchingData')}
                        </div>
                    )}
                </div>
            </SidebarPortal>

            {/* Variable Description Overlay */}
            {variableDescription}

            <MapContainer
                center={[-34.6, -58.4]}
                zoom={4}
                className="w-full h-full z-0"
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">Carto</a>'
                />

                <MapBoundsController
                    selectedStateIds={selectedStateIds}
                    geoData={geoData || []}
                    countries={countries || []}
                />

                {mergedGeoJSON && activeVarMeta && (
                    <MapGeoJSONLayer
                        features={mergedGeoJSON}
                        obsData={obsData || {}}
                        year={year}
                        variable={variable}
                        vType={activeVarMeta.type}
                        palette={activeVarMeta.palette}
                        prettyName={lang === 'de' ? (activeVarMeta.pretty_name_de || activeVarMeta.pretty_name) : lang === 'es' ? (activeVarMeta.pretty_name_es || activeVarMeta.pretty_name) : activeVarMeta.pretty_name}
                        partyColors={partyColors}
                        activeDataset={activeDataset}
                    />
                )}
            </MapContainer>
        </div>
    );
}
