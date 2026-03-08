import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import {
    ALL_SECTIONS, VAR_SECTION_IDS,
    DATABASES, COVERAGE_ROWS, DATA_SOURCES, KEY_REFS,
    ID_VARS, EXEC_NAT_VARS, EXEC_SUB_VARS, ELECT_EXEC_VARS, ELECT_LEG_VARS, DEMO_VARS,
} from '../data/methodology';
import { MethodologySidebar } from '../components/Methodology/MethodologySidebar';
import { DatabaseCard } from '../components/Methodology/DatabaseCard';
import { VarTable } from '../components/Methodology/VarTable';

// ── Minimal shared sub-components ────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <section id={id} className="mb-16 scroll-mt-28">
            <h2 className="text-2xl font-black text-slate-900 mb-6 pb-3 border-b border-slate-100">{title}</h2>
            <div className="space-y-4 text-slate-600 leading-relaxed text-[15px]">{children}</div>
        </section>
    );
}

function InfoBox({ children, type = 'default' }: { children: React.ReactNode; type?: 'default' | 'note' }) {
    return (
        <div className={`my-4 px-4 py-3.5 rounded-xl border text-sm leading-relaxed ${
            type === 'note'
                ? 'bg-amber-50 border-amber-100 text-amber-900'
                : 'bg-brand-50 border-brand-100 text-brand-900'
        }`}>
            {children}
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function MethodologyPage() {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState('introduction');
    const [showFAB, setShowFAB] = useState(false);
    const [varGroupOpen, setVarGroupOpen] = useState(false);
    const [openVarTab, setOpenVarTab] = useState<string | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Scrollspy
    useEffect(() => {
        const sectionEls = ALL_SECTIONS
            .map(id => document.getElementById(id))
            .filter(Boolean) as HTMLElement[];

        observerRef.current = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter(e => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible.length > 0) {
                    const id = visible[0].target.id;
                    setActiveSection(id);
                    if (VAR_SECTION_IDS.includes(id as typeof VAR_SECTION_IDS[number])) {
                        setVarGroupOpen(true);
                    }
                }
            },
            { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
        );
        sectionEls.forEach(el => observerRef.current!.observe(el));
        return () => observerRef.current?.disconnect();
    }, []);

    // FAB on scroll
    useEffect(() => {
        const handler = () => setShowFAB(window.scrollY > 300);
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, []);

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
    };

    const handleVarTabClick = (id: string) => {
        scrollTo(id);
        setOpenVarTab(prev => prev === id ? null : id);
    };

    return (
        <div className="min-h-screen bg-white pt-20">
            {/* Page Header */}
            <div className="bg-slate-50 border-b border-slate-100 py-12 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 text-xs font-bold text-brand-500 uppercase tracking-widest mb-3">
                        <span>SPP</span><span className="text-slate-300">·</span><span>{t('methodology.title')}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-4">
                        {t('methodology.heading')}
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl">{t('methodology.subheading')}</p>
                    <div className="flex items-center gap-3 mt-6 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                            {t('methodology.version')}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1.5">
                            {t('methodology.date')}
                        </span>
                        <a href="/SPP_Document_V4.pdf" download
                            className="inline-flex items-center gap-2 text-xs font-bold text-brand-600 bg-brand-50 border border-brand-200 rounded-full px-3 py-1.5 hover:bg-brand-100 transition-colors">
                            <Download size={12} />{t('methodology.downloadCodebook')}
                        </a>
                    </div>
                </div>
            </div>

            {/* Main Layout */}
            <div className="max-w-7xl mx-auto px-6 py-12 flex gap-12">
                <MethodologySidebar
                    activeSection={activeSection}
                    varGroupOpen={varGroupOpen}
                    openVarTab={openVarTab}
                    onScrollTo={scrollTo}
                    onToggleVarGroup={() => setVarGroupOpen(v => !v)}
                    onVarTabClick={handleVarTabClick}
                />

                <main className="flex-1 min-w-0 max-w-3xl">

                    <Section id="introduction" title={t('methodology.nav.introduction')}>
                        <p>{t('methodology.introduction.p1')}</p>
                        <p>{t('methodology.introduction.p2')}</p>
                        <InfoBox>
                            <strong>{t('methodology.introduction.citationLabel')}</strong>{' '}
                            Giraudy, Agustina; Gonzalez, Guadalupe Andrea; Urdinez, Francisco, 2025,{' '}
                            <em>"Codebook: Subnational Politics Project (SPP) (v. 1)"</em>,{' '}
                            <a href="https://doi.org/10.17605/OSF.IO/H96FD" target="_blank" rel="noopener noreferrer"
                                className="text-brand-600 underline">https://doi.org/10.17605/OSF.IO/H96FD</a>
                        </InfoBox>
                    </Section>

                    <Section id="databases" title={t('methodology.nav.databases')}>
                        <p>{t('methodology.databases.p1')}</p>
                        <div className="my-6 space-y-4">
                            {DATABASES.map(db => <DatabaseCard key={db.abbr} db={db} t={t} />)}
                        </div>
                        <h3 className="text-base font-black text-slate-800 mt-8 mb-2">{t('methodology.databases.structure')}</h3>
                        <p>{t('methodology.databases.structureDesc')}</p>
                        <h3 className="text-base font-black text-slate-800 mt-6 mb-2">{t('methodology.databases.quality')}</h3>
                        <p>{t('methodology.databases.qualityDesc')}</p>
                    </Section>

                    <Section id="coverage" title={t('methodology.nav.coverage')}>
                        <p>{t('methodology.coverage.p1')}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
                            {[
                                { value: '3',   label: t('methodology.coverage.countries') },
                                { value: '83',  label: t('methodology.coverage.units') },
                                { value: '40+', label: t('methodology.coverage.years') },
                                { value: '60+', label: t('methodology.coverage.variables') },
                            ].map(stat => (
                                <div key={stat.label} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-black text-brand-500">{stat.value}</div>
                                    <div className="text-xs text-slate-500 font-medium mt-1 leading-tight">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                        <div className="overflow-x-auto my-6 rounded-xl border border-slate-100">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs uppercase tracking-wide">{t('methodology.coverage.country')}</th>
                                        <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs uppercase tracking-wide">{t('methodology.coverage.unitsCol')}</th>
                                        <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs uppercase tracking-wide">{t('methodology.coverage.exeStart')}</th>
                                        <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs uppercase tracking-wide">{t('methodology.coverage.legStart')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {COVERAGE_ROWS.map((row, i) => (
                                        <tr key={row.country} className={i % 2 === 1 ? 'bg-slate-50/50' : ''}>
                                            <td className="px-4 py-3 font-bold text-slate-800">{row.country}</td>
                                            <td className="px-4 py-3 text-slate-600">{row.units}</td>
                                            <td className="px-4 py-3 text-slate-600">{row.exe}</td>
                                            <td className="px-4 py-3 text-slate-600">{row.leg}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <InfoBox type="note">{t('methodology.coverage.note')}</InfoBox>
                    </Section>

                    <Section id="id-variables" title={t('methodology.nav.idVariables')}>
                        <p>{t('methodology.idVariables.p1')}</p>
                        <VarTable vars={ID_VARS} />
                    </Section>

                    <Section id="exec-variables" title={t('methodology.nav.execVariables')}>
                        <p>{t('methodology.execVariables.p1')}</p>
                        <h3 className="text-base font-black text-slate-800 mt-6 mb-1">
                            {t('methodology.execVariables.nationalTitle')}
                            <span className="ml-2 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded align-middle">→ NED</span>
                        </h3>
                        <VarTable vars={EXEC_NAT_VARS} />
                        <h3 className="text-base font-black text-slate-800 mt-8 mb-1">
                            {t('methodology.execVariables.subnationalTitle')}
                            <span className="ml-2 text-[10px] font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded align-middle">→ SED</span>
                        </h3>
                        <VarTable vars={EXEC_SUB_VARS} />
                    </Section>

                    <Section id="electoral-exec" title={t('methodology.nav.electoralExec')}>
                        <p>{t('methodology.electoralExec.p1')}</p>
                        <div className="my-3"><span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">→ SEED</span></div>
                        <VarTable vars={ELECT_EXEC_VARS} />
                    </Section>

                    <Section id="electoral-leg" title={t('methodology.nav.electoralLeg')}>
                        <p>{t('methodology.electoralLeg.p1')}</p>
                        <div className="my-3"><span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">→ SLED</span></div>
                        <VarTable vars={ELECT_LEG_VARS} />
                    </Section>

                    <Section id="democracy-indices" title={t('methodology.nav.democracyIndices')}>
                        <p>{t('methodology.democracyIndices.p1')}</p>
                        <div className="my-3"><span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">→ SDI</span></div>
                        <VarTable vars={DEMO_VARS} />
                    </Section>

                    <Section id="data-sources" title={t('methodology.nav.dataSources')}>
                        <p>{t('methodology.dataSources.p1')}</p>
                        <div className="my-6 space-y-6">
                            {DATA_SOURCES.map(({ country, sources }) => (
                                <div key={country}>
                                    <h4 className="text-sm font-black text-slate-700 mb-2">{country}</h4>
                                    <ul className="space-y-1.5">
                                        {sources.map(s => (
                                            <li key={s} className="flex items-start gap-2 text-sm text-slate-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />{s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        <p>{t('methodology.dataSources.p2')}</p>
                    </Section>

                    <Section id="appendices" title={t('methodology.nav.appendices')}>
                        <p>{t('methodology.appendices.p1')}</p>
                        <InfoBox>
                            <strong>{t('methodology.appendices.fullCodebook')}</strong>{' '}
                            {t('methodology.appendices.fullCodebookDesc')}{' '}
                            <a href="/SPP_Document_V4.pdf" download className="text-brand-500 hover:text-brand-600 font-bold underline">
                                {t('methodology.downloadCodebook')}
                            </a>
                        </InfoBox>
                        <h3 className="text-base font-black text-slate-800 mt-8 mb-4">{t('methodology.appendices.keyRefsTitle')}</h3>
                        <div className="space-y-4">
                            {KEY_REFS.map(ref => (
                                <div key={ref.author} className="flex gap-3 text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                                    <p className="text-slate-600 leading-relaxed">
                                        <span className="font-bold text-slate-800">{ref.author}</span>{' '}{ref.work}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <div className="h-24" />
                </main>
            </div>

            {/* FAB */}
            <div className={`fixed bottom-8 right-8 z-50 transition-all duration-300 ${showFAB ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <a href="/SPP_Document_V4.pdf" download
                    className="flex items-center gap-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm px-5 py-3 rounded-full shadow-2xl shadow-brand-500/30 transition-all hover:scale-105 active:scale-95">
                    <Download size={16} />{t('methodology.downloadCodebook')}
                </a>
            </div>
        </div>
    );
}
