import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Landmark, Armchair, Handshake } from 'lucide-react';
import { GeographySingleGroup } from './GeographySingleGroup';
import type { CountryGeo, StateGeo } from '../../api/hooks';

interface CameraSidebarProps {
    chamber: '1' | '2';
    setChamber: (ch: '1' | '2') => void;
    isUnicameral: boolean;
    year: number | null;
    setYear: (y: number) => void;
    isPlaying: boolean;
    setIsPlaying: (p: boolean) => void;
    availableYears: number[] | undefined;
    isFetchingYears: boolean;
    countries: CountryGeo[] | undefined;
    allStates: StateGeo[] | undefined;
    selectedStateId: number | null;
    onSelectState: (id: number) => void;
    expandedCountries: number[];
    setExpandedCountries: React.Dispatch<React.SetStateAction<number[]>>;
    isFetching: boolean;
    isArgentina: boolean;
    isMexico: boolean;
    showCarryover: boolean;
    onToggleCarryover: () => void;
    groupCoalitions: boolean;
    onToggleGroupCoalitions: () => void;
}

// A custom functional component wrapping the parliament SVG icon
const HemicycleIcon = ({ className = '', size = 24, stroke = 'currentColor', color = 'currentColor' }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 50 50"
            fill={color || stroke}
            className={`lucide ${className}`}
        >
            <path d="M25 0L25 4.5C29 4.5 27.300781 6 31 6L33 6L33 2L31 2C27.300781 2 29 0 25 0 Z M 25 7C18.195313 7 12.585938 12.320313 12.0625 19L12 19C11.96875 19 11.9375 19 11.90625 19C11.875 19 11.84375 19 11.8125 19C11.261719 19.050781 10.855469 19.542969 10.90625 20.09375C10.957031 20.644531 11.449219 21.050781 12 21L12 26L14 26L14 21L16 21L16 26L18 26L18 21L20 21L20 26L22 26L22 21L24 21L24 26L26 26L26 21L28 21L28 26L30 26L30 21L32 21L32 26L34 26L34 21L36 21L36 26L38 26L38 21C38.359375 21.003906 38.695313 20.816406 38.878906 20.503906C39.058594 20.191406 39.058594 19.808594 38.878906 19.496094C38.695313 19.183594 38.359375 18.996094 38 19L37.9375 19C37.414063 12.320313 31.804688 7 25 7 Z M 25 9C30.699219 9 35.25 13.433594 35.78125 19L14.21875 19C14.75 13.433594 19.300781 9 25 9 Z M 0 27L0 50L50 50L50 27 Z M 2 29L48 29L48 48L2 48 Z M 5 32L5 35L9 35L9 32 Z M 12 32L12 35L16 35L16 32 Z M 19 32L19 35L23 35L23 32 Z M 26 32L26 35L30 35L30 32 Z M 33 32L33 35L37 35L37 32 Z M 40 32L40 35L44 35L44 32 Z M 5 37L5 40L9 40L9 37 Z M 12 37L12 40L16 40L16 37 Z M 19 37L19 40L23 40L23 37 Z M 26 37L26 40L30 40L30 37 Z M 33 37L33 40L37 40L37 37 Z M 40 37L40 40L44 40L44 37 Z M 5 42L5 45L9 45L9 42 Z M 12 42L12 45L16 45L16 42 Z M 19 42L19 45L23 45L23 42 Z M 26 42L26 45L30 45L30 42 Z M 33 42L33 45L37 45L37 42 Z M 40 42L40 45L44 45L44 42Z" />
        </svg>
    );
};

export const CameraSidebar: React.FC<CameraSidebarProps> = ({
    chamber,
    setChamber,
    isUnicameral,
    year,
    setYear,
    isPlaying,
    setIsPlaying,
    availableYears,
    isFetchingYears,
    countries,
    allStates,
    selectedStateId,
    onSelectState,
    expandedCountries,
    setExpandedCountries,
    isFetching,
    isArgentina,
    isMexico,
    showCarryover,
    onToggleCarryover,
    groupCoalitions,
    onToggleGroupCoalitions,
}) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-6 p-6 pb-20 bg-spp-bgMuted">

            {/* Chamber toggle */}
            <div>
                <label className="block text-xs font-bold text-spp-gray uppercase tracking-wider mb-2">
                    {t('camera.chamber')}
                </label>
                <div className="flex gap-2">
                    {(['1', '2'] as const).map(ch => {
                        const isSelected = chamber === ch;
                        const isDisabled = isUnicameral && ch === '2';
                        const Icon = ch === '1' ? Landmark : HemicycleIcon;
                        
                        return (
                            <button
                                key={ch}
                                onClick={() => setChamber(ch)}
                                disabled={isDisabled}
                                className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all
                                    ${isSelected 
                                        ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm' 
                                        : isDisabled
                                            ? 'border-slate-100 bg-spp-bgMuted text-slate-300 opacity-50 cursor-not-allowed'
                                            : 'border-slate-200 bg-white text-spp-gray hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                title={isDisabled ? t('camera.unicameralOnly') : undefined}
                            >
                                <Icon 
                                    size={24} 
                                    className="mb-1" 
                                    color={isSelected ? 'currentColor' : isDisabled ? '#cbd5e1' : '#4D4D4D'} 
                                    stroke={isSelected ? 'currentColor' : isDisabled ? '#cbd5e1' : '#4D4D4D'} 
                                    strokeWidth={isSelected ? 2.5 : 2} 
                                />
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-brand-700' : isDisabled ? 'text-slate-300' : 'text-spp-gray'}`}>
                                    {ch === '1' ? 'Lower' : 'Upper'}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Year selector — slider over available years + play button */}
            <div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <div className="flex items-center gap-2">
                        <span>{t('camera.year')}</span>
                        {availableYears && availableYears.length > 1 && (
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
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
                            onSelectState={onSelectState}
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

            {/* Filters — shown only for ARG (carryover) and MEX (coalitions) */}
            {(isArgentina || isMexico) && (
                <div>
                    <label className="block text-xs font-bold text-spp-gray uppercase tracking-wider mb-2">
                        {t('camera.filters', 'Filters')}
                    </label>
                    <div className="flex flex-col gap-2">
                        {isArgentina && (
                            <button
                                onClick={onToggleCarryover}
                                className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl border-2 text-left transition-all ${
                                    showCarryover
                                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                                        : 'border-slate-200 bg-white text-spp-gray hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <Armchair size={14} className="shrink-0" />
                                <span className="text-[11px] font-bold uppercase tracking-wider flex-1">
                                    {t('camera.showCarryover', 'Carryover seats')}
                                </span>
                                <span className={`w-8 h-4 rounded-full flex items-center transition-colors shrink-0 ${showCarryover ? 'bg-brand-500' : 'bg-slate-300'}`}>
                                    <span className={`w-3 h-3 rounded-full bg-white shadow-sm mx-0.5 transition-transform ${showCarryover ? 'translate-x-4' : 'translate-x-0'}`} />
                                </span>
                            </button>
                        )}
                        {isMexico && (
                            <button
                                onClick={onToggleGroupCoalitions}
                                className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl border-2 text-left transition-all ${
                                    groupCoalitions
                                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                                        : 'border-slate-200 bg-white text-spp-gray hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <Handshake size={14} className="shrink-0" />
                                <span className="text-[11px] font-bold uppercase tracking-wider flex-1">
                                    {t('camera.groupCoalitions', 'Group coalitions')}
                                </span>
                                <span className={`w-8 h-4 rounded-full flex items-center transition-colors shrink-0 ${groupCoalitions ? 'bg-brand-500' : 'bg-slate-300'}`}>
                                    <span className={`w-3 h-3 rounded-full bg-white shadow-sm mx-0.5 transition-transform ${groupCoalitions ? 'translate-x-4' : 'translate-x-0'}`} />
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {isFetching && (
                <div className="text-xs text-brand-600 font-medium animate-pulse">
                    {t('map.fetchingData')}
                </div>
            )}
        </div>
    );
};
