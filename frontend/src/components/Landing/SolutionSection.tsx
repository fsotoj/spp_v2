import { BookOpen, Globe, Newspaper, Layers } from 'lucide-react';
import { UseCaseCard } from './UseCaseCard';

export function SolutionSection() {
    return (
        <section className="py-24 lg:pr-6 xl:pr-12 bg-white relative overflow-hidden -mt-12 rounded-t-[3rem] z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.03)] border-t border-slate-100 flex flex-col lg:flex-row items-center gap-0 lg:gap-12">
            {/* Background embellishments */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-50/50 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3 z-0 pointer-events-none" />
            
            {/* Desktop Image: The Engine (Left Bleed) */}
            <div className="hidden lg:flex w-1/2 relative z-10 items-center justify-start pr-12">
                <div className="absolute inset-0 bg-brand-400/5 blur-[50px] transition-all duration-700 -z-10" />
                <img 
                    src="/spp_map_tool.webp" 
                    alt="SPP Data Dashboard" 
                    className="w-full h-auto rounded-r-[3rem] shadow-2xl border-y border-r border-slate-200 object-cover object-left transition-transform duration-1000 hover:scale-[1.01]"
                    onError={(e) => { e.currentTarget.src = "/spp_map_tool.png" }}
                />
            </div>
            
            {/* Content Container */}
            <div className="w-full lg:w-1/2 flex flex-col gap-10 relative z-10 pt-4 px-6 md:px-12 lg:px-0 lg:pl-10 max-w-3xl lg:mr-auto">
                
                {/* Header Narrative */}
                <div className="space-y-6">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-400 tracking-tight leading-tight">
                        A transformational resource for subnational research.
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed drop-shadow-sm">
                        The Subnational Politics Project addresses the long-standing challenge of data scarcity and comparability in the Global South. By offering over 40 years of systematic, transparent, and publicly accessible data, we empower deeper analysis of federalism, democracy, and territorial governance.
                    </p>
                </div>

                {/* Mobile Image: The Engine (Full Bleed Content Break) */}
                {/* SUGGESTION: On mobile, letting the image bleed edge-to-edge as a 'cover' breaks the text beautifully like a magazine spread. */}
                <div className="flex lg:hidden w-[calc(100%+3rem)] -ml-6 md:w-[calc(100%+6rem)] md:-ml-12 relative h-64 sm:h-80 shadow-inner group">
                    <img 
                        src="/spp_map_tool.webp" 
                        alt="SPP Data Dashboard" 
                        className="w-full h-full object-cover object-top border-y border-slate-100"
                        onError={(e) => { e.currentTarget.src = "/spp_map_tool.png" }}
                    />
                </div>

                {/* Use Cases Grid */}
                <div className="space-y-4">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">Empowering workflows</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <UseCaseCard
                            icon={<BookOpen size={18} />}
                            title="Scholarly Research"
                            description="Analyze subnational democracy, authoritarianism, and party competition."
                            color="orange"
                        />
                        <UseCaseCard
                            icon={<Layers size={18} />}
                            title="Policy Analysis"
                            description="Empower policymakers to identify and address territorial inequalities."
                            color="brand"
                        />
                        <UseCaseCard
                            icon={<Newspaper size={18} />}
                            title="Teaching & Education"
                            description="Provide students with unique visual tools for comparative politics."
                            color="amber"
                        />
                        <UseCaseCard
                            icon={<Globe size={18} />}
                            title="Democratic Accountability"
                            description="Open data for journalists to hold local governments accountable."
                            color="slate"
                        />
                    </div>
                </div>

            </div>

        </section>
    );
}
