// ── Section definitions ──────────────────────────────────────────────────────
export const TOP_SECTIONS    = ['introduction', 'databases', 'coverage'] as const;
export const VAR_SECTION_IDS = ['id-variables', 'exec-variables', 'electoral-exec', 'electoral-leg', 'democracy-indices'] as const;
export const BTM_SECTIONS    = ['data-sources', 'appendices'] as const;

export const ALL_SECTIONS = [...TOP_SECTIONS, ...VAR_SECTION_IDS, ...BTM_SECTIONS];

export const SECTION_LABEL: Record<string, string> = {
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
export const DATABASES = [
    { abbr: 'SED',     nameKey: 'methodology.databases.sed.name',     descKey: 'methodology.databases.sed.desc',     doi: 'https://doi.org/doi:10.7910/DVN/1D3P3J',  citationKey: 'methodology.databases.sed.citation' },
    { abbr: 'SEED',    nameKey: 'methodology.databases.seed.name',    descKey: 'methodology.databases.seed.desc',    doi: 'https://doi.org/doi:10.7910/DVN/UPOWMW',  citationKey: 'methodology.databases.seed.citation' },
    { abbr: 'SLED',    nameKey: 'methodology.databases.sled.name',    descKey: 'methodology.databases.sled.desc',    doi: 'https://doi.org/doi:10.7910/DVN/084FXF',  citationKey: 'methodology.databases.sled.citation' },
    { abbr: 'SDI',     nameKey: 'methodology.databases.sdi.name',     descKey: 'methodology.databases.sdi.desc',     doi: 'https://doi.org/doi:10.7910/DVN/7TNLBW',  citationKey: 'methodology.databases.sdi.citation' },
    { abbr: 'CFTDFLD', nameKey: 'methodology.databases.cftdfld.name', descKey: 'methodology.databases.cftdfld.desc', doi: 'https://doi.org/doi:10.7910/DVN/AJJLHX',  citationKey: 'methodology.databases.cftdfld.citation' },
    { abbr: 'NED',     nameKey: 'methodology.databases.ned.name',     descKey: 'methodology.databases.ned.desc',     doi: 'https://doi.org/doi:10.7910/DVN/HNKQUH',  citationKey: 'methodology.databases.ned.citation' },
];

// ── Variable type ─────────────────────────────────────────────────────────────
export interface Var { name: string; type: string; desc: string }

// ── Identifier variables ──────────────────────────────────────────────────────
export const ID_VARS: Var[] = [
    { name: 'country_name',       type: 'Categorical', desc: 'Country name (ARGENTINA, BRAZIL, MEXICO)' },
    { name: 'country_code',       type: 'Numeric',     desc: 'ISO 3166-1 numeric country code (032, 076, 484)' },
    { name: 'state_name',         type: 'Text',        desc: 'Subnational unit name (province or state)' },
    { name: 'state_code',         type: 'Numeric',     desc: 'Numeric code for subnational unit within country' },
    { name: 'country_state_code', type: 'Numeric',     desc: 'Combined 5-digit code (country_code + state_code)' },
    { name: 'region_name',        type: 'Categorical', desc: 'Geographic region within country' },
    { name: 'year',               type: 'Numeric',     desc: 'Calendar year of observation (1983–2024)' },
];

// ── National executive variables (→ NED) ─────────────────────────────────────
export const EXEC_NAT_VARS: Var[] = [
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

// ── Subnational executive variables (→ SED) ───────────────────────────────────
export const EXEC_SUB_VARS: Var[] = [
    { name: 'name_head_sub_exe',                       type: 'Text',        desc: "Governor's name (winner recorded for electoral years)" },
    { name: 'sex_head_sub_exe',                        type: 'Binary',      desc: "Governor's gender (0=Male, 1=Female)" },
    { name: 'start_date_head_sub_exe',                 type: 'Date',        desc: 'Start date of gubernatorial term (yyyy-mm-dd)' },
    { name: 'end_date_head_sub_exe',                   type: 'Date',        desc: 'End date of gubernatorial term (yyyy-mm-dd)' },
    { name: 'term_length_in_years_sub_exe',            type: 'Numeric',     desc: "Duration of governor's term in years (decimal)" },
    { name: 'turnover_head_sub_exe',                   type: 'Binary',      desc: 'Governor turnover (1=turnover year; includes early exit, intervention, death)' },
    { name: 'cumulative_changes_head_sub_exe',         type: 'Numeric',     desc: 'Cumulative count of gubernatorial changes since start of data series' },
    { name: 'early_exit_sub_exe',                      type: 'Binary',      desc: 'Governor left office early (1=early exit)' },
    { name: 'consecutive_reelection_sub_exe',          type: 'Binary',      desc: 'Consecutively re-elected (1=yes; blank=N/A e.g. Mexico where reelection is prohibited)' },
    { name: 'cumulative_years_in_power_sub_exe',       type: 'Numeric',     desc: 'Total years governor held subnational executive office' },
    { name: 'head_party_sub_exe',                      type: 'Categorical', desc: "Governor's political party" },
    { name: 'cumulative_years_in_power_party_sub_exe', type: 'Numeric',     desc: "Cumulative years a party has controlled subnational executive (decimal)" },
    { name: 'ideo_party_sub_exe',                      type: 'Ordinal',     desc: "Party ideology (1=Left, 2=Center-left, 3=Center-right, 4=Right, blank=Independent)" },
    { name: 'concurrent_with_nat_election_sub_exe',    type: 'Binary',      desc: 'Gubernatorial and presidential elections held concurrently (1=concurrent)' },
    { name: 'turnover_party_sub_exe',                  type: 'Binary',      desc: 'Party turnover in governorship (1=turnover year)' },
    { name: 'cumulative_changes_party_sub_exe',        type: 'Numeric',     desc: 'Cumulative count of party changes in governorship' },
    { name: 'alignment_with_nat_sub_exe',              type: 'Binary',      desc: 'Alignment between president and governor (1=aligned: same party, coalition, or cooperative)' },
];

// ── Electoral executive variables (→ SEED) ────────────────────────────────────
export const ELECT_EXEC_VARS: Var[] = [
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

// ── Electoral legislative variables (→ SLED) ──────────────────────────────────
export const ELECT_LEG_VARS: Var[] = [
    { name: 'chamber_election_sub_leg',             type: 'Categorical', desc: 'Chamber (1=Lower, 2=Upper)' },
    { name: 'date_election_sub_leg',                type: 'Date',        desc: 'Election date (yyyy-mm-dd)' },
    { name: 'voters_registered_sub_leg',            type: 'Numeric',     desc: 'Registered voters (sum across districts for mixed systems)' },
    { name: 'total_voters_sub_leg',                 type: 'Numeric',     desc: 'Total voters' },
    { name: 'perc_voters_sub_leg',                  type: 'Numeric',     desc: 'Turnout rate (total_voters / voters_registered × 100)' },
    { name: 'valid_votes_sub_leg',                  type: 'Numeric',     desc: 'Total valid votes' },
    { name: 'perc_valid_votes_sub_leg',             type: 'Numeric',     desc: 'Valid votes as % of total votes' },
    { name: 'party_name_sub_leg',                   type: 'Text',        desc: 'Party/coalition name' },
    { name: 'total_votes_party_sub_leg',            type: 'Numeric',     desc: 'Total votes for party/coalition' },
    { name: 'perc_votes_party_sub_leg',             type: 'Numeric',     desc: 'Party vote share (total_votes_party / valid_votes × 100)' },
    { name: 'total_seats_party_sub_leg',            type: 'Numeric',     desc: 'Seats obtained by party/coalition' },
    { name: 'perc_seats_party_sub_leg',             type: 'Numeric',     desc: 'Party seat share (total_seats_party / total_seats_in_contest × 100)' },
    { name: 'blank_votes_sub_leg',                  type: 'Numeric',     desc: 'Blank votes' },
    { name: 'null_votes_sub_leg',                   type: 'Numeric',     desc: 'Null votes' },
    { name: 'challenged_votes_sub_leg',             type: 'Numeric',     desc: 'Challenged votes' },
    { name: 'margin_victory_sub_leg',               type: 'Numeric',     desc: 'Margin of victory: winning party % minus second-place %' },
    { name: 'cumulative_elections_year_sub_leg',    type: 'Numeric',     desc: 'Cumulative count of subnational legislative elections' },
    { name: 'concurrent_election_with_nat_sub_leg', type: 'Binary',      desc: 'Legislative and presidential elections in same calendar year (1=concurrent)' },
    { name: 'num_parties_election_contest_sub_leg', type: 'Numeric',     desc: 'Number of parties competing' },
    { name: 'total_seats_in_contest_sub_leg',       type: 'Numeric',     desc: 'Seats in dispute' },
    { name: 'total_chamber_seats_sub_leg',          type: 'Numeric',     desc: 'Total seats in lower/single chamber' },
    { name: 'num_seats_incumbent_sub_leg',          type: 'Numeric',     desc: "Governor's party seats (excludes coalition partners)" },
    { name: 'perc_seats_incumbent_sub_leg',         type: 'Numeric',     desc: "Governor's party seat share" },
    { name: 'num_seats_opos_sub_leg',               type: 'Numeric',     desc: 'All opposition party seats' },
    { name: 'perc_seats_opos_sub_leg',              type: 'Numeric',     desc: 'Opposition seat share' },
    { name: 'enp_sub_leg',                          type: 'Numeric',     desc: 'Effective Number of Parties; ENPL = 1/Σ(vᵢ²)' },
    { name: 'chamber_sub_leg',                      type: 'Categorical', desc: 'Number of chambers (1=Unicameral, 2=Bicameral)' },
    { name: 'term_length_in_years_sub_leg',         type: 'Numeric',     desc: "Legislators' tenure in years (as of July 2025)" },
    { name: 'renewal_type_sub_leg',                 type: 'Categorical', desc: 'Chamber renewal type (1=Staggered every 2 years, 2=Full renewal)' },
    { name: 'electoral_system_sub_leg',             type: 'Categorical', desc: 'Electoral system (1=PR, 2=Simple Majority, 3=Mixed PR+SM, 4=Mixed PR+predefined districts)' },
];

// ── Democracy index variables (→ SDI) ─────────────────────────────────────────
export const DEMO_VARS: Var[] = [
    { name: 'SUR_index_giraudy_2015',            type: 'Numeric', desc: 'SUR Index (Giraudy 2015); Argentina & Mexico only. Standardized 0–1 (higher = more democratic).' },
    { name: 'SUR_index_sub_exe',                 type: 'Numeric', desc: 'SUR Index for executive branch: turnover_sub_exe + contestation_sub_exe. Standardized 0–1.' },
    { name: 'contestation_sub_exe',              type: 'Numeric', desc: 'Executive electoral competitiveness: (enp_sub_exe + (1 − margin_victory_sub_exe)) / 2. Standardized 0–1.' },
    { name: 'contestation_sub_leg',              type: 'Numeric', desc: 'Legislative electoral competitiveness: (enp_sub_leg + (1 − margin_victory_sub_leg)) / 2. Standardized 0–1.' },
    { name: 'turnover_sub_exe',                  type: 'Numeric', desc: 'Average of governor and party turnover. Thresholds: ARG/BRA ≤3 consecutive terms = 1; MEX <12 consecutive years = 1.' },
    { name: 'clean_elections_sub_exe_giraudy_2015', type: 'Ordinal', desc: 'Post-electoral Conflict Index (Giraudy 2015). 0–3: 3=no conflict, 2=<1 week, 1=8–30 days, 0=>1 month. Mexico 2000–2009 only.' },
];

// ── Variable groups for sidebar accordion ─────────────────────────────────────
export const VAR_GROUPS: { id: string; labelKey: string; vars: Var[] }[] = [
    { id: 'id-variables',      labelKey: 'methodology.nav.idVariables',      vars: ID_VARS },
    { id: 'exec-variables',    labelKey: 'methodology.nav.execVariables',     vars: [...EXEC_NAT_VARS, ...EXEC_SUB_VARS] },
    { id: 'electoral-exec',    labelKey: 'methodology.nav.electoralExec',     vars: ELECT_EXEC_VARS },
    { id: 'electoral-leg',     labelKey: 'methodology.nav.electoralLeg',      vars: ELECT_LEG_VARS },
    { id: 'democracy-indices', labelKey: 'methodology.nav.democracyIndices',  vars: DEMO_VARS },
];

// ── Type badge color map ──────────────────────────────────────────────────────
export const TYPE_COLORS: Record<string, string> = {
    Binary:      'bg-purple-50 text-purple-700',
    Numeric:     'bg-blue-50 text-blue-700',
    Categorical: 'bg-amber-50 text-amber-700',
    Ordinal:     'bg-orange-50 text-orange-700',
    Text:        'bg-slate-100 text-slate-600',
    Date:        'bg-teal-50 text-teal-700',
};

// ── Country coverage table ────────────────────────────────────────────────────
export const COVERAGE_ROWS = [
    { country: 'Argentina', units: '24 provinces', exe: '1983', leg: '1983' },
    { country: 'Brazil',    units: '27 states',    exe: '1998', leg: '1998' },
    { country: 'Mexico',    units: '32 states',    exe: '1985', leg: '1985' },
];

// ── Country data sources ──────────────────────────────────────────────────────
export const DATA_SOURCES = [
    { country: 'Argentina', sources: [
        'Dirección Nacional Electoral (argentina.gob.ar/dine)',
        'Cámara Nacional Electoral',
        'Selected Provincial Electoral Tribunals',
        "Andy Tow's Electoral Repository (andytow.com)",
    ]},
    { country: 'Brazil', sources: [
        'Tribunal Superior Eleitoral (tse.jus.br)',
        'ElectionsBR database (Meireles et al., 2016)',
        'State Electoral Tribunals',
    ]},
    { country: 'Mexico', sources: [
        'Instituto Nacional Electoral (ine.mx)',
        'State Electoral Institutes (Instituto Electoral Estatal)',
    ]},
];

// ── Appendix C references ─────────────────────────────────────────────────────
export const KEY_REFS = [
    { author: 'Coppedge, Michael. 1997.', work: '"A classification of Latin American political parties." Working Paper #224. Kellogg Institute.' },
    { author: 'Giraudy, Agustina. 2015.', work: 'Democrats and autocrats: Pathways of subnational undemocratic regime continuity within democratic countries. Oxford University Press.' },
    { author: 'Laakso, Markku, and Rein Taagepera. 1979.', work: '"Effective number of parties: a measure with application to West Europe." Comparative Political Studies 12(1): 3–27.' },
    { author: 'Meireles, Fernando, Denisson Silva, and Beatriz Costa. 2016.', work: '"electionsBR: R functions to download and clean Brazilian electoral data."' },
    { author: 'Murillo, María Victoria, Virginia Oliveros, and Milan Vaishnav. 2010.', work: '"Dataset on Political Ideology of Presidents and Parties in Latin America." Columbia University Press.' },
    { author: 'Szajkowski, Bogdan. 2005.', work: 'Political Parties of the World. 6th ed. London: John Harper.' },
];
