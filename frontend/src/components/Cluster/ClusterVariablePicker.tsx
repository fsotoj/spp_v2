import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VariableDict } from '../../api/hooks';

const MAX_VARIABLES = 8;

interface TreeGroup {
    dbName: string;
    displayName: string;
    vars: VariableDict[];
    subgroups?: TreeGroup[];
}

interface ClusterVariablePickerProps {
    variables: VariableDict[];
    selected: string[];
    onToggle: (variable: string) => void;
    lang: string;
}

// ── Single variable row ───────────────────────────────────────────────────────

function VarRow({ v, selected, onToggle, atLimit, lang, depth = 0 }: {
    v: VariableDict & { variable: string };
    selected: string[];
    onToggle: (code: string) => void;
    atLimit: boolean;
    lang: string;
    depth?: number;
}) {
    const isSelected = selected.includes(v.variable);
    const isDisabled = atLimit && !isSelected;
    const label = lang === 'de' ? (v.pretty_name_de || v.pretty_name || v.variable)
        : lang === 'es' ? (v.pretty_name_es || v.pretty_name || v.variable)
            : lang === 'pt' ? (v.pretty_name_pt || v.pretty_name || v.variable)
                : (v.pretty_name || v.variable);
    const indent = depth > 0 ? 'ml-9' : 'ml-6';

    return (
        <label
            title={label}
            className={`flex items-center gap-2 ${indent} pr-3 py-1.5 cursor-pointer border-l-2 transition-colors text-xs ${isSelected
                ? 'border-spp-purple bg-spp-purple text-white font-bold'
                : isDisabled
                    ? 'border-transparent text-slate-300 cursor-not-allowed'
                    : 'border-transparent text-spp-gray hover:bg-brand-50/50 hover:text-spp-textDark'
                }`}
        >
            <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => onToggle(v.variable)}
                className="w-3.5 h-3.5 rounded accent-spp-purple cursor-pointer disabled:cursor-not-allowed shrink-0"
            />
            <span className="truncate">{label}</span>
        </label>
    );
}

// ── Recursive group node ──────────────────────────────────────────────────────

function GroupNode({ group, selected, onToggle, lang, atLimit, depth = 0 }: {
    group: TreeGroup;
    selected: string[];
    onToggle: (code: string) => void;
    lang: string;
    atLimit: boolean;
    depth?: number;
}) {
    const allVarCodes = useMemo(() => {
        const collect = (g: TreeGroup): string[] => [
            ...g.vars.map(v => v.variable),
            ...(g.subgroups?.flatMap(collect) ?? []),
        ];
        return collect(group);
    }, [group]);

    const selectedHere = allVarCodes.filter(c => selected.includes(c)).length;
    const hasSelected = selectedHere > 0;
    const [open, setOpen] = useState(false);

    const paddingClass = depth === 0 ? 'pl-3 bg-spp-bgMuted' : 'pl-6 text-sm';

    return (
        <div className={`border-b border-slate-200 last:border-b-0 ${depth > 0 ? 'bg-spp-bgLight border-t' : ''}`}>
            <button
                className={`w-full flex items-center justify-between py-2 pr-3 hover:bg-brand-50 transition-colors ${paddingClass} ${hasSelected && depth === 0 ? 'font-semibold text-spp-purple' : ''}`}
                onClick={() => setOpen(o => !o)}
            >
                <div className="flex items-center gap-2 text-spp-textDark">
                    {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="truncate text-sm">{group.displayName}</span>
                </div>
                <span className={`text-xs px-1.5 rounded-full ${hasSelected ? 'bg-spp-purple text-white' : 'bg-slate-200 text-spp-gray'}`}>
                    {selectedHere > 0 ? `${selectedHere}/` : ''}{allVarCodes.length}
                </span>
            </button>

            {open && (
                <div className="bg-spp-bgLight flex flex-col py-1">
                    {group.subgroups?.map(sg => (
                        <GroupNode
                            key={sg.dbName}
                            group={sg}
                            selected={selected}
                            onToggle={onToggle}
                            lang={lang}
                            atLimit={atLimit}
                            depth={depth + 1}
                        />
                    ))}
                    {group.vars.map(v => (
                        <VarRow
                            key={v.variable}
                            v={v}
                            selected={selected}
                            onToggle={onToggle}
                            atLimit={atLimit}
                            lang={lang}
                            depth={depth}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ClusterVariablePicker({ variables, selected, onToggle, lang }: ClusterVariablePickerProps) {
    const { t } = useTranslation();

    const groups = useMemo<TreeGroup[]>(() => {
        const lowerLabel = lang === 'es' ? 'Cámara Baja'
            : lang === 'de' ? 'Unterhaus'
                : lang === 'pt' ? 'Câmara Baixa'
                    : 'Lower Chamber';
        const upperLabel = lang === 'es' ? 'Cámara Alta'
            : lang === 'de' ? 'Oberhaus'
                : lang === 'pt' ? 'Câmara Alta'
                    : 'Upper Chamber';

        const map: Record<string, TreeGroup> = {};

        variables.forEach(v => {
            const db = v.dataset || 'Other';
            const display = lang === 'de' ? (v.dataset_de || db)
                : lang === 'es' ? (v.dataset_es || db)
                    : lang === 'pt' ? (v.dataset_pt || db)
                        : db;

            if (db === 'Legislative Elections') {
                if (!map[db]) {
                    map[db] = {
                        dbName: db,
                        displayName: display,
                        vars: [],
                        subgroups: [
                            { dbName: lowerLabel, displayName: lowerLabel, vars: [] },
                            { dbName: upperLabel, displayName: upperLabel, vars: [] },
                        ],
                    };
                }
                map[db].subgroups![0].vars.push({ ...v, variable: `${v.variable}_1` });
                map[db].subgroups![1].vars.push({ ...v, variable: `${v.variable}_2` });
            } else {
                if (!map[db]) map[db] = { dbName: db, displayName: display, vars: [] };
                map[db].vars.push(v);
            }
        });

        return Object.keys(map).sort().map(k => map[k]);
    }, [variables, lang]);

    const atLimit = selected.length >= MAX_VARIABLES;

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-spp-gray uppercase tracking-wider">
                    {t('cluster.variables')}
                </label>
                <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${atLimit ? 'bg-spp-purple text-white' : 'bg-slate-200 text-spp-gray'}`}>
                    {selected.length} / {MAX_VARIABLES}
                </span>
            </div>
            <div className="bg-spp-bgLight border border-slate-200 rounded-lg text-sm overflow-hidden flex flex-col shadow-inner">
                {groups.map(g => (
                    <GroupNode
                        key={g.dbName}
                        group={g}
                        selected={selected}
                        onToggle={onToggle}
                        lang={lang}
                        atLimit={atLimit}
                    />
                ))}
            </div>
            {atLimit && (
                <p className="text-[10px] text-spp-purple mt-1">{t('cluster.limitReached', { max: MAX_VARIABLES })}</p>
            )}
        </div>
    );
}
