import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Map, BarChart3, Landmark, ChevronRight, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ExploreToolsSwitcherProps {
    activeToolLabel: string | null;
    isHomePage: boolean;
    isScrolled: boolean;
}

export function ExploreToolsSwitcher({ activeToolLabel, isHomePage, isScrolled }: ExploreToolsSwitcherProps) {
    const { t } = useTranslation();
    const location = useLocation();
    const [isExploreOpen, setIsExploreOpen] = useState(false);
    const [isExploreLocked, setIsExploreLocked] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close all menus on route change
    useEffect(() => {
        setIsExploreOpen(false);
        setIsExploreLocked(false);
    }, [location.pathname]);

    // Handle clicking outside to close explore dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (dropdownRef.current && !dropdownRef.current.contains(target)) {
                setIsExploreOpen(false);
                setIsExploreLocked(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div 
            className="relative mt-0.5 flex items-center h-10 w-[140px] z-[110]" 
            ref={dropdownRef}
            onMouseEnter={() => {
                if (!isExploreLocked) setIsExploreOpen(true);
            }}
            onMouseLeave={() => {
                if (!isExploreLocked) setIsExploreOpen(false);
            }}
        >
            <div className="relative group/gear h-10 transition-all duration-300 w-full">
                <button
                    onClick={() => {
                        if (isExploreLocked) {
                            setIsExploreLocked(false);
                            setIsExploreOpen(false);
                        } else {
                            setIsExploreLocked(true);
                            setIsExploreOpen(true);
                        }
                    }}
                    className={`absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center gap-1.5 h-10 rounded-lg transition-all duration-300 font-bold border ${activeToolLabel
                        ? 'text-brand-500 border-brand-200 bg-brand-50 shadow-sm'
                        : isHomePage && !isScrolled
                            ? 'text-white border-white/25 hover:bg-white/10'
                            : 'text-spp-gray border-brand-100 hover:text-spp-textDark hover:bg-spp-bgMuted shadow-sm'
                        } w-full px-3`}
                >
                    {!isExploreOpen ? (
                        <>
                            {activeToolLabel === t('nav.mappingTool') && <Map size={16} className="absolute left-3" />}
                            {activeToolLabel === t('nav.chamberTool') && <Landmark size={16} className="absolute left-3" />}
                            {activeToolLabel === t('nav.graphTool') && <BarChart3 size={16} className="absolute left-3" />}
                            <span className="whitespace-nowrap overflow-hidden text-sm">{t('nav.explore')}</span>
                            <ChevronRight size={16} strokeWidth={3} className="absolute right-3" />
                        </>
                    ) : (
                        <>
                            <Settings size={16} className={`absolute left-3 transition-transform duration-300 ${isExploreLocked ? 'text-brand-600' : ''}`} />
                            <span className="whitespace-nowrap overflow-hidden text-sm">Select tool</span>
                            <ChevronRight size={16} strokeWidth={3} className="absolute right-3 rotate-90" />
                        </>
                    )}
                </button>
            </div>

            {/* Roll out Menu */}
            <div 
                className={`absolute left-0 top-full pt-2 flex flex-col items-start gap-2 ${!isExploreOpen ? 'pointer-events-none' : ''}`}
            >
                <ToolChildLink
                    to="/explore"
                    icon={<Map size={18} />}
                    label={t('nav.mappingTool')}
                    description={t('nav.mappingToolDesc')}
                    active={location.pathname === '/explore'}
                    onClick={() => setIsExploreOpen(false)}
                    isOpen={isExploreOpen}
                    delay="delay-[0ms]"
                />
                <ToolChildLink
                    to="/camera"
                    icon={<Landmark size={18} />}
                    label={t('nav.chamberTool')}
                    description={t('nav.chamberToolDesc')}
                    active={location.pathname === '/camera'}
                    onClick={() => setIsExploreOpen(false)}
                    isOpen={isExploreOpen}
                    delay="delay-[75ms]"
                />
                <ToolChildLink
                    to="/graph"
                    icon={<BarChart3 size={18} />}
                    label={t('nav.graphTool')}
                    description={t('nav.graphToolDesc')}
                    active={location.pathname === '/graph'}
                    onClick={() => setIsExploreOpen(false)}
                    isOpen={isExploreOpen}
                    delay="delay-[150ms]"
                />
            </div>
        </div>
    );
}

function ToolChildLink({ to, icon, label, description, active, disabled, onClick, soonLabel, isOpen, delay }: { to: string; icon: React.ReactNode; label: string; description?: string; active?: boolean; disabled?: boolean; onClick?: () => void; soonLabel?: string; isOpen: boolean; delay: string }) {
    const baseTransform = isOpen 
        ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" 
        : "opacity-0 -translate-y-6 scale-95 pointer-events-none";

    const visibilityClass = isOpen ? 'visible' : 'invisible';

    if (disabled) {
        return (
            <div className={`relative w-64 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${baseTransform} ${delay} z-[110] ${visibilityClass}`}>
                <div className="flex items-start gap-3 p-3 rounded-xl border bg-spp-bgMuted border-brand-100 text-spp-gray opacity-60 cursor-not-allowed shadow-sm">
                    <div className="p-2 rounded-lg bg-spp-bgLight border border-brand-100">
                        {icon}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-spp-textDark">{label}</span>
                            {soonLabel && <span className="text-[8px] bg-brand-100 px-1 rounded text-spp-gray font-black">{soonLabel}</span>}
                        </div>
                        {description && <div className="text-[10px] text-spp-gray mt-1 leading-tight">{description}</div>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative w-64 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${baseTransform} ${delay} z-[110] ${visibilityClass}`}>
            <Link
                to={to}
                onClick={onClick}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 shadow-sm ${active ? 'bg-brand-50 border-brand-200 text-brand-400' : 'bg-spp-bgLight border-brand-100 text-spp-gray hover:text-brand-400 hover:border-brand-200 hover:bg-brand-50'}`}
            >
                <div className={`p-2 rounded-lg transition-colors ${active ? 'bg-white shadow-sm' : 'bg-spp-bgMuted'}`}>
                    {icon}
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-spp-textDark">{label}</span>
                    {description && <div className="text-[10px] text-spp-gray mt-1 leading-tight">{description}</div>}
                </div>
            </Link>
        </div>
    );
}
