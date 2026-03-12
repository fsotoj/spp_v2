import React from 'react';
import { useTranslation } from 'react-i18next';
import { VariableTreeGroup } from '../Map/VariableTreeGroup';
import { GeographyTreeGroup } from '../Map/GeographyTreeGroup';
import type { CountryGeo, StateGeo } from '../../api/hooks';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GraphSidebarProps {
    // Geography
    countries: CountryGeo[] | undefined;
    allStates: StateGeo[] | undefined;
    selectedStateIds: number[];
    onToggleState: (id: number) => void;
    onToggleCountry: (ids: number[], force: boolean) => void;
    expandedCountries: number[];
    setExpandedCountries: React.Dispatch<React.SetStateAction<number[]>>;

    // Variable
    groupedVariables: any[];
    variable: string;
    onSelectVariable: (v: string) => void;
    lang: string;

    // Year range
    yearMin: number;
    yearMax: number;
    onYearMinChange: (y: number) => void;
    onYearMaxChange: (y: number) => void;
    globalYearMin: number;
    globalYearMax: number;

    // Options
    colorBy: 'state' | 'country';
    onToggleColorBy: () => void;
    forceYZero: boolean;
    onToggleForceYZero: () => void;

    isFetching: boolean;
}

// ── Toggle button (matches Camera sidebar style) ──────────────────────────────

function Toggle({ label: labelText, icon: Icon, active, onToggle }: {
    label: string;
    icon: React.FC<{ size: number; className?: string }>;
    active: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            onClick={onToggle}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl border-2 text-left transition-all ${
                active
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-spp-gray hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
            <Icon size={14} className="shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider flex-1">{labelText}</span>
            <span className={`w-8 h-4 rounded-full flex items-center transition-colors shrink-0 ${active ? 'bg-brand-500' : 'bg-slate-300'}`}>
                <span className={`w-3 h-3 rounded-full bg-white shadow-sm mx-0.5 transition-transform ${active ? 'translate-x-4' : 'translate-x-0'}`} />
            </span>
        </button>
    );
}

// ── Dual-handle year range slider ─────────────────────────────────────────────

function YearRangeSlider({ yearMin, yearMax, globalYearMin, globalYearMax, onYearMinChange, onYearMaxChange }: {
    yearMin: number;
    yearMax: number;
    globalYearMin: number;
    globalYearMax: number;
    onYearMinChange: (y: number) => void;
    onYearMaxChange: (y: number) => void;
}) {
    const range = globalYearMax - globalYearMin;
    const leftPct = ((yearMin - globalYearMin) / range) * 100;
    const rightPct = ((yearMax - globalYearMin) / range) * 100;

    return (
        <div className="relative h-10 flex items-center">
            {/* Track background */}
            <div className="absolute left-0 right-0 h-2 bg-slate-200 rounded-full" />
            {/* Active range fill */}
            <div
                className="absolute h-2 bg-brand-400 rounded-full"
                style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
            />
            {/* Min thumb — pointer-events on thumb only so the track doesn't block the other input */}
            <input
                type="range"
                min={globalYearMin}
                max={globalYearMax}
                value={yearMin}
                onChange={e => {
                    const v = Number(e.target.value);
                    if (v <= yearMax) onYearMinChange(v);
                }}
                className="absolute w-full h-2 appearance-none bg-transparent [pointer-events:none] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer accent-brand-600 focus:outline-none"
                style={{ zIndex: 5 }}
            />
            {/* Max thumb */}
            <input
                type="range"
                min={globalYearMin}
                max={globalYearMax}
                value={yearMax}
                onChange={e => {
                    const v = Number(e.target.value);
                    if (v >= yearMin) onYearMaxChange(v);
                }}
                className="absolute w-full h-2 appearance-none bg-transparent [pointer-events:none] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer accent-brand-600 focus:outline-none"
                style={{ zIndex: 5 }}
            />
        </div>
    );
}

// ── Icon components ───────────────────────────────────────────────────────────

const PaletteIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
);

const ZeroAxisIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="3" y1="20" x2="21" y2="20" />
        <polyline points="3 10 9 4 15 10 21 4" />
    </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

export function GraphSidebar({
    countries,
    allStates,
    selectedStateIds,
    onToggleState,
    onToggleCountry,
    expandedCountries,
    setExpandedCountries,
    groupedVariables,
    variable,
    onSelectVariable,
    lang,
    yearMin,
    yearMax,
    onYearMinChange,
    onYearMaxChange,
    globalYearMin,
    globalYearMax,
    colorBy,
    onToggleColorBy,
    forceYZero,
    onToggleForceYZero,
    isFetching,
}: GraphSidebarProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-6 p-6 pb-20 bg-spp-bgMuted">

            {/* ── Variable selector ── */}
            <div>
                <label className="block text-xs font-bold text-spp-gray uppercase tracking-wider mb-2">
                    {t('map.variables')}
                </label>
                <div className="bg-spp-bgLight border border-slate-200 rounded-lg text-sm overflow-hidden flex flex-col shadow-inner">
                    {groupedVariables.map((group) => (
                        <VariableTreeGroup
                            key={group.dbName}
                            group={group}
                            activeVariable={variable}
                            onSelect={onSelectVariable}
                            lang={lang}
                        />
                    ))}
                </div>
            </div>

            {/* ── Year range (dual-handle) ── */}
            <div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    <span>{t('map.year')}</span>
                    <span className="text-spp-purple font-black text-sm tabular-nums">
                        {yearMin} – {yearMax}
                    </span>
                </div>
                <YearRangeSlider
                    yearMin={yearMin}
                    yearMax={yearMax}
                    globalYearMin={globalYearMin}
                    globalYearMax={globalYearMax}
                    onYearMinChange={onYearMinChange}
                    onYearMaxChange={onYearMaxChange}
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 tabular-nums">
                    <span>{globalYearMin}</span>
                    <span>{globalYearMax}</span>
                </div>
            </div>

            {/* ── Geography selector (multi-select) ── */}
            <div>
                <label className="block text-xs font-bold text-spp-gray uppercase tracking-wider mb-2">
                    {t('map.geography')}
                </label>
                <div className="bg-spp-bgLight border border-slate-200 rounded-lg overflow-hidden shadow-inner flex flex-col">
                    {countries?.map(country => (
                        <GeographyTreeGroup
                            key={country.id}
                            country={country}
                            allStates={allStates || []}
                            selectedStateIds={selectedStateIds}
                            onToggleState={onToggleState}
                            onToggleCountry={onToggleCountry}
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

            {/* ── Options ── */}
            <div>
                <label className="block text-xs font-bold text-spp-gray uppercase tracking-wider mb-2">
                    {t('camera.filters', 'Options')}
                </label>
                <div className="flex flex-col gap-2">
                    <Toggle
                        label="Color by country"
                        icon={PaletteIcon}
                        active={colorBy === 'country'}
                        onToggle={onToggleColorBy}
                    />
                    <Toggle
                        label="Start Y-axis at 0"
                        icon={ZeroAxisIcon}
                        active={forceYZero}
                        onToggle={onToggleForceYZero}
                    />
                </div>
            </div>

            {isFetching && (
                <div className="text-xs text-brand-600 font-medium animate-pulse">
                    {t('map.fetchingData')}
                </div>
            )}
        </div>
    );
}
