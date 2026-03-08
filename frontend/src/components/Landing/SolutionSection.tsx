import { BookOpen, Globe, Newspaper, Layers } from 'lucide-react';
import { UseCaseCard } from './UseCaseCard';
import { useTranslation } from 'react-i18next';

export function SolutionSection() {
    const { t } = useTranslation();

    return (
        <section className="py-24 lg:pr-6 xl:pr-12 bg-slate-900 relative overflow-hidden z-20 flex flex-col lg:flex-row items-center gap-0 lg:gap-12">
            {/* Background SVG as cover */}
            <img
                src="/background.svg"
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none z-0"
            />

            {/* Background embellishments */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3 z-0 pointer-events-none" />

            {/* Desktop Image: The Engine (Left Bleed) */}
            <div className="hidden lg:flex w-1/2 relative z-10 items-center justify-start pr-12">
                <div className="absolute inset-0 bg-brand-400/5 blur-[50px] transition-all duration-700 -z-10" />
                <img
                    src="/spp_map_tool.webp"
                    alt="SPP Data Dashboard"
                    className="w-full h-auto shadow-2xl border-y border-r border-slate-200 object-cover object-left transition-transform duration-1000 hover:scale-[1.01]"
                    onError={(e) => { e.currentTarget.src = "/spp_map_tool.png" }}
                />
            </div>

            {/* Content Container */}
            <div className="w-full lg:w-1/2 flex flex-col gap-10 relative z-10 pt-4 px-6 md:px-12 lg:px-0 lg:pl-10 max-w-3xl lg:mr-auto">

                {/* Header Narrative */}
                <div className="space-y-6">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                        {t('solution.title')}
                    </h2>
                    <p className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed drop-shadow-sm">
                        {t('solution.body')}
                    </p>
                </div>

                {/* Mobile Image: The Engine (Full Bleed Content Break) */}
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
                    <p className="text-[11px] font-black text-slate-100 uppercase tracking-widest pl-2">{t('solution.empoweringWorkflows')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <UseCaseCard
                            icon={<BookOpen size={18} />}
                            title={t('solution.scholarlyResearch')}
                            description={t('solution.scholarlyDesc')}
                            color="orange"
                        />
                        <UseCaseCard
                            icon={<Layers size={18} />}
                            title={t('solution.policyAnalysis')}
                            description={t('solution.policyDesc')}
                            color="brand"
                        />
                        <UseCaseCard
                            icon={<Newspaper size={18} />}
                            title={t('solution.teachingEducation')}
                            description={t('solution.teachingDesc')}
                            color="amber"
                        />
                        <UseCaseCard
                            icon={<Globe size={18} />}
                            title={t('solution.democraticAccountability')}
                            description={t('solution.democraticDesc')}
                            color="slate"
                        />
                    </div>
                </div>

            </div>

        </section>
    );
}
