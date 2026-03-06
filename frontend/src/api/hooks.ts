import { useQuery } from '@tanstack/react-query';
import apiClient from './client';

export interface VariableDict {
    id: number;
    variable: string;
    pretty_name: string | null;
    dataset: string | null;
    type: string;
    category: string | null;
    viewable_map: number | null;
    palette: string | null;
    description_for_ui: string | null;
    add_indices: string | null;
}

export interface StateGeo {
    id: number;
    country_id: number;
    country_state_code: string;
    name: string;
    geometry: string; // GeoJSON string
}

export interface CountryGeo {
    id: number;
    name: string;
    code: string | null;
    bbox: [number, number, number, number];
}

export interface PartyColor {
    party_name: string;
    color: string;
}

// ── Metadata Queries ────────────────────────────────────────────────────────

export function useCountries() {
    return useQuery({
        queryKey: ['countries'],
        queryFn: async () => {
            const { data } = await apiClient.get<CountryGeo[]>('/metadata/geography/countries');
            return data;
        },
        staleTime: Infinity,
    });
}

export function useVariables() {
    return useQuery({
        queryKey: ['variables'],
        queryFn: async () => {
            const { data } = await apiClient.get<VariableDict[]>('/metadata/variables');
            return data;
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}

export function useStatesGeo() {
    return useQuery({
        queryKey: ['geography', 'states'],
        queryFn: async () => {
            const { data } = await apiClient.get<StateGeo[]>('/metadata/geography/states');
            return data;
        },
        staleTime: Infinity, // never changes during session
    });
}

export function usePartyColors() {
    return useQuery({
        queryKey: ['partyColors'],
        queryFn: async () => {
            const [exeRes, legRes] = await Promise.all([
                apiClient.get<PartyColor[]>('/metadata/party-colors/exe'),
                apiClient.get<PartyColor[]>('/metadata/party-colors/leg')
            ]);

            const colorMap: Record<string, string> = {};
            [...exeRes.data, ...legRes.data].forEach(p => {
                if (p.party_name && p.party_name.length > 0) {
                    colorMap[p.party_name] = p.color;
                }
            });
            return colorMap;
        },
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
    });
}

// ── Observation Queries ─────────────────────────────────────────────────────

export function useObservations(dataset: string, yearMin: number, yearMax: number) {
    return useQuery({
        queryKey: ['observations', dataset, yearMin, yearMax],
        queryFn: async () => {
            const url = `/data/observations?dataset=${dataset}&year_min=${yearMin}&year_max=${yearMax}`;
            console.log(`[useObservations] Fetching URL: ${url}`);
            const { data } = await apiClient.get<any[]>(url);
            console.log(`[useObservations] Received ${data.length} rows from API. First row:`, data[0]);

            // Index by state_id for faster O(1) mapping into GeoJSON
            const indexed: Record<number, any> = {};
            data.forEach(row => {
                indexed[row.state_id] = row;
            });
            return indexed;
        },
        enabled: !!dataset && !!yearMin && !!yearMax,
        placeholderData: (previousData) => previousData,
    });
}
