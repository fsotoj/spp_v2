import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Map, BarChart3, Landmark, ChevronDown, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * GlobalHeader: The "Navigation Spine" of the Research Portal.
 * Persists across all pages and provides the primary structural axis.
 */
export function GlobalHeader() {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const [isExploreOpen, setIsExploreOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Determine if we should use the transparent header logic (only on home page)
    const isHomePage = location.pathname === '/';

    // Determine active tool text
    const activeToolLabel = location.pathname.includes('/explore') ? t('nav.mappingTool') : null;

    // Close all menus on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsExploreOpen(false);
    }, [location.pathname]);

    // Handle clicking outside to close explore dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (dropdownRef.current && !dropdownRef.current.contains(target)) {
                setIsExploreOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Intersection Observer for scroll morph effect on Home Page
    useEffect(() => {
        if (!isHomePage) {
            setIsScrolled(true); // Always solid if not on home page
            return;
        }

        const heroEl = document.getElementById('hero-section');
        if (!heroEl) {
            setIsScrolled(true); // Fallback
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                // If the hero is intersecting, we are at the top (transparent)
                // If it's NOT intersecting, we scrolled past it (solid)
                setIsScrolled(!entry.isIntersecting);
            },
            {
                root: null,
                threshold: 0,
                // Trigger right as the very bottom of the hero leaves the viewport
                rootMargin: "-80px 0px 0px 0px"
            }
        );

        observer.observe(heroEl);

        return () => {
            observer.disconnect();
        };
    }, [isHomePage]);

    const headerVariantClass = isScrolled ? 'header--scrolled' : 'header--top';



    return (
        <>
            <header className={`fixed top-0 left-0 w-full h-20 z-[100] flex items-center justify-between px-4 md:px-12 transition-all duration-300 ${headerVariantClass}`}>
                {/* Left: Branding */}
                <div className="flex items-center gap-4">
                    <Link to="/" className="flex items-center group transition-transform hover:scale-105 active:scale-95">
                        <img src={isScrolled ? "/SPP.svg" : "/SPP_blanco.svg"} className="h-10 md:h-12 header-logo transition-all duration-300" alt="SPP Logo" />
                    </Link>
                </div>

                {/* Center / Right: Nav Link Items */}
                <nav className="hidden md:flex items-center gap-1 md:gap-4 ml-auto">
                    <PortalNav path="/" label={t('nav.home')} active={location.pathname === '/'} />

                    {/* Advanced Tool Switcher */}
                    <div className="relative mt-0.5" ref={dropdownRef}>
                        <button
                            onMouseEnter={() => setIsExploreOpen(true)}
                            onClick={() => setIsExploreOpen(!isExploreOpen)}
                            className={`header-link flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 text-sm font-bold border ${activeToolLabel
                                ? 'text-brand-500 border-brand-200 bg-brand-50 shadow-sm'
                                : isHomePage && !isScrolled
                                    ? 'text-white border-white/25 hover:bg-white/10'
                                    : 'text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50 shadow-sm'
                                }`}
                        >
                            {activeToolLabel === t('nav.mappingTool') && <Map size={16} />}
                            <span>{t('nav.explore')}</span>
                            <ChevronDown size={14} className={`transition-transform duration-300 ${isExploreOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isExploreOpen && (
                            <nav
                                onMouseLeave={() => setIsExploreOpen(false)}
                                className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-200"
                            >
                                <ToolLink
                                    to="/explore"
                                    icon={<Map size={18} />}
                                    label={t('nav.mappingTool')}
                                    description={t('nav.mappingToolDesc')}
                                    active={location.pathname === '/explore'}
                                    onClick={() => setIsExploreOpen(false)}
                                />
                                <ToolLink
                                    to="#"
                                    icon={<BarChart3 size={18} />}
                                    label={t('nav.graphTool')}
                                    description={t('nav.graphToolDesc')}
                                    disabled
                                    soonLabel={t('nav.soon')}
                                />
                                <ToolLink
                                    to="#"
                                    icon={<Landmark size={18} />}
                                    label={t('nav.chamberTool')}
                                    description={t('nav.chamberToolDesc')}
                                    disabled
                                    soonLabel={t('nav.soon')}
                                />
                            </nav>
                        )}
                    </div>

                    <PortalNav path="/methodology" label={t('nav.methods')} active={location.pathname === '/methodology'} />
                    <PortalNav path="/data" label={t('nav.data')} active={location.pathname === '/data'} />
                    <PortalNav path="/about" label={t('nav.about')} active={location.pathname === '/about'} />

                    <div className="h-6 w-px bg-slate-200 mx-2 transition-colors duration-300" />

                    {/* Language Switcher */}
                    <LanguageSwitcher
                        i18n={i18n}
                    />

                    <div className="h-6 w-px bg-slate-200 mx-2 transition-colors duration-300" />

                    <img
                        src="/EscuelaCienciasSocialesyGobierno_Horizontal_Blanco.webp"
                        alt="Escuela de Ciencias Sociales y Gobierno — Tecnológico de Monterrey"
                        className="header-university-logo h-8 w-auto object-contain opacity-80 hover:opacity-100 transition-all duration-300"
                    />
                </nav>

                {/* Right: Mobile Hamburger */}
                <button
                    className="header-link md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all duration-300"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle navigation menu"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Slide-Down Drawer */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed top-20 left-0 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xl z-[99] animate-in fade-in slide-in-from-top-2 duration-200">
                    <nav className="flex flex-col p-4 gap-1">
                        <MobileNavLink path="/" label={t('nav.home')} active={location.pathname === '/'} onClick={() => setIsMobileMenuOpen(false)} />
                        <MobileNavLink path="/explore" label={`🗺 ${t('nav.mappingTool')}`} active={location.pathname === '/explore'} onClick={() => setIsMobileMenuOpen(false)} />
                        <MobileNavLink path="/methodology" label={t('nav.methods')} active={location.pathname === '/methodology'} onClick={() => setIsMobileMenuOpen(false)} />
                        <MobileNavLink path="/data" label={t('nav.data')} active={location.pathname === '/data'} onClick={() => setIsMobileMenuOpen(false)} />
                        <MobileNavLink path="/about" label={t('nav.about')} active={location.pathname === '/about'} onClick={() => setIsMobileMenuOpen(false)} />

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between pb-2 px-2">
                            <div className="flex gap-2">
                                {['en', 'es', 'de'].map((l) => (
                                    <button
                                        key={l}
                                        onClick={() => {
                                            i18n.changeLanguage(l);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                                            i18n.language.startsWith(l)
                                                ? 'bg-brand-50 text-brand-600 border-brand-200'
                                                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        {l.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            <img
                                src="/EscuelaCienciasSocialesyGobierno_Horizontal_Negro.webp"
                                alt="Escuela de Ciencias Sociales y Gobierno — Tecnológico de Monterrey"
                                className="h-7 w-auto object-contain opacity-70"
                            />
                        </div>
                    </nav>
                </div>
            )}
        </>
    );
}

function LanguageSwitcher({ i18n }: {
    i18n: any;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const lang = i18n.language.slice(0, 2);
    
    const langNames: Record<string, string> = {
        en: 'English',
        es: 'Español',
        de: 'Deutsch'
    };

    const currentLangName = langNames[lang] || 'English';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div 
            className="relative h-full flex items-center" 
            ref={dropdownRef}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-lg transition-all duration-300 text-brand-500 hover:bg-white/10"
            >
                <span>{currentLangName}</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-32 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-[110] animate-in fade-in slide-in-from-top-1 duration-200">
                    {Object.entries(langNames).map(([code, name]) => (
                        <button
                            key={code}
                            onClick={() => {
                                i18n.changeLanguage(code);
                                setIsOpen(false);
                            }}
                            className={`w-full text-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                lang === code
                                    ? 'bg-brand-50 text-brand-600'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function PortalNav({ path, label, active }: { path: string; label: string; active: boolean }) {
    return (
        <Link
            to={path}
            className={`header-link text-sm font-bold px-3 py-2 rounded-lg transition-all duration-300 ${active
                ? 'text-brand-400'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
        >
            {label}
        </Link>
    );
}

function MobileNavLink({ path, label, active, onClick }: { path: string; label: string; active: boolean; onClick: () => void }) {
    return (
        <Link
            to={path}
            onClick={onClick}
            className={`text-base font-bold px-4 py-3 rounded-xl transition-all ${active
                ? 'bg-brand-50 text-brand-600'
                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
        >
            {label}
        </Link>
    );
}

function ToolLink({ to, icon, label, description, active, disabled, onClick, soonLabel }: { to: string; icon: React.ReactNode; label: string; description?: string; active?: boolean; disabled?: boolean; onClick?: () => void; soonLabel?: string }) {
    if (disabled) {
        return (
            <div className="flex items-center gap-3 p-3 text-slate-400 opacity-50 cursor-not-allowed select-none rounded-xl">
                <div className="bg-slate-100 p-2 rounded-lg">
                    {icon}
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{label}</span>
                        <span className="text-[8px] bg-slate-200 px-1 rounded text-slate-500 font-black">{soonLabel ?? 'SOON'}</span>
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
