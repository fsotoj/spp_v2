import { useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { CountryGeo, StateGeo } from '../../api/hooks';

/**
 * Single-select geography tree group for the Camera tool.
 * Mirrors the visual style of GeographyTreeGroup (Map tool) but enforces
 * single-state selection: clicking a state replaces the current selection.
 */
export function GeographySingleGroup({
    country,
    allStates,
    selectedStateId,
    onSelectState,
    isExpanded,
    onToggleExpand,
}: {
    country: CountryGeo;
    allStates: StateGeo[];
    selectedStateId: number | null;
    onSelectState: (id: number) => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
}) {
    const states = useMemo(
        () => allStates.filter(s => s.country_id === country.id),
        [allStates, country.id],
    );

    const selectedState = states.find(s => s.id === selectedStateId) ?? null;

    return (
        <div className="border-b border-slate-200 last:border-b-0">
            <div className="flex items-center group hover:bg-brand-50 transition-colors">
                <button
                    onClick={onToggleExpand}
                    className="p-2 text-spp-gray hover:text-spp-textDark transition-colors"
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                <button
                    onClick={onToggleExpand}
                    className="flex-1 text-left py-2 px-2 text-xs font-bold text-spp-textDark truncate"
                >
                    {country.name.charAt(0) + country.name.slice(1).toLowerCase()}
                </button>

                {selectedState && (
                    <span className="text-[10px] font-semibold text-spp-purple mr-3 shrink-0 truncate max-w-[80px]">
                        {selectedState.name.charAt(0) + selectedState.name.slice(1).toLowerCase()}
                    </span>
                )}
            </div>

            {isExpanded && (
                <div className="bg-spp-bgMuted/30 py-1 border-t border-slate-200/50">
                    {states.map(state => {
                        const isSelected = state.id === selectedStateId;
                        return (
                            <button
                                key={state.id}
                                onClick={() => { onSelectState(state.id); if (isExpanded) onToggleExpand(); }}
                                className={`w-full flex items-center gap-2 ml-9 pr-3 py-1.5 text-left transition-all duration-150 border-l-2 ${
                                    isSelected
                                        ? 'bg-spp-purple text-white border-spp-purple'
                                        : 'hover:bg-brand-50 border-transparent text-spp-gray hover:text-spp-textDark'
                                }`}
                            >
                                <span className="text-[11px] font-medium truncate">
                                    {state.name.charAt(0) + state.name.slice(1).toLowerCase()}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
