import React from 'react';
import { toPartyTitleCase } from './CameraUtils';
import type { PartyRow } from './HemicycleChart';

interface CameraLegendPanelProps {
    chamberLabel: string;
    parties: PartyRow[];
    highlightedParty: string | null;
    setHighlightedParty: (name: string | null) => void;
    coalitionsGrouped?: boolean;
}

export const CameraLegendPanel: React.FC<CameraLegendPanelProps> = ({
    chamberLabel,
    parties,
    highlightedParty,
    setHighlightedParty,
    coalitionsGrouped = false,
}) => {
    return (
        <div className="flex-1 w-1/2 md:w-auto flex flex-col bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden min-h-0">
            {/* Legend Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <h3 className="font-black text-[10px] text-brand-600 uppercase tracking-[0.12em]">
                    {chamberLabel}
                </h3>
            </div>
            {coalitionsGrouped && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-100 bg-brand-50 shrink-0">
                    <i className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-brand-400 ring-offset-1 bg-brand-200" />
                    <span className="text-[9px] text-brand-700 font-bold uppercase tracking-wider">= Coalition</span>
                </div>
            )}

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
                                className={`w-3 h-3 rounded-full shrink-0 shadow-sm ${coalitionsGrouped && party.is_coalition === 1 ? 'ring-2 ring-brand-400 ring-offset-1' : 'border border-white/60'}`}
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
            
            <div className="hidden md:block px-4 py-2 border-t border-slate-100 bg-spp-bgMuted shrink-0">
                <div className="text-[9px] text-slate-300 font-bold uppercase tracking-wider">
                    SLED
                </div>
            </div>
        </div>
    );
};
