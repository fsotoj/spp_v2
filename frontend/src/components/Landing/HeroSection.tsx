import { Link } from 'react-router-dom';
import { Download, ArrowRight, Telescope } from 'lucide-react';

export function HeroSection() {
    return (
        <section
            id="hero-section"
            className="relative min-h-screen flex items-center justify-center overflow-hidden bg-cover bg-center before:absolute before:inset-0 before:bg-black/40 before:z-0"
            style={{ backgroundImage: "url('/hero_background.webp')" }}
        >
            <div className="relative z-10 w-full pt-20 pb-10 px-5 sm:px-8 md:px-12 max-w-7xl mx-auto flex flex-col justify-center min-h-[85vh]">

                {/* Background Map SVG */}
                <div className="absolute left-1/2 top-[40%] sm:top-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] sm:w-[120%] lg:left-auto lg:translate-x-0 lg:right-0 lg:w-[51%] max-w-xl opacity-20 sm:opacity-30 lg:opacity-70 pointer-events-none drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    <img
                        src="/map_web.svg"
                        alt="SPP Subnational Map"
                        className="w-full object-contain map-heartbeat brightness-0 invert"
                    />
                </div>

                {/* Top Section: Hero Text (Wider, Full Width) */}
                <div className="w-full text-left z-10 relative pointer-events-none flex-1 flex flex-col justify-center">
                    <p className="text-xl sm:text-2xl md:text-3xl lg:text-[34px] leading-[1.25] lg:leading-[1.2] max-w-3xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 text-white drop-shadow-lg font-medium tracking-tight">
                        Systematic, transparent, and publicly accessible data on
                        <strong className="font-extrabold text-white"> subnational political institutions and electoral outcomes </strong>
                        across Latin American countries.
                    </p>
                </div>

                {/* Bottom Section: CTAs/Harvard (Matched to Stats) & Map/Stats */}
                <div className="flex flex-col lg:flex-row items-end justify-between w-full gap-8 lg:gap-14 mt-auto mb-4 lg:mb-0 z-10">

                    {/* Left side: CTAs and Harvard */}
                    <div className="flex-1 w-full flex flex-col lg:justify-end space-y-6 lg:pb-0 text-center lg:text-left">
                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                            <Link
                                to="/explore"
                                className="group relative flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg bg-brand-400 text-[#111111] hover:bg-brand-300 w-full sm:w-auto"
                            >
                                <Telescope size={22} className="text-slate-900 group-hover:rotate-12 transition-transform" />
                                Start Exploring
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <a
                                href="https://dataverse.harvard.edu/dataverse/spp"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 bg-white text-brand-700 hover:bg-slate-50 shadow-lg w-full sm:w-auto"
                            >
                                <Download size={20} />
                                Download Data
                            </a>
                        </div>

                        {/* Harvard Dataverse badge */}
                        <div className="hidden sm:flex items-center justify-center lg:justify-start gap-2 pt-2 animate-in fade-in duration-700 delay-500">
                            <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest drop-shadow-sm">Hosted on</span>
                            <span className="text-[11px] font-black text-slate-900 bg-white/90 px-2 py-0.5 rounded-md tracking-tight">Harvard Dataverse</span>
                            <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest drop-shadow-sm">· Free &amp; Open Access</span>
                        </div>
                    </div>

                    {/* Right side: Stats (Now standalone on the bottom right) */}
                    <div className="flex-1 w-full max-w-2xl lg:max-w-xl animate-in fade-in zoom-in duration-1000 flex flex-col justify-end self-end">
                        {/* Stats */}
                        <div className="flex items-center justify-center gap-0 border border-white/20 rounded-2xl bg-white/10 backdrop-blur-md shadow-lg overflow-hidden text-white w-full">
                            <StatPill value="~87" label="Subnational Units" />
                            <div className="w-px self-stretch bg-white/20" />
                            <StatPill value="3" label="Federal Countries" />
                            <div className="w-px self-stretch bg-white/20" />
                            <StatPill value="40+" label="Years of Data" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function StatPill({ value, label }: { value: string; label: string }) {
    return (
        <div className="flex-1 flex flex-col items-center gap-0.5 text-center py-4 px-3">
            <span className="text-2xl sm:text-3xl font-black leading-none text-brand-400 drop-shadow-md">{value}</span>
            <span className="text-[10px] sm:text-xs font-black text-white/90 uppercase tracking-wider mt-1 drop-shadow-sm">{label}</span>
        </div>
    );
}
