// Common Spanish/Portuguese short words (≤4 chars) that must NOT be treated as abbreviations.
export const SPA_POR_WORDS = new Set([
    // Spanish articles, prepositions, conjunctions
    'EL', 'LA', 'LOS', 'LAS', 'UN', 'UNA',
    'DE', 'DEL', 'EN', 'AL', 'POR', 'CON', 'SIN',
    'Y', 'O', 'E', 'NI', 'U', 'A',
    // Portuguese articles, prepositions, conjunctions
    'DO', 'DA', 'DOS', 'DAS', 'EM', 'NO', 'NA', 'NOS', 'NAS',
    'OU', 'MAS', 'COM', 'PARA', 'NOVO'
]);

export const FALLBACK_COLOR = '#94a3b8';

export interface ChamberMeta {
    totalChamberSeats: number | string | null;
    seatsInContest: number | string | null;
    renewalType: number | string | null;
    electoralSystem: number | string | null;
    partiesContesting: number | string | null;
    enpl: number | string | null;
}

export interface StateObservation {
    winner_candidate_sub_exe?: string;
    name_head_sub_exe?: string;
    head_party_sub_exe?: string;
    consecutive_reelection_sub_exe?: number;
}

export function extractSeats(row: any): number {
    const v = row['total_seats_party_sub_leg'];
    if (v != null && !isNaN(Number(v))) return Math.round(Number(v));
    return 0;
}

/** Title-cases a party name, preserving abbreviations (≤4 all-caps letters, not a common word)
 *  and hyphen-joined coalition codes (e.g. PAN-PRI-PRD). */
export function toPartyTitleCase(name: string): string {
    if (/^[A-Z]{2,}(-[A-Z]{2,})+$/.test(name)) return name; // full coalition string
    return name.split(' ').map(word => {
        if (/^[A-Z]{2,}(-[A-Z]{2,})+$/.test(word)) return word;                         // inline coalition
        if (/^[A-Z]{1,4}$/.test(word) && !SPA_POR_WORDS.has(word)) return word;          // abbreviation
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

export function toTitleCase(str: any) {
    if (!str || str === 'N/A') return 'N/A';
    return String(str)
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
