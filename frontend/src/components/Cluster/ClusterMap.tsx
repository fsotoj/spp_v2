import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CLUSTER_COLORS, CLUSTER_LABELS, type ClusterAssignment } from '../../services/clusterService';
import type { StateGeo, CountryGeo } from '../../api/hooks';
import { useTranslation } from 'react-i18next';

interface ClusterMapProps {
    geoData: StateGeo[];
    countries: CountryGeo[];
    selectedStateIds: number[];
    assignments: ClusterAssignment[];
    clusterK: number;
}

const NA_COLOR = '#e2e8f0';
const EXCLUDED_COLOR = '#f1f5f9';

function FitBounds({ stateIds, geoData, countries }: { stateIds: number[]; geoData: StateGeo[]; countries: CountryGeo[] }) {
    const map = useMap();
    useEffect(() => {
        if (stateIds.length === 0) return;
        const selected = geoData.filter(s => stateIds.includes(s.id));
        const countryIds = [...new Set(selected.map(s => s.country_id))];
        const bboxes = countries.filter(c => countryIds.includes(c.id)).map(c => c.bbox);
        if (bboxes.length === 0) return;
        const minLat = Math.min(...bboxes.map(b => b[1]));
        const maxLat = Math.max(...bboxes.map(b => b[3]));
        const minLng = Math.min(...bboxes.map(b => b[0]));
        const maxLng = Math.max(...bboxes.map(b => b[2]));
        map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [20, 20] });
    }, [stateIds.join(',')]);
    return null;
}

export function ClusterMap({ geoData, countries, selectedStateIds, assignments, clusterK }: ClusterMapProps) {
    const { t } = useTranslation();

    const assignmentMap = useMemo(() => {
        const m = new Map<number, string | null>();
        assignments.forEach(a => m.set(a.stateId, a.cluster));
        return m;
    }, [assignments]);

    const features = useMemo(() => {
        return geoData
            .filter(s => selectedStateIds.includes(s.id))
            .map(s => {
                try {
                    return {
                        id: s.id,
                        name: s.name,
                        cluster: assignmentMap.get(s.id) ?? null,
                        geometry: JSON.parse(s.geometry),
                    };
                } catch { return null; }
            })
            .filter(Boolean);
    }, [geoData, selectedStateIds, assignmentMap]);

    const usedLabels = CLUSTER_LABELS.slice(0, clusterK);

    return (
        <div className="relative w-full h-full">
            <MapContainer
                center={[-15, -65]}
                zoom={3}
                className="w-full h-full z-0"
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">Carto</a>'
                />
                <FitBounds stateIds={selectedStateIds} geoData={geoData} countries={countries} />

                {features.map(f => {
                    if (!f) return null;
                    const clusterIdx = f.cluster ? CLUSTER_LABELS.indexOf(f.cluster) : -1;
                    const fillColor = f.cluster === null
                        ? EXCLUDED_COLOR
                        : clusterIdx >= 0
                            ? CLUSTER_COLORS[clusterIdx]
                            : NA_COLOR;

                    return (
                        <GeoJSON
                            key={`${f.id}-${f.cluster}`}
                            data={{ type: 'Feature', geometry: f.geometry, properties: {} } as any}
                            style={() => ({
                                fillColor,
                                weight: f.cluster === null ? 1 : 1.5,
                                color: '#ffffff',
                                fillOpacity: f.cluster === null ? 0.3 : 0.82,
                            })}
                            onEachFeature={(_, layer) => {
                                const label = f.cluster
                                    ? `${t('cluster.cluster')} ${f.cluster}`
                                    : t('cluster.excludedShort');
                                layer.bindTooltip(`<strong>${f.name}</strong><br/>${label}`, {
                                    sticky: true,
                                    className: 'leaflet-tooltip-spp',
                                });
                            }}
                        />
                    );
                })}
            </MapContainer>

            {/* Legend */}
            {assignments.length > 0 && (
                <div className="absolute bottom-4 right-4 z-[900] bg-spp-bgLight border border-brand-100 rounded-xl shadow-sm p-3 flex flex-col gap-1.5">
                    {usedLabels.map((label, i) => (
                        <div key={label} className="flex items-center gap-2">
                            <span
                                className="w-3.5 h-3.5 rounded-sm shrink-0 inline-block"
                                style={{ backgroundColor: CLUSTER_COLORS[i] }}
                            />
                            <span className="text-[11px] font-bold text-spp-textDark">
                                {t('cluster.cluster')} {label}
                            </span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 mt-1 border-t border-slate-100 pt-1.5">
                        <span className="w-3.5 h-3.5 rounded-sm shrink-0 inline-block border border-slate-200" style={{ backgroundColor: EXCLUDED_COLOR }} />
                        <span className="text-[11px] text-spp-gray">{t('cluster.excludedShort')}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
