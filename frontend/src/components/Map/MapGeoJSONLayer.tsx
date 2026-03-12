import { useState, useMemo, useEffect, useRef } from 'react';
import { GeoJSON, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapSelectionPanel } from './MapSelectionPanel';
import {
    ChevronUp, ChevronDown as ChevronDownIcon,
    Landmark, BarChart3
} from 'lucide-react';
import chroma from 'chroma-js';
import { useSidebar } from '../Layout';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

/**
 * Core Leaflet layer component for rendering data-bound polygons.
 * Handles the heavy lifting of color scaling, interactive filtering, and performance synchronization.
 */
export function MapGeoJSONLayer({ features, obsData, year, variable, vType, palette, prettyName, partyColors, activeDataset, onFilterChange, isSelecting, selectionStateIds, onToggleSelectionState, onClearSelection, activeVarMeta, onFilterToSelection }: { features: any[], obsData: Record<number, any>, year: number, variable: string, vType: string, palette?: string | null, prettyName?: string | null, partyColors?: Record<string, string>, activeDataset: string, onFilterChange?: (hiddenIndices: number[], hiddenNA: boolean) => void, isSelecting?: boolean, selectionStateIds?: number[], onToggleSelectionState?: (stateId: number) => void, onClearSelection?: () => void, activeVarMeta?: any, onFilterToSelection?: (ids: number[]) => void }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

    const toggleDetails = (stateId: number, key: string) => {
        setExpandedDetails(prev => ({
            ...prev,
            [`${stateId}-${key}`]: !prev[`${stateId}-${key}`]
        }));
    };

    // Language-aware type maps — rebuilt when language changes
    const TYPE_MAPS = useMemo<Record<string, Record<any, string>>>(() => ({
        binary: { 0: t('popup.no'), 1: t('popup.yes') },
        gender: { 0: t('popup.male'), 1: t('popup.female'), 2: t('popup.other') },
        chamber: { 1: t('popup.unicameral'), 2: t('popup.bicameral') },
        system: {
            1: t('popup.proportionalRepresentation'),
            2: t('popup.simpleMajority'),
            3: t('popup.mixedPRMajority'),
            4: t('popup.mixedPRDistricts'),
        },
        renewal: { 1: t('popup.staggeredEvery2Years'), 2: t('popup.fullRenewal') },
        ordinal: { 1: t('popup.left'), 2: t('popup.centerLeft'), 3: t('popup.centerRight'), 4: t('popup.right') },
    }), [t]);

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

            let k = 5;
            if (count < 5) k = 3;
            else if (count >= 15 && count < 35) k = 4;
            else if (count >= 35) k = 6;

            const uniqueVals = Array.from(new Set(numValues)).sort((a, b) => a - b);

            let bks: number[] = [];
            try {
                bks = chroma.limits(numValues, 'k', k);
                if (bks.length < k + 1 && uniqueVals.length >= k) {
                    bks = chroma.limits(numValues, 'q', k);
                }
            } catch (e) {
                bks = chroma.limits(numValues, 'e', k);
            }

            bks = Array.from(new Set(bks)).sort((a, b) => a - b);
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
    }, [features, variable, vType, paletteArray, isNumeric, isSpecial, TYPE_MAPS]);

    const [hiddenIndices, setHiddenIndices] = useState<number[]>([]);
    const [hiddenNA, setHiddenNA] = useState(false);

    useEffect(() => {
        setHiddenIndices([]);
        setHiddenNA(false);
    }, [variable]);

    useEffect(() => {
        onFilterChange?.(hiddenIndices, hiddenNA);
    }, [hiddenIndices, hiddenNA]);

    const getColor = (val: any) => {
        if (val === undefined || val === null) return '#999999';

        if (isNumeric && colorScale) {
            return (colorScale as any)(Number(val)).hex();
        }

        if (vType === 'categorical') {
            const partyVal = String(val).trim();
            if (partyColors && partyColors[partyVal]) return partyColors[partyVal];
            const uniqueCats = Array.from(new Set(features.map(f => f.properties[variable]).filter(v => v))).sort();
            const idx = uniqueCats.indexOf(val);
            return paletteArray[idx % paletteArray.length];
        }

        return '#999999';
    };

    const isFeatureVisible = (val: any) => {
        if (val === undefined || val === null) return !hiddenNA;

        if (isNumeric && (breaks as number[]).length > 0) {
            const num = Number(val);
            if (isSpecial) {
                const idx = (breaks as number[]).indexOf(num);
                return !hiddenIndices.includes(idx);
            } else {
                let binIdx = -1;
                const bks = breaks as number[];
                for (let i = 0; i < bks.length - 1; i++) {
                    if (num >= bks[i] && (i === bks.length - 2 ? num <= bks[i + 1] : num < bks[i + 1])) {
                        binIdx = i;
                        break;
                    }
                }
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
        if (val === undefined || val === null) return t('popup.notAvailable');
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

    const map = useMap();
    const geoJsonInstanceRef = useRef<L.GeoJSON>(null);
    const isSelectingRef = useRef(isSelecting ?? false);
    const onToggleSelectionStateRef = useRef(onToggleSelectionState);
    const featuresRef = useRef(features);
    const justRubberBandedRef = useRef(false);

    const geoJsonStyle = (feature: any) => {
        const stateId = feature.properties.state_id;
        const isSelected = selectionStateIds?.includes(stateId) ?? false;
        const currentData = obsData[stateId];
        const val = currentData ? currentData[variable] : null;
        const visible = isFeatureVisible(val);
        const color = getColor(val);

        return {
            fillColor: color,
            weight: isSelected ? 3 : (visible ? 1.2 : 0),
            opacity: isSelected || visible ? 1 : 0,
            color: isSelected ? '#FFA92A' : '#111111',
            fillOpacity: visible ? 0.9 : 0,
        };
    };

    const styleRef = useRef(geoJsonStyle);
    const visibleRef = useRef(isFeatureVisible);

    useEffect(() => {
        styleRef.current = geoJsonStyle;
        visibleRef.current = isFeatureVisible;
    }, [geoJsonStyle, isFeatureVisible]);

    useEffect(() => {
        isSelectingRef.current = isSelecting ?? false;
        onToggleSelectionStateRef.current = onToggleSelectionState;
    }, [isSelecting, onToggleSelectionState]);

    useEffect(() => {
        featuresRef.current = features;
    }, [features]);

    // ── Geometry centroid helper ──────────────────────────────────────────────
    const getGeometryCentroid = (geometry: any): L.LatLng | null => {
        if (!geometry?.coordinates) return null;
        const coords: number[][] = [];
        const collect = (arr: any) => {
            if (!Array.isArray(arr)) return;
            if (typeof arr[0] === 'number') { coords.push(arr); } else { arr.forEach(collect); }
        };
        collect(geometry.coordinates);
        if (coords.length === 0) return null;
        const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
        const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
        return L.latLng(lat, lng);
    };

    // ── Rubber-band selection + map interaction lock ──────────────────────────
    useEffect(() => {
        if (!isSelecting) {
            map.dragging.enable();
            map.scrollWheelZoom.enable();
            map.doubleClickZoom.enable();
            return;
        }

        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();

        let startPt: L.Point | null = null;
        let rubberRect: L.Rectangle | null = null;
        let dragging = false;

        const onMouseDown = (e: any) => {
            startPt = map.mouseEventToContainerPoint(e.originalEvent);
            dragging = false;
        };

        const onMouseMove = (e: any) => {
            if (!startPt) return;
            const cp = map.mouseEventToContainerPoint(e.originalEvent);
            if (!dragging && (Math.abs(cp.x - startPt.x) > 8 || Math.abs(cp.y - startPt.y) > 8)) {
                dragging = true;
                document.body.style.userSelect = 'none';
            }
            if (!dragging) return;
            const sw = map.containerPointToLatLng(L.point(Math.min(startPt.x, cp.x), Math.max(startPt.y, cp.y)));
            const ne = map.containerPointToLatLng(L.point(Math.max(startPt.x, cp.x), Math.min(startPt.y, cp.y)));
            if (!rubberRect) {
                rubberRect = L.rectangle([sw, ne], { color: '#FFA92A', weight: 2, fillColor: '#FFA92A', fillOpacity: 0.08, dashArray: '5 4' }).addTo(map);
            } else {
                rubberRect.setBounds([sw, ne]);
            }
        };

        const onMouseUp = () => {
            if (dragging && rubberRect) {
                const bounds = rubberRect.getBounds();
                for (const f of featuresRef.current) {
                    const c = getGeometryCentroid(f.geometry);
                    if (c && bounds.contains(c)) {
                        onToggleSelectionStateRef.current?.(f.properties.state_id);
                    }
                }
                justRubberBandedRef.current = true;
                setTimeout(() => { justRubberBandedRef.current = false; }, 100);
            }
            if (rubberRect) { map.removeLayer(rubberRect); rubberRect = null; }
            startPt = null;
            dragging = false;
            document.body.style.userSelect = '';
        };

        map.on('mousedown', onMouseDown);
        map.on('mousemove', onMouseMove);
        map.on('mouseup', onMouseUp);

        return () => {
            map.off('mousedown', onMouseDown);
            map.off('mousemove', onMouseMove);
            map.off('mouseup', onMouseUp);
            map.dragging.enable();
            map.scrollWheelZoom.enable();
            map.doubleClickZoom.enable();
            if (rubberRect) map.removeLayer(rubberRect);
        };
    }, [isSelecting, map]);

    const onEachFeature = (feature: any, layer: L.Layer) => {
        if (feature.properties.state_id === features[0]?.properties.state_id || feature.properties.state_id === features[features.length - 1]?.properties.state_id) {
            console.log(`[LayerDebug] Initializing feature layer for ${feature.properties.name} (ID: ${feature.properties.state_id})`);
        }

        layer.on({
            click: (e: any) => {
                if (!isSelectingRef.current) return;
                if (justRubberBandedRef.current) return;
                L.DomEvent.stopPropagation(e);
                onToggleSelectionStateRef.current?.(feature.properties.state_id);
            },
            mouseover: (e) => {
                const l = e.target;
                const stateId = feature.properties.state_id;
                const currentData = obsData[stateId];
                const val = currentData ? currentData[variable] : null;

                if (isSelectingRef.current) {
                    // In selection mode: show a lighter hover cue without clobbering the orange ring
                    l.setStyle({ weight: 4, fillOpacity: 1 });
                    l.bringToFront();
                    return;
                }
                if (!visibleRef.current(val)) return;
                l.setStyle({ weight: 4, color: '#FFA92A', fillOpacity: 1 });
                l.bringToFront();
            },
            mouseout: (e) => {
                e.target.setStyle(styleRef.current(feature));
            }
        });

        layer.on('add', () => {
            updateTooltip(layer, feature);
        });
    };

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

    const uniqueCategoricals = useMemo(() => {
        if (isNumeric) return [];

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
    }, [features, obsData, variable, breaks, hiddenIndices, hiddenNA, selectionStateIds]);

    const { isMobile, isSidebarOpen } = useSidebar();
    const isOverlaysHidden = isMobile && isSidebarOpen;

    return (
        <>
            {features.map((f) => {
                const stateId = f.properties.state_id;
                const data = obsData[stateId] || {};
                const val = data[variable];

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
                        {!isSelecting && <Popup className="legacy-popup">
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
                                        <span className="popup-label">{t('popup.state')}:</span>
                                        <span className="popup-value">{toTitleCase(f.properties.name)}</span>
                                    </div>
                                    <div className="popup-row">
                                        <span className="popup-label">{t('popup.governor')}:</span>
                                        <span className="popup-value truncate max-w-[180px]" title={data.winner_candidate_sub_exe ?? data.name_head_sub_exe}>
                                            {toTitleCase(data.winner_candidate_sub_exe ?? data.name_head_sub_exe)}
                                        </span>
                                    </div>
                                    <div className="popup-row">
                                        <span className="popup-label">{t('popup.party')}:</span>
                                        <span className="popup-value truncate max-w-[180px]" title={data.head_party_sub_exe}>
                                            {toTitleCase(data.head_party_sub_exe)}
                                        </span>
                                    </div>
                                    <div className="popup-row">
                                        <span className="popup-label">{t('popup.chamber')}:</span>
                                        <span className="popup-value">
                                            {(() => {
                                                const chRaw = data.chamber_sub_leg ?? data.chamber_sub_leg_1 ?? data.chamber_sub_leg_2;
                                                const ch = Number(chRaw);
                                                return ch === 1 ? t('popup.unicameral') : ch === 2 ? t('popup.bicameral') : 'N/A';
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
                                            {t('popup.governorDetails')}
                                            {expandedDetails[`${stateId}-gov`] ? <ChevronUp size={12} /> : <ChevronDownIcon size={12} />}
                                        </button>
                                        {expandedDetails[`${stateId}-gov`] && (
                                            <div className="px-3 py-2 text-[11px] border-t border-slate-200 bg-white space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">{t('popup.ideology')}:</span>
                                                    <span className="font-semibold">{TYPE_MAPS.ordinal[data.ideo_party_sub_exe] || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">{t('popup.alignment')}:</span>
                                                    <span className="font-semibold">{data.alignment_with_nat_sub_exe === 1 ? t('popup.yes') : t('popup.no')}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">{t('popup.reelected')}:</span>
                                                    <span className="font-semibold">{data.consecutive_reelection_sub_exe === 1 ? t('popup.yes') : t('popup.no')}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Legislative Details */}
                                    {(data.chamber_sub_leg || data.chamber_sub_leg_1 || data.chamber_sub_leg_2 || data.total_chamber_seats_sub_leg_1) && (
                                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                                            <button
                                                onClick={() => toggleDetails(stateId, 'leg')}
                                                className="w-full flex justify-between items-center px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
                                            >
                                                {t('popup.legislativeDetails')}
                                                {expandedDetails[`${stateId}-leg`] ? <ChevronUp size={12} /> : <ChevronDownIcon size={12} />}
                                            </button>
                                            {expandedDetails[`${stateId}-leg`] && (
                                                <div className="px-3 py-2 text-[11px] border-t border-slate-200 bg-white space-y-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">{t('map.lowerChamber')}:</span>
                                                        <span className="font-semibold">{data.total_chamber_seats_sub_leg_1 || 0} {t('popup.seats')}</span>
                                                    </div>
                                                    {(data.chamber_sub_leg === 2 || data.chamber_sub_leg_1 === 2 || data.total_chamber_seats_sub_leg_2) && (
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-400">{t('map.upperChamber')}:</span>
                                                            <span className="font-semibold">{data.total_chamber_seats_sub_leg_2 || 0} {t('popup.seats')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                                    <button 
                                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-spp-orange text-white rounded-lg text-xs font-bold hover:bg-spp-purple hover:shadow-md transition-all duration-300 transform active:scale-95"
                                        onClick={() => {
                                            navigate(`/camera?stateId=${stateId}&year=${year}&chamber=1`);
                                        }}
                                    >
                                        <Landmark size={14} />
                                        {t('popup.cameraBtn')}
                                    </button>
                                    <button
                                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-spp-orange text-white rounded-lg text-xs font-bold hover:bg-spp-purple hover:shadow-md transition-all duration-300 transform active:scale-95"
                                        onClick={() => {
                                            navigate(`/graph?stateId=${stateId}&variable=${variable}&year=${year}`);
                                        }}
                                    >
                                        <BarChart3 size={14} />
                                        {t('popup.graphBtn')}
                                    </button>
                                </div>
                            </div>
                        </Popup>}
                    </GeoJSON>
                );
            })}

            {/* Bottom-right stack: selection panel (when active) + legend */}
            <div className={`absolute bottom-20 md:bottom-6 right-2 md:right-6 z-[800] flex flex-col gap-2 items-stretch w-[min(200px,calc(100vw-1rem))] md:w-[220px] transition-all duration-300 origin-bottom-right ${isOverlaysHidden ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}>

                {isSelecting && selectionStateIds && selectionStateIds.length > 0 && activeVarMeta && (
                    <MapSelectionPanel
                        selectionStateIds={selectionStateIds}
                        obsData={obsData}
                        variable={variable}
                        vType={vType}
                        activeVarMeta={activeVarMeta}
                        year={year}
                        allStates={features.map(f => ({ id: f.properties.state_id, name: f.properties.name }))}
                        prettyName={prettyName ?? null}
                        onClear={() => onClearSelection?.()}
                        onFilterToSelection={onFilterToSelection
                            ? () => onFilterToSelection(selectionStateIds)
                            : undefined
                        }
                    />
                )}

            {/* Legend */}
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/50 p-2 md:p-4 max-h-[35vh] md:max-h-[60vh] overflow-y-auto">
                <div className="flex flex-col gap-1.5 md:gap-2">
                    <div className="py-0.5 md:py-1">
                        <div className="text-[11px] md:text-sm font-bold text-slate-800 leading-tight">{prettyName || variable}</div>
                    </div>

                    <div className="flex flex-col gap-0.5 md:gap-1 pt-1.5 md:pt-2 border-t border-slate-100">
                        {/* NA entry first (mimic R) */}
                        <div
                            className={`flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-1 py-0.5 rounded transition-all ${hiddenNA ? 'opacity-40 grayscale' : ''}`}
                            onClick={() => setHiddenNA(!hiddenNA)}
                        >
                            <i className="w-4 h-2 md:w-5 md:h-3 rounded-sm border border-slate-300" style={{ background: '#999999' }} />
                            <span className={`text-[10px] md:text-[11px] font-medium text-slate-600 uppercase ${hiddenNA ? 'line-through' : ''}`}>{t('popup.notAvailable')}</span>
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
                            <div className="text-[10px] text-slate-400 italic py-1">{t('popup.noActiveData')}</div>
                        )}
                    </div>
                </div>
            </div>
            </div>
        </>
    );
}
