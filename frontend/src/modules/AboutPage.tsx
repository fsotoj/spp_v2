import { useTranslation } from 'react-i18next';
import { Landmark, Globe2, BookOpen, LineChart } from 'lucide-react';

export function AboutPage() {
    const { t } = useTranslation(['translation']);

    return (
        <div className="min-h-screen bg-slate-50 pt-20">
            {/* Header Section */}
            <div className="bg-white border-b border-slate-100 py-20 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-brand-50/50 to-transparent pointer-events-none" />
                <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-brand-100/50 rounded-full blur-3xl opacity-40 pointer-events-none" />
                
                <div className="max-w-4xl mx-auto relative z-10 text-center">
                    <div className="inline-flex items-center justify-center gap-2 text-xs font-black text-brand-500 uppercase tracking-widest mb-6 bg-brand-50 px-3 py-1.5 rounded-full">
                        <span>SPP</span><span className="text-brand-300">·</span><span>{t('aboutPage.title')}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
                        {t('aboutPage.heading')}
                    </h1>
                </div>
            </div>

            {/* Narrative Content */}
            <main className="max-w-3xl mx-auto px-6 py-16">
                <div className="prose prose-lg prose-slate prose-p:leading-relaxed prose-p:text-slate-600">
                    <p className="text-xl md:text-2xl text-slate-800 font-medium leading-relaxed mb-8">
                        {t('aboutPage.p1')}
                    </p>
                    
                    <div className="w-12 h-1 bg-brand-200 rounded-full my-12" />
                    
                    <p className="mb-6">
                        {t('aboutPage.p2')}
                    </p>
                    <p className="mb-6">
                        {t('aboutPage.p3')}
                    </p>
                    <p className="mb-12">
                        {t('aboutPage.p4')}
                    </p>
                </div>

                {/* Conceptual Grid to make the page pop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-16 pt-16 border-t border-slate-200">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                            <Globe2 size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{t('aboutPage.cards.scopeTitle')}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            {t('aboutPage.cards.scopeDesc')}
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mb-4">
                            <LineChart size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{t('aboutPage.cards.timeTitle')}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            {t('aboutPage.cards.timeDesc')}
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                            <Landmark size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{t('aboutPage.cards.institutionsTitle')}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            {t('aboutPage.cards.institutionsDesc')}
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mb-4">
                            <BookOpen size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{t('aboutPage.cards.openTitle')}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            {t('aboutPage.cards.openDesc')}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
