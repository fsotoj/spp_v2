import { useState, useMemo, useEffect, useRef } from 'react';
import { GeoJSON, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
    ChevronUp, ChevronDown as ChevronDownIcon,
    Landmark, BarChart3
} from 'lucide-react';
import chroma from 'chroma-js';
import { useSidebar } from '../Layout';

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
export function MapGeoJSONLayer({ features, obsData, year, variable, vType, palette, prettyName, partyColors, activeDataset }: { features: any[], obsData: Record<number, any>, year: number, variable: string, vType: string, palette?: string | null, prettyName?: string | null, partyColors?: Record<string, string>, activeDataset: string }) {
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
                l.setStyle({ weight: 4, color: '#FFA92A', fillOpacity: 1 });
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

    const { isMobile, isSidebarOpen } = useSidebar();
    const isOverlaysHidden = isMobile && isSidebarOpen;

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
                        ref={geoJsonInstanceRef as any}
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

            {/* Dynamic Legend — sits above the FAB on mobile (bottom-20), normal on md+ (bottom-6) */}
            <div className={`absolute bottom-20 md:bottom-6 right-2 md:right-6 z-[1000] bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/50 p-2 md:p-4 min-w-[150px] md:min-w-[180px] max-w-[min(200px,calc(100vw-1rem))] md:max-w-sm max-h-[35vh] md:max-h-[60vh] overflow-y-auto transition-all duration-300 origin-bottom-right ${isOverlaysHidden ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}>
                <div className="flex flex-col gap-1.5 md:gap-2">
                    <div className="border-l-4 border-brand-500 pl-2 md:pl-3 py-0.5 md:py-1 transition-all">
                        <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5 md:mb-1">Variable</h4>
                        <div className="text-[11px] md:text-sm font-bold text-slate-800 leading-tight">{prettyName || variable}</div>
                    </div>

                    <div className="flex flex-col gap-0.5 md:gap-1 pt-1.5 md:pt-2 border-t border-slate-100">
                        {/* NA entry first (mimic R) */}
                        <div
                            className={`flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-1 py-0.5 rounded transition-all ${hiddenNA ? 'opacity-40 grayscale' : ''}`}
                            onClick={() => setHiddenNA(!hiddenNA)}
                        >
                            <i className="w-4 h-2 md:w-5 md:h-3 rounded-sm border border-slate-300" style={{ background: '#999999' }} />
                            <span className={`text-[10px] md:text-[11px] font-medium text-slate-600 uppercase ${hiddenNA ? 'line-through' : ''}`}>Not Available</span>
                        </div>

                        {isNumeric && colorScale && labels.length > 0 ? (
                            labels.map((lab, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-1 py-0.5 rounded legend-item-transition ${hiddenIndices.includes(i) ? 'opacity-40 grayscale' : ''}`}
                                    onClick={() => toggleIndex(i)}
                                >
                                    <i className="w-4 h-2 md:w-5 md:h-3 rounded-sm border border-slate-300 transition-colors duration-500" style={{ background: isSpecial ? colorScale(breaks[i]).hex() : colorScale((breaks[i] + (breaks[i + 1] || breaks[i])) / 2).hex() }} />
                                    <span className={`text-[10px] md:text-[11px] font-bold text-slate-700 legend-item-transition ${hiddenIndices.includes(i) ? 'line-through italic text-slate-400' : ''}`}>{lab}</span>
                                </div>
                            ))
                        ) : !isNumeric && uniqueCategoricals.length > 0 ? (
                            uniqueCategoricals.map((val: any, i: number) => (
                                <div
                                    key={val}
                                    className={`flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-1 py-0.5 rounded transition-all ${hiddenIndices.includes(i) ? 'opacity-40 grayscale' : ''}`}
                                    onClick={() => toggleIndex(i)}
                                >
                                    <i className="w-4 h-4 rounded-full border border-slate-300 shadow-sm shrink-0" style={{ background: getColor(val) }} />
                                    <span className={`text-[10px] md:text-[11px] font-bold text-slate-700 truncate ${hiddenIndices.includes(i) ? 'line-through italic text-slate-400' : ''}`} title={val}>{formatDisplayValue(val)}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-[10px] text-slate-400 italic py-1">No active data points</div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
