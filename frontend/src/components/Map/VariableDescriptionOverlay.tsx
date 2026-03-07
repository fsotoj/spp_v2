import { Info } from 'lucide-react';
import { useSidebar } from '../Layout';

/**
 * VariableDescriptionOverlay
 * - Desktop (md+): full-width panel, pointer-events-none, always visible.
 * - Mobile (<md):  compact static pill. Hidden entirely when sidebar is open.
 */
export function VariableDescriptionOverlay({
    label, dataset, chamberText, addIndices
}: {
    label: string;
    dataset: string;
    chamberText: string;
    addIndices?: string | null;
}) {
    const { isMobile, isSidebarOpen } = useSidebar();

    // Hide completely on mobile when sidebar drawer is open to prevent overlap
    const isHidden = isMobile && isSidebarOpen;

    return (
        <div className={`transition-all duration-300 ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {/* Desktop: full panel, pointer-events-none */}
            <div className="hidden md:block absolute top-4 right-4 z-[1000] max-w-[400px] bg-spp-bgLight/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-white/50 text-[11px] text-spp-gray leading-relaxed pointer-events-none border-l-4 border-l-brand-500">
                You are seeing <strong className="text-spp-textDark">{label}</strong>
                {chamberText}; from the Subnational <strong className="text-spp-textDark">{dataset}</strong> Database.
                {addIndices && <span className="block mt-1 italic text-slate-400">{addIndices}</span>}
            </div>

            {/* Mobile: compact pill matching desktop description content */}
            {/* z-[90] keeps it below the fixed header (z-[100]) and the mobile drawer (z-[99]) */}
            <div className="md:hidden absolute top-3 left-2 right-2 z-[90] pointer-events-none">
                <div className="flex items-start gap-2 bg-spp-bgLight/90 backdrop-blur-md rounded-xl shadow-lg border border-white/50 border-l-4 border-l-brand-500 px-3 py-2 text-left">
                    <Info size={14} className="text-brand-500 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-spp-gray leading-snug flex-1">
                        You are seeing <strong className="text-spp-textDark">{label}</strong>
                        {chamberText}; from the Subnational <strong className="text-spp-textDark">{dataset}</strong> Database.
                        {addIndices && <span className="block mt-0.5 italic text-slate-400">{addIndices}</span>}
                    </span>
                </div>
            </div>
        </div>
    );
}
