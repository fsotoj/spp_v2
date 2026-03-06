import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';

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
 * It sits underneath the GlobalHeader and provides side-panel controls.
 */
export function Layout({ children }: LayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen bg-[#f8fafc] overflow-hidden pt-20 transition-all duration-500 font-sans text-slate-800">
            {/* Contextual Secondary Sidebar (Tool controls) */}
            <aside
                className={`bg-white border-r border-slate-200 flex flex-col shadow-sm z-20 transition-all duration-300 ease-in-out relative ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
                    }`}
            >
                <div className="h-14 flex items-center px-6 border-b border-slate-100 font-bold text-xs text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    <Filter size={14} className="mr-2" />
                    Explorer Controls
                </div>

                <div id="sidebar-content" className="flex-1 overflow-y-auto overflow-x-hidden">
                    {/* Tools will inject their controls here via SidebarPortal */}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                        <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                        Live Data Engine
                    </div>
                </div>
            </aside>

            {/* Main Analytical Space */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Floating Toggle Button for Sidebar */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={`absolute top-4 z-40 p-2 bg-white border border-slate-200 shadow-md rounded-lg text-slate-500 hover:text-brand-400 transition-all ${isSidebarOpen ? 'left-4' : 'left-4'
                        }`}
                >
                    {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>

                <div className="flex-1 relative overflow-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
}
