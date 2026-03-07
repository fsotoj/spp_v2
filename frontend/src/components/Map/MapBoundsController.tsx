import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { CountryGeo, StateGeo } from '../../api/hooks';

/**
 * Component that synchronizes map viewport bounds with the active selection.
 * Automatically zooms/pans when states are added or removed.
 */
export function MapBoundsController({ selectedStateIds, geoData, countries }: { selectedStateIds: number[], geoData: StateGeo[], countries: CountryGeo[] }) {
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
