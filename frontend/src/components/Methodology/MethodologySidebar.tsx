import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    TOP_SECTIONS, BTM_SECTIONS, VAR_SECTION_IDS,
    SECTION_LABEL, VAR_GROUPS,
} from '../../data/methodology';

interface Props {
    activeSection: string;
    varGroupOpen: boolean;
    openVarTab: string | null;
    onScrollTo: (id: string) => void;
    onToggleVarGroup: () => void;
    onVarTabClick: (id: string) => void;
}

function NavBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left text-sm px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                active
                    ? 'text-brand-600 bg-brand-50 font-bold border-l-2 border-brand-400'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
        >
            {label}
        </button>
    );
}

export function MethodologySidebar({ activeSection, varGroupOpen, openVarTab, onScrollTo, onToggleVarGroup, onVarTabClick }: Props) {
    const { t } = useTranslation();
    const isVarSection = VAR_SECTION_IDS.includes(activeSection as typeof VAR_SECTION_IDS[number]);

    return (
        <aside className="hidden lg:block w-60 flex-shrink-0">
            <nav className="sticky top-28 flex flex-col gap-0.5 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1 pb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-3">
                    {t('methodology.tableOfContents')}
                </p>

                {TOP_SECTIONS.map(id => (
                    <NavBtn key={id} label={t(SECTION_LABEL[id])} active={activeSection === id} onClick={() => onScrollTo(id)} />
                ))}

                {/* Variables accordion */}
                <div className="mt-1">
                    <button
                        onClick={onToggleVarGroup}
                        className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                            isVarSection
                                ? 'text-brand-600 bg-brand-50 border-l-2 border-brand-400'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                        <span>{t('methodology.nav.variables')}</span>
                        <ChevronDown
                            size={13}
                            className={`transition-transform duration-200 flex-shrink-0 ${varGroupOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {varGroupOpen && (
                        <div className="ml-3 mt-0.5 border-l border-slate-100 flex flex-col gap-0.5 pl-2">
                            {VAR_GROUPS.map(group => {
                                const isGroupActive = activeSection === group.id;
                                const isTabOpen = openVarTab === group.id;

                                return (
                                    <div key={group.id}>
                                        <button
                                            onClick={() => onVarTabClick(group.id)}
                                            className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                                                isGroupActive
                                                    ? 'text-brand-600 bg-brand-50'
                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span>{t(group.labelKey)}</span>
                                            <ChevronRight
                                                size={11}
                                                className={`transition-transform duration-200 flex-shrink-0 ${isTabOpen ? 'rotate-90' : ''}`}
                                            />
                                        </button>

                                        {isTabOpen && (
                                            <div className="ml-3 mt-0.5 border-l border-slate-100 flex flex-col gap-px pl-2 pb-1">
                                                {group.vars.map(v => (
                                                    <button
                                                        key={v.name}
                                                        onClick={() => onScrollTo(`var-${v.name}`)}
                                                        className="text-left text-[10px] font-mono text-slate-400 hover:text-brand-500 hover:bg-brand-50 px-2 py-1 rounded transition-colors"
                                                    >
                                                        {v.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-1 flex flex-col gap-0.5">
                    {BTM_SECTIONS.map(id => (
                        <NavBtn key={id} label={t(SECTION_LABEL[id])} active={activeSection === id} onClick={() => onScrollTo(id)} />
                    ))}
                </div>
            </nav>
        </aside>
    );
}
