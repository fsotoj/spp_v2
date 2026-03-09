import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause } from 'lucide-react';
import { SidebarPortal } from '../components/Layout';
import {
    useCountries, useStatesGeo, usePartyColors,
    usePartyObservations, usePartyObservationYears,
} from '../api/hooks';
import { HemicycleChart, type PartyRow } from '../components/Camera/HemicycleChart';
import { GeographySingleGroup } from '../components/Camera/GeographySingleGroup';

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractSeats(row: any): number {
    const v = row['total_seats_party_sub_leg'];
    if (v != null && !isNaN(Number(v))) return Math.round(Number(v));
    return 0;
}

// Common Spanish/Portuguese short words (≤4 chars) that must NOT be treated as abbreviations.
const SPA_POR_WORDS = new Set([
    // Spanish articles, prepositions, conjunctions
    'EL', 'LA', 'LOS', 'LAS', 'UN', 'UNA',
    'DE', 'DEL', 'EN', 'AL', 'POR', 'CON', 'SIN',
    'Y', 'O', 'E', 'NI', 'U', 'A',
    // Portuguese articles, prepositions, conjunctions
    'DO', 'DA', 'DOS', 'DAS', 'EM', 'NO', 'NA', 'NOS', 'NAS',
    'OU', 'MAS', 'COM', 'PARA', 'NOVO'
]);

/** Title-cases a party name, preserving abbreviations (≤4 all-caps letters, not a common word)
 *  and hyphen-joined coalition codes (e.g. PAN-PRI-PRD). */
function toPartyTitleCase(name: string): string {
    if (/^[A-Z]{2,}(-[A-Z]{2,})+$/.test(name)) return name; // full coalition string
    return name.split(' ').map(word => {
        if (/^[A-Z]{2,}(-[A-Z]{2,})+$/.test(word)) return word;                         // inline coalition
        if (/^[A-Z]{1,4}$/.test(word) && !SPA_POR_WORDS.has(word)) return word;          // abbreviation
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

const FALLBACK_COLOR = '#94a3b8';

// ── Main Module ──────────────────────────────────────────────────────────────

export function CameraModule() {
    const { t } = useTranslation();

    const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
    const [expandedCountries, setExpandedCountries] = useState<number[]>([]);
    const [year, setYear] = useState<number | null>(null);
    const [chamber, setChamber] = useState<'1' | '2'>('1');
    const [isPlaying, setIsPlaying] = useState(false);
    const [highlightedParty, setHighlightedParty] = useState<string | null>(null);

    const { data: countries } = useCountries();
    const { data: allStates } = useStatesGeo();
    const { data: partyColorMap } = usePartyColors();
    const { data: availableYears, isFetching: isFetchingYears } = usePartyObservationYears(selectedStateId, chamber);
    const { data: rawPartyRows, isFetching } = usePartyObservations(
        selectedStateId,
        year ?? 0,
        chamber,
    );

    // Default: expand Mexico, select its first state
    useEffect(() => {
        if (!countries || !allStates || selectedStateId !== null) return;
        const mexico = countries.find(c => c.name === 'MEXICO');
        if (!mexico) return;
        setExpandedCountries([mexico.id]);
        const mexStates = allStates
            .filter(s => s.country_id === mexico.id)
            .sort((a, b) => a.name.localeCompare(b.name));
        if (mexStates.length > 0) setSelectedStateId(mexStates[0].id);
    }, [countries, allStates, selectedStateId]);

    // When state or chamber changes, snap year to most recent available
    useEffect(() => {
        if (!availableYears || availableYears.length === 0) return;
        const mostRecent = availableYears[availableYears.length - 1];
        setYear(prev => {
            if (prev !== null && availableYears.includes(prev)) return prev;
            return mostRecent;
        });
    }, [availableYears]);

    // When chamber or state changes, stop playback and reset year
    useEffect(() => {
        setIsPlaying(false);
        setYear(null);
    }, [chamber, selectedStateId]);

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
        setSelectedStateId(id);
        // Auto-expand the country that owns this state
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
            totalChamberSeats: getVal('total_chamber_seats_sub_leg'),
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
        ? selectedStateName.charAt(0) + selectedStateName.slice(1).toLowerCase()
        : '';
    const chartSubtitle = parties.length > 0
        ? `${year} · ${chamberLabel} · ${totalSeats} ${t('camera.seats')}`
        : '';

    return (
        <>
            {/* ── Sidebar ── */}
            <SidebarPortal>
                <div className="flex flex-col gap-6 p-6 pb-20 bg-spp-bgMuted">

                    {/* Chamber toggle */}
                    <div>
                        <label className="block text-xs font-bold text-spp-gray uppercase tracking-wider mb-2">
                            {t('camera.chamber')}
                        </label>
                        <div className="flex rounded-lg overflow-hidden border border-slate-200 shadow-inner">
                            {(['1', '2'] as const).map(ch => (
                                <button
                                    key={ch}
                                    onClick={() => setChamber(ch)}
                                    className={`flex-1 py-2 text-xs font-bold transition-all ${chamber === ch
                                            ? 'bg-brand-600 text-white shadow-sm'
                                            : 'bg-spp-bgLight text-slate-500 hover:bg-slate-100'
                                        }`}
                                >
                                    {ch === '1' ? t('map.lowerChamber') : t('map.upperChamber')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Year selector — slider over available years + play button */}
                    <div>
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            <div className="flex items-center gap-2">
                                <span>{t('camera.year')}</span>
                                {availableYears && availableYears.length > 1 && (
                                    <button
                                        onClick={() => setIsPlaying(p => !p)}
                                        className={`flex items-center justify-center p-1 rounded-full transition-all ${isPlaying ? 'bg-brand-100 text-brand-600 shadow-sm' : 'hover:bg-slate-100 text-slate-400'}`}
                                        title={isPlaying ? t('map.pauseAnimation') : t('map.playAnimation')}
                                    >
                                        {isPlaying
                                            ? <Pause size={14} fill="currentColor" />
                                            : <Play size={14} fill="currentColor" />}
                                    </button>
                                )}
                            </div>
                            <span className="text-spp-purple font-black text-sm tabular-nums">
                                {year ?? '—'}
                            </span>
                        </div>
                        {isFetchingYears ? (
                            <div className="text-xs text-brand-500 animate-pulse">{t('map.fetchingData')}</div>
                        ) : availableYears && availableYears.length > 0 ? (
                            <>
                                <input
                                    type="range"
                                    min={availableYears[0]}
                                    max={availableYears[availableYears.length - 1]}
                                    value={year ?? availableYears[availableYears.length - 1]}
                                    onChange={e => {
                                        setIsPlaying(false);
                                        const v = Number(e.target.value);
                                        const nearest = availableYears.reduce((a, b) =>
                                            Math.abs(b - v) < Math.abs(a - v) ? b : a
                                        );
                                        setYear(nearest);
                                    }}
                                    onMouseDown={() => setIsPlaying(false)}
                                    step={1}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 focus:outline-none"
                                />
                                {/* Custom tick marks at each available year */}
                                {availableYears.length > 1 && (
                                    <div className="relative h-3 mt-0.5 mx-[7px]">
                                        {availableYears.map(y => {
                                            const pct = ((y - availableYears[0]) / (availableYears[availableYears.length - 1] - availableYears[0])) * 100;
                                            const isActive = y === year;
                                            return (
                                                <div
                                                    key={y}
                                                    className={`absolute top-0.5 w-1.5 h-1.5 rounded-full -translate-x-1/2 transition-colors ${isActive ? 'bg-spp-purple' : 'bg-brand-400'}`}
                                                    style={{ left: `${pct}%` }}
                                                    title={String(y)}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        ) : selectedStateId !== null ? (
                            <div className="text-xs text-slate-400 italic">{t('camera.noData')}</div>
                        ) : null}
                    </div>

                    {/* Geography tree — single select */}
                    <div>
                        <label className="block text-xs font-bold text-spp-gray uppercase tracking-wider mb-2">
                            {t('map.geography')}
                        </label>
                        <div className="bg-spp-bgLight border border-slate-200 rounded-lg overflow-hidden shadow-inner flex flex-col">
                            {countries?.map(country => (
                                <GeographySingleGroup
                                    key={country.id}
                                    country={country}
                                    allStates={allStates || []}
                                    selectedStateId={selectedStateId}
                                    onSelectState={handleSelectState}
                                    isExpanded={expandedCountries.includes(country.id)}
                                    onToggleExpand={() =>
                                        setExpandedCountries(prev =>
                                            prev.includes(country.id)
                                                ? prev.filter(id => id !== country.id)
                                                : [...prev, country.id]
                                        )
                                    }
                                />
                            ))}
                        </div>
                    </div>

                    {isFetching && (
                        <div className="text-xs text-brand-600 font-medium animate-pulse">
                            {t('map.fetchingData')}
                        </div>
                    )}
                </div>
            </SidebarPortal>

            {/* ── Main area: chart (flex-1) + legend panel (fixed w-52) ── */}
            <div className="w-full h-full flex overflow-hidden bg-spp-bgMuted">

                {/* Chart */}
                <div className="flex-1 flex items-start justify-center p-4 md:p-8 overflow-hidden min-w-0">
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

                {/* Legend panel */}
                {parties.length > 0 && (
                    <aside className="w-52 shrink-0 border-l border-slate-200 bg-spp-bgLight flex flex-col overflow-hidden">
                        <div className="px-4 pt-4 pb-2 border-b border-slate-100">
                            <div className="text-[10px] font-black text-brand-600 uppercase tracking-[0.12em]">
                                {chamberLabel}
                            </div>
                            <div className="text-[11px] font-bold text-slate-700 mt-0.5 tabular-nums">
                                {totalSeats} {t('camera.seats')}
                            </div>
                        </div>

                        {chamberMeta && (() => {
                            const RENEWAL: Record<string, string> = {
                                '1': t('popup.staggeredEvery2Years'),
                                '2': t('popup.fullRenewal'),
                            };
                            const SYSTEM: Record<string, string> = {
                                '1': t('popup.proportionalRepresentation'),
                                '2': t('popup.simpleMajority'),
                                '3': t('popup.mixedPRMajority'),
                                '4': t('popup.mixedPRDistricts'),
                            };
                            const fmt = (v: any) => v != null ? String(v) : '—';
                            const fmtNum = (v: any) => v != null && !isNaN(Number(v)) ? Number(v).toFixed(2) : '—';
                            const fmtCode = (map: Record<string, string>, v: any) =>
                                v != null ? (map[String(Math.round(Number(v)))] ?? fmt(v)) : '—';
                            const rows: [string, string][] = [
                                [t('camera.seatsInContest'), fmt(chamberMeta.seatsInContest)],
                                [t('camera.renewalType'), fmtCode(RENEWAL, chamberMeta.renewalType)],
                                [t('camera.electoralSystem'), fmtCode(SYSTEM, chamberMeta.electoralSystem)],
                                [t('camera.partiesContesting'), fmt(chamberMeta.partiesContesting)],
                                [t('camera.enpl'), fmtNum(chamberMeta.enpl)],
                            ];
                            return (
                                <div className="px-3 py-2 border-b border-slate-100 space-y-1">
                                    {rows.map(([label, value]) => (
                                        <div key={label} className="flex justify-between gap-1">
                                            <span className="text-[9px] font-bold text-spp-gray leading-tight shrink-0">{label}</span>
                                            <span className="text-[9px] font-semibold text-spp-textDark text-right leading-tight">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}

                        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
                            {parties.map(party => {
                                const isActive = highlightedParty === null || party.party_name === highlightedParty;
                                return (
                                    <div
                                        key={party.party_name}
                                        className={`flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-slate-50 transition-all ${!isActive ? 'opacity-25' : ''}`}
                                        onMouseEnter={() => setHighlightedParty(party.party_name)}
                                        onMouseLeave={() => setHighlightedParty(null)}
                                    >
                                        <i
                                            className="w-3 h-3 rounded-full shrink-0 border border-white/60 shadow-sm"
                                            style={{ background: party.color }}
                                        />
                                        <span
                                            className="text-[10px] font-semibold text-slate-700 truncate flex-1 leading-tight"
                                            title={party.party_name}
                                        >
                                            {toPartyTitleCase(party.party_name)}
                                        </span>
                                        <span className="text-[10px] font-black text-brand-600 tabular-nums shrink-0">
                                            {party.seats}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="px-4 py-2 border-t border-slate-100 bg-spp-bgMuted">
                            <div className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">
                                SLED
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </>
    );
}
