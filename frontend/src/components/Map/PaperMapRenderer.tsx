import { forwardRef, useMemo, useEffect } from 'react';
import { MapContainer, GeoJSON, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import chroma from 'chroma-js';
import { useTranslation } from 'react-i18next';

const SOURCE_ATTRIBUTION = `Subnational Politics Project (SPP) · ${new Date().getFullYear()}`;

// Fits the map to the bounding box of all features on mount/update.
function BoundsFitter({ features }: { features: any[] }) {
    const map = useMap();
    useEffect(() => {
        if (!features.length) return;
        try {
            const layer = L.geoJSON(features as any);
            const bounds = layer.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [24, 24] });
            }
        } catch { /* ignore invalid geometries */ }
    }, [features, map]);
    return null;
}

const ALTERNATIVE_PALETTES: Record<string, string> = {
    YlGnBu: '#ffffcc,#c7e9b4,#7fcdbb,#41b6c4,#1d91c0,#225ea8,#0c2c84',
    Reds: '#fff5f0,#fee0d2,#fcbba1,#fc9272,#fb6a4a,#de2d26,#a50f15',
    Blues: '#f7fbff,#deebf7,#c6dbef,#9ecae1,#6baed6,#3182bd,#08519c',
    Purples: '#fcfbfd,#efedf5,#dadaeb,#bcbddc,#9e9ac8,#756bb1,#54278f',
    Viridis: '#440154,#414487,#2a788e,#22a884,#7ad151,#fde725',
    Grays: '#f7f7f7,#d9d9d9,#bdbdbd,#969696,#636363,#252525',
};

export { ALTERNATIVE_PALETTES };

export interface PaperMapRendererProps {
    features: any[];
    obsData: Record<number, any>;
    variable: string;
    vType: string;
    /** Original variable palette (comma-separated hex). Null uses fallback. */
    defaultPalette: string | null | undefined;
    /** Override palette id. 'default' means use defaultPalette. */
    paletteOverride: string;
    prettyName?: string | null;
    partyColors?: Record<string, string>;
    applyFilters: boolean;
    hiddenIndices: number[];
    hiddenNA: boolean;
    mapTitle?: string;
    showStateLabels: boolean;
    showValueLabels: boolean;
}

export const PaperMapRenderer = forwardRef<HTMLDivElement, PaperMapRendererProps>(
    function PaperMapRenderer(props, ref) {
        const {
            features, obsData, variable, vType,
            defaultPalette, paletteOverride,
            prettyName, partyColors,
            applyFilters, hiddenIndices, hiddenNA,
            mapTitle, showStateLabels, showValueLabels,
        } = props;

        const { t } = useTranslation();

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

        const isSpecial = !!TYPE_MAPS[vType];
        const isNumeric = ['continuous', 'discrete', 'percentage'].includes(vType) || isSpecial;

        const paletteArray = useMemo(() => {
            if (paletteOverride !== 'default' && ALTERNATIVE_PALETTES[paletteOverride]) {
                return ALTERNATIVE_PALETTES[paletteOverride].split(',').map(c => c.trim());
            }
            if (defaultPalette) return defaultPalette.split(',').map(c => c.trim());
            return ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494'];
        }, [paletteOverride, defaultPalette]);

        const { colorScale, breaks, labels } = useMemo(() => {
            const rawValues = features
                .map(f => f.properties[variable])
                .filter(v => v !== undefined && v !== null && !isNaN(parseFloat(v)));

            if (isSpecial) {
                const map = TYPE_MAPS[vType];
                const domain = Object.keys(map).map(Number).sort((a, b) => a - b);
                const scale = chroma.scale(paletteArray).domain([Math.min(...domain), Math.max(...domain)]).classes(domain.length);
                return { colorScale: scale, breaks: domain, labels: domain.map(d => map[d]) };
            }

            if (isNumeric && rawValues.length > 0) {
                const numValues = rawValues.map(Number);
                const min = Math.min(...numValues);
                const count = numValues.length;
                let k = count < 5 ? 3 : count >= 15 && count < 35 ? 4 : count >= 35 ? 6 : 5;
                const uniqueVals = Array.from(new Set(numValues)).sort((a, b) => a - b);
                let bks: number[] = [];
                try {
                    bks = chroma.limits(numValues, 'k', k);
                    if (bks.length < k + 1 && uniqueVals.length >= k) bks = chroma.limits(numValues, 'q', k);
                } catch {
                    bks = chroma.limits(numValues, 'e', k);
                }
                bks = Array.from(new Set(bks)).sort((a, b) => a - b);
                if (bks.length < 2) bks = [min, min + 0.001];
                const scale = chroma.scale(paletteArray).domain([bks[0], bks[bks.length - 1]]).classes(bks);
                const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: vType === 'percentage' ? 2 : 1 });
                const labs = bks.slice(0, -1).map((b, i) => {
                    const next = bks[i + 1];
                    return vType === 'percentage' ? `${fmt(b)}% – ${fmt(next)}%` : `${fmt(b)} – ${fmt(next)}`;
                });
                return { colorScale: scale, breaks: bks, labels: labs };
            }

            return { colorScale: null, breaks: [] as number[], labels: [] as string[] };
        }, [features, variable, vType, paletteArray, isNumeric, isSpecial, TYPE_MAPS]);

        const uniqueCategoricals = useMemo(() => {
            if (isNumeric) return [];
            return Array.from(new Set(
                features.map(f => f.properties[variable]).filter(v => v !== undefined && v !== null && v !== '')
            )).sort() as any[];
        }, [features, variable, isNumeric]);

        const getColor = (val: any): string => {
            if (val === undefined || val === null) return '#999999';
            if (isNumeric && colorScale) return (colorScale as any)(Number(val)).hex();
            if (vType === 'categorical') {
                if (partyColors && partyColors[String(val).trim()]) return partyColors[String(val).trim()];
                const idx = uniqueCategoricals.indexOf(val);
                return paletteArray[idx % paletteArray.length];
            }
            return '#999999';
        };

        const isVisible = (val: any): boolean => {
            if (!applyFilters) return true;
            if (val === undefined || val === null) return !hiddenNA;
            if (isNumeric && breaks.length > 0) {
                const num = Number(val);
                if (isSpecial) {
                    const idx = (breaks as number[]).indexOf(num);
                    return !hiddenIndices.includes(idx);
                } else {
                    const bks = breaks as number[];
                    let binIdx = -1;
                    for (let i = 0; i < bks.length - 1; i++) {
                        if (num >= bks[i] && (i === bks.length - 2 ? num <= bks[i + 1] : num < bks[i + 1])) {
                            binIdx = i; break;
                        }
                    }
                    if (binIdx === -1 && num === bks[bks.length - 1]) binIdx = bks.length - 2;
                    return !hiddenIndices.includes(binIdx);
                }
            }
            if (vType === 'categorical') {
                const idx = uniqueCategoricals.indexOf(val);
                return !hiddenIndices.includes(idx);
            }
            return true;
        };

        const formatVal = (val: any): string => {
            if (val === undefined || val === null) return 'N/A';
            if (isSpecial) return TYPE_MAPS[vType][val] ?? String(val);
            const num = Number(val);
            if (isNaN(num)) return String(val);
            if (vType === 'percentage') return `${num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
            if (vType === 'continuous') return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
            if (vType === 'discrete') return Math.floor(num).toLocaleString();
            return num.toLocaleString();
        };

        const featureCollection = useMemo(() => ({
            type: 'FeatureCollection' as const,
            features,
        }), [features]);

        const layerKey = `${paletteOverride}-${applyFilters}-${hiddenIndices.join(',')}-${hiddenNA}`;

        const paperStyle = (feature: any): L.PathOptions => {
            const val = obsData[feature?.properties?.state_id]?.[variable] ?? null;
            const visible = isVisible(val);
            return {
                fillColor: getColor(val),
                weight: visible ? 1 : 0,
                opacity: visible ? 1 : 0,
                color: '#333333',
                fillOpacity: visible ? 0.92 : 0,
            };
        };

        // Compute centroid + label icon for each feature
        const labelMarkers = useMemo(() => {
            if (!showStateLabels && !showValueLabels) return [];
            return features.flatMap(f => {
                const stateId = f.properties.state_id;
                const val = obsData[stateId]?.[variable] ?? null;
                if (!isVisible(val)) return [];
                try {
                    const center = L.geoJSON(f).getBounds().getCenter();
                    const nameLine = showStateLabels
                        ? `<div style="font-weight:700;color:#1e293b;line-height:1.2">${f.properties.name}</div>`
                        : '';
                    const valLine = showValueLabels
                        ? `<div style="font-weight:600;color:#475569;line-height:1.2">${formatVal(val)}</div>`
                        : '';
                    const icon = L.divIcon({
                        className: '',
                        html: `<div style="
                            font-family:system-ui,-apple-system,sans-serif;
                            font-size:8px;
                            text-align:center;
                            white-space:nowrap;
                            transform:translate(-50%,-50%);
                            text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff,0 0 3px #fff;
                            pointer-events:none;
                        ">${nameLine}${valLine}</div>`,
                        iconSize: [0, 0],
                        iconAnchor: [0, 0],
                    });
                    return [{ stateId, center, icon }];
                } catch {
                    return [];
                }
            });
        }, [features, obsData, variable, showStateLabels, showValueLabels, applyFilters, hiddenIndices, hiddenNA]);

        return (
            <div ref={ref} className="relative bg-white" style={{ width: '100%', height: '100%' }}>
                <MapContainer
                    center={[0, -60]}
                    zoom={3}
                    style={{ width: '100%', height: '100%', background: 'white' }}
                    zoomControl={false}
                    attributionControl={false}
                    dragging={false}
                    scrollWheelZoom={false}
                    doubleClickZoom={false}
                    touchZoom={false}
                    keyboard={false}
                >
                    <BoundsFitter features={features} />
                    <GeoJSON
                        key={layerKey}
                        data={featureCollection as any}
                        style={paperStyle}
                    />
                    {labelMarkers.map(({ stateId, center, icon }) => (
                        <Marker
                            key={`label-${stateId}-${layerKey}`}
                            position={center}
                            icon={icon}
                            interactive={false}
                            zIndexOffset={500}
                        />
                    ))}
                </MapContainer>

                {/* Title */}
                {mapTitle && (
                    <div
                        className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 px-4 py-1.5 rounded shadow-sm border border-slate-200"
                        style={{ pointerEvents: 'none' }}
                    >
                        <span className="text-sm font-bold text-slate-800">{mapTitle}</span>
                    </div>
                )}

                {/* Fixed source attribution */}
                <div
                    className="absolute bottom-3 left-3 z-[1000] bg-white/80 px-2 py-0.5 rounded text-[9px] text-slate-400 italic"
                    style={{ pointerEvents: 'none' }}
                >
                    {SOURCE_ATTRIBUTION}
                </div>

                {/* Legend */}
                <div
                    className="absolute bottom-3 right-3 z-[1000] bg-white border border-slate-200 rounded-lg shadow-md p-3 min-w-[140px] max-w-[200px]"
                    style={{ pointerEvents: 'none' }}
                >
                    <div className="mb-2">
                        <div className="text-[11px] font-bold text-slate-800 leading-tight">{prettyName || variable}</div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <div className={`flex items-center gap-1.5 ${applyFilters && hiddenNA ? 'opacity-30' : ''}`}>
                            <i className="w-4 h-2.5 rounded-sm border border-slate-300 shrink-0" style={{ background: '#999999' }} />
                            <span className={`text-[9px] font-medium text-slate-500 uppercase tracking-tight ${applyFilters && hiddenNA ? 'line-through' : ''}`}>{t('popup.notAvailable')}</span>
                        </div>

                        {isNumeric && colorScale && labels.length > 0 ? (
                            labels.map((lab, i) => (
                                <div key={i} className={`flex items-center gap-1.5 ${applyFilters && hiddenIndices.includes(i) ? 'opacity-30' : ''}`}>
                                    <i
                                        className="w-4 h-2.5 rounded-sm border border-slate-300 shrink-0"
                                        style={{ background: isSpecial ? colorScale(breaks[i]).hex() : colorScale(((breaks as number[])[i] + ((breaks as number[])[i + 1] || (breaks as number[])[i])) / 2).hex() }}
                                    />
                                    <span className={`text-[9px] font-bold text-slate-700 ${applyFilters && hiddenIndices.includes(i) ? 'line-through text-slate-400' : ''}`}>{lab}</span>
                                </div>
                            ))
                        ) : !isNumeric && uniqueCategoricals.length > 0 ? (
                            uniqueCategoricals.map((val: any, i: number) => (
                                <div key={val} className={`flex items-center gap-1.5 ${applyFilters && hiddenIndices.includes(i) ? 'opacity-30' : ''}`}>
                                    <i className="w-3 h-3 rounded-full border border-slate-300 shrink-0" style={{ background: getColor(val) }} />
                                    <span className={`text-[9px] font-bold text-slate-700 truncate ${applyFilters && hiddenIndices.includes(i) ? 'line-through text-slate-400' : ''}`}>{val}</span>
                                </div>
                            ))
                        ) : null}
                    </div>
                </div>
            </div>
        );
    }
);
