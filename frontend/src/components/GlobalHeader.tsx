import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Map, BarChart3, Landmark, Quote, ChevronDown, Sparkles } from 'lucide-react';

/**
 * GlobalHeader: The "Navigation Spine" of the Research Portal.
 * Persists across all pages and provides the primary structural axis.
 */
export function GlobalHeader() {
    const location = useLocation();
    const [isExploreOpen, setIsExploreOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Determine active tool text
    const activeToolLabel = location.pathname.includes('/explore') ? "Mapping Tool" : null;

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsExploreOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="fixed top-0 left-0 w-full h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 z-[100] flex items-center justify-between px-6 md:px-12 transition-all">
            {/* Left: Branding (Simplified) */}
            <div className="flex items-center gap-4">
                <Link to="/" className="flex items-center group transition-transform hover:scale-105 active:scale-95">
                    <img src="/SPP.svg" className="h-10 md:h-12" alt="SPP Logo" />
                </Link>
            </div>

            {/* Center: Advanced Tool Switcher (Collapsible) */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onMouseEnter={() => setIsExploreOpen(true)}
                    onClick={() => setIsExploreOpen(!isExploreOpen)}
                    className={`flex items-center gap-3 px-5 py-2.5 rounded-xl border transition-all duration-300 font-bold text-sm ${activeToolLabel
                        ? 'bg-brand-50 border-brand-200 text-brand-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-brand-200 hover:bg-slate-50 shadow-sm'
                        }`}
                >
                    <span>{activeToolLabel ? `Explore: ${activeToolLabel}` : "Explore Tools"}</span>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isExploreOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isExploreOpen && (
                    <nav
                        onMouseLeave={() => setIsExploreOpen(false)}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                        <ToolLink
                            to="/explore"
                            icon={<Map size={18} />}
                            label="Mapping Tool"
                            description="Interactive subnational visualization"
                            active={location.pathname === '/explore'}
                            onClick={() => setIsExploreOpen(false)}
                        />
                        <ToolLink
                            to="#"
                            icon={<BarChart3 size={18} />}
                            label="Graph Tool"
                            description="Electoral trends & analytics"
                            disabled
                        />
                        <ToolLink
                            to="#"
                            icon={<Landmark size={18} />}
                            label="Chamber Tool"
                            description="Legislative composition details"
                            disabled
                        />
                    </nav>
                )}
            </div>

            {/* Right: Global Navigation */}
            <nav className="flex items-center gap-1 md:gap-4">
                <PortalNav path="/" label="Home" active={location.pathname === '/'} />
                <PortalNav path="/methodology" label="Methods" active={location.pathname === '/methodology'} />
                <PortalNav path="/data" label="Data" active={location.pathname === '/data'} />
                <PortalNav path="/about" label="About" active={location.pathname === '/about'} />

                <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />

                <button
                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-brand-400 transition-all shadow-md active:scale-95"
                    onClick={() => alert('Citation: Giraudy et al. (2025). Subnational Politics Project.')}
                >
                    <Quote size={14} />
                    <span>How to Cite</span>
                </button>
            </nav>
        </header>
    );
}

function PortalNav({ path, label, active }: { path: string; label: string; active: boolean }) {
    return (
        <Link
            to={path}
            className={`text-sm font-bold px-3 py-2 rounded-lg transition-all ${active
                ? 'text-brand-400'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
        >
            {label}
        </Link>
    );
}

function ToolLink({ to, icon, label, description, active, disabled, onClick }: { to: string; icon: React.ReactNode; label: string; description?: string; active?: boolean; disabled?: boolean; onClick?: () => void }) {
    if (disabled) {
        return (
            <div className="flex items-center gap-3 p-3 text-slate-400 opacity-50 cursor-not-allowed select-none rounded-xl">
                <div className="bg-slate-100 p-2 rounded-lg">
                    {icon}
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{label}</span>
                        <span className="text-[8px] bg-slate-200 px-1 rounded text-slate-500 font-black">SOON</span>
                    </div>
                    {description && <p className="text-[10px] text-slate-400 leading-tight">{description}</p>}
                </div>
            </div>
        );
    }

    return (
        <Link
            to={to}
            onClick={onClick}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${active
                ? 'bg-brand-50 text-brand-600 shadow-sm border border-brand-100'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 group'
                }`}
        >
            <div className={`p-2 rounded-lg transition-colors ${active ? 'bg-white shadow-sm' : 'bg-slate-50 group-hover:bg-brand-50'}`}>
                {icon}
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-bold">{label}</span>
                {description && <p className={`text-[10px] leading-tight ${active ? 'text-brand-400' : 'text-slate-400'}`}>{description}</p>}
            </div>
        </Link>
    );
}
