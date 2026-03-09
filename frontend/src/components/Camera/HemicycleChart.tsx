import { useMemo, useState } from 'react';

export interface PartyRow {
    party_name: string;
    seats: number;
    color: string;
}

interface SeatDot {
    x: number;
    y: number;
    party_name: string;
    color: string;
}

// SVG viewport constants
const CX = 110;   // centre x
const CY = 115;   // centre y (base of semicircle)
const R_MAX = 92; // outermost row radius

/**
 * Distributes `total` seats across `K` concentric rows using a
 * largest-remainder proportional allocation. Each row's share is
 * proportional to its radius (arc-length proxy).
 */
function distributeSeats(total: number, radii: number[]): number[] {
    const K = radii.length;
    const sumR = radii.reduce((a, b) => a + b, 0);
    const raw = radii.map(r => (total * r) / sumR);
    const seats = raw.map(v => Math.max(1, Math.round(v)));

    // Largest-remainder fix so sum == total
    let diff = total - seats.reduce((a, b) => a + b, 0);
    const order = raw
        .map((v, i) => ({ i, frac: v - Math.floor(v) }))
        .sort((a, b) => (diff > 0 ? b.frac - a.frac : a.frac - b.frac));
    for (let j = 0; diff !== 0; j++) {
        const idx = order[j % K].i;
        seats[idx] += diff > 0 ? 1 : -1;
        diff += diff > 0 ? -1 : 1;
    }
    return seats;
}

/**
 * Data-driven tier table derived from actual SLED seat distribution.
 * (median≈25, 90th pct≈48, real max≈132 for Salta 1983)
 *
 * K=1  single row at r=65 (centre of viewport) — looks great for small N
 * K=2  two rows spread between 45–85
 * K=3  three rows: 38–65–92
 * K=4  four rows: 38–57–76–92  (handles up to ~160 seats)
 *
 * dotR is computed dynamically: fill the tightest (inner) row with a 1.2 gap,
 * clamped to a tier-specific maximum so dots never look huge.
 */
function getLayoutParams(N: number): { radii: number[]; dotR: number; seatsPerRow: number[] } {
    let radii: number[];
    let maxDotR: number;

    if (N <= 20)      { radii = [65];             maxDotR = 6.5; }
    else if (N <= 50) { radii = [45, 85];         maxDotR = 5.0; }
    else if (N <= 90) { radii = [38, 65, 92];     maxDotR = 3.2; }
    else              { radii = [38, 57, 76, 92]; maxDotR = 2.5; }

    const seatsPerRow = distributeSeats(N, radii);

    // Fit the dot to the tightest row (inner row has smallest circumference)
    const GAP = 1.2;
    const spacePerSeat = (Math.PI * radii[0]) / seatsPerRow[0];
    const dotR = Math.max(1.5, Math.min(maxDotR, (spacePerSeat - GAP) / 2));

    return { radii, dotR, seatsPerRow };
}

/**
 * Computes hemicycle dot positions and assigns parties.
 * Returns dots and the computed dotR for rendering.
 */
function computeHemicycle(parties: PartyRow[]): { dots: SeatDot[]; dotR: number } {
    const totalSeats = parties.reduce((s, p) => s + p.seats, 0);
    if (totalSeats === 0) return { dots: [], dotR: 3 };

    const { radii, dotR, seatsPerRow } = getLayoutParams(totalSeats);

    // Build seat positions: inner → outer, left (π) → right (0) per row
    const positions: { x: number; y: number }[] = [];
    for (let k = 0; k < radii.length; k++) {
        const r = radii[k];
        const n = seatsPerRow[k];
        for (let j = 0; j < n; j++) {
            const theta = n === 1 ? Math.PI / 2 : Math.PI - (Math.PI * j) / (n - 1);
            positions.push({
                x: CX + r * Math.cos(theta),
                y: CY - r * Math.sin(theta),
            });
        }
    }

    // Assign parties to positions in order
    const dots: SeatDot[] = [];
    let pos = 0;
    for (const party of parties) {
        for (let s = 0; s < party.seats && pos < positions.length; s++, pos++) {
            dots.push({ ...positions[pos], party_name: party.party_name, color: party.color });
        }
    }
    return { dots, dotR };
}

interface HemicycleChartProps {
    parties: PartyRow[];
    highlightedParty: string | null;
    onPartyHover: (party: string | null) => void;
    title?: string;
    subtitle?: string;
}

export function HemicycleChart({
    parties,
    highlightedParty,
    onPartyHover,
    title,
    subtitle,
}: HemicycleChartProps) {
    const { dots, dotR } = useMemo(() => computeHemicycle(parties), [parties]);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);

    const handleMouseEnter = (dot: SeatDot, e: React.MouseEvent<SVGCircleElement>) => {
        onPartyHover(dot.party_name);
        const svgEl = (e.currentTarget as SVGCircleElement).ownerSVGElement;
        if (!svgEl) return;
        const rect = svgEl.getBoundingClientRect();
        const px = (dot.x / 220) * rect.width + rect.left;
        const py = (dot.y / 120) * rect.height + rect.top;
        setTooltip({ x: px, y: py, label: dot.party_name });
    };

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <svg
                viewBox="0 0 220 120"
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
                onMouseLeave={() => { onPartyHover(null); setTooltip(null); }}
            >
                {/* Title and subtitle — rendered above all arcs */}
                {title && (
                    <text
                        x={CX}
                        y={11}
                        textAnchor="middle"
                        fontSize={7}
                        fontWeight="800"
                        fill="#1e293b"
                        fontFamily="inherit"
                    >
                        {title}
                    </text>
                )}
                {subtitle && (
                    <text
                        x={CX}
                        y={20}
                        textAnchor="middle"
                        fontSize={5.5}
                        fontWeight="600"
                        fill="#64748b"
                        fontFamily="inherit"
                    >
                        {subtitle}
                    </text>
                )}

                {/* Dots */}
                {dots.map((dot, i) => {
                    const active = highlightedParty === null || dot.party_name === highlightedParty;
                    return (
                        <circle
                            key={i}
                            cx={dot.x}
                            cy={dot.y}
                            r={dotR}
                            fill={dot.color}
                            opacity={active ? 1 : 0.12}
                            stroke={dot.party_name === highlightedParty ? '#fff' : 'none'}
                            strokeWidth={0.7}
                            className="transition-opacity duration-150 cursor-pointer"
                            onMouseEnter={e => handleMouseEnter(dot, e)}
                        />
                    );
                })}

                {/* Baseline */}
                <path
                    d={`M ${CX - R_MAX - 4} ${CY} L ${CX + R_MAX + 4} ${CY}`}
                    stroke="#e2e8f0"
                    strokeWidth="0.8"
                    fill="none"
                />
            </svg>

            {/* Floating tooltip */}
            {tooltip && (
                <div
                    className="fixed z-[900] pointer-events-none bg-slate-900/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap -translate-x-1/2 -translate-y-full"
                    style={{ left: tooltip.x, top: tooltip.y - 6 }}
                >
                    {tooltip.label}
                </div>
            )}
        </div>
    );
}
