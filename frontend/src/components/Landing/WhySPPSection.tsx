import { AlertCircle } from 'lucide-react';

export function WhySPPSection() {
    return (
        <>
            {/* Section 1: Why SPP? & Image Cover */}
            <section className="py-24 px-6 md:px-12 bg-spp-bgLight relative overflow-hidden min-h-[500px] lg:min-h-[600px] flex items-center group">
                
                {/* Partial-bleed Background Image */}
                <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[65%] z-0 overflow-hidden opacity-30 md:opacity-60 lg:opacity-100 transition-opacity duration-300">
                    <img 
                        src="/Gobernadores-y-Milei.webp" 
                        alt="Gobernadores y Milei" 
                        className="w-full h-full object-cover object-[60%_center] lg:object-[80%_center] transition-transform duration-1000 group-hover:scale-105 opacity-80 mix-blend-multiply"
                    />
                    {/* Gradient Fade: Ensures text on left is visible by fading image into bg color */}
                    <div className="absolute inset-0 bg-gradient-to-r from-spp-bgLight via-spp-bgLight/90 lg:via-spp-bgLight/50 to-transparent"></div>
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-spp-bgLight to-transparent"></div>
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-spp-bgLight to-transparent"></div>
                </div>

                <div className="max-w-7xl mx-auto w-full relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                    
                    {/* Left Column: Why SPP? */}
                    <div className="w-full lg:w-3/5 space-y-8 lg:pr-12">
                        <div>
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-400 tracking-tight leading-tight">
                                Why SPP?
                            </h2>
                        </div>
                        
                        <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-medium max-w-2xl drop-shadow-sm">
                            Researchers studying subnational politics in Latin America have long faced the same obstacle: data on governors, legislatures, and elections was{' '}
                            <strong className="text-slate-800 font-black">scattered across countries, coded differently in each, and nearly impossible to compare at scale.</strong>
                        </p>

                        <div className="flex flex-wrap gap-3 max-w-2xl">
                            {[
                                { label: "Fragmented across sources", icon: <AlertCircle size={15} /> },
                                { label: "No standardization",        icon: <AlertCircle size={15} /> },
                                { label: "Difficult to access",       icon: <AlertCircle size={15} /> },
                                { label: "No visualization tools",    icon: <AlertCircle size={15} /> },
                            ].map(({ label, icon }) => (
                                <div key={label} className="flex items-center gap-3 text-sm font-bold text-slate-700 bg-white/70 backdrop-blur-md px-5 py-3 rounded-xl border border-slate-200/50 shadow-md">
                                    <span className="text-brand-500">{icon}</span>
                                    {label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right transparent column just to hold layout space if needed */}
                    <div className="w-full lg:w-2/5 hidden lg:block"></div>
                </div>
            </section>

        </>
    );
}
