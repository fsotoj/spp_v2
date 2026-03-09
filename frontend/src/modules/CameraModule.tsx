import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { SidebarPortal } from '../components/Layout';
import {
    useCountries, useStatesGeo, usePartyColors,
    usePartyObservations, usePartyObservationYears,
    useStateObservation
} from '../api/hooks';
import { HemicycleChart, type PartyRow } from '../components/Camera/HemicycleChart';
import { extractSeats, toTitleCase } from '../components/Camera/CameraUtils';
import { CameraSidebar } from '../components/Camera/CameraSidebar';
import { CameraInfoPanel } from '../components/Camera/CameraInfoPanel';
import { CameraLegendPanel } from '../components/Camera/CameraLegendPanel';

const FALLBACK_COLOR = '#94a3b8';

// ── Main Module ──────────────────────────────────────────────────────────────

export function CameraModule() {
    const { t } = useTranslation();

    const [searchParams] = useSearchParams();
    const searchStateId = searchParams.get('stateId');
    const searchYear = searchParams.get('year');
    const searchChamber = searchParams.get('chamber');

    const [selectedStateId, setSelectedStateId] = useState<number | null>(searchStateId ? Number(searchStateId) : null);
    const [expandedCountries, setExpandedCountries] = useState<number[]>([]);
    const [year, setYear] = useState<number | null>(searchYear ? Number(searchYear) : 2015);
    const [chamber, setChamber] = useState<'1' | '2'>(searchChamber === '2' ? '2' : '1');
    const [isPlaying, setIsPlaying] = useState(false);
    const [highlightedParty, setHighlightedParty] = useState<string | null>(null);

    const { data: countries } = useCountries();
    const { data: allStates } = useStatesGeo();
    const { data: partyColorMap } = usePartyColors();
    
    const { data: availableYears, isFetching: isFetchingYears } = usePartyObservationYears(selectedStateId, chamber);
    const { data: upperChamberYears, isError: isErrorUpperYears } = usePartyObservationYears(selectedStateId, '2');
    // A state is unicameral if the upper chamber query explicitly returns an empty array or errors out (404 Not Found)
    const isUnicameral = isErrorUpperYears || (upperChamberYears !== undefined && upperChamberYears.length === 0);
    const { data: rawPartyRows, isFetching } = usePartyObservations(
        selectedStateId,
        year ?? 0,
        chamber,
    );
    const { data: stateObs } = useStateObservation(selectedStateId, year);

    // Default: select Mexico -> Nuevo Leon if no URL param was provided
    useEffect(() => {
        if (!countries || !allStates || selectedStateId !== null) return;
        if (searchStateId) return; // Skip default logic if a state was passed in via URL
        const mexico = countries.find(c => c.name === 'MEXICO');
        if (!mexico) return;
        
        // Find Nuevo Leon
        const nl = allStates.find(
            s => s.country_id === mexico.id && 
            (s.name.toUpperCase() === 'NUEVO LEÓN' || s.name.toUpperCase() === 'NUEVO LEON')
        );
        
        if (nl) {
            setSelectedStateId(nl.id);
        } else {
            // fallback
            const mexStates = allStates
                .filter(s => s.country_id === mexico.id)
                .sort((a, b) => a.name.localeCompare(b.name));
            if (mexStates.length > 0) setSelectedStateId(mexStates[0].id);
        }
    }, [countries, allStates, selectedStateId]);

    // When state or chamber changes, snap year to the closest lower one
    useEffect(() => {
        if (!availableYears || availableYears.length === 0) return;
        setYear(prev => {
            if (prev === null) return availableYears[availableYears.length - 1];
            
            let closestLower = availableYears[0];
            for (const y of availableYears) {
                if (y <= prev) closestLower = y;
                else break;
            }
            return closestLower;
        });
    }, [availableYears]);

    // When chamber or state changes, stop playback
    useEffect(() => {
        setIsPlaying(false);
    }, [chamber, selectedStateId]);

    // If state becomes unicameral but we are in upper chamber, force switch to lower chamber
    useEffect(() => {
        if (isUnicameral && chamber === '2') {
            setChamber('1');
        }
    }, [isUnicameral, chamber]);

    // Playback: advance through available years, stop at the last one
    useEffect(() => {
        if (!isPlaying || !availableYears || availableYears.length === 0) return;
        const interval = setInterval(() => {
            setYear(prev => {
                const idx = prev !== null ? availableYears.indexOf(prev) : -1;
                // If not found (shouldn't happen after snapping), start from beginning
                if (idx === -1) return availableYears[0];
                if (idx >= availableYears.length - 1) {
                    setIsPlaying(false);
                    return prev;
                }
                return availableYears[idx + 1];
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isPlaying, availableYears]);

    const handleSelectState = (id: number) => {
        // Only set expanded countries, but don't force year change here unless desired
        setSelectedStateId(id);
        const state = allStates?.find(s => s.id === id);
        if (state && !expandedCountries.includes(state.country_id)) {
            setExpandedCountries(prev => [...prev, state.country_id]);
        }
    };

    // ── Derived data ────────────────────────────────────────────────────────

    const parties: PartyRow[] = useMemo(() => {
        if (!rawPartyRows || rawPartyRows.length === 0) return [];
        // Aggregate seats per party — ARG election years have two cohorts for the
        // same party (is_carryover=0 and is_carryover=1); we sum them for the full
        // chamber composition. BRA/MEX only ever have one row per party.
        const partyMap = new Map<string, { seats: number; color: string }>();
        for (const row of rawPartyRows) {
            const name: string = row.party_name ?? '';
            if (!name) continue;
            const seats = extractSeats(row);
            if (seats <= 0) continue;
            const color = (partyColorMap?.[name]) ?? FALLBACK_COLOR;
            const existing = partyMap.get(name);
            if (existing) existing.seats += seats;
            else partyMap.set(name, { seats, color });
        }
        return Array.from(partyMap.entries())
            .map(([party_name, { seats, color }]) => ({ party_name, seats, color }))
            .sort((a, b) => b.seats - a.seats);
    }, [rawPartyRows, partyColorMap]);

    const totalSeats = useMemo(() => parties.reduce((s, p) => s + p.seats, 0), [parties]);

    const chamberMeta = useMemo(() => {
        if (!rawPartyRows || rawPartyRows.length === 0) return null;
        const getVal = (key: string) => {
            for (const row of rawPartyRows) {
                const v = row[key];
                if (v != null && v !== '') return v;
            }
            return null;
        };
        return {
            totalChamberSeats: getVal('total_chamber_seats_sub_leg') ?? getVal('total_chamber_seats_sub_leg_1'),
            seatsInContest: getVal('total_seats_in_contest_sub_leg'),
            renewalType: getVal('renewal_type_sub_leg'),
            electoralSystem: getVal('electoral_system_sub_leg'),
            partiesContesting: getVal('num_parties_election_contest_sub_leg'),
            enpl: getVal('enp_sub_leg'),
        };
    }, [rawPartyRows]);

    const selectedStateName = allStates?.find(s => s.id === selectedStateId)?.name ?? '';
    const chamberLabel = chamber === '1' ? t('map.lowerChamber') : t('map.upperChamber');

    const chartTitle = selectedStateName
        ? toTitleCase(selectedStateName)
        : '';
    const chartSubtitle = parties.length > 0
        ? `${year} · ${chamberLabel} · ${totalSeats} ${t('camera.seats')}`
        : '';

    return (
        <div className="w-full h-full flex animate-in fade-in duration-500 ease-out fill-mode-forwards">
            <SidebarPortal>
                <CameraSidebar
                    chamber={chamber}
                    setChamber={setChamber}
                    isUnicameral={isUnicameral}
                    year={year}
                    setYear={(y: number) => setYear(y)}
                    isPlaying={isPlaying}
                    setIsPlaying={setIsPlaying}
                    availableYears={availableYears}
                    isFetchingYears={isFetchingYears}
                    countries={countries}
                    allStates={allStates}
                    selectedStateId={selectedStateId}
                    onSelectState={handleSelectState}
                    expandedCountries={expandedCountries}
                    setExpandedCountries={setExpandedCountries}
                    isFetching={isFetching}
                />
            </SidebarPortal>

            {/* ── Main area: chart (flex-1) + legend panel ── */}
            <div className="w-full h-full flex flex-col md:flex-row overflow-hidden bg-spp-bgMuted">

                {/* Chart Area */}
                <div className="flex-1 relative overflow-hidden min-w-0">
                    <div className="absolute inset-0 flex items-start justify-center pt-2 md:pt-4 pb-2 px-2 md:px-4">
                        {parties.length > 0 ? (
                            <HemicycleChart
                                parties={parties}
                                highlightedParty={highlightedParty}
                                onPartyHover={setHighlightedParty}
                                title={chartTitle}
                                subtitle={chartSubtitle}
                            />
                        ) : (
                            <div className="text-center text-slate-400 space-y-2 px-8">
                                {isFetching || isFetchingYears ? (
                                    <div className="text-sm font-medium animate-pulse text-brand-500">
                                        {t('map.fetchingData')}
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-4xl">🏛</div>
                                        <div className="text-sm font-bold text-slate-500">{t('camera.noData')}</div>
                                        <div className="text-xs text-slate-400 max-w-xs mx-auto">{t('camera.noDataHint')}</div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right/Bottom Panel: Data / Legend */}
                {Object.keys(parties).length > 0 && (
                    <aside className="w-full md:w-64 h-[45vh] md:h-full shrink-0 p-2 md:p-4 border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50 relative z-10 flex flex-row md:flex-col gap-2 md:gap-4 overflow-hidden">
                        <CameraInfoPanel
                            chamberMeta={chamberMeta}
                            stateObs={stateObs}
                        />
                        <CameraLegendPanel
                            chamberLabel={chamberLabel}
                            parties={parties}
                            highlightedParty={highlightedParty}
                            setHighlightedParty={setHighlightedParty}
                        />
                    </aside>
                )}
            </div>
        </div>
    );
}

