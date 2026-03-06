import { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Play, Pause, ChevronRight, ChevronDown, Camera,
    Settings, Landmark, BarChart3, ChevronUp, ChevronDown as ChevronDownIcon
} from 'lucide-react';
import { useStatesGeo, useVariables, usePartyColors, useObservations, useCountries } from '../api/hooks';
import type { CountryGeo, StateGeo } from '../api/hooks';
import { toPng } from 'html-to-image';
import chroma from 'chroma-js';
import { SidebarPortal } from '../components/Layout';

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
                    const next = prev + 1;
                    return next > 2024 ? 1983 : next;
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
        vars: any[];
        subgroups?: TreeGroup[];
    }

    // Group the valid variables by database (dataset)
    const groupedVariables = useMemo(() => {
        const groups: Record<string, TreeGroup> = {};
        mapVariables.forEach(v => {
            const db = v.dataset;
            if (!db || db === 'Other' || db === 'Others') return;

            if (db === 'Legislative Elections') {
                if (!groups[db]) {
                    groups[db] = {
                        dbName: db, vars: [], subgroups: [
                            { dbName: "Lower Chamber", vars: [] },
                            { dbName: "Upper Chamber", vars: [] }
                        ]
                    };
                }
                groups[db].subgroups![0].vars.push({ ...v, variable: `${v.variable}_1` });
                groups[db].subgroups![1].vars.push({ ...v, variable: `${v.variable}_2` });
            } else {
                if (!groups[db]) groups[db] = { dbName: db, vars: [] };
                groups[db].vars.push(v);
            }
        });

        const sortedGroups: TreeGroup[] = [];
        Object.keys(groups).sort().forEach(k => { sortedGroups.push(groups[k]); });
        return sortedGroups;
    }, [mapVariables]);

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
            if (variable.endsWith('_1')) chamberText = " (Lower Chamber)";
            else if (variable.endsWith('_2')) chamberText = " (Upper Chamber)";
        }

        return (
            <div className="absolute top-4 right-4 z-[1000] max-w-[400px] bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-white/50 text-[11px] text-slate-700 leading-relaxed pointer-events-none transition-all duration-500 border-l-4 border-l-brand-500 scale-100 opacity-100 translate-x-0">
                You are seeing <strong>{activeVarMeta.description_for_ui || activeVarMeta.pretty_name || variable}</strong>
                {chamberText}; from the Subnational <strong>{activeVarMeta.dataset}</strong> Database.
                {activeVarMeta.add_indices && <span className="block mt-1 italic text-slate-500">{activeVarMeta.add_indices}</span>}
            </div>
        );
    }, [activeVarMeta, variable]);

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
                <div className="flex flex-col gap-6 p-6 pb-20">
                    {/* Section Label */}
                    <div className="flex items-center gap-2 text-[10px] font-black text-brand-500 uppercase tracking-widest border-b border-brand-100 pb-2">
                        <Settings size={12} />
                        Visualization Settings
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Variables</label>
                        <div className="bg-white/60 border border-slate-200 rounded-lg text-sm overflow-hidden flex flex-col shadow-inner">
                            {groupedVariables.map((group) => (
                                <VariableTreeGroup
                                    key={group.dbName}
                                    group={group}
                                    activeVariable={variable}
                                    onSelect={(v) => setVariable(v)}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            <div className="flex items-center gap-2">
                                <span>Year</span>
                                <button
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    className={`flex items-center justify-center p-1 rounded-full transition-all ${isPlaying ? 'bg-brand-100 text-brand-600 shadow-sm' : 'hover:bg-slate-100 text-slate-400'}`}
                                    title={isPlaying ? "Pause animation" : "Play animation"}
                                >
                                    {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                </button>
                            </div>
                            <span className="text-brand-600 font-black text-sm tabular-nums">{year}</span>
                        </label>
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
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Geography</label>
                        <div className="bg-white/60 border border-slate-200 rounded-lg overflow-hidden shadow-inner flex flex-col">
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
                                onClick={() => {
                                    if (geoData) setSelectedStateIds(geoData.map(s => s.id));
                                }}
                                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                            >
                                Reset Selection
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
                                Screenshot
                            </button>
                        </div>
                    </div>

                    {isFetchingObs && (
                        <div className="text-xs text-brand-600 font-medium flex items-center animate-pulse">
                            Fetching data...
                        </div>
                    )}
                </div>
            </SidebarPortal>

            {/* Global Transitions & Leaflet Overrides */}
            <style>{`
                .leaflet-interactive {
                    transition: fill 0.4s ease-out, fill-opacity 0.4s ease-out, stroke-width 0.2s ease-out;
                }
                .legend-item-transition {
                    transition: all 0.3s ease-in-out;
                }
                .popup-header {
                    border-bottom: 2px solid #3b82f6;
                    padding-bottom: 4px;
                    margin-bottom: 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                }
                .popup-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 4px;
                    font-size: 11px;
                }
                .popup-label {
                    color: #64748b;
                    font-weight: 500;
                }
                .popup-value {
                    color: #1e293b;
                    font-weight: 700;
                    text-align: right;
                }
                .leaflet-container {
                    background: #f8fafc !important;
                }
            `}</style>

            {/* Variable Description Overlay */}
            {variableDescription}

            <MapContainer
                center={[-34.6, -58.4]}
                zoom={4}
                className="w-full h-full z-0"
                style={{ height: '100%', width: '100%' }}
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
                        prettyName={activeVarMeta.pretty_name}
                        partyColors={partyColors}
                        activeDataset={activeDataset}
                    />
                )}
            </MapContainer>
        </div>
    );
}

/**
 * Component that synchronizes map viewport bounds with the active selection.
 * Automatically zooms/pans when states are added or removed.
 */
function MapBoundsController({ selectedStateIds, geoData, countries }: { selectedStateIds: number[], geoData: StateGeo[], countries: CountryGeo[] }) {
    const map = useMap();

    useEffect(() => {
        if (selectedStateIds.length === 0 || geoData.length === 0 || countries.length === 0) return;

        // Determine which countries are active
        const activeCountryIds = Array.from(new Set(
            geoData.filter(s => selectedStateIds.includes(s.id)).map(s => s.country_id)
        ));

        if (activeCountryIds.length === 0) return;

        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

        activeCountryIds.forEach(cid => {
            const country = countries.find(c => c.id === cid);
            if (country) {
                const [lng1, lat1, lng2, lat2] = country.bbox;
                minLng = Math.min(minLng, lng1, lng2);
                minLat = Math.min(minLat, lat1, lat2);
                maxLng = Math.max(maxLng, lng1, lng2);
                maxLat = Math.max(maxLat, lat1, lat2);
            }
        });

        if (minLng !== Infinity) {
            map.flyToBounds([
                [minLat, minLng],
                [maxLat, maxLng]
            ], { padding: [40, 40], duration: 1.5 });
        }
    }, [selectedStateIds, geoData, countries, map]);

    return null;
}

/**
 * Recursive tree component for geography selection.
 * Supports country-level master toggles and state-level individual toggles.
 */
function GeographyTreeGroup({
    country,
    allStates,
    selectedStateIds,
    onToggleState,
    onToggleCountry,
    isExpanded,
    onToggleExpand
}: {
    country: CountryGeo,
    allStates: StateGeo[],
    selectedStateIds: number[],
    onToggleState: (id: number) => void,
    onToggleCountry: (ids: number[], force: boolean) => void,
    isExpanded: boolean,
    onToggleExpand: () => void
}) {
    const states = useMemo(() => allStates.filter(s => s.country_id === country.id), [allStates, country.id]);
    const stateIds = states.map(s => s.id);

    const selectedInCountry = stateIds.filter(id => selectedStateIds.includes(id));
    const isAllSelected = selectedInCountry.length === stateIds.length && stateIds.length > 0;
    const isNoneSelected = selectedInCountry.length === 0;
    const isIndeterminate = !isAllSelected && !isNoneSelected;

    return (
        <div className="border-b border-slate-100 last:border-b-0">
            <div className="flex items-center group hover:bg-slate-50 transition-colors">
                <button
                    onClick={onToggleExpand}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                    onChange={() => onToggleCountry(stateIds, !isAllSelected)}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 accent-brand-500 cursor-pointer"
                />

                <button
                    onClick={onToggleExpand}
                    className="flex-1 text-left py-2 px-2 text-xs font-bold text-slate-700 truncate"
                >
                    {country.name}
                </button>

                <span className="text-[10px] text-slate-400 font-mono pr-3">
                    {selectedInCountry.length}/{stateIds.length}
                </span>
            </div>

            {isExpanded && (
                <div className="bg-slate-50/30 py-1 border-t border-slate-100/50">
                    {states.map(state => (
                        <label key={state.id} className="flex items-center gap-2 pl-9 pr-3 py-1 hover:bg-brand-50/50 cursor-pointer group transition-colors">
                            <input
                                type="checkbox"
                                checked={selectedStateIds.includes(state.id)}
                                onChange={() => onToggleState(state.id)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 accent-brand-500"
                            />
                            <span className="text-[11px] text-slate-600 group-hover:text-slate-900 truncate transition-colors">
                                {state.name}
                            </span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Recursive tree component for variable selection grouped by dataset.
 * Automatically expands when a child variable is selected.
 */
function VariableTreeGroup({ group, activeVariable, onSelect, depth = 0 }: { group: any, activeVariable: string, onSelect: (v: string) => void, depth?: number }) {

    // Check if any child variable is active, OR recursively if any subgroup contains the active variable
    const isActiveHere = useMemo(() => {
        const checkActive = (g: any): boolean => {
            if (g.vars.some((v: any) => v.variable === activeVariable)) return true;
            if (g.subgroups) return g.subgroups.some(checkActive);
            return false;
        };
        return checkActive(group);
    }, [group, activeVariable]);

    const [isOpen, setIsOpen] = useState(false);

    // Only auto-open on variable selection if it was not deliberate toggle? 
    // Actually, to fully respect "collapse by default", we just set initial state to false.
    // If the user selects a variable from elsewhere (e.g. initial load), it will stay collapsed.
    // But maybe we want it to open ONLY when the variable changes?
    // Let's just set it to false and remove the immediate auto-open.
    useEffect(() => {
        // No auto-open effect here to keep it collapsed by default
    }, []);

    const paddingClass = depth > 0 ? "pl-6 text-sm" : "pl-3 bg-slate-50";

    // Count pure variables for indicator 
    const varCount = group.vars.length + (group.subgroups ? group.subgroups.reduce((acc: number, sg: any) => acc + sg.vars.length, 0) : 0);

    return (
        <div className={`border-b border-slate-200 last:border-b-0 ${depth > 0 ? 'bg-white border-t' : ''}`}>
            <button
                className={`w-full flex items-center justify-between py-2 pr-3 hover:bg-slate-100 transition-colors ${paddingClass} ${isActiveHere && depth === 0 ? 'font-semibold' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 text-slate-700">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="truncate">{group.dbName}</span>
                </div>
                <span className="text-xs bg-slate-200 text-slate-500 px-1.5 rounded-full">{varCount}</span>
            </button>

            {isOpen && (
                <div className="bg-white flex flex-col py-1">
                    {/* Render subgroups recursively */}
                    {group.subgroups && group.subgroups.map((sg: any) => (
                        <VariableTreeGroup
                            key={sg.dbName}
                            group={sg}
                            activeVariable={activeVariable}
                            onSelect={onSelect}
                            depth={depth + 1}
                        />
                    ))}

                    {/* Render variables */}
                    {group.vars.map((v: any) => {
                        const active = v.variable === activeVariable;
                        const varPad = depth > 0 ? "ml-9" : "ml-6";
                        return (
                            <button
                                key={v.variable}
                                onClick={() => onSelect(v.variable)}
                                className={`text-left px-3 py-1.5 text-xs truncate transition-colors border-l-2 ${varPad} ${active
                                    ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold'
                                    : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                title={v.pretty_name || v.variable}
                            >
                                {v.pretty_name || v.variable}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Leaflet Inner Component for Drawing GeoJSON ─────────────────────────────

const TYPE_MAPS: Record<string, Record<any, string>> = {
    binary: { 0: "No", 1: "Yes" },
    gender: { 0: "Male", 1: "Female", 2: "Other" },
    chamber: { 1: "Unicameral", 2: "Bicameral" },
    system: {
        1: "Proportional Representation (PR)",
        2: "Simple Majority",
        3: "Mixed (PR + Majority)",
        4: "Mixed (PR + predefined districts)"
    },
    renewal: { 1: "Staggered every 2 years", 2: "Full renewal" },
    ordinal: { 1: "Left", 2: "Center Left", 3: "Center Right", 4: "Right" }
};

/**
 * Core Leaflet layer component for rendering data-bound polygons.
 * Handles the heavy lifting of color scaling, interactive filtering, and performance synchronization.
 */
function MapGeoJSONLayer({ features, obsData, year, variable, vType, palette, prettyName, partyColors, activeDataset }: { features: any[], obsData: Record<number, any>, year: number, variable: string, vType: string, palette?: string | null, prettyName?: string | null, partyColors?: Record<string, string>, activeDataset: string }) {
    const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

    const toggleDetails = (stateId: number, key: string) => {
        setExpandedDetails(prev => ({
            ...prev,
            [`${stateId}-${key}`]: !prev[`${stateId}-${key}`]
        }));
    };

    // Parse palette (comma separated hex)
    const paletteArray = useMemo(() => {
        if (!palette) return ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494']; // fallback brewer YlGnBu
        return palette.split(',').map(c => c.trim());
    }, [palette]);

    // Create color scale if numeric
    const isSpecial = !!TYPE_MAPS[vType];
    const isNumeric = ['continuous', 'discrete', 'percentage'].includes(vType) || isSpecial;

    /**
     * Primary color scaling logic for the current variable.
     * Uses Memoization to avoid recalculating breaks and scales needlessly.
     * Implements dynamic binning based on the number of features shown.
     */
    const { colorScale, breaks, labels } = useMemo(() => {
        const rawValues = features.map(f => f.properties[variable]).filter(v => v !== undefined && v !== null && !isNaN(parseFloat(v)));

        if (isSpecial) {
            const map = TYPE_MAPS[vType];
            const domain = Object.keys(map).map(Number).sort((a, b) => a - b);
            // Use discrete scale for special types
            const scale = chroma.scale(paletteArray).domain([Math.min(...domain), Math.max(...domain)]).classes(domain.length);
            return {
                colorScale: scale,
                breaks: domain,
                labels: domain.map(d => map[d])
            };
        }

        if (isNumeric && rawValues.length > 0) {
            const numValues: number[] = rawValues.map(v => Number(v));
            const min = Math.min(...numValues);
            const count = numValues.length;

            // Dynamic binning resolution based on observation count
            let k = 5;
            if (count < 5) k = 3;
            else if (count >= 15 && count < 35) k = 4;
            else if (count >= 35) k = 6;

            const uniqueVals = Array.from(new Set(numValues)).sort((a, b) => a - b);

            let bks: number[] = [];
            try {
                // Primary strategy: k-means (Jenks-like statistical clusters)
                bks = chroma.limits(numValues, 'k', k);

                // FALLBACK: If k-means returns fewer bins than requested (common with skewed data)
                // we try quantiles ('q') to ensure the requested resolution is met.
                if (bks.length < k + 1 && uniqueVals.length >= k) {
                    bks = chroma.limits(numValues, 'q', k);
                }
            } catch (e) {
                // Secondary Fallback: Equal intervals ('e')
                bks = chroma.limits(numValues, 'e', k);
            }

            bks = Array.from(new Set(bks)).sort((a, b) => a - b);

            // Final safety: if still only 1 point, create a tiny range to satisfy the scale
            if (bks.length < 2) bks = [min, min + 0.001];

            const scale = chroma.scale(paletteArray).domain([bks[0], bks[bks.length - 1]]).classes(bks);

            const format = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: (vType === 'percentage' ? 2 : 1) });

            const labs = bks.slice(0, -1).map((b, i) => {
                const next = bks[i + 1];
                if (vType === 'percentage') return `${format(b)}% - ${format(next)}%`;
                return `${format(b)} - ${format(next)}`;
            });

            return { colorScale: scale, breaks: bks, labels: labs };
        }

        return { colorScale: null, breaks: [], labels: [] };
    }, [features, variable, vType, paletteArray, isNumeric, isSpecial]);

    const [hiddenIndices, setHiddenIndices] = useState<number[]>([]);
    const [hiddenNA, setHiddenNA] = useState(false);

    // Reset filters when variable changes
    useEffect(() => {
        setHiddenIndices([]);
        setHiddenNA(false);
    }, [variable]);

    /**
     * Color selection logic.
     * For categorical variables, handles party-specific colors or falls back to palette cycles.
     */
    const getColor = (val: any) => {
        if (val === undefined || val === null) return '#999999'; // R's default NA color

        if (isNumeric && colorScale) {
            return (colorScale as any)(Number(val)).hex();
        }

        // Categorical selection logic
        if (vType === 'categorical') {
            const partyVal = String(val).trim();
            if (partyColors && partyColors[partyVal]) return partyColors[partyVal];
            // If no party color, use a hash-based or cyclic fallback from palette
            const uniqueCats = Array.from(new Set(features.map(f => f.properties[variable]).filter(v => v))).sort();
            const idx = uniqueCats.indexOf(val);
            return paletteArray[idx % paletteArray.length];
        }

        return '#999999';
    };

    /**
     * Determines if a feature should be visible based on legend category toggles.
     */
    const isFeatureVisible = (val: any) => {
        if (val === undefined || val === null) return !hiddenNA;

        if (isNumeric && (breaks as number[]).length > 0) {
            const num = Number(val);
            if (isSpecial) {
                const idx = (breaks as number[]).indexOf(num);
                return !hiddenIndices.includes(idx);
            } else {
                // Find bin index
                let binIdx = -1;
                const bks = breaks as number[];
                for (let i = 0; i < bks.length - 1; i++) {
                    // Inclusion logic for k-means breaks
                    if (num >= bks[i] && (i === bks.length - 2 ? num <= bks[i + 1] : num < bks[i + 1])) {
                        binIdx = i;
                        break;
                    }
                }
                // Fallback for exact max
                if (binIdx === -1 && num === bks[bks.length - 1]) binIdx = bks.length - 2;

                return !hiddenIndices.includes(binIdx);
            }
        }

        if (vType === 'categorical') {
            const uniqueCats = Array.from(new Set(features.map(f => f.properties[variable]).filter(v => v))).sort();
            const idx = uniqueCats.indexOf(val);
            return !hiddenIndices.includes(idx);
        }

        return true;
    };

    const formatDisplayValue = (val: any) => {
        if (val === undefined || val === null) return 'Not Available';
        if (isSpecial) return TYPE_MAPS[vType][val] || val;

        const num = Number(val);
        if (isNaN(num)) return String(val);

        if (vType === 'percentage') return `${num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
        if (vType === 'continuous') return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
        if (vType === 'discrete') return Math.floor(num).toLocaleString();
        return num.toLocaleString();
    };

    const toTitleCase = (str: any) => {
        if (!str || str === 'N/A') return 'N/A';
        return String(str)
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // We'll use a local ref to track the Leaflet object
    const geoJsonInstanceRef = useRef<L.GeoJSON>(null);

    const geoJsonStyle = (feature: any) => {
        const stateId = feature.properties.state_id;
        const currentData = obsData[stateId];
        const val = currentData ? currentData[variable] : null;
        const visible = isFeatureVisible(val);
        const color = getColor(val);

        return {
            fillColor: color,
            weight: visible ? 1.2 : 0,
            opacity: visible ? 1 : 0,
            color: '#111111',
            fillOpacity: visible ? 0.9 : 0,
        };
    };

    // Use Refs to bypass stale closures in Leaflet event listeners
    const styleRef = useRef(geoJsonStyle);
    const visibleRef = useRef(isFeatureVisible);

    useEffect(() => {
        styleRef.current = geoJsonStyle;
        visibleRef.current = isFeatureVisible;
    }, [geoJsonStyle, isFeatureVisible]);

    const onEachFeature = (feature: any, layer: L.Layer) => {
        // Log initialization of layers
        if (feature.properties.state_id === features[0]?.properties.state_id || feature.properties.state_id === features[features.length - 1]?.properties.state_id) {
            console.log(`[LayerDebug] Initializing feature layer for ${feature.properties.name} (ID: ${feature.properties.state_id})`);
        }

        layer.on({
            mouseover: (e) => {
                const l = e.target;
                const stateId = feature.properties.state_id;
                const currentData = obsData[stateId];
                const val = currentData ? currentData[variable] : null;

                if (!visibleRef.current(val)) return;
                l.setStyle({ weight: 4, color: '#666', fillOpacity: 1 });
                l.bringToFront();
            },
            mouseout: (e) => {
                e.target.setStyle(styleRef.current(feature));
            }
        });

        // Tooltips should also use the latest data
        layer.on('add', () => {
            updateTooltip(layer, feature);
        });
    };

    // Helper to update tooltip content without re-binding everything
    const updateTooltip = (layer: any, feature: any) => {
        const stateId = feature.properties.state_id;
        const currentData = obsData[stateId];
        const val = currentData ? currentData[variable] : null;

        layer.bindTooltip(`
      <div class="font-sans px-3 py-2">
        <strong class="block text-slate-900 border-b border-slate-200 pb-1 mb-1">${feature.properties.name}</strong>
        <div class="flex justify-between gap-4">
             <span class="text-xs text-slate-500 font-medium uppercase tracking-tighter">${prettyName || variable}:</span>
             <span class="text-xs text-brand-700 font-bold">${formatDisplayValue(val)}</span>
        </div>
      </div>
    `, { sticky: true, className: 'bg-white/95 backdrop-blur border-none shadow-2xl rounded-lg p-0' });
    };

    // Extract unique values for categorical legend
    const uniqueCategoricals = useMemo(() => {
        if (isNumeric) return [];

        // Only for governor party, filter categories to only those in the current view/selection
        const isGovernorParty = variable.includes('head_party');

        const baseValues = isGovernorParty
            ? features.map(f => f.properties[variable])
            : Object.values(obsData).map(row => row[variable]);

        return Array.from(new Set(
            baseValues.filter(v => v !== undefined && v !== null && v !== "")
        )).sort();
    }, [obsData, features, variable, isNumeric]);

    const toggleIndex = (idx: number) => {
        setHiddenIndices(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    /**
     * Imperative Synchronization.
     * Leaflet is not reactive. This effect force-synchronizes the polygon styles and 
     * tooltip content when React data (years, variables, filters) changes.
     */
    useEffect(() => {
        if (geoJsonInstanceRef.current) {
            let updateCount = 0;
            let sampleLog = "";

            geoJsonInstanceRef.current.eachLayer((layer: any) => {
                const style = styleRef.current(layer.feature);
                layer.setStyle(style);
                updateTooltip(layer, layer.feature);

                if (updateCount === 0) {
                    sampleLog = `Sample [${layer.feature.properties.name}]: Val=${obsData[layer.feature.properties.state_id]?.[variable]}, Color=${style.fillColor}`;
                }
                updateCount++;
            });
            console.log(`[SyncDebug] Year ${year} complete. ${updateCount} layers updated. ${sampleLog}`);
        }
    }, [features, obsData, variable, breaks, hiddenIndices, hiddenNA]);

    return (
        <>
            {features.map((f) => {
                const stateId = f.properties.state_id;
                const data = obsData[stateId] || {};
                const val = data[variable];

                // Comprehensive debug log
                if (f.properties.name.toLowerCase().includes('buenos') || f.properties.name.toLowerCase().includes('sao paulo')) {
                    console.log(`[PopupDebug] State: ${f.properties.name}, TargetDatasets: ${activeDataset}, ActiveVar: ${variable}, Available Keys:`, Object.keys(data));
                }

                return (
                    <GeoJSON
                        key={`${f.properties.state_id}-${variable}`}
                        data={f as any}
                        style={() => geoJsonStyle(f)}
                        onEachFeature={(feat, layer) => onEachFeature(feat, layer)}
                    >
                        <Popup className="legacy-popup">
                            <div className="w-[280px] font-sans text-slate-700">
                                {/* Header */}
                                <div className="popup-header">
                                    <span className="text-xs font-black uppercase text-brand-600 tracking-tight truncate max-w-[160px]">
                                        {prettyName || variable}
                                    </span>
                                    <span className="text-sm font-bold text-slate-800 tabular-nums">
                                        {formatDisplayValue(val)}
                                    </span>
                                </div>

                                {/* Body */}
                                <div className="flex flex-col gap-1 mb-4">
                                    <div className="popup-row">
                                        <span className="popup-label">State:</span>
                                        <span className="popup-value">{toTitleCase(f.properties.name)}</span>
                                    </div>
                                    <div className="popup-row">
                                        <span className="popup-label">Governor:</span>
                                        <span className="popup-value truncate max-w-[180px]" title={data.winner_candidate_sub_exe}>
                                            {toTitleCase(data.winner_candidate_sub_exe)}
                                        </span>
                                    </div>
                                    <div className="popup-row">
                                        <span className="popup-label">Party:</span>
                                        <span className="popup-value truncate max-w-[180px]" title={data.head_party_sub_exe}>
                                            {toTitleCase(data.head_party_sub_exe)}
                                        </span>
                                    </div>
                                    <div className="popup-row">
                                        <span className="popup-label">Chamber:</span>
                                        <span className="popup-value">
                                            {(() => {
                                                const chRaw = data.chamber_sub_leg ?? data.chamber_sub_leg_1 ?? data.chamber_sub_leg_2;
                                                const ch = Number(chRaw);
                                                return ch === 1 ? "Unicameral" : ch === 2 ? "Bicameral" : "N/A";
                                            })()}
                                        </span>
                                    </div>
                                </div>

                                {/* Details Sections */}
                                <div className="space-y-2">
                                    {/* Governor Details */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                                        <button
                                            onClick={() => toggleDetails(stateId, 'gov')}
                                            className="w-full flex justify-between items-center px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
                                        >
                                            Governor details
                                            {expandedDetails[`${stateId}-gov`] ? <ChevronUp size={12} /> : <ChevronDownIcon size={12} />}
                                        </button>
                                        {expandedDetails[`${stateId}-gov`] && (
                                            <div className="px-3 py-2 text-[11px] border-t border-slate-200 bg-white space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Ideology:</span>
                                                    <span className="font-semibold">{TYPE_MAPS.ordinal[data.ideo_party_sub_exe] || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Alignment:</span>
                                                    <span className="font-semibold">{data.alignment_with_nat_sub_exe === 1 ? 'Yes' : 'No'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Reelected:</span>
                                                    <span className="font-semibold">{data.consecutive_reelection_sub_exe === 1 ? 'Yes' : 'No'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Legislative Details (check multiple possible keys) */}
                                    {(data.chamber_sub_leg || data.chamber_sub_leg_1 || data.chamber_sub_leg_2 || data.total_chamber_seats_sub_leg_1) && (
                                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                                            <button
                                                onClick={() => toggleDetails(stateId, 'leg')}
                                                className="w-full flex justify-between items-center px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
                                            >
                                                Legislative details
                                                {expandedDetails[`${stateId}-leg`] ? <ChevronUp size={12} /> : <ChevronDownIcon size={12} />}
                                            </button>
                                            {expandedDetails[`${stateId}-leg`] && (
                                                <div className="px-3 py-2 text-[11px] border-t border-slate-200 bg-white space-y-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">Lower Chamber:</span>
                                                        <span className="font-semibold">{data.total_chamber_seats_sub_leg_1 || 0} seats</span>
                                                    </div>
                                                    {(data.chamber_sub_leg === 2 || data.chamber_sub_leg_1 === 2 || data.total_chamber_seats_sub_leg_2) && (
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-400">Upper Chamber:</span>
                                                            <span className="font-semibold">{data.total_chamber_seats_sub_leg_2 || 0} seats</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Dumb Buttons */}
                                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                                    <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors">
                                        <Landmark size={14} />
                                        Camera
                                    </button>
                                    <button className="flex-1 flex items-center justify-center gap-2 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                                        <BarChart3 size={14} />
                                        Graph
                                    </button>
                                </div>
                            </div>
                        </Popup>
                    </GeoJSON>
                );
            })}

            {/* Dynamic Legend */}
            <div className="absolute bottom-6 right-6 z-[1000] bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/50 p-5 min-w-[200px] max-w-sm max-h-[60vh] overflow-y-auto transition-all duration-500 origin-bottom-right">
                <div className="flex flex-col gap-3">
                    <div className="border-l-4 border-brand-500 pl-3 py-1 transition-all">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Variable</h4>
                        <div className="text-sm font-bold text-slate-800 leading-tight">{prettyName || variable}</div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                        {/* NA entry first (mimic R) */}
                        <div
                            className={`flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1 rounded transition-all ${hiddenNA ? 'opacity-40 grayscale' : ''}`}
                            onClick={() => setHiddenNA(!hiddenNA)}
                        >
                            <i className="w-5 h-3 rounded-sm border border-slate-300" style={{ background: '#999999' }} />
                            <span className={`text-[11px] font-medium text-slate-600 uppercase ${hiddenNA ? 'line-through' : ''}`}>Not Available</span>
                        </div>

                        {isNumeric && colorScale && labels.length > 0 ? (
                            labels.map((lab, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1 rounded legend-item-transition ${hiddenIndices.includes(i) ? 'opacity-40 grayscale' : ''}`}
                                    onClick={() => toggleIndex(i)}
                                >
                                    <i className="w-5 h-3 rounded-sm border border-slate-300 transition-colors duration-500" style={{ background: isSpecial ? colorScale(breaks[i]).hex() : colorScale((breaks[i] + (breaks[i + 1] || breaks[i])) / 2).hex() }} />
                                    <span className={`text-[11px] font-bold text-slate-700 legend-item-transition ${hiddenIndices.includes(i) ? 'line-through italic text-slate-400' : ''}`}>{lab}</span>
                                </div>
                            ))
                        ) : !isNumeric && uniqueCategoricals.length > 0 ? (
                            uniqueCategoricals.map((val: any, i: number) => (
                                <div
                                    key={val}
                                    className={`flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1 rounded transition-all ${hiddenIndices.includes(i) ? 'opacity-40 grayscale' : ''}`}
                                    onClick={() => toggleIndex(i)}
                                >
                                    <i className="w-5 h-5 rounded-full border border-slate-300 shadow-sm shrink-0" style={{ background: getColor(val) }} />
                                    <span className={`text-[11px] font-bold text-slate-700 truncate ${hiddenIndices.includes(i) ? 'line-through italic text-slate-400' : ''}`} title={val}>{formatDisplayValue(val)}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-xs text-slate-400 italic py-2">No active data points</div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
