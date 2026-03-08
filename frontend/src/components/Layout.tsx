import { useState, useEffect, type ReactNode, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Settings, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const SidebarContext = createContext({ isMobile: false, isSidebarOpen: false });
export function useSidebar() { return useContext(SidebarContext); }

interface LayoutProps {
    children: ReactNode;
}

/**
 * SidebarPortal allows tools (Map, Graph, etc.) to "push" their controls 
 * into the global Sidebar.
 */
export function SidebarPortal({ children }: { children: ReactNode }) {
    const sidebarEl = document.getElementById('sidebar-content');
    if (!sidebarEl) return null;
    return createPortal(children, sidebarEl);
}

/**
 * Layout: The container for the analytical tools (Map, Graph, Chamber).
 * - md+:    Inline collapsible sidebar (original behaviour).
 * - <md:    Slide-over fixed drawer that overlays the map from the top of the page.
 *           Starts closed. A bottom-left FAB toggles it.
 */
export function Layout({ children }: LayoutProps) {
    const { t } = useTranslation();
    const isMobileBreakpoint = () => typeof window !== 'undefined' && window.innerWidth < 768;

    // On mobile default to closed; on desktop default to open
    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobileBreakpoint());
    const [isMobile, setIsMobile] = useState(isMobileBreakpoint());

    // Keep isMobile in sync with the window resize
    useEffect(() => {
        const onResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // Close sidebar when resizing down to mobile
            if (mobile) setIsSidebarOpen(false);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

    return (
        <SidebarContext.Provider value={{ isMobile, isSidebarOpen }}>
            <div className="flex h-screen bg-spp-bgMuted overflow-hidden pt-20 transition-all font-sans text-spp-textDark relative animate-in fade-in duration-500">

                {/* ── Mobile backdrop ──────────────────────────────────────── */}
                {isMobile && isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-30"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* ── Sidebar ─────────────────────────────────────────────── */}
                {isMobile ? (
                    /* Mobile: fixed slide-over drawer */
                    <aside
                        className={`
                        fixed left-0 bottom-0 top-20 z-40
                        bg-spp-bgLight border-r border-slate-200 flex flex-col shadow-2xl
                        transition-all duration-300 ease-in-out
                        ${isSidebarOpen ? 'w-[min(320px,85vw)]' : 'w-0 overflow-hidden'}
                    `}
                    >
                        <div className="h-14 shrink-0 flex items-center px-6 border-b border-slate-100 font-bold text-[10px] text-brand-600 uppercase tracking-[0.15em] whitespace-nowrap">
                            <Settings size={14} className="mr-2" />
                            {t('map.visualizationSettings')}
                        </div>
                        <div id="sidebar-content" className="flex-1 overflow-y-auto overflow-x-hidden" />
                        <div className="p-4 border-t border-slate-100 bg-spp-bgMuted shrink-0">
                            <div className="flex items-center gap-2 text-[10px] text-spp-gray font-bold uppercase">
                                <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                                Live Data Engine
                            </div>
                        </div>
                    </aside>
                ) : (
                    /* Desktop: inline sidebar */
                    <aside
                        className={`bg-spp-bgLight border-r border-slate-200 flex flex-col shadow-sm z-20 transition-all duration-300 ease-in-out relative ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}
                    >
                        <div className="h-14 flex items-center px-6 border-b border-slate-100 font-bold text-[10px] text-brand-600 uppercase tracking-[0.15em] whitespace-nowrap">
                            <Settings size={14} className="mr-2 text-brand-500" />
                            {t('map.visualizationSettings')}
                        </div>
                        <div id="sidebar-content" className="flex-1 overflow-y-auto overflow-x-hidden" />
                        <div className="p-4 border-t border-slate-100 bg-spp-bgMuted">
                            <div className="flex items-center gap-2 text-[10px] text-spp-gray font-bold uppercase">
                                <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                                Live Data Engine
                            </div>
                        </div>
                    </aside>
                )}

                {/* ── Main Analytical Space ────────────────────────────────── */}
                <main className="flex-1 flex flex-col h-full overflow-hidden relative">

                    {/* Desktop toggle button: top-left chevron */}
                    <button
                        onClick={toggleSidebar}
                        className={`absolute top-4 z-40 p-2 bg-spp-bgLight border border-slate-200 shadow-md rounded-lg text-spp-gray hover:text-brand-400 transition-all hidden md:flex ${isSidebarOpen ? 'left-4' : 'left-4'}`}
                    >
                        {isSidebarOpen ? <ChevronLeft size={20} /> : <Settings size={20} />}
                    </button>

                    {/* Mobile FAB: bottom-left, thumb-reachable */}
                    <button
                        onClick={toggleSidebar}
                        className="md:hidden fixed bottom-6 left-4 z-50 flex items-center gap-2 px-4 py-3 bg-spp-textDark text-spp-textLight text-xs font-bold rounded-xl shadow-2xl hover:bg-brand-500 active:scale-95 transition-all"
                        aria-label="Toggle visualization settings"
                    >
                        <Settings size={16} />
                        <span>{t('map.visualizationSettings')}</span>
                    </button>

                    <div className="flex-1 relative overflow-hidden">
                        {children}
                    </div>
                </main>
            </div>
        </SidebarContext.Provider>
    );
}
