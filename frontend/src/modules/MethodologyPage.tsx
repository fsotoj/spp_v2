import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

// ── Section definitions ──────────────────────────────────────────────────────
const TOP_SECTIONS    = ['introduction', 'databases', 'coverage'] as const;
const VAR_SECTION_IDS = ['id-variables', 'exec-variables', 'electoral-exec', 'electoral-leg', 'democracy-indices'] as const;
const BTM_SECTIONS    = ['data-sources', 'appendices'] as const;

const ALL_SECTIONS = [...TOP_SECTIONS, ...VAR_SECTION_IDS, ...BTM_SECTIONS];

const SECTION_LABEL: Record<string, string> = {
    'introduction':      'methodology.nav.introduction',
    'databases':         'methodology.nav.databases',
    'coverage':          'methodology.nav.coverage',
    'id-variables':      'methodology.nav.idVariables',
    'exec-variables':    'methodology.nav.execVariables',
    'electoral-exec':    'methodology.nav.electoralExec',
    'electoral-leg':     'methodology.nav.electoralLeg',
    'democracy-indices': 'methodology.nav.democracyIndices',
    'data-sources':      'methodology.nav.dataSources',
    'appendices':        'methodology.nav.appendices',
};

// ── All 6 databases ──────────────────────────────────────────────────────────
const DATABASES = [
    { abbr: 'SED',     nameKey: 'methodology.databases.sed.name',     descKey: 'methodology.databases.sed.desc',     doi: 'https://doi.org/doi:10.7910/DVN/1D3P3J',  citationKey: 'methodology.databases.sed.citation' },
    { abbr: 'SEED',    nameKey: 'methodology.databases.seed.name',    descKey: 'methodology.databases.seed.desc',    doi: 'https://doi.org/doi:10.7910/DVN/UPOWMW',  citationKey: 'methodology.databases.seed.citation' },
    { abbr: 'SLED',    nameKey: 'methodology.databases.sled.name',    descKey: 'methodology.databases.sled.desc',    doi: 'https://doi.org/doi:10.7910/DVN/084FXF',  citationKey: 'methodology.databases.sled.citation' },
    { abbr: 'SDI',     nameKey: 'methodology.databases.sdi.name',     descKey: 'methodology.databases.sdi.desc',     doi: 'https://doi.org/doi:10.7910/DVN/7TNLBW',  citationKey: 'methodology.databases.sdi.citation' },
    { abbr: 'CFTDFLD', nameKey: 'methodology.databases.cftdfld.name', descKey: 'methodology.databases.cftdfld.desc', doi: 'https://doi.org/doi:10.7910/DVN/AJJLHX',  citationKey: 'methodology.databases.cftdfld.citation' },
    { abbr: 'NED',     nameKey: 'methodology.databases.ned.name',     descKey: 'methodology.databases.ned.desc',     doi: 'https://doi.org/doi:10.7910/DVN/HNKQUH',  citationKey: 'methodology.databases.ned.citation' },
];

// ── Variable definitions ─────────────────────────────────────────────────────
const ID_VARS = [
    { name: 'country_name',       type: 'Categorical', desc: 'Country name (ARGENTINA, BRAZIL, MEXICO)' },
    { name: 'country_code',       type: 'Numeric',     desc: 'ISO 3166-1 numeric country code (032, 076, 484)' },
    { name: 'state_name',         type: 'Text',        desc: 'Subnational unit name (province or state)' },
    { name: 'state_code',         type: 'Numeric',     desc: 'Numeric code for subnational unit within country' },
    { name: 'country_state_code', type: 'Numeric',     desc: 'Combined 5-digit code (country_code + state_code)' },
    { name: 'region_name',        type: 'Categorical', desc: 'Geographic region within country' },
    { name: 'year',               type: 'Numeric',     desc: 'Calendar year of observation (1983–2024)' },
];

const EXEC_NAT_VARS = [
    { name: 'name_head_nat_exe',                 type: 'Text',        desc: "President's name (winner recorded for electoral years)" },
    { name: 'sex_head_nat_exe',                  type: 'Binary',      desc: "President's gender (0=Male, 1=Female; source: V-Dem)" },
    { name: 'start_date_head_nat_exe',           type: 'Date',        desc: 'Start date of presidential term (yyyy-mm-dd)' },
    { name: 'end_date_head_nat_exe',             type: 'Date',        desc: 'End date of presidential term (yyyy-mm-dd)' },
    { name: 'term_length_in_years_nat_exe',      type: 'Numeric',     desc: "Duration of president's current term in years (decimal)" },
    { name: 'consecutive_reelection_nat_exe',    type: 'Binary',      desc: 'Consecutively re-elected (1=yes, 0=no; non-consecutive not counted)' },
    { name: 'early_exit_nat_exe',                type: 'Binary',      desc: 'Left office before constitutional term end (1=early exit)' },
    { name: 'head_party_nat_exe',                type: 'Categorical', desc: "President's political party" },
    { name: 'ideo_party_nat_exe',                type: 'Ordinal',     desc: "Party ideology (1=Left, 2=Center-left, 3=Center-right, 4=Right, blank=Independent)" },
    { name: 'year_election_nat_exe',             type: 'Binary',      desc: 'Presidential election held in given year (1=yes, 0=no)' },
    { name: 'cumulative_years_in_power_nat_exe', type: 'Numeric',     desc: 'Total years president held executive office' },
];

const EXEC_SUB_VARS = [
    { name: 'name_head_sub_exe',                      type: 'Text',        desc: "Governor's name (winner recorded for electoral years)" },
    { name: 'sex_head_sub_exe',                       type: 'Binary',      desc: "Governor's gender (0=Male, 1=Female)" },
    { name: 'start_date_head_sub_exe',                type: 'Date',        desc: 'Start date of gubernatorial term (yyyy-mm-dd)' },
    { name: 'end_date_head_sub_exe',                  type: 'Date',        desc: 'End date of gubernatorial term (yyyy-mm-dd)' },
    { name: 'term_length_in_years_sub_exe',           type: 'Numeric',     desc: "Duration of governor's term in years (decimal)" },
    { name: 'turnover_head_sub_exe',                  type: 'Binary',      desc: 'Governor turnover (1=turnover year; includes early exit, intervention, death)' },
    { name: 'cumulative_changes_head_sub_exe',        type: 'Numeric',     desc: 'Cumulative count of gubernatorial changes since start of data series' },
    { name: 'early_exit_sub_exe',                     type: 'Binary',      desc: 'Governor left office early (1=early exit)' },
    { name: 'consecutive_reelection_sub_exe',         type: 'Binary',      desc: 'Consecutively re-elected (1=yes; blank=N/A e.g. Mexico where reelection is prohibited)' },
    { name: 'cumulative_years_in_power_sub_exe',      type: 'Numeric',     desc: 'Total years governor held subnational executive office' },
    { name: 'head_party_sub_exe',                     type: 'Categorical', desc: "Governor's political party" },
    { name: 'cumulative_years_in_power_party_sub_exe',type: 'Numeric',     desc: "Cumulative years a party has controlled subnational executive (decimal)" },
    { name: 'ideo_party_sub_exe',                     type: 'Ordinal',     desc: "Party ideology (1=Left, 2=Center-left, 3=Center-right, 4=Right, blank=Independent)" },
    { name: 'concurrent_with_nat_election_sub_exe',   type: 'Binary',      desc: 'Gubernatorial and presidential elections held concurrently (1=concurrent)' },
    { name: 'turnover_party_sub_exe',                 type: 'Binary',      desc: 'Party turnover in governorship (1=turnover year)' },
    { name: 'cumulative_changes_party_sub_exe',       type: 'Numeric',     desc: 'Cumulative count of party changes in governorship' },
    { name: 'alignment_with_nat_sub_exe',             type: 'Binary',      desc: 'Alignment between president and governor (1=aligned: same party, coalition, or cooperative)' },
];

const ELECT_EXEC_VARS = [
    { name: 'election_sub_exe',                     type: 'Binary',  desc: 'Gubernatorial election held (1=yes, 0=no)' },
    { name: 'winner_candidate_sub_exe',             type: 'Text',    desc: 'Name of winning candidate who took office' },
    { name: 'date_election_sub_exe',                type: 'Date',    desc: 'Election date (yyyy-mm-dd)' },
    { name: 'voters_registered_sub_exe',            type: 'Numeric', desc: 'Total registered voters' },
    { name: 'total_voters_sub_exe',                 type: 'Numeric', desc: 'Total voters (includes blank/null votes)' },
    { name: 'perc_voter_sub_exe',                   type: 'Numeric', desc: 'Turnout rate (total_voters / voters_registered × 100)' },
    { name: 'valid_votes_sub_exe',                  type: 'Numeric', desc: 'Total valid votes' },
    { name: 'perc_valid_votes_sub_exe',             type: 'Numeric', desc: 'Valid votes as % of total votes' },
    { name: 'invalid_votes_sub_exe',                type: 'Numeric', desc: 'Total invalid/void votes' },
    { name: 'perc_invalid_votes_sub_exe',           type: 'Numeric', desc: 'Invalid votes as % of total votes' },
    { name: 'votes_candidate_winner_sub_exe',       type: 'Numeric', desc: 'Total votes for winning candidate' },
    { name: 'perc_votes_winner_candidate_sub_exe',  type: 'Numeric', desc: 'Winner vote share (winner_votes / valid_votes × 100)' },
    { name: 'second_place_votes_sub_exe',           type: 'Numeric', desc: 'Total votes for second-place candidate' },
    { name: 'perc_second_place_sub_exe',            type: 'Numeric', desc: 'Second-place vote share' },
    { name: 'last_place_votes_sub_exe',             type: 'Numeric', desc: 'Total votes for last-place candidate' },
    { name: 'perc_last_place_sub_exe',              type: 'Numeric', desc: 'Last-place vote share' },
    { name: 'margin_victory_sub_exe',               type: 'Numeric', desc: 'Margin of victory: winner % minus runner-up %' },
    { name: 'num_parties_election_contest_sub_exe', type: 'Numeric', desc: 'Number of parties competing' },
    { name: 'cumulative_elections_year_sub_exe',    type: 'Numeric', desc: 'Cumulative count of subnational executive elections in a state' },
    { name: 'snap_election_sub_exe',                type: 'Binary',  desc: 'Snap election occurred (1=yes)' },
    { name: 'enp_sub_exe',                          type: 'Numeric', desc: 'Effective Number of Parties (Laakso & Taagepera 1979); ENP = 1/Σ(pᵢ²)' },
];

const ELECT_LEG_VARS = [
    { name: 'chamber_election_sub_leg',                type: 'Categorical', desc: 'Chamber (1=Lower, 2=Upper)' },
    { name: 'date_election_sub_leg',                   type: 'Date',        desc: 'Election date (yyyy-mm-dd)' },
    { name: 'voters_registered_sub_leg',               type: 'Numeric',     desc: 'Registered voters (sum across districts for mixed systems)' },
    { name: 'total_voters_sub_leg',                    type: 'Numeric',     desc: 'Total voters' },
    { name: 'perc_voters_sub_leg',                     type: 'Numeric',     desc: 'Turnout rate (total_voters / voters_registered × 100)' },
    { name: 'valid_votes_sub_leg',                     type: 'Numeric',     desc: 'Total valid votes' },
    { name: 'perc_valid_votes_sub_leg',                type: 'Numeric',     desc: 'Valid votes as % of total votes' },
    { name: 'party_name_sub_leg',                      type: 'Text',        desc: 'Party/coalition name' },
    { name: 'total_votes_party_sub_leg',               type: 'Numeric',     desc: 'Total votes for party/coalition' },
    { name: 'perc_votes_party_sub_leg',                type: 'Numeric',     desc: 'Party vote share (total_votes_party / valid_votes × 100)' },
    { name: 'total_seats_party_sub_leg',               type: 'Numeric',     desc: 'Seats obtained by party/coalition' },
    { name: 'perc_seats_party_sub_leg',                type: 'Numeric',     desc: 'Party seat share (total_seats_party / total_seats_in_contest × 100)' },
    { name: 'blank_votes_sub_leg',                     type: 'Numeric',     desc: 'Blank votes' },
    { name: 'null_votes_sub_leg',                      type: 'Numeric',     desc: 'Null votes' },
    { name: 'challenged_votes_sub_leg',                type: 'Numeric',     desc: 'Challenged votes' },
    { name: 'margin_victory_sub_leg',                  type: 'Numeric',     desc: 'Margin of victory: winning party % minus second-place %' },
    { name: 'cumulative_elections_year_sub_leg',       type: 'Numeric',     desc: 'Cumulative count of subnational legislative elections' },
    { name: 'concurrent_election_with_nat_sub_leg',    type: 'Binary',      desc: 'Legislative and presidential elections in same calendar year (1=concurrent)' },
    { name: 'num_parties_election_contest_sub_leg',    type: 'Numeric',     desc: 'Number of parties competing' },
    { name: 'total_seats_in_contest_sub_leg',          type: 'Numeric',     desc: 'Seats in dispute' },
    { name: 'total_chamber_seats_sub_leg',             type: 'Numeric',     desc: 'Total seats in lower/single chamber' },
    { name: 'num_seats_incumbent_sub_leg',             type: 'Numeric',     desc: "Governor's party seats (excludes coalition partners)" },
    { name: 'perc_seats_incumbent_sub_leg',            type: 'Numeric',     desc: "Governor's party seat share" },
    { name: 'num_seats_opos_sub_leg',                  type: 'Numeric',     desc: 'All opposition party seats' },
    { name: 'perc_seats_opos_sub_leg',                 type: 'Numeric',     desc: 'Opposition seat share' },
    { name: 'enp_sub_leg',                             type: 'Numeric',     desc: 'Effective Number of Parties; ENPL = 1/Σ(vᵢ²)' },
    { name: 'chamber_sub_leg',                         type: 'Categorical', desc: 'Number of chambers (1=Unicameral, 2=Bicameral)' },
    { name: 'term_length_in_years_sub_leg',            type: 'Numeric',     desc: "Legislators' tenure in years (as of July 2025)" },
    { name: 'renewal_type_sub_leg',                    type: 'Categorical', desc: 'Chamber renewal type (1=Staggered every 2 years, 2=Full renewal)' },
    { name: 'electoral_system_sub_leg',                type: 'Categorical', desc: 'Electoral system (1=PR, 2=Simple Majority, 3=Mixed PR+SM, 4=Mixed PR+predefined districts)' },
];

const DEMO_VARS = [
    { name: 'SUR_index_giraudy_2015',            type: 'Numeric', desc: 'SUR Index (Giraudy 2015); Argentina & Mexico only. Standardized 0–1 (higher = more democratic).' },
    { name: 'SUR_index_sub_exe',                 type: 'Numeric', desc: 'SUR Index for executive branch: turnover_sub_exe + contestation_sub_exe. Standardized 0–1.' },
    { name: 'contestation_sub_exe',              type: 'Numeric', desc: 'Executive electoral competitiveness: (enp_sub_exe + (1 − margin_victory_sub_exe)) / 2. Standardized 0–1.' },
    { name: 'contestation_sub_leg',              type: 'Numeric', desc: 'Legislative electoral competitiveness: (enp_sub_leg + (1 − margin_victory_sub_leg)) / 2. Standardized 0–1.' },
    { name: 'turnover_sub_exe',                  type: 'Numeric', desc: 'Average of governor and party turnover. Thresholds: ARG/BRA ≤3 consecutive terms = 1; MEX <12 consecutive years = 1.' },
    { name: 'clean_elections_sub_exe_giraudy_2015', type: 'Ordinal', desc: 'Post-electoral Conflict Index (Giraudy 2015). 0–3: 3=no conflict, 2=<1 week, 1=8–30 days, 0=>1 month. Mexico 2000–2009 only.' },
];

// ── Variable groups for sidebar accordion ─────────────────────────────────────
const VAR_GROUPS: { id: string; labelKey: string; vars: { name: string; type: string; desc: string }[] }[] = [
    { id: 'id-variables',      labelKey: 'methodology.nav.idVariables',      vars: ID_VARS },
    { id: 'exec-variables',    labelKey: 'methodology.nav.execVariables',    vars: [...EXEC_NAT_VARS, ...EXEC_SUB_VARS] },
    { id: 'electoral-exec',    labelKey: 'methodology.nav.electoralExec',    vars: ELECT_EXEC_VARS },
    { id: 'electoral-leg',     labelKey: 'methodology.nav.electoralLeg',     vars: ELECT_LEG_VARS },
    { id: 'democracy-indices', labelKey: 'methodology.nav.democracyIndices', vars: DEMO_VARS },
];

// ── Type badge color map ──────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
    Binary:      'bg-purple-50 text-purple-700',
    Numeric:     'bg-blue-50 text-blue-700',
    Categorical: 'bg-amber-50 text-amber-700',
    Ordinal:     'bg-orange-50 text-orange-700',
    Text:        'bg-slate-100 text-slate-600',
    Date:        'bg-teal-50 text-teal-700',
};

// ── Appendix C references ─────────────────────────────────────────────────────
const KEY_REFS = [
    { author: 'Coppedge, Michael. 1997.', work: '"A classification of Latin American political parties." Working Paper #224. Kellogg Institute.' },
    { author: 'Giraudy, Agustina. 2015.', work: 'Democrats and autocrats: Pathways of subnational undemocratic regime continuity within democratic countries. Oxford University Press.' },
    { author: 'Laakso, Markku, and Rein Taagepera. 1979.', work: '"Effective number of parties: a measure with application to West Europe." Comparative Political Studies 12(1): 3–27.' },
    { author: 'Meireles, Fernando, Denisson Silva, and Beatriz Costa. 2016.', work: '"electionsBR: R functions to download and clean Brazilian electoral data."' },
    { author: 'Murillo, María Victoria, Virginia Oliveros, and Milan Vaishnav. 2010.', work: '"Dataset on Political Ideology of Presidents and Parties in Latin America." Columbia University Press.' },
    { author: 'Szajkowski, Bogdan. 2005.', work: 'Political Parties of the World. 6th ed. London: John Harper.' },
];

// ────────────────────────────────────────────────────────────────────────────
export function MethodologyPage() {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState('introduction');
    const [showFAB, setShowFAB] = useState(false);

    // Sidebar accordion state
    const [varGroupOpen, setVarGroupOpen] = useState(false);       // "Variables" parent
    const [openVarTab, setOpenVarTab] = useState<string | null>(null); // which sub-tab is open

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
                    // Auto-open Variables accordion when a variable section is active
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

    const isVarSection = VAR_SECTION_IDS.includes(activeSection as typeof VAR_SECTION_IDS[number]);

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

                {/* ── Sidebar ────────────────────────────────────────────── */}
                <aside className="hidden lg:block w-60 flex-shrink-0">
                    <nav className="sticky top-28 flex flex-col gap-0.5 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1 pb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-3">
                            {t('methodology.tableOfContents')}
                        </p>

                        {/* Top sections */}
                        {TOP_SECTIONS.map(id => (
                            <NavBtn key={id} label={t(SECTION_LABEL[id])} active={activeSection === id} onClick={() => scrollTo(id)} />
                        ))}

                        {/* Variables accordion */}
                        <div className="mt-1">
                            <button
                                onClick={() => setVarGroupOpen(v => !v)}
                                className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                                    isVarSection
                                        ? 'text-brand-600 bg-brand-50 border-l-2 border-brand-400'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <span>{t('methodology.nav.variables')}</span>
                                <ChevronDown
                                    size={13}
                                    className={`transition-transform duration-200 flex-shrink-0 ${varGroupOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {varGroupOpen && (
                                <div className="ml-3 mt-0.5 border-l border-slate-100 flex flex-col gap-0.5 pl-2">
                                    {VAR_GROUPS.map(group => {
                                        const isGroupActive = activeSection === group.id;
                                        const isTabOpen = openVarTab === group.id;

                                        return (
                                            <div key={group.id}>
                                                {/* Sub-section button */}
                                                <button
                                                    onClick={() => handleVarTabClick(group.id)}
                                                    className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                                                        isGroupActive
                                                            ? 'text-brand-600 bg-brand-50'
                                                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <span>{t(group.labelKey)}</span>
                                                    <ChevronRight
                                                        size={11}
                                                        className={`transition-transform duration-200 flex-shrink-0 ${isTabOpen ? 'rotate-90' : ''}`}
                                                    />
                                                </button>

                                                {/* Variable names list */}
                                                {isTabOpen && (
                                                    <div className="ml-3 mt-0.5 border-l border-slate-100 flex flex-col gap-px pl-2 pb-1">
                                                        {group.vars.map(v => (
                                                            <button
                                                                key={v.name}
                                                                onClick={() => scrollTo(`var-${v.name}`)}
                                                                className="text-left text-[10px] font-mono text-slate-400 hover:text-brand-500 hover:bg-brand-50 px-2 py-1 rounded transition-colors"
                                                            >
                                                                {v.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Bottom sections */}
                        <div className="mt-1 flex flex-col gap-0.5">
                            {BTM_SECTIONS.map(id => (
                                <NavBtn key={id} label={t(SECTION_LABEL[id])} active={activeSection === id} onClick={() => scrollTo(id)} />
                            ))}
                        </div>
                    </nav>
                </aside>

                {/* ── Content ────────────────────────────────────────────── */}
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
                                    {[
                                        { country: 'Argentina', units: '24 provinces', exe: '1983', leg: '1983' },
                                        { country: 'Brazil',    units: '27 states',    exe: '1998', leg: '1998' },
                                        { country: 'Mexico',    units: '32 states',    exe: '1985', leg: '1985' },
                                    ].map((row, i) => (
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
                            {[
                                { country: 'Argentina', sources: ['Dirección Nacional Electoral (argentina.gob.ar/dine)', 'Cámara Nacional Electoral', 'Selected Provincial Electoral Tribunals', "Andy Tow's Electoral Repository (andytow.com)"] },
                                { country: 'Brazil',    sources: ['Tribunal Superior Eleitoral (tse.jus.br)', 'ElectionsBR database (Meireles et al., 2016)', 'State Electoral Tribunals'] },
                                { country: 'Mexico',    sources: ['Instituto Nacional Electoral (ine.mx)', 'State Electoral Institutes (Instituto Electoral Estatal)'] },
                            ].map(({ country, sources }) => (
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

// ── Sub-components ──────────────────────────────────────────────────────────

function NavBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left text-sm px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                active
                    ? 'text-brand-600 bg-brand-50 font-bold border-l-2 border-brand-400'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
        >
            {label}
        </button>
    );
}

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

function DatabaseCard({ db, t }: { db: typeof DATABASES[0]; t: (key: string) => string }) {
    return (
        <div className="border border-slate-100 rounded-xl p-4 hover:border-brand-200 transition-colors">
            <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                    <span className="text-xs font-black text-brand-500 uppercase tracking-widest">{db.abbr}</span>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">{t(db.nameKey)}</div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{t(db.descKey)}</div>
                </div>
                <a href={db.doi} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-brand-500 hover:text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2 py-1 rounded-lg transition-colors">
                    DOI <ExternalLink size={9} />
                </a>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-50 text-[11px] text-slate-500 leading-relaxed italic">
                {t(db.citationKey)}
            </div>
        </div>
    );
}

function VarTable({ vars }: { vars: { name: string; type: string; desc: string }[] }) {
    return (
        <div className="space-y-0 my-4 divide-y divide-slate-50">
            {vars.map(v => (
                <div key={v.name} id={`var-${v.name}`} className="flex items-start gap-3 py-2.5 scroll-mt-28">
                    <code className="text-[11px] px-2 py-1 rounded font-mono flex-shrink-0 mt-0.5 bg-slate-100 text-slate-700 whitespace-nowrap">
                        {v.name}
                    </code>
                    <div className="flex-1 min-w-0">
                        <span className={`inline-block text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded mr-2 ${TYPE_COLORS[v.type] ?? 'bg-slate-100 text-slate-500'}`}>
                            {v.type}
                        </span>
                        <span className="text-sm text-slate-600">{v.desc}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
