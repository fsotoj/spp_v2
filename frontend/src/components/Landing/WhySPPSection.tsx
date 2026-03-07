import { AlertCircle, CheckCircle2, BookOpen, Globe, Layers, Newspaper } from 'lucide-react';

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

            {/* Section 2: Our Response & Use Cases */}
            <section className="py-20 px-6 md:px-12 bg-slate-50 border-y border-slate-100 relative overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 lg:gap-16 relative z-10">
                    
                    {/* Left: Our Response */}
                    <div className="flex-1 space-y-6">
                        <p className="text-[11px] font-black text-brand-500 uppercase tracking-widest pl-1">Our Response</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                "Systematic and rigorously coded",
                                "Comparable across countries",
                                "Free and publicly accessible",
                                "Interactive mapping dashboard",
                            ].map(item => (
                                <div key={item} className="flex items-center gap-3 bg-white border border-brand-100/80 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
                                    <CheckCircle2 size={18} className="text-brand-400 shrink-0" />
                                    <span className="text-sm font-bold text-slate-700">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Use Cases Grid */}
                    <div className="flex-1 space-y-6">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Who uses SPP?</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <UseCaseCard
                                icon={<BookOpen size={20} />}
                                title="Research & Policy"
                                description="Identify territorial inequalities within and across each country."
                                color="orange"
                            />
                            <UseCaseCard
                                icon={<Globe size={20} />}
                                title="Democratic Access"
                                description="Transparent, public data for citizens and journalists."
                                color="slate"
                            />
                            <UseCaseCard
                                icon={<Layers size={20} />}
                                title="Comparative Tool"
                                description="Compare federal systems across Argentina, Brazil, and Mexico."
                                color="brand"
                            />
                            <UseCaseCard
                                icon={<Newspaper size={20} />}
                                title="Teaching & Media"
                                description="Visual tools for educators, reporters, and institutions."
                                color="amber"
                            />
                        </div>
                    </div>

                </div>
            </section>
        </>
    );
}

function UseCaseCard({
    icon, title, description, color
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: 'orange' | 'slate' | 'brand' | 'amber';
}) {
    const iconStyles = {
        orange: "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
        slate:  "bg-gradient-to-br from-slate-600 to-slate-900 text-white",
        brand:  "bg-gradient-to-br from-brand-400 to-brand-600 text-white",
        amber:  "bg-gradient-to-br from-amber-300 to-amber-500 text-white",
    };
    const barStyles = {
        orange: "from-amber-400 to-orange-500",
        slate:  "from-slate-600 to-slate-900",
        brand:  "from-brand-400 to-brand-600",
        amber:  "from-amber-300 to-amber-500",
    };

    return (
        <div className="group relative bg-spp-bgLight p-4 lg:p-5 rounded-3xl border border-slate-100 hover:border-slate-200 transition-all hover:shadow-lg hover:shadow-slate-100 hover:-translate-y-0.5 flex flex-row items-start gap-4">
            <div className={`w-10 h-10 rounded-xl shrink-0 ${iconStyles[color]} flex items-center justify-center shadow-md`}>
                {icon}
            </div>
            <div className="flex flex-col flex-1">
                <h3 className="text-sm font-black text-slate-900 mb-1 leading-snug">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{description}</p>
                <div className={`w-0 h-1 bg-gradient-to-r ${barStyles[color]} mt-3 rounded-full opacity-30 group-hover:opacity-100 group-hover:w-8 transition-all duration-500`} />
            </div>
        </div>
    );
}
