import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

/**
 * Recursive tree component for variable selection grouped by dataset.
 * Automatically expands when a child variable is selected.
 */
export function VariableTreeGroup({ group, activeVariable, onSelect, depth = 0 }: { group: any, activeVariable: string, onSelect: (v: string) => void, depth?: number }) {

    // Check if any child variable is active, OR recursively if any subgroup contains the active variable
    const isActiveHere = useMemo(() => {
        const checkActive = (g: any): boolean => {
            if (g.vars.some((v: any) => v.variable === activeVariable)) return true;
            if (g.subgroups) return g.subgroups.some(checkActive);
            return false;
        };
        return checkActive(group);
    }, [group, activeVariable]);

    const [isOpen, setIsOpen] = useState(false);

    // Only auto-open on variable selection if it was not deliberate toggle? 
    // Actually, to fully respect "collapse by default", we just set initial state to false.
    // If the user selects a variable from elsewhere (e.g. initial load), it will stay collapsed.
    // But maybe we want it to open ONLY when the variable changes?
    // Let's just set it to false and remove the immediate auto-open.
    useEffect(() => {
        // No auto-open effect here to keep it collapsed by default
    }, []);

    const paddingClass = depth > 0 ? "pl-6 text-sm" : "pl-3 bg-spp-bgMuted";

    // Count pure variables for indicator 
    const varCount = group.vars.length + (group.subgroups ? group.subgroups.reduce((acc: number, sg: any) => acc + sg.vars.length, 0) : 0);

    return (
        <div className={`border-b border-slate-200 last:border-b-0 ${depth > 0 ? 'bg-spp-bgLight border-t' : ''}`}>
            <button
                className={`w-full flex items-center justify-between py-2 pr-3 hover:bg-brand-50 transition-colors ${paddingClass} ${isActiveHere && depth === 0 ? 'font-semibold text-brand-700' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 text-spp-textDark">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="truncate">{group.dbName}</span>
                </div>
                <span className={`text-xs px-1.5 rounded-full ${isActiveHere ? 'bg-brand-100 text-brand-600' : 'bg-slate-200 text-spp-gray'}`}>{varCount}</span>
            </button>

            {isOpen && (
                <div className="bg-spp-bgLight flex flex-col py-1">
                    {/* Render subgroups recursively */}
                    {group.subgroups && group.subgroups.map((sg: any) => (
                        <VariableTreeGroup
                            key={sg.dbName}
                            group={sg}
                            activeVariable={activeVariable}
                            onSelect={onSelect}
                            depth={depth + 1}
                        />
                    ))}

                    {/* Render variables */}
                    {group.vars.map((v: any) => {
                        const active = v.variable === activeVariable;
                        const varPad = depth > 0 ? "ml-9" : "ml-6";
                        return (
                            <button
                                key={v.variable}
                                onClick={() => onSelect(v.variable)}
                                className={`text-left px-3 py-1.5 text-xs truncate transition-colors border-l-2 ${varPad} ${active
                                    ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold'
                                    : 'border-transparent text-spp-gray hover:bg-brand-50/50 hover:text-spp-textDark'
                                    }`}
                                title={v.pretty_name || v.variable}
                            >
                                {v.pretty_name || v.variable}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
