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
    pretty_name_es: string | null;
    dataset_es: string | null;
    description_for_ui_es: string | null;
    add_indices_es: string | null;
    pretty_name_de: string | null;
    dataset_de: string | null;
    description_for_ui_de: string | null;
    add_indices_de: string | null;
    pretty_name_pt: string | null;
    dataset_pt: string | null;
    description_for_ui_pt: string | null;
    add_indices_pt: string | null;
    viewable_graph: number | null;
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

// ── Party Observation Queries ────────────────────────────────────────────────

export function usePartyObservations(
    stateId: number | null,
    year: number,
    chamber: string,
) {
    return useQuery({
        queryKey: ['party-observations', stateId, year, chamber],
        queryFn: async () => {
            const { data } = await apiClient.get<any[]>(
                `/data/party-observations?dataset=SLED&state_id=${stateId}&year_min=${year}&year_max=${year}&chamber=${chamber}`
            );
            return data;
        },
        enabled: stateId !== null && !!year && !!chamber,
        placeholderData: (prev) => prev,
    });
}

export function usePartyObservationYears(
    stateId: number | null,
    chamber: string,
) {
    return useQuery({
        queryKey: ['party-observation-years', stateId, chamber],
        queryFn: async () => {
            const { data } = await apiClient.get<number[]>(
                `/data/party-observation-years?state_id=${stateId}&chamber=${chamber}`
            );
            return data; // sorted asc from backend
        },
        enabled: stateId !== null && !!chamber,
        staleTime: 1000 * 60 * 60,
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

// ── State Observation (Governor, Meta, etc) ──────────────────────────────────

export function useStateObservation(stateId: number | null, year: number | null) {
    return useQuery({
        queryKey: ['state-observation', stateId, year],
        queryFn: async () => {
            if (!stateId || !year) return null;
            
            // To properly resolve the "closest year", we must fetch SED and SLED separately.
            // A legislative election year (SLED) may not perfectly align with the executive one (SED).
            const [resSled, resSed, resSeed] = await Promise.all([
                apiClient.get<any[]>(`/data/observations?dataset=SLED,SLED_SNAPSHOT&state_id=${stateId}`).catch(() => ({ data: [] })),
                apiClient.get<any[]>(`/data/observations?dataset=SED&state_id=${stateId}`).catch(() => ({ data: [] })),
                apiClient.get<any[]>(`/data/observations?dataset=SEED&state_id=${stateId}`).catch(() => ({ data: [] }))
            ]);
            
            const sledData = resSled.data || [];
            const sedData = [...(resSed.data || []), ...(resSeed.data || [])];
            
            console.log(`[useStateObservation] stateId: ${stateId}, year: ${year}`);
            console.log(`[useStateObservation] Raw SLED Data length:`, sledData.length);
            console.log(`[useStateObservation] Raw SED/SEED Data length:`, sedData.length, sedData);
            
            if (sledData.length === 0 && sedData.length === 0) return null;
            
            // Helper to find the exact or closest past year row
            const findBestRow = (data: any[]) => {
                if (!data.length) return {};
                let row = data.find((r: any) => r.year === year);
                if (row) return row;
                const pastYears = data.filter((r: any) => r.year <= year).sort((a: any, b: any) => b.year - a.year);
                if (pastYears.length > 0) return pastYears[0];
                return data[0] || {};
            };

            const bestSled = findBestRow(sledData);
            const bestSed = findBestRow(sedData);
            
            console.log(`[useStateObservation] Best SED Row selected:`, bestSed);

            return { ...bestSled, ...bestSed };
        },
        enabled: stateId !== null && year !== null,
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}

// ── Time-series Observations (Graph tool) ────────────────────────────────────

export interface TimeSeriesRow {
    state_id: number;
    year: number;
    [variable: string]: number | null;
}

export function useObservationsTimeSeries(
    dataset: string,
    stateIds: number[],
    yearMin: number,
    yearMax: number,
) {
    const stateParam = stateIds.map(id => `state_id=${id}`).join('&');
    return useQuery({
        queryKey: ['observations-ts', dataset, stateIds.slice().sort().join(','), yearMin, yearMax],
        queryFn: async () => {
            const url = `/data/observations?dataset=${dataset}&${stateParam}&year_min=${yearMin}&year_max=${yearMax}`;
            const { data } = await apiClient.get<any[]>(url);
            return data as TimeSeriesRow[];
        },
        enabled: !!dataset && stateIds.length > 0 && !!yearMin && !!yearMax,
        placeholderData: (prev) => prev,
        staleTime: 1000 * 60 * 5,
    });
}
