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
    const [showCarryover, setShowCarryover] = useState(false);
    const [groupCoalitions, setGroupCoalitions] = useState(false);

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

    // Detect the country of the selected state
    const selectedCountryName = useMemo(() => {
        if (!selectedStateId || !allStates || !countries) return null;
        const state = allStates.find(s => s.id === selectedStateId);
        const country = countries.find(c => c.id === state?.country_id);
        return country?.name?.toUpperCase() ?? null;
    }, [selectedStateId, allStates, countries]);

    const isArgentina = selectedCountryName === 'ARGENTINA';
    const isMexico = selectedCountryName === 'MEXICO';

    // Reset filters when country changes
    useEffect(() => {
        setShowCarryover(false);
        setGroupCoalitions(false);
    }, [selectedCountryName]);

    const handleSelectState = (id: number) => {
        // Only set expanded countries, but don't force year change here unless desired
        setSelectedStateId(id);
        const state = allStates?.find(s => s.id === id);
        if (state && !expandedCountries.includes(state.country_id)) {
            setExpandedCountries(prev => [...prev, state.country_id]);
        }
    };

    // ── Derived data ────────────────────────────────────────────────────────

    // Cohort-split party rows used for the hemicycle.
    // ARG: one entry per (party, is_carryover, origin_year) cohort — same color, contiguous dots.
    // MEX/BRA: one entry per party (no cohort splitting needed).
    const partyRows: PartyRow[] = useMemo(() => {
        if (!rawPartyRows || rawPartyRows.length === 0) return [];

        type CohortEntry = {
            seats: number; color: string;
            votes: number | null;
            is_carryover: 0 | 1 | null; origin_year: number | null;
            is_coalition: 0 | 1 | null; coalition_name: string | null;
        };
        const cohortMap = new Map<string, CohortEntry>();

        for (const row of rawPartyRows) {
            const name: string = row.party_name ?? '';
            if (!name) continue;
            const seats = extractSeats(row);
            if (seats <= 0) continue;

            const isCarryover: 0 | 1 | null = row.is_carryover != null
                ? (Number(row.is_carryover) as 0 | 1) : null;
            const originYear: number | null = row.origin_year != null
                ? Number(row.origin_year) : null;

            // ARG rows have is_carryover set; split by cohort. BRA/MEX key by name only.
            const key = isCarryover != null
                ? `${name}|${isCarryover}|${originYear ?? ''}`
                : name;

            const rawVotes = row['total_votes_party_sub_leg'];
            const votes: number | null = (isCarryover !== 1 && rawVotes != null && !isNaN(Number(rawVotes)))
                ? Number(rawVotes) : null;

            const color = (partyColorMap?.[name]) ?? FALLBACK_COLOR;
            const existing = cohortMap.get(key);
            if (existing) {
                existing.seats += seats;
            } else {
                cohortMap.set(key, {
                    seats, color, votes,
                    is_carryover: isCarryover,
                    origin_year: originYear,
                    is_coalition: row.is_coalition != null ? (Number(row.is_coalition) as 0 | 1) : null,
                    coalition_name: row.coalition_name ?? null,
                });
            }
        }

        // Compute total seats per canonical party name for sorting
        const partyTotals = new Map<string, number>();
        for (const [key, entry] of cohortMap) {
            const canonName = key.split('|')[0];
            partyTotals.set(canonName, (partyTotals.get(canonName) ?? 0) + entry.seats);
        }

        return Array.from(cohortMap.entries())
            .map(([key, entry]) => ({ party_name: key.split('|')[0], ...entry }))
            .sort((a, b) => {
                const totalDiff = (partyTotals.get(b.party_name) ?? 0) - (partyTotals.get(a.party_name) ?? 0);
                if (totalDiff !== 0) return totalDiff;
                // Within same party: new seats (0) before carryover (1)
                return (a.is_carryover ?? 0) - (b.is_carryover ?? 0);
            });
    }, [rawPartyRows, partyColorMap]);

    // Apply active filters to produce the final rows passed to the chart
    const filteredRows: PartyRow[] = useMemo(() => {
        let rows = partyRows;

        // ARG: merge ALL cohorts (new + carryover) per party when carryover display is off,
        // so we see the full chamber composition without cohort distinction
        if (isArgentina && !showCarryover) {
            const merged = new Map<string, PartyRow>();
            for (const p of rows) {
                const ex = merged.get(p.party_name);
                if (ex) ex.seats += p.seats;
                else merged.set(p.party_name, { ...p, is_carryover: null });
            }
            rows = Array.from(merged.values()).sort((a, b) => b.seats - a.seats);
        }

        // MEX: merge coalition parties under the coalition name
        if (isMexico && groupCoalitions) {
            const merged = new Map<string, PartyRow>();
            for (const p of rows) {
                if (p.is_coalition === 1 && p.coalition_name) {
                    const existing = merged.get(p.coalition_name);
                    if (existing) {
                        existing.seats += p.seats;
                    } else {
                        merged.set(p.coalition_name, { ...p, party_name: p.coalition_name });
                    }
                } else {
                    merged.set(p.party_name, { ...p });
                }
            }
            rows = Array.from(merged.values()).sort((a, b) => b.seats - a.seats);
        }

        // ARG with carryover visible: group all new-seat cohorts before all carryover cohorts
        // so the hemicycle renders new seats on the left and carryover on the right
        if (isArgentina && showCarryover) {
            const hasAnyCarryover = rows.some(p => p.is_carryover === 1);
            if (hasAnyCarryover) {
                const totals = new Map<string, number>();
                for (const p of rows) totals.set(p.party_name, (totals.get(p.party_name) ?? 0) + p.seats);
                const byTotal = (a: PartyRow, b: PartyRow) =>
                    (totals.get(b.party_name) ?? 0) - (totals.get(a.party_name) ?? 0);
                rows = [
                    ...rows.filter(p => p.is_carryover !== 1).sort(byTotal),
                    ...rows.filter(p => p.is_carryover === 1).sort(byTotal),
                ];
            }
        }

        return rows;
    }, [partyRows, isArgentina, isMexico, showCarryover, groupCoalitions]);

    // Legend rows: aggregated by party_name (one entry per party, total seats)
    const legendRows: PartyRow[] = useMemo(() => {
        const map = new Map<string, PartyRow>();
        for (const p of filteredRows) {
            const ex = map.get(p.party_name);
            if (ex) ex.seats += p.seats;
            else map.set(p.party_name, { ...p });
        }
        return Array.from(map.values()).sort((a, b) => b.seats - a.seats);
    }, [filteredRows]);

    const totalSeats = useMemo(() => filteredRows.reduce((s, p) => s + p.seats, 0), [filteredRows]);

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
    const chartSubtitle = filteredRows.length > 0
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
                    isArgentina={isArgentina}
                    isMexico={isMexico}
                    showCarryover={showCarryover}
                    onToggleCarryover={() => setShowCarryover(v => !v)}
                    groupCoalitions={groupCoalitions}
                    onToggleGroupCoalitions={() => setGroupCoalitions(v => !v)}
                />
            </SidebarPortal>

            {/* ── Main area: chart (flex-1) + legend panel ── */}
            <div className="w-full h-full flex flex-col md:flex-row overflow-hidden bg-spp-bgMuted">

                {/* Chart Area */}
                <div className="flex-1 relative overflow-hidden min-w-0">
                    <div className="absolute inset-0 flex items-start justify-center pt-2 md:pt-4 pb-2 px-2 md:px-4">
                        {filteredRows.length > 0 ? (
                            <HemicycleChart
                                parties={filteredRows}
                                highlightedParty={highlightedParty}
                                onPartyHover={setHighlightedParty}
                                title={chartTitle}
                                subtitle={chartSubtitle}
                                coalitionsGrouped={groupCoalitions}
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
                {filteredRows.length > 0 && (
                    <aside className="w-full md:w-64 h-[45vh] md:h-full shrink-0 p-2 md:p-4 border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50 relative z-10 flex flex-row md:flex-col gap-2 md:gap-4 overflow-hidden">
                        <CameraInfoPanel
                            chamberMeta={chamberMeta}
                            stateObs={stateObs}
                        />
                        <CameraLegendPanel
                            chamberLabel={chamberLabel}
                            parties={legendRows}
                            highlightedParty={highlightedParty}
                            setHighlightedParty={setHighlightedParty}
                            coalitionsGrouped={groupCoalitions}
                        />
                    </aside>
                )}
            </div>
        </div>
    );
}

