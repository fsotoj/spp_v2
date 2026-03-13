import { useTranslation } from 'react-i18next';
import { Download, Database, Code, BookOpen, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useDataverse } from '../hooks/useDataverse';
import { Link } from 'react-router-dom';

const DB_METHODOLOGY_LINKS: Record<string, string> = {
    SED: 'exec-variables',
    SEED: 'electoral-exec',
    SLED: 'electoral-leg',
    SDI: 'democracy-indices',
    CFTDFLD: 'databases',
    NED: 'exec-variables',
};

export function DataPage() {
    const { t } = useTranslation(['translation']);
    const { datasets, loading, isFallback } = useDataverse();

    return (
        <div className="min-h-screen bg-slate-50 pt-20">
            {/* Page Header */}
            <div className="bg-white border-b border-slate-100 py-16 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-brand-50/50 to-transparent pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-100 rounded-full blur-3xl opacity-30 pointer-events-none" />
                
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex items-center gap-2 text-xs font-bold text-brand-500 uppercase tracking-widest mb-3">
                        <span>SPP</span><span className="text-slate-300">·</span><span>{t('dataHub.title')}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-4 tracking-tight">
                        {t('dataHub.heading')}
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
                        {t('dataHub.subheading')}
                    </p>
                    <div className="flex items-center gap-4 mt-8">
                        <a href="https://dataverse.harvard.edu/dataverse/spp" target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-slate-900 text-white font-bold text-sm px-6 py-3 rounded-full hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/20">
                            <Database size={16} />{t('dataHub.downloadAll')}
                        </a>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
                
                {/* Datasets List */}
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                        <Database className="text-brand-500" size={24} />
                        Harvard Dataverse Collections
                    </h2>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <Loader2 className="animate-spin text-brand-500 mb-4" size={32} />
                            <p className="text-slate-500 font-medium">{t('dataHub.fetching')}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {isFallback && (
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 animate-in fade-in slide-in-from-top-4">
                                    <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
                                    <p className="text-sm font-medium">{t('dataHub.fallbackMsg')}</p>
                                </div>
                            )}

                            {datasets.map((db, idx) => (
                                <div 
                                    key={db.abbr} 
                                    className="group bg-white border border-slate-200 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/5 hover:border-brand-200 block"
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="inline-flex items-center gap-2 mb-2">
                                                <span className="text-xs font-black text-brand-500 bg-brand-50 px-2 py-0.5 rounded uppercase tracking-widest">{db.abbr}</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-brand-600 transition-colors">
                                                {t(db.nameKey, { defaultValue: db.nameKey.split('.').pop()?.toUpperCase() })}
                                            </h3>
                                            <p className="text-sm text-slate-500 mb-4 leading-relaxed max-w-xl">
                                                {t(db.descKey)}
                                            </p>
                                            
                                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[11px] text-slate-500 leading-relaxed font-mono">
                                                {t(db.citationKey)}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 min-w-[160px]">
                                            <a href={db.url} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full bg-brand-50 text-brand-600 hover:bg-brand-500 hover:text-white border border-brand-200 hover:border-brand-500 font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
                                                <Download size={14} />
                                                {t('dataHub.downloadDataverse')}
                                            </a>
                                            <Link to={`/methodology#${DB_METHODOLOGY_LINKS[db.abbr]}`}
                                                className="flex items-center justify-center gap-2 w-full bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
                                                <BookOpen size={14} />
                                                {t('dataHub.viewMethodology')}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Future API Sidebar */}
                <div className="lg:col-span-1">
                    <div className="sticky top-28 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-8 shadow-2xl overflow-hidden relative group">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 p-32 bg-brand-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-transform group-hover:scale-110 duration-700" />
                        <div className="absolute bottom-0 left-0 p-24 bg-purple-500/20 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none transition-transform group-hover:scale-110 duration-700 delay-100" />
                        
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-300 bg-brand-500/10 border border-brand-400/20 px-2.5 py-1 rounded-full mb-6">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                                {t('dataHub.comingSoon')}
                            </div>
                            
                            <h3 className="text-2xl font-black mb-4 flex items-center gap-3">
                                <Code className="text-brand-400" size={28} />
                                {t('dataHub.futureApi')}
                            </h3>
                            
                            <p className="text-slate-300 text-sm leading-relaxed mb-8">
                                {t('dataHub.futureApiDesc')}
                            </p>

                            <div className="bg-slate-950/50 border border-slate-700/50 rounded-lg p-4 font-mono text-xs text-brand-200 mb-8 backdrop-blur-sm">
                                <div className="text-slate-500 mb-1"># Query state-level indicators</div>
                                <div className="flex gap-2 text-slate-300">
                                    <span className="text-brand-400">GET</span> 
                                    /api/v1/sed?country=MEX&year=2021
                                </div>
                            </div>
                            
                            <a 
                                href="mailto:subnationalpoliticsproject@gmail.com?subject=SPP%20API%20Early%20Access%20Request"
                                className="w-full flex items-center justify-between bg-white text-slate-900 font-bold text-sm px-6 py-3.5 rounded-xl hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 group/btn shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                            >
                                {t('dataHub.requestAccessBtn')}
                                <ArrowRight size={16} className="transition-transform group-hover/btn:translate-x-1" />
                            </a>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
