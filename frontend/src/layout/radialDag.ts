import type { LayoutNode, LayoutResult, LayoutFn } from "./types";

// Circular node diameter in radial view (CompactCircularNode is 169–338px)
const NODE_DIAMETER  = 244;
const ARC_SPACING    = 35;
const ARC_PER_NODE   = NODE_DIAMETER + ARC_SPACING; // arc-length budget per node

// Radial geometry — innermost ring radius is computed dynamically per graph (see step 2)
const MIN_RING_GAP  = 300;  // minimum radial step between depth rings (> NODE_DIAMETER)
const SECTOR_GAP    = 0.05; // angular gap between component sectors (radians)

// Central orphan cluster — concentric rings inside the first outer ring
const ORPHAN_R0   = 138;  // radius of first orphan ring (must be > NODE_DIAMETER/2 = 122)
const ORPHAN_STEP = 250;  // radial gap between orphan rings (must be >= NODE_DIAMETER)

export const layoutRadial: LayoutFn = (
  nodes,
  { traversalData, orphanNodes, components, parents },
  { width, height }
): LayoutResult => {
  if (width === 0 || height === 0) return { positions: {} };

  const cx = width  / 2;
  const cy = height / 2;
  const positions: LayoutResult["positions"] = {};
  const orphanSet = new Set(orphanNodes);

  // ── 1. Group non-orphan nodes by component → depth ───────────────────────

  type CompData = { byDepth: Map<number, string[]>; maxAnyDepth: number };
  const compData = new Map<string, CompData>();

  for (const compID of Object.keys(components).sort()) {
    const byDepth = new Map<number, string[]>();
    for (const id of components[compID]) {
      if (orphanSet.has(id)) continue;
      const d = traversalData[id]?.depth ?? 0;
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d)!.push(id);
    }
    if (byDepth.size === 0) continue;
    const maxAnyDepth = Math.max(...Array.from(byDepth.values()).map(v => v.length));
    compData.set(compID, { byDepth, maxAnyDepth });
  }

  const activeComps = Array.from(compData.entries());
  if (activeComps.length === 0) {
    placeOrphans(ORPHAN_R0 + NODE_DIAMETER + 30);
    return { positions };
  }

  // ── 2. Allocate sector angles proportionally to each component's widest layer

  const totalDemand = activeComps.reduce((s, [, d]) => s + d.maxAnyDepth, 0);
  const totalGap    = SECTOR_GAP * activeComps.length;
  const usable      = Math.max(0.1, 2 * Math.PI - totalGap);

  // Compute the innerBoundary needed to fit ALL orphans in concentric rings.
  // Mirrors the placeOrphans capacity formula so the two stay in sync.
  function orphanZoneInnerBoundary(count: number): number {
    if (count <= 1) return 0;
    let r = ORPHAN_R0;
    let remaining = count;
    while (remaining > 0) {
      const ratio    = Math.min(1, NODE_DIAMETER / (2 * r));
      const capacity = Math.max(1, Math.floor(Math.PI / Math.asin(ratio)));
      remaining -= capacity;
      if (remaining > 0) r += ORPHAN_STEP;
    }
    return r + NODE_DIAMETER / 2 + 20;
  }

  // Dynamic innermost ring radius: scales with graph density so small graphs
  // stay compact while large graphs are driven by the arc constraint instead.
  // Also guarantees enough room for every orphan without overflow.
  const minRadius = Math.max(
    ORPHAN_R0 + Math.round(NODE_DIAMETER * 0.55),              // orphan clearance floor ≈ 272
    Math.round((totalDemand * ARC_PER_NODE) / (2 * Math.PI)), // natural packing radius
    orphanZoneInnerBoundary(orphanNodes.length),               // fit all orphans in inner zone
  );

  const sectors = activeComps.map(([compID, data]) => ({
    compID,
    data,
    sectorAngle: (data.maxAnyDepth / Math.max(1, totalDemand)) * usable,
  }));

  // ── 3. Global radii — same depth = same ring across ALL components ─────────
  //
  // For each depth d, radius must satisfy every component's arc requirement:
  //   θ_c · r ≥ N_c[d] · ARC_PER_NODE   →   r ≥ N_c[d] · ARC_PER_NODE / θ_c
  // Take the maximum across all components, then enforce monotonic growth.

  const allDepths = new Set<number>();
  for (const { data } of sectors) {
    for (const d of data.byDepth.keys()) allDepths.add(d);
  }
  const sortedDepths = Array.from(allDepths).sort((a, b) => a - b);

  const globalRadii = new Map<number, number>();
  let prevR = 0;

  for (const d of sortedDepths) {
    let rRequired = minRadius + d * MIN_RING_GAP;

    for (const { data, sectorAngle } of sectors) {
      const N = data.byDepth.get(d)?.length ?? 0;
      if (N > 0) rRequired = Math.max(rRequired, (N * ARC_PER_NODE) / sectorAngle);
    }

    const r = Math.max(rRequired, prevR + MIN_RING_GAP);
    globalRadii.set(d, r);
    prevR = r;
  }

  // ── 4. Place nodes — sweep around the circle, barycenter order per ring ────

  // Track each placed node's angle so child rings can barycenter off parents
  const nodeAngle = new Map<string, number>();
  let cursor = -Math.PI / 2; // start at 12 o'clock

  for (const { data, sectorAngle } of sectors) {
    const { byDepth } = data;
    const startAngle  = cursor;

    for (const d of sortedDepths) {
      const rawIds = byDepth.get(d);
      if (!rawIds || rawIds.length === 0) continue;

      const r = globalRadii.get(d)!;
      const N = rawIds.length;

      // Barycenter: sort by avg angle of parents already placed in ring d-1
      const ordered = [...rawIds].sort((a, b) => {
        const avgAngle = (id: string): number => {
          const ps = (parents[id] ?? []).filter(p => nodeAngle.has(p));
          if (ps.length === 0) return id.localeCompare(b) < 0 ? -1e9 : 1e9; // stable fallback
          return ps.reduce((s, p) => s + nodeAngle.get(p)!, 0) / ps.length;
        };
        return avgAngle(a) - avgAngle(b);
      });

      // Pack nodes into just the arc they need, centered within the sector.
      // Prevents sparse spreading when sector is larger than the node arc demand.
      const layerArc   = Math.min(sectorAngle, (N * ARC_PER_NODE) / r);
      const layerStart = startAngle + (sectorAngle - layerArc) / 2;
      ordered.forEach((id, i) => {
        const a = layerStart + ((i + 0.5) / N) * layerArc;
        nodeAngle.set(id, a);
        positions[id] = {
          x: cx + r * Math.cos(a),
          y: cy + r * Math.sin(a),
        };
      });
    }

    cursor += sectorAngle + SECTOR_GAP;
  }

  // ── 5. Orphan nodes — concentric mini-rings at the centre ─────────────────
  //
  // Use chord-based capacity: largest N where 2r·sin(π/N) ≥ NODE_DIAMETER.
  // Inner boundary is derived from the actual first outer ring so the gap
  // between the orphan cluster and the main rings scales with graph size.

  function placeOrphans(innerBoundary: number) {
    if (orphanNodes.length === 0) return;

    if (orphanNodes.length === 1) {
      positions[orphanNodes[0]] = { x: cx, y: cy };
      return;
    }

    // Keep orphan node centres at least half a diameter from the first outer ring
    const MAX_R    = Math.max(ORPHAN_R0, innerBoundary - NODE_DIAMETER / 2 - 20);
    let remaining  = [...orphanNodes];
    let r          = ORPHAN_R0;

    while (remaining.length > 0 && r <= MAX_R) {
      const ratio    = Math.min(1, NODE_DIAMETER / (2 * r));
      const capacity = Math.max(1, Math.floor(Math.PI / Math.asin(ratio)));
      const slice    = remaining.splice(0, capacity);

      slice.forEach((id, i) => {
        const a = -Math.PI / 2 + (i / slice.length) * 2 * Math.PI;
        positions[id] = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
      });

      r += ORPHAN_STEP;
    }

    // Overflow fallback (rare): dense grid centred at origin
    remaining.forEach((id, i) => {
      positions[id] = { x: cx + (i % 5) * 60 - 120, y: cy + Math.floor(i / 5) * 60 };
    });
  }

  const innerBoundary = globalRadii.size > 0
    ? Math.min(...globalRadii.values())
    : minRadius;

  placeOrphans(innerBoundary);
  return { positions };
};
