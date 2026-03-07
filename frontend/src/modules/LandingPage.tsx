import { Link } from 'react-router-dom';
import {
    Download, ArrowRight, Layout as LayoutIcon,
    BookOpen, Globe, Layers, Newspaper,
    AlertCircle, CheckCircle2, Linkedin
} from 'lucide-react';

// ── People data (ported from about_spp_module.R) ──────────────────────────────
const PEOPLE = [
    {
        name: "Agustina Giraudy",
        role: "Principal Investigator",
        linkedin: "https://www.linkedin.com/in/agustina-giraudy-72a3b81a9/",
        site: "https://agustinagiraudy.com/",
        org: "American University · Tecnológico de Monterrey",
        img: "/agustina.webp",
        color: "#FFA92A",
    },
    {
        name: "Francisco Urdinez",
        role: "Collaborator",
        linkedin: "https://www.linkedin.com/in/francisco-urdinez-a8061813/",
        site: "https://www.furdinez.com/",
        org: "Universidad Católica de Chile",
        img: "/francisco.webp",
        color: "#722464",
    },
    {
        name: "Guadalupe González",
        role: "Collaborator",
        linkedin: "https://www.linkedin.com/in/guadag12/",
        site: "https://guadagonzalez.com/",
        org: "University of Maryland",
        img: "/guadalupe.webp",
        color: "#722464",
    },
    {
        name: "Felipe Soto Jorquera",
        role: "Collaborator",
        linkedin: "https://www.linkedin.com/in/felipesotojorquera/",
        site: null,
        org: "Hertie School, Berlin",
        img: "/felipe.webp",
        color: "#722464",
    },
    {
        name: "Sergio Huertas Hernández",
        role: "Research Assistant",
        linkedin: "https://www.linkedin.com/in/sergio-huertas-hern%C3%A1ndez/",
        site: "https://serhuertas.github.io/",
        org: "Universidad Católica de Chile",
        img: "/sergio.webp",
        color: "#444447",
    },
    {
        name: "Magdalena Nieto",
        role: "Research Assistant",
        linkedin: "https://www.linkedin.com/in/magdalenanieto/",
        site: null,
        org: "Universidad de Buenos Aires",
        img: "/magdalena.webp",
        color: "#444447",
    },
];

export function LandingPage() {
    return (
        <div className="min-h-screen bg-[#fcfcfd] text-slate-800 font-sans selection:bg-brand-100 selection:text-brand-900">

            {/* Flip-card CSS — scoped to .spp-person-card (ported from about_spp_module.R) */}
            <style>{`
                .spp-person-card {
                    height: 19em;
                    width: 100%;
                    max-width: 14em;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    border-radius: 16px;
                    overflow: hidden;
                    background: #fff;
                    box-shadow: 15px 15px 27px #e1e1e3, -15px -15px 27px #ffffff;
                    transition: all 0.4s cubic-bezier(0.645, 0.045, 0.355, 1);
                }
                .spp-person-photo {
                    height: 10em;
                    width: 100%;
                    position: absolute;
                    top: 0;
                    background-size: cover;
                    background-position: center top;
                    background-repeat: no-repeat;
                    z-index: 2;
                    transition: all 0.4s cubic-bezier(0.645, 0.045, 0.355, 1);
                }
                .spp-photo-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 60%);
                    opacity: 0;
                    transition: opacity 0.4s ease;
                }
                .spp-photo-footer {
                    position: absolute;
                    bottom: 0.8em;
                    left: 0.8em;
                    right: 0.8em;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    z-index: 3;
                }
                .spp-photo-name {
                    opacity: 0;
                    transform: translateY(5px);
                    transition: all 0.4s ease 0.1s;
                    color: white;
                    font-weight: 800;
                    font-size: 0.95rem;
                    line-height: 1.1;
                }
                .spp-person-info {
                    background-color: #FAFAFC;
                    height: 9em;
                    width: 100%;
                    position: absolute;
                    bottom: 0;
                    padding: 1.2em 0.6em;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    z-index: 1;
                    transition: all 0.4s cubic-bezier(0.645, 0.045, 0.355, 1);
                }
                .spp-role-badge {
                    font-size: 8px;
                    text-transform: uppercase;
                    font-weight: 800;
                    color: white;
                    padding: 3px 8px;
                    border-radius: 4px;
                }
                .spp-person-name {
                    margin: 0;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #1a1a1b;
                }
                .spp-person-org {
                    font-size: 10px;
                    color: #666;
                    line-height: 1.3;
                }
                .spp-social-row {
                    display: flex;
                    flex-direction: row;
                    gap: 6px;
                    align-items: center;
                }
                .spp-social-btn {
                    width: 24px;
                    height: 24px;
                    background-color: #000;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 5px;
                    text-decoration: none;
                    font-size: 11px;
                    overflow: hidden;
                    white-space: nowrap;
                    transition: all 0.4s cubic-bezier(0.645, 0.045, 0.355, 1);
                }
                .spp-btn-text {
                    max-width: 0;
                    opacity: 0;
                    margin-left: 0;
                    font-weight: 700;
                    font-size: 10px;
                    transition: all 0.4s ease;
                }
                /* Hover transitions */
                .spp-person-card:hover .spp-person-info   { height: 0; opacity: 0; }
                .spp-person-card:hover .spp-person-photo  { height: 19em; }
                .spp-person-card:hover .spp-photo-overlay { opacity: 1; }
                .spp-person-card:hover .spp-photo-name    { opacity: 1; transform: translateY(0); }
                .spp-person-card:hover .spp-social-btn    { width: 78px; background-color: white; color: black; padding: 0 6px; }
                .spp-person-card:hover .spp-btn-text      { max-width: 50px; opacity: 1; margin-left: 5px; }
                .spp-social-btn.li:hover  { background-color: #0A66C2 !important; color: white !important; }
                .spp-social-btn.web:hover { background-color: #FFA92A !important; color: white !important; }
            `}</style>

            {/* ── Hero ──────────────────────────────────────────────────── */}
            <section className="relative pt-28 pb-16 px-5 sm:px-8 md:px-12 max-w-7xl mx-auto overflow-hidden">
                <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-24">

                    {/* Hero Text */}
                    <div className="flex-1 space-y-6 text-center lg:text-left">
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700 hyphens-auto">
                            Explore Subnational{' '}
                            <span className="text-brand-400">Latin American</span>{' '}
                            Politics.
                        </h1>

                        <p className="text-base sm:text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                            Systematic, transparent, and publicly accessible data on political institutions and electoral outcomes across Latin American federal systems.
                        </p>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-2 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                            <Link
                                to="/explore"
                                className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-brand-400 text-white rounded-2xl font-bold transition-all hover:bg-brand-500 hover:scale-[1.02] active:scale-95 shadow-xl shadow-brand-100/20"
                            >
                                <LayoutIcon size={20} />
                                Start Exploring
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <a
                                href="https://dataverse.harvard.edu/dataverse/spp"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-95"
                            >
                                <Download size={20} />
                                Download Data
                            </a>
                        </div>

                        {/* Harvard Dataverse badge */}
                        <div className="flex items-center justify-center lg:justify-start gap-2 pt-1 animate-in fade-in duration-700 delay-500">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Hosted on</span>
                            <span className="text-[11px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md tracking-tight">Harvard Dataverse</span>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">· Free &amp; Open Access</span>
                        </div>

                        {/* Mobile-only: compact stat bar */}
                        <div className="flex sm:hidden items-center justify-center gap-6 pt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="text-2xl font-black text-brand-400">~87</span>
                                Subnational Units
                            </div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="text-2xl font-black text-brand-400">3</span>
                                Countries
                            </div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="text-2xl font-black text-brand-400">40+</span>
                                Years
                            </div>
                        </div>
                    </div>

                    {/* Hero Visual: Browser Frame Mockup — hidden on phone, visible sm+ */}
                    <div className="hidden sm:block flex-1 w-full max-w-2xl lg:max-w-none animate-in fade-in zoom-in duration-1000">
                        <div className="relative group">
                            <div className="absolute -inset-4 bg-gradient-to-tr from-brand-500/20 to-amber-500/20 rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-75 transition-opacity" />
                            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden transition-transform duration-500 group-hover:-translate-y-2">
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
                                <div className="aspect-[16/10] bg-slate-100 flex items-center justify-center relative">
                                    <img
                                        src="/dashboard-demo.gif"
                                        alt="SPP Dashboard Demo"
                                        className="w-full h-full object-cover"
                                        onError={(e: any) => {
                                            e.target.src = "https://images.unsplash.com/photo-1551288049-bbbda536639a?auto=format&fit=crop&q=80&w=1200";
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Coverage Stats Band ───────────────────────────────────── */}
            <section className="hidden sm:block border-y border-slate-100 bg-white py-8 px-6">
                <div className="max-w-3xl mx-auto flex items-center justify-center gap-16">
                    <StatPill value="~87" label="Subnational Units" sub="Arg · Bra · Mex" />
                    <div className="w-px h-12 bg-slate-200" />
                    <StatPill value="3" label="Federal Countries" sub="Argentina · Brazil · Mexico" />
                    <div className="w-px h-12 bg-slate-200" />
                    <StatPill value="40+" label="Years of Data" sub="Return of democracy → present" />
                </div>
            </section>

            {/* ── Problem → Solution ───────────────────────────────────── */}
            <section className="py-24 px-6 md:px-12 bg-[#fcfcfd]">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center mb-12 tracking-tight">
                        How did the SPP start?
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* The Problem */}
                        <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                    <AlertCircle size={20} />
                                </div>
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">The Problem</h3>
                            </div>
                            <p className="text-sm text-slate-500 font-semibold mb-5">Subnational data in Latin America:</p>
                            <ul className="space-y-3">
                                {[
                                    "Fragmented across multiple sources",
                                    "Without standardization across countries",
                                    "Difficult to access and compare",
                                    "No interactive visualization tools",
                                ].map(item => (
                                    <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* The SPP */}
                        <div className="bg-gradient-to-br from-brand-50 to-amber-50 rounded-[2rem] border border-brand-100 p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-brand-400 flex items-center justify-center text-white shrink-0">
                                    <CheckCircle2 size={20} />
                                </div>
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">The SPP</h3>
                            </div>
                            <p className="text-sm text-slate-600 font-semibold mb-5">It is a subnational data hub:</p>
                            <ul className="space-y-3">
                                {[
                                    "Systematic and rigorously coded",
                                    "Comparable across countries",
                                    "Free and publicly accessible",
                                    "With an interactive mapping dashboard",
                                ].map(item => (
                                    <li key={item} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                                        <CheckCircle2 size={15} className="mt-0.5 text-brand-400 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Use Cases ─────────────────────────────────────────────── */}
            <section className="py-24 px-6 md:px-12 bg-white">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center mb-3 tracking-tight">
                        What is SPP for?
                    </h2>
                    <p className="text-center text-slate-500 text-sm font-medium mb-12 max-w-xl mx-auto">
                        From academic research to journalism, SPP serves anyone who needs reliable subnational data on Latin American politics.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <UseCaseCard
                            icon={<BookOpen size={22} />}
                            title="Research & Public Policy"
                            description="Identification of territorial inequalities within and across each country."
                            color="orange"
                        />
                        <UseCaseCard
                            icon={<Globe size={22} />}
                            title="Democratic Access"
                            description="Transparent and publicly accessible data for citizens, journalists, and institutions."
                            color="slate"
                        />
                        <UseCaseCard
                            icon={<Layers size={22} />}
                            title="Comparative Tool"
                            description="Systematic comparison between federal systems across Argentina, Brazil, and Mexico."
                            color="brand"
                        />
                        <UseCaseCard
                            icon={<Newspaper size={22} />}
                            title="Teaching & Journalism"
                            description="Learning, descriptive, and visualization tools for educators and reporters."
                            color="amber"
                        />
                    </div>
                </div>
            </section>

            {/* ── Team ──────────────────────────────────────────────────── */}
            <section className="py-24 px-6 md:px-12 bg-[#fcfcfd] border-t border-slate-100">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center mb-3 tracking-tight">Team</h2>
                    <p className="text-center text-slate-500 text-sm font-medium mb-14 max-w-lg mx-auto">
                        The SPP is based at the Tecnológico de Monterrey, Escuela de Ciencias Sociales y Gobierno.
                    </p>

                    {/* Flip-card grid — responsive: 2 cols on mobile, 3 on md, 6 on xl */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 justify-items-center">
                        {PEOPLE.map(person => (
                            <PersonCard key={person.name} person={person} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <footer className="py-12 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest flex flex-col gap-2">
                    <div>&copy; {new Date().getFullYear()} Subnational Politics Project</div>
                    <div>
                        Designed by:{' '}
                        <a href="https://www.linkedin.com/in/felipesotojorquera/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-400 transition-colors">
                            Felipe Soto Jorquera
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatPill({ value, label, sub }: { value: string; label: string; sub: string }) {
    return (
        <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="text-3xl font-black text-brand-400 leading-none">{value}</span>
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider mt-1">{label}</span>
            <span className="text-[10px] text-slate-400 font-medium">{sub}</span>
        </div>
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
        <div className="group relative bg-[#fcfcfd] p-8 rounded-[2rem] border border-slate-100 hover:border-slate-200 transition-all hover:shadow-2xl hover:shadow-slate-100 hover:-translate-y-1 flex flex-col">
            <div className={`w-12 h-12 rounded-2xl ${iconStyles[color]} flex items-center justify-center shadow-lg mb-5`}>
                {icon}
            </div>
            <h3 className="text-base font-black text-slate-900 mb-3 leading-snug">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium flex-1">{description}</p>
            <div className={`w-10 h-1 bg-gradient-to-r ${barStyles[color]} mt-6 rounded-full opacity-30 group-hover:opacity-100 group-hover:w-14 transition-all duration-500`} />
        </div>
    );
}

/** Flip-card person card — mirrors the R `spp-property-card` component exactly */
function PersonCard({ person }: {
    person: {
        name: string; role: string; linkedin: string;
        site: string | null; org: string; img: string; color: string;
    }
}) {
    return (
        <div className="spp-person-card">
            {/* Photo layer */}
            <div className="spp-person-photo" style={{ backgroundImage: `url('${person.img}')` }}>
                <div className="spp-photo-overlay" />
                <div className="spp-photo-footer">
                    <div className="spp-photo-name">{person.name}</div>
                    <div className="spp-social-row">
                        <a
                            href={person.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="spp-social-btn li"
                        >
                            <Linkedin size={11} />
                            <span className="spp-btn-text">LinkedIn</span>
                        </a>
                        {person.site && (
                            <a
                                href={person.site}
                                target="_blank"
                                rel="noreferrer"
                                className="spp-social-btn web"
                            >
                                <Globe size={11} />
                                <span className="spp-btn-text">Website</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Info panel */}
            <div className="spp-person-info">
                <span className="spp-role-badge" style={{ backgroundColor: person.color }}>
                    {person.role}
                </span>
                <p className="spp-person-name">{person.name}</p>
                <p className="spp-person-org">{person.org}</p>
            </div>
        </div>
    );
}
