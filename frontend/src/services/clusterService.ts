// ─── Palette ─────────────────────────────────────────────────────────────────

export const CLUSTER_COLORS: string[] = [
    '#FFA92A', // brand-400
    '#722464', // spp-purple
    '#E5007D', // spp-magenta
    '#2D7DD2', // blue
    '#3BBB96', // teal
    '#E84855', // red
    '#7C3AED', // violet
    '#059669', // emerald
];

export const CLUSTER_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StateVector {
    stateId: number;
    stateName: string;
    countryName: string;
    rawMeans: (number | null)[];
    values: number[];       // z-scored
    hasMissing: boolean;
}

export interface ClusterAssignment {
    stateId: number;
    cluster: string | null; // null = excluded (missing data)
}

export interface KMeansResult {
    type: 'kmeans' | 'kmedoids';
    assignments: ClusterAssignment[];
    centroids: number[][];   // one per cluster label (z-scored variable space)
    medoidIds?: number[];    // kmedoids only: stateId of each cluster's medoid
}

export interface DendrogramLeaf {
    isLeaf: true;
    stateId: number;
    stateName: string;
}

export interface DendrogramNode {
    isLeaf: false;
    left: DendrogramNode | DendrogramLeaf;
    right: DendrogramNode | DendrogramLeaf;
    distance: number;
    stateIds: number[];
}

export interface HierarchicalResult {
    type: 'hierarchical';
    assignments: ClusterAssignment[];
    root: DendrogramNode | DendrogramLeaf;
}

export interface PCAPoint {
    stateId: number;
    pc1: number;
    pc2: number;
}

export type ClusterResult = KMeansResult | HierarchicalResult;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function euclidean(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

function normalize(v: number[]): number[] {
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map(x => x / norm);
}

function matVec(mat: number[][], v: number[]): number[] {
    return mat.map(row => row.reduce((s, x, j) => s + x * v[j], 0));
}

// ─── Data preparation ─────────────────────────────────────────────────────────

/** Average raw API rows across years, grouped by state_id. */
export function averageObsByState(
    rows: any[],
    variables: string[],
): Record<number, Record<string, number | null>> {
    const acc: Record<number, Record<string, { sum: number; count: number }>> = {};

    for (const row of rows) {
        const sid = Number(row.state_id);
        if (!acc[sid]) acc[sid] = {};
        for (const v of variables) {
            if (!acc[sid][v]) acc[sid][v] = { sum: 0, count: 0 };
            const val = row[v];
            if (val != null && !isNaN(Number(val))) {
                acc[sid][v].sum += Number(val);
                acc[sid][v].count += 1;
            }
        }
    }

    const result: Record<number, Record<string, number | null>> = {};
    for (const sid in acc) {
        result[Number(sid)] = {};
        for (const v of variables) {
            const e = acc[sid]?.[v];
            result[Number(sid)][v] = e && e.count > 0 ? e.sum / e.count : null;
        }
    }
    return result;
}

/**
 * Build z-scored state vectors from pre-averaged observations.
 * States with any missing variable are flagged (hasMissing=true) and their
 * z-scored values default to 0 so they don't crash downstream, but they
 * must not be passed to clustering algorithms.
 */
export function buildAndNormalizeVectors(
    averaged: Record<number, Record<string, number | null>>,
    stateIds: number[],
    stateNames: Record<number, string>,
    countryNames: Record<number, string>,
    variables: string[],
): StateVector[] {
    const raw: StateVector[] = stateIds.map(id => {
        const row = averaged[id] ?? {};
        const rawMeans = variables.map(v => {
            const val = row[v];
            return val != null && !isNaN(Number(val)) ? Number(val) : null;
        });
        return {
            stateId: id,
            stateName: stateNames[id] ?? String(id),
            countryName: countryNames[id] ?? '',
            rawMeans,
            values: [],
            hasMissing: rawMeans.some(v => v === null),
        };
    });

    const complete = raw.filter(s => !s.hasMissing);
    const nVars = variables.length;
    const means = Array(nVars).fill(0);
    const stds = Array(nVars).fill(1);

    for (let j = 0; j < nVars; j++) {
        const vals = complete.map(s => s.rawMeans[j] as number);
        if (vals.length === 0) continue;
        const m = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance = vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length;
        means[j] = m;
        stds[j] = Math.sqrt(variance) || 1;
    }

    return raw.map(s => ({
        ...s,
        values: s.rawMeans.map((v, j) =>
            v === null ? 0 : (v - means[j]) / stds[j]
        ),
    }));
}

// ─── K-Means ─────────────────────────────────────────────────────────────────

function kmeansppInit(points: number[][], k: number): number[][] {
    const centroids: number[][] = [[...points[Math.floor(Math.random() * points.length)]]];
    while (centroids.length < k) {
        const dists = points.map(p => Math.min(...centroids.map(c => euclidean(p, c) ** 2)));
        const total = dists.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        let added = false;
        for (let i = 0; i < points.length; i++) {
            r -= dists[i];
            if (r <= 0) { centroids.push([...points[i]]); added = true; break; }
        }
        if (!added) centroids.push([...points[points.length - 1]]);
    }
    return centroids;
}

export function runKMeans(states: StateVector[], k: number): KMeansResult {
    const complete = states.filter(s => !s.hasMissing);
    k = Math.min(k, complete.length);
    const points = complete.map(s => s.values);

    let centroids = kmeansppInit(points, k);
    let assignments = new Array<number>(points.length).fill(0);

    for (let iter = 0; iter < 300; iter++) {
        const newAssign = points.map(p =>
            centroids.reduce((best, c, i) =>
                euclidean(p, c) < euclidean(p, centroids[best]) ? i : best, 0)
        );
        if (newAssign.every((a, i) => a === assignments[i])) break;
        assignments = newAssign;
        centroids = Array.from({ length: k }, (_, ci) => {
            const group = points.filter((_, pi) => assignments[pi] === ci);
            if (!group.length) return centroids[ci];
            const dim = group[0].length;
            return Array.from({ length: dim }, (_, d) =>
                group.reduce((sum, p) => sum + p[d], 0) / group.length
            );
        });
    }

    const labelMap = new Map<number, number>();
    complete.forEach((s, i) => labelMap.set(s.stateId, assignments[i]));

    return {
        type: 'kmeans',
        assignments: states.map(s => ({
            stateId: s.stateId,
            cluster: s.hasMissing ? null : CLUSTER_LABELS[labelMap.get(s.stateId)!],
        })),
        centroids,
    };
}

// ─── K-Medoids (PAM) ─────────────────────────────────────────────────────────

export function runKMedoids(states: StateVector[], k: number): KMeansResult {
    const complete = states.filter(s => !s.hasMissing);
    k = Math.min(k, complete.length);
    const points = complete.map(s => s.values);
    const n = points.length;

    const dist = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => euclidean(points[i], points[j]))
    );

    const totalCost = (meds: number[]) =>
        points.reduce((sum, _, i) => sum + Math.min(...meds.map(m => dist[m][i])), 0);

    // Greedy initialization
    const firstMedoid = Array.from({ length: n }, (_, i) => i)
        .reduce((best, i) =>
            dist[i].reduce((s, d) => s + d, 0) < dist[best].reduce((s, d) => s + d, 0) ? i : best, 0);
    const medoids: number[] = [firstMedoid];

    while (medoids.length < k) {
        const gains = Array.from({ length: n }, (_, i) => {
            if (medoids.includes(i)) return -Infinity;
            return points.reduce((s, _, j) =>
                s + Math.max(0, Math.min(...medoids.map(m => dist[m][j])) - dist[i][j]), 0);
        });
        const next = gains.indexOf(Math.max(...gains));
        medoids.push(next >= 0 ? next : 0);
    }

    // PAM swap
    let improved = true;
    while (improved) {
        improved = false;
        for (let mi = 0; mi < k; mi++) {
            for (let oi = 0; oi < n; oi++) {
                if (medoids.includes(oi)) continue;
                const cand = [...medoids];
                cand[mi] = oi;
                if (totalCost(cand) < totalCost(medoids)) {
                    medoids[mi] = oi;
                    improved = true;
                }
            }
        }
    }

    const assignments = points.map((_, i) =>
        medoids.reduce((best, m, ci) => dist[m][i] < dist[medoids[best]][i] ? ci : best, 0)
    );

    const labelMap = new Map<number, number>();
    complete.forEach((s, i) => labelMap.set(s.stateId, assignments[i]));

    return {
        type: 'kmedoids',
        assignments: states.map(s => ({
            stateId: s.stateId,
            cluster: s.hasMissing ? null : CLUSTER_LABELS[labelMap.get(s.stateId)!],
        })),
        centroids: medoids.map(mi => points[mi]),
        medoidIds: medoids.map(mi => complete[mi].stateId),
    };
}

// ─── Hierarchical (Ward's method) ─────────────────────────────────────────────

function getLeafStateIds(node: DendrogramNode | DendrogramLeaf): number[] {
    if (node.isLeaf) return [node.stateId];
    return [...getLeafStateIds(node.left), ...getLeafStateIds(node.right)];
}

export function runHierarchical(states: StateVector[], k: number): HierarchicalResult {
    const complete = states.filter(s => !s.hasMissing);
    const n = complete.length;
    k = Math.min(k, n);

    type Cluster = { indices: number[]; centroid: number[]; node: DendrogramNode | DendrogramLeaf };

    let clusters: Cluster[] = complete.map((s, i) => ({
        indices: [i],
        centroid: [...s.values],
        node: { isLeaf: true, stateId: s.stateId, stateName: s.stateName } as DendrogramLeaf,
    }));

    // Ward distance: increase in total within-cluster variance
    const wardDist = (a: Cluster, b: Cluster): number => {
        const na = a.indices.length, nb = b.indices.length;
        return a.centroid.reduce((sum, v, d) =>
            sum + (na * nb / (na + nb)) * (v - b.centroid[d]) ** 2, 0);
    };

    // Merge until k clusters remain
    while (clusters.length > k) {
        let minD = Infinity, mi = 0, mj = 1;
        for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                const d = wardDist(clusters[i], clusters[j]);
                if (d < minD) { minD = d; mi = i; mj = j; }
            }
        }
        const na = clusters[mi].indices.length, nb = clusters[mj].indices.length;
        const nc = na + nb;
        const merged: Cluster = {
            indices: [...clusters[mi].indices, ...clusters[mj].indices],
            centroid: clusters[mi].centroid.map((v, d) =>
                (v * na + clusters[mj].centroid[d] * nb) / nc
            ),
            node: {
                isLeaf: false,
                left: clusters[mi].node,
                right: clusters[mj].node,
                distance: minD,
                stateIds: [...getLeafStateIds(clusters[mi].node), ...getLeafStateIds(clusters[mj].node)],
            },
        };
        clusters.splice(mj, 1);
        clusters.splice(mi, 1, merged);
    }

    // Connect remaining top-level clusters under a virtual root (distance=0)
    let root: DendrogramNode | DendrogramLeaf = clusters[0].node;
    for (let i = 1; i < clusters.length; i++) {
        root = {
            isLeaf: false,
            left: root,
            right: clusters[i].node,
            distance: 0,
            stateIds: [...getLeafStateIds(root), ...getLeafStateIds(clusters[i].node)],
        };
    }

    const result: ClusterAssignment[] = [];
    clusters.forEach((cl, ci) =>
        cl.indices.forEach(idx =>
            result.push({ stateId: complete[idx].stateId, cluster: CLUSTER_LABELS[ci] })
        )
    );
    states.filter(s => s.hasMissing).forEach(s =>
        result.push({ stateId: s.stateId, cluster: null })
    );

    return { type: 'hierarchical', assignments: result, root };
}

// ─── Optimal k (silhouette + WCSS / elbow) ────────────────────────────────────

export interface OptimalKPoint {
    k: number;
    wcss: number;
    silhouette: number;
}

/**
 * Average silhouette coefficient for one clustering result.
 * s(i) = (b(i) - a(i)) / max(a(i), b(i))
 * where a = mean intra-cluster distance, b = mean nearest-cluster distance.
 */
function silhouetteScore(states: StateVector[], assignments: ClusterAssignment[]): number {
    const assignMap = new Map<number, string | null>();
    assignments.forEach(a => assignMap.set(a.stateId, a.cluster));

    const included = states.filter(s => !s.hasMissing && assignMap.get(s.stateId) !== null);
    if (included.length < 2) return 0;

    const clusterLabels = [...new Set(included.map(s => assignMap.get(s.stateId)!))] as string[];
    if (clusterLabels.length < 2) return 0;

    const scores = included.map(s => {
        const myCluster = assignMap.get(s.stateId)!;
        const sameCluster = included.filter(o => o.stateId !== s.stateId && assignMap.get(o.stateId) === myCluster);

        if (sameCluster.length === 0) return 0; // singleton — treat as 0

        const a = sameCluster.reduce((sum, o) => sum + euclidean(s.values, o.values), 0) / sameCluster.length;

        const otherLabels = clusterLabels.filter(l => l !== myCluster);
        const b = Math.min(...otherLabels.map(l => {
            const members = included.filter(o => assignMap.get(o.stateId) === l);
            return members.reduce((sum, o) => sum + euclidean(s.values, o.values), 0) / members.length;
        }));

        return (b - a) / Math.max(a, b);
    });

    return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** Within-cluster sum of squared distances to centroid. */
function computeWCSS(states: StateVector[], centroids: number[][], assignments: ClusterAssignment[]): number {
    const assignMap = new Map<number, string | null>();
    assignments.forEach(a => assignMap.set(a.stateId, a.cluster));
    return states
        .filter(s => !s.hasMissing)
        .reduce((sum, s) => {
            const cluster = assignMap.get(s.stateId);
            if (!cluster) return sum;
            const ci = CLUSTER_LABELS.indexOf(cluster);
            if (ci < 0 || !centroids[ci]) return sum;
            return sum + euclidean(s.values, centroids[ci]) ** 2;
        }, 0);
}

/**
 * Run K-Means for k = 2..kMax and return WCSS + silhouette for each k.
 * Always uses K-Means (regardless of the user's chosen algorithm) because it
 * is the fastest and produces centroids for WCSS calculation. The result is
 * used only to recommend k, not as the final clustering.
 */
export function computeOptimalK(states: StateVector[], kMax = 8): OptimalKPoint[] {
    const n = states.filter(s => !s.hasMissing).length;
    const results: OptimalKPoint[] = [];
    for (let k = 2; k <= Math.min(kMax, n - 1); k++) {
        const res = runKMeans(states, k);
        results.push({
            k,
            wcss: computeWCSS(states, res.centroids, res.assignments),
            silhouette: silhouetteScore(states, res.assignments),
        });
    }
    return results;
}

// ─── PCA (2 components via power iteration) ────────────────────────────────────

export function computePCA(states: StateVector[]): PCAPoint[] {
    const complete = states.filter(s => !s.hasMissing);
    if (complete.length < 2) {
        return complete.map(s => ({ stateId: s.stateId, pc1: 0, pc2: 0 }));
    }
    const n = complete.length;
    const dim = complete[0].values.length;
    const X = complete.map(s => s.values);

    const colMeans = Array.from({ length: dim }, (_, j) =>
        X.reduce((s, row) => s + row[j], 0) / n
    );

    const cov = Array.from({ length: dim }, (_, i) =>
        Array.from({ length: dim }, (_, j) =>
            X.reduce((s, row) => s + (row[i] - colMeans[i]) * (row[j] - colMeans[j]), 0) / (n - 1)
        )
    );

    const powerIter = (deflate?: number[]) => {
        let vec = normalize(Array.from({ length: dim }, () => Math.random() - 0.5));
        for (let it = 0; it < 300; it++) {
            let nv = matVec(cov, vec);
            if (deflate) {
                const dot = nv.reduce((s, v, i) => s + v * deflate[i], 0);
                nv = nv.map((v, i) => v - dot * deflate[i]);
            }
            vec = normalize(nv);
        }
        return vec;
    };

    const pc1 = powerIter();
    const pc2 = powerIter(pc1);

    return complete.map(s => ({
        stateId: s.stateId,
        pc1: s.values.reduce((sum, v, i) => sum + v * pc1[i], 0),
        pc2: s.values.reduce((sum, v, i) => sum + v * pc2[i], 0),
    }));
}
