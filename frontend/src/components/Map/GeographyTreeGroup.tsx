import { useMemo } from 'react';
import { ChevronRight, ChevronDown, Check } from 'lucide-react';
import type { CountryGeo, StateGeo } from '../../api/hooks';

/**
 * Recursive tree component for geography selection.
 * Supports country-level master toggles and state-level individual toggles.
 */
export function GeographyTreeGroup({
    country,
    allStates,
    selectedStateIds,
    onToggleState,
    onToggleCountry,
    isExpanded,
    onToggleExpand
}: {
    country: CountryGeo,
    allStates: StateGeo[],
    selectedStateIds: number[],
    onToggleState: (id: number) => void,
    onToggleCountry: (ids: number[], force: boolean) => void,
    isExpanded: boolean,
    onToggleExpand: () => void
}) {
    const states = useMemo(() => allStates.filter(s => s.country_id === country.id), [allStates, country.id]);
    const stateIds = states.map(s => s.id);

    const selectedInCountry = stateIds.filter(id => selectedStateIds.includes(id));
    const isAllSelected = selectedInCountry.length === stateIds.length && stateIds.length > 0;
    const isNoneSelected = selectedInCountry.length === 0;
    const isIndeterminate = !isAllSelected && !isNoneSelected;

    return (
        <div className="border-b border-slate-200 last:border-b-0">
            <div className="flex items-center group hover:bg-brand-50 transition-colors">
                <button
                    onClick={onToggleExpand}
                    className="p-2 text-spp-gray hover:text-spp-textDark transition-colors"
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                    onChange={() => onToggleCountry(stateIds, !isAllSelected)}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 accent-brand-500 cursor-pointer"
                />

                <button
                    onClick={onToggleExpand}
                    className="flex-1 text-left py-2 px-2 text-xs font-bold text-spp-textDark truncate"
                >
                    {country.name}
                </button>

                <span className="text-[10px] text-spp-gray font-mono pr-3">
                    {selectedInCountry.length}/{stateIds.length}
                </span>
            </div>

            {isExpanded && (
                <div className="bg-spp-bgMuted/30 py-1 border-t border-slate-200/50">
                    {states.map(state => {
                        const isSelected = selectedStateIds.includes(state.id);
                        return (
                            <label
                                key={state.id}
                                className={`flex items-center gap-2 ml-9 pr-3 py-1.5 cursor-pointer group transition-all duration-200 border-l-2 ${isSelected
                                    ? 'bg-spp-purple text-white border-spp-purple'
                                    : 'hover:bg-brand-50 border-transparent text-spp-gray hover:text-spp-textDark'
                                    }`}
                            >
                                <div className="relative flex items-center justify-center ml-1">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => onToggleState(state.id)}
                                        className="appearance-none w-3.5 h-3.5 rounded border border-slate-300 bg-white checked:border-white transition-colors cursor-pointer"
                                    />
                                    {isSelected && (
                                        <Check className="absolute pointer-events-none text-spp-purple" size={12} strokeWidth={4} />
                                    )}
                                </div>
                                <span className="text-[11px] font-medium truncate">
                                    {state.name}
                                </span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
