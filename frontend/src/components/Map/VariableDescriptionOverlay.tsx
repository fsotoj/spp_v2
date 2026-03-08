import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useSidebar } from '../Layout';
import { useTranslation } from 'react-i18next';

export function VariableDescriptionOverlay({
    label, dataset, chamberText, addIndices
}: {
    label: string;
    dataset: string;
    chamberText: string;
    addIndices?: string | null;
}) {
    const { t } = useTranslation();
    const { isMobile, isSidebarOpen } = useSidebar();
    const [collapsed, setCollapsed] = useState(false);

    const isHidden = isMobile && isSidebarOpen;

    const descriptionText = (
        <>
            {t('map.youAreSeeing')} <strong className="text-spp-textDark">{label}</strong>
            {chamberText}; {t('map.fromSubnational')} <strong className="text-spp-textDark">{dataset}</strong> {t('map.database')}
        </>
    );

    return (
        <div className={`transition-all duration-300 ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

            {/* ── Desktop ── */}
            <div className="hidden md:block absolute top-4 right-4 z-[800]">
                {collapsed ? (
                    <button
                        onClick={() => setCollapsed(false)}
                        className="pointer-events-auto w-8 h-8 rounded-full bg-spp-bgLight/90 backdrop-blur-md shadow-xl border border-white/50 flex items-center justify-center text-brand-500 hover:bg-white hover:text-brand-600 transition-colors"
                        title={t('map.showInfo')}
                    >
                        <HelpCircle size={15} />
                    </button>
                ) : (
                    <div className="relative max-w-[400px] bg-spp-bgLight/90 backdrop-blur-md p-4 pr-9 rounded-xl shadow-xl border border-white/50 text-[11px] text-spp-gray leading-relaxed border-l-4 border-l-brand-500">
                        <span className="pointer-events-none">
                            {descriptionText}.
                            {addIndices && <span className="block mt-1 italic text-slate-400">{addIndices}</span>}
                        </span>
                        <button
                            onClick={() => setCollapsed(true)}
                            className="pointer-events-auto absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title={t('map.hideInfo')}
                        >
                            <HelpCircle size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Mobile ── */}
            <div className="md:hidden absolute top-3 left-2 right-2 z-[90]">
                {collapsed ? (
                    <button
                        onClick={() => setCollapsed(false)}
                        className="pointer-events-auto w-8 h-8 rounded-full bg-spp-bgLight/90 backdrop-blur-md shadow-lg border border-white/50 flex items-center justify-center text-brand-500"
                        title={t('map.showInfo')}
                    >
                        <HelpCircle size={15} />
                    </button>
                ) : (
                    <div className="relative flex items-start gap-2 bg-spp-bgLight/90 backdrop-blur-md rounded-xl shadow-lg border border-white/50 border-l-4 border-l-brand-500 px-3 py-2 pr-9 text-left pointer-events-none">
                        <span className="text-[11px] text-spp-gray leading-snug flex-1">
                            {descriptionText}.
                            {addIndices && <span className="block mt-0.5 italic text-slate-400">{addIndices}</span>}
                        </span>
                        <button
                            onClick={() => setCollapsed(true)}
                            className="pointer-events-auto absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title={t('map.hideInfo')}
                        >
                            <HelpCircle size={13} />
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
}
