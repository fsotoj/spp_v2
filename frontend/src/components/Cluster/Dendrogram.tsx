import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { CLUSTER_COLORS, CLUSTER_LABELS, type DendrogramNode, type DendrogramLeaf } from '../../services/clusterService';

type HNode = DendrogramNode | DendrogramLeaf;

interface DendrogramProps {
    root: HNode;
    assignments: { stateId: number; cluster: string | null }[];
    stateNames: Record<number, string>;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

interface LayoutLeaf {
    type: 'leaf';
    stateId: number;
    x: number; // 0..1 horizontal position
}

interface LayoutNode {
    type: 'node';
    left: Layout;
    right: Layout;
    x: number;
    y: number; // 0..1 normalized distance from top
    distance: number;
}

type Layout = LayoutLeaf | LayoutNode;

let leafCounter = 0;

function buildLayout(node: HNode, maxDist: number): Layout {
    if (node.isLeaf) {
        const x = leafCounter++ / 1; // placeholder, re-assigned after counting
        return { type: 'leaf', stateId: node.stateId, x };
    }
    const left = buildLayout(node.left, maxDist);
    const right = buildLayout(node.right, maxDist);
    const x = (getCenterX(left) + getCenterX(right)) / 2;
    const y = maxDist > 0 ? node.distance / maxDist : 0;
    return { type: 'node', left, right, x, y, distance: node.distance };
}

function getCenterX(layout: Layout): number {
    return layout.x;
}

function collectLeaves(layout: Layout): LayoutLeaf[] {
    if (layout.type === 'leaf') return [layout];
    return [...collectLeaves(layout.left), ...collectLeaves(layout.right)];
}

function assignLeafPositions(layout: Layout, leaves: LayoutLeaf[], total: number): void {
    leaves.forEach((leaf, i) => { leaf.x = (i + 0.5) / total; });
    propagateX(layout);
}

function propagateX(layout: Layout): number {
    if (layout.type === 'leaf') return layout.x;
    const lx = propagateX(layout.left);
    const rx = propagateX(layout.right);
    layout.x = (lx + rx) / 2;
    return layout.x;
}

function getMaxDistance(node: HNode): number {
    if (node.isLeaf) return 0;
    return Math.max(node.distance, getMaxDistance(node.left), getMaxDistance(node.right));
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderEdges(layout: Layout, W: number, H: number, padTop: number, padBottom: number, acc: ReactElement[]): void {
    if (layout.type === 'leaf') return;

    const toPixelX = (x: number) => x * W;
    const toPixelY = (y: number) => padTop + (1 - y) * (H - padTop - padBottom);

    const py = toPixelY(layout.y);
    const lx = toPixelX(layout.left.x);
    const ly = toPixelY(layout.left.type === 'node' ? layout.left.y : 0);
    const rx = toPixelX(layout.right.x);
    const ry = toPixelY(layout.right.type === 'node' ? layout.right.y : 0);

    // Horizontal line at this node's height, from left child to right child
    acc.push(<line key={`h-${layout.x}-${layout.y}`} x1={lx} y1={py} x2={rx} y2={py} stroke="#94a3b8" strokeWidth={1.5} />);
    // Vertical drop to left child
    acc.push(<line key={`vl-${layout.x}-${layout.y}`} x1={lx} y1={py} x2={lx} y2={ly} stroke="#94a3b8" strokeWidth={1.5} />);
    // Vertical drop to right child
    acc.push(<line key={`vr-${layout.x}-${layout.y}`} x1={rx} y1={py} x2={rx} y2={ry} stroke="#94a3b8" strokeWidth={1.5} />);

    renderEdges(layout.left, W, H, padTop, padBottom, acc);
    renderEdges(layout.right, W, H, padTop, padBottom, acc);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Dendrogram({ root, assignments, stateNames }: DendrogramProps) {
    const { t } = useTranslation();

    const clusterMap = useMemo(() => {
        const m = new Map<number, string | null>();
        assignments.forEach(a => m.set(a.stateId, a.cluster));
        return m;
    }, [assignments]);

    const layout = useMemo<Layout | null>(() => {
        if (!root) return null;
        leafCounter = 0;
        const maxDist = getMaxDistance(root);
        const l = buildLayout(root, maxDist);
        const leaves = collectLeaves(l);
        assignLeafPositions(l, leaves, leaves.length);
        return l;
    }, [root]);

    if (!layout) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                {t('cluster.noData')}
            </div>
        );
    }

    const W = 560;
    const H = 340;
    const padTop = 20;
    const padBottom = 60;

    const leaves = collectLeaves(layout);
    const edges: ReactElement[] = [];
    renderEdges(layout, W, H, padTop, padBottom, edges);

    const toPixelX = (x: number) => x * W;
    const toPixelY = (y: number) => padTop + (1 - y) * (H - padTop - padBottom);
    const leafY = toPixelY(0);

    return (
        <div className="w-full h-full flex flex-col">
            <p className="text-xs font-bold text-spp-gray uppercase tracking-wider px-4 pt-3 mb-1">
                {t('cluster.dendrogramTitle')}
            </p>
            <div className="flex-1 min-h-0 overflow-auto px-2">
                <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
                    {edges}
                    {leaves.map(leaf => {
                        const x = toPixelX(leaf.x);
                        const cluster = clusterMap.get(leaf.stateId);
                        const clusterIdx = cluster ? CLUSTER_LABELS.indexOf(cluster) : -1;
                        const color = clusterIdx >= 0 ? CLUSTER_COLORS[clusterIdx] : '#94a3b8';
                        const name = stateNames[leaf.stateId] ?? String(leaf.stateId);

                        return (
                            <g key={leaf.stateId}>
                                <circle cx={x} cy={leafY} r={4} fill={color} />
                                <text
                                    x={x}
                                    y={leafY + 10}
                                    textAnchor="end"
                                    dominantBaseline="middle"
                                    fontSize={8.5}
                                    fill="#4D4D4D"
                                    transform={`rotate(-60, ${x}, ${leafY + 10})`}
                                >
                                    {name.length > 12 ? name.slice(0, 11) + '…' : name}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
