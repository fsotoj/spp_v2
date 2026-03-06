import { Link } from 'react-router-dom';
import {
    Download, RefreshCw, History, Database,
    ArrowRight, Layout as LayoutIcon, Play
} from 'lucide-react';

export function LandingPage() {
    return (
        <div className="min-h-screen bg-[#fcfcfd] text-slate-800 font-sans selection:bg-brand-100 selection:text-brand-900">
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                    {/* Hero Text */}
                    <div className="flex-1 space-y-8 text-center lg:text-left">
                        <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
                            Explore Subnational <br />
                            <span className="text-brand-400">Latin American</span> <br />
                            Politics.
                        </h1>

                        <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                            Systematic, transparent, and publicly accessible data on political institutions and electoral outcomes across Latin American federal systems.
                        </p>

                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                            <Link
                                to="/explore"
                                className="group relative flex items-center gap-3 px-8 py-4 bg-brand-400 text-white rounded-2xl font-bold transition-all hover:bg-brand-500 hover:scale-[1.02] active:scale-95 shadow-xl shadow-brand-100/20"
                            >
                                <LayoutIcon size={20} />
                                Start Exploring
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <a
                                href="https://dataverse.harvard.edu/dataverse/spp"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-8 py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-95"
                            >
                                <Download size={20} />
                                Download Data
                            </a>
                        </div>
                    </div>

                    {/* Hero Visual: Browser Frame Mockup */}
                    <div className="flex-1 w-full max-w-2xl lg:max-w-none animate-in fade-in zoom-in duration-1000">
                        <div className="relative group">
                            {/* Decorative Glow */}
                            <div className="absolute -inset-4 bg-gradient-to-tr from-brand-500/20 to-accent-orange-500/20 rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-75 transition-opacity" />

                            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden transition-transform duration-500 group-hover:-translate-y-2">
                                {/* Chrome Toolbar */}
                                <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-6">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-400" />
                                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                                    </div>
                                    <div className="flex-1 max-w-sm bg-white border border-slate-200 rounded-md h-6 px-3 flex items-center">
                                        <span className="text-[10px] text-slate-400 font-mono truncate">subnationalpolitics.com/explore</span>
                                    </div>
                                </div>

                                {/* Image/GIF Content Area */}
                                <div className="aspect-[16/10] bg-slate-100 flex items-center justify-center relative group/overlay">
                                    <img
                                        src="/dashboard-demo.gif"
                                        alt="SPP Dashboard Demo"
                                        className="w-full h-full object-cover"
                                        onError={(e: any) => {
                                            e.target.src = "https://images.unsplash.com/photo-1551288049-bbbda536639a?auto=format&fit=crop&q=80&w=1200";
                                        }}
                                    />
                                    {/* Play Overlay */}
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/overlay:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 scale-90 group-hover/overlay:scale-100 transition-transform">
                                            <Play fill="currentColor" size={32} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 px-6 md:px-12 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<RefreshCw size={24} />}
                            title="Country Comparability"
                            description="Harmonized electoral data and indices for robust comparison across Latin American federal systems."
                            color="orange"
                        />
                        <FeatureCard
                            icon={<History size={24} />}
                            title="Longitudinal Depth"
                            description="Track political evolution with continuous data from the return of democracy to the present."
                            color="slate"
                        />
                        <FeatureCard
                            icon={<Database size={24} />}
                            title="Consolidated Records"
                            description="Centralized electoral variables with standardized keys for seamless integration with spatial data."
                            color="magenta"
                        />
                    </div>
                </div>
            </section>

            {/* Minimal Footer */}
            <footer className="py-12 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest flex flex-col gap-2">
                    <div>&copy; {new Date().getFullYear()} Subnational Politics Project</div>
                    <div>
                        Designed by: <a href="https://www.linkedin.com/in/felipesotojorquera/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-400 transition-colors">Felipe Soto Jorquera</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: 'orange' | 'slate' | 'magenta' }) {
    const colorStyles = {
        orange: "from-amber-400 to-accent-orange-600",
        slate: "from-slate-700 to-slate-900",
        magenta: "from-brand-400 to-brand-600"
    };

    return (
        <div className="group relative bg-[#fcfcfd] p-8 rounded-[2rem] border border-slate-100 hover:border-slate-200 transition-all hover:shadow-2xl hover:shadow-slate-100 hover:-translate-y-1">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorStyles[color]} text-white flex items-center justify-center mb-6 shadow-lg`}>
                {icon}
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
                {description}
            </p>
            <div className={`w-12 h-1 bg-gradient-to-r ${colorStyles[color]} mt-6 rounded-full opacity-30 group-hover:opacity-100 group-hover:w-16 transition-all duration-500`} />
        </div>
    );
}
