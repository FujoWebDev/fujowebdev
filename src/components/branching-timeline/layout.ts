import type { BranchRun, BranchSide, Lane, TimelinePlan } from "./timeline.ts";

export interface RailMeasurements {
  milestoneCentres: ReadonlyMap<number, number>;

  spinePins: ReadonlyMap<number, number>;
}

export interface RailPolicy {
  mainX: number;

  laneGap: number;

  bend: number;
  overlay: { width: number; height: number };

  trunkTop?: number;
  trunkBottom?: number;
}

export interface RailSegment {
  kind: "trunk" | "branch";
  lane: Lane;

  atOrder: number;
  runKey?: string;
  path: string;
}

export interface RailMark {
  order: number;
  role: "milestone" | "merge";
  posX: number;
  posY: number;
}

type RailDiagnosticCode =
  | "missing-measurement"
  | "non-monotonic-edge"
  | "insufficient-bend-room"
  | "corridor-outside-overlay";

interface RailDiagnostic {
  code: RailDiagnosticCode;
  order: number;
  detail: string;
}

export interface RailLayout {
  segments: readonly RailSegment[];
  marks: readonly RailMark[];
  diagnostics: readonly RailDiagnostic[];
}

interface CorridorSegment {
  runKey: string;
  side: BranchSide;

  index: number;

  orders: [number, ...number[]];

  from: number;
  until: number;
}

interface CorridorAssignment {
  leftCount: number;
  rightCount: number;
  segments: readonly CorridorSegment[];
  byOrder: ReadonlyMap<number, { side: BranchSide; index: number }>;
}

interface SideGroup {
  side: BranchSide;
  orders: [number, ...number[]];
  last: number;
}

function groupBySide(
  anchors: readonly { order: number; placement: BranchSide }[]
): SideGroup[] {
  const groups: SideGroup[] = [];
  for (const milestone of anchors) {
    const current = groups.at(-1);
    if (current && current.side === milestone.placement) {
      current.orders.push(milestone.order);
      current.last = milestone.order;
    } else {
      groups.push({
        side: milestone.placement,
        orders: [milestone.order],
        last: milestone.order,
      });
    }
  }
  return groups;
}

function corridorSegmentsOf(run: BranchRun): CorridorSegment[] {
  const groups = groupBySide(run.milestones);
  return groups.map((group, position) => {
    const next = groups[position + 1];
    return {
      runKey: run.key,
      side: group.side,
      index: -1,
      orders: group.orders,
      from:
        position === 0
          ? run.beginsAfterMergeAt ?? group.orders[0]
          : group.orders[0],
      until: next ? next.orders[0] : run.mergesAt ?? group.last,
    };
  });
}

export function assignCorridors(plan: TimelinePlan): CorridorAssignment {
  const segments = plan.runs.flatMap(corridorSegmentsOf);

  const counts = { left: 0, right: 0 } satisfies Record<BranchSide, number>;
  for (const side of ["left", "right"] as const) {
    const slotEnds: number[] = [];
    for (const segment of segments.filter(
      (candidate) => candidate.side === side
    )) {
      let slot = slotEnds.findIndex((end) => end <= segment.from);
      if (slot === -1) {
        slot = slotEnds.length;
        slotEnds.push(segment.until);
      } else {
        slotEnds[slot] = segment.until;
      }
      segment.index = slot;
    }
    counts[side] = Math.max(slotEnds.length, 1);
  }

  const byOrder = new Map<number, { side: BranchSide; index: number }>();
  for (const segment of segments) {
    for (const order of segment.orders) {
      byOrder.set(order, { side: segment.side, index: segment.index });
    }
  }

  return {
    leftCount: counts.left,
    rightCount: counts.right,
    segments,
    byOrder,
  };
}

const formatCoordinate = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
};

function corridorX({
  policy,
  side,
  index,
}: {
  policy: RailPolicy;
  side: BranchSide;
  index: number;
}): number {
  const offset = policy.laneGap * (index + 1);
  return side === "right" ? policy.mainX + offset : policy.mainX - offset;
}

const verticalPath = ({
  posX,
  fromY,
  toY,
}: {
  posX: number;
  fromY: number;
  toY: number;
}) =>
  `M ${formatCoordinate(posX)} ${formatCoordinate(fromY)} L ${formatCoordinate(posX)} ${formatCoordinate(toY)}`;

const bendPath = ({
  fromX,
  fromY,
  toX,
  toY,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}) => {
  const controlY = fromY + (toY - fromY) / 2;
  return ` C ${formatCoordinate(fromX)} ${formatCoordinate(controlY)} ${formatCoordinate(toX)} ${formatCoordinate(controlY)} ${formatCoordinate(toX)} ${formatCoordinate(toY)}`;
};

interface CorridorPoint {
  order: number;
  posX: number;
  posY: number;
  side: BranchSide;
}

interface RailBuild {
  plan: TimelinePlan;
  measurements: RailMeasurements;
  policy: RailPolicy;
  corridors: CorridorAssignment;

  mergePoints: Map<number, number>;
  segments: RailSegment[];
  marks: RailMark[];
  diagnostics: RailDiagnostic[];
}

interface RunBuild {
  build: RailBuild;
  run: BranchRun;
}

export function layoutTimeline({
  plan,
  measurements,
  policy,
}: {
  plan: TimelinePlan;
  measurements: RailMeasurements;
  policy: RailPolicy;
}): RailLayout {
  const build: RailBuild = {
    plan,
    measurements,
    policy,
    corridors: assignCorridors(plan),
    mergePoints: new Map(),
    segments: [],
    marks: [],
    diagnostics: [],
  };

  resolveMergePoints(build);
  reportCorridorsOutsideOverlay(build);
  for (const run of plan.runs) {
    layoutRun({ build, run });
  }
  layoutTrunk(build);
  markMainLine(build);

  return {
    segments: build.segments,
    marks: build.marks.toSorted(
      (first, second) =>
        first.order - second.order || (first.role === "milestone" ? -1 : 1)
    ),
    diagnostics: build.diagnostics,
  };
}

function resolveMergePoints(build: RailBuild): void {
  const { plan, measurements, policy, mergePoints, diagnostics } = build;
  const byOrder = new Map(
    plan.milestones.map((milestone) => [milestone.order, milestone])
  );
  for (const run of plan.runs) {
    const milestone = run.mergesAt === null ? null : byOrder.get(run.mergesAt);
    if (!milestone) {
      continue;
    }
    const landmark =
      milestone.placement === "main"
        ? { source: measurements.spinePins, detail: "spine-pin", lift: 0 }
        : {
            source: measurements.milestoneCentres,
            detail: "card-centre",
            lift: policy.bend,
          };
    const landmarkY = landmark.source.get(milestone.order);
    if (landmarkY === undefined) {
      diagnostics.push({
        code: "missing-measurement",
        order: milestone.order,
        detail: landmark.detail,
      });
      continue;
    }
    mergePoints.set(milestone.order, landmarkY + landmark.lift);
  }
}

function reportCorridorsOutsideOverlay(build: RailBuild): void {
  const { policy, corridors, diagnostics } = build;
  for (const segment of corridors.segments) {
    const posX = corridorX({
      policy,
      side: segment.side,
      index: segment.index,
    });
    if (posX < 0 || posX > policy.overlay.width) {
      diagnostics.push({
        code: "corridor-outside-overlay",
        order: segment.orders[0],
        detail: formatCoordinate(posX),
      });
    }
  }
}

function bendRoom({
  build,
  available,
  wanted,
  order,
  detail,
}: {
  build: RailBuild;
  available: number;
  wanted: number;
  order: number;
  detail: string;
}): number {
  if (available >= wanted) {
    return wanted;
  }
  build.diagnostics.push({ code: "insufficient-bend-room", order, detail });
  return Math.max(0, available);
}

function corridorPointsOf({ build, run }: RunBuild): CorridorPoint[] {
  const points: CorridorPoint[] = [];
  for (const milestone of run.milestones) {
    const centreY = build.measurements.milestoneCentres.get(milestone.order);
    if (centreY === undefined) {
      build.diagnostics.push({
        code: "missing-measurement",
        order: milestone.order,
        detail: "card-centre",
      });
      continue;
    }
    const slot = build.corridors.byOrder.get(milestone.order);
    if (!slot) {
      throw new Error(
        `Missing corridor assignment for milestone ${milestone.order}`
      );
    }
    points.push({
      order: milestone.order,
      posX: corridorX({
        policy: build.policy,
        side: slot.side,
        index: slot.index,
      }),
      posY: centreY,
      side: slot.side,
    });
  }
  return points;
}

function layoutRun({ build, run }: RunBuild): void {
  const points = corridorPointsOf({ build, run });
  for (const point of points) {
    build.marks.push({
      order: point.order,
      role: "milestone",
      posX: point.posX,
      posY: point.posY,
    });
  }

  const [first] = points;
  if (!first) {
    return;
  }
  build.segments.push({
    kind: "branch",
    lane: first.side,
    atOrder: first.order,
    runKey: run.key,
    path: forkPath({ build, run, first }),
  });

  let from = first;
  for (const target of points.slice(1)) {
    const path = edgePath({ build, from, target });
    if (path !== null) {
      build.segments.push({
        kind: "branch",
        lane: target.side,
        atOrder: target.order,
        runKey: run.key,
        path,
      });
    }
    from = target;
  }

  mergeIntoMain({ build, run, last: from });
}

function forkPath({
  build,
  run,
  first,
}: RunBuild & { first: CorridorPoint }): string {
  const { mainX, bend } = build.policy;
  const forkFrom =
    (run.beginsAfterMergeAt === null
      ? undefined
      : build.mergePoints.get(run.beginsAfterMergeAt)) ?? first.posY - bend;
  const forkEnd =
    forkFrom +
    bendRoom({
      build,
      available: first.posY - forkFrom,
      wanted: bend,
      order: first.order,
      detail: "fork",
    });
  const tail =
    first.posY > forkEnd
      ? ` L ${formatCoordinate(first.posX)} ${formatCoordinate(first.posY)}`
      : "";
  const start = `M ${formatCoordinate(mainX)} ${formatCoordinate(forkFrom)}`;
  return `${start}${bendPath({ fromX: mainX, fromY: forkFrom, toX: first.posX, toY: forkEnd })}${tail}`;
}

function edgePath({
  build,
  from,
  target,
}: {
  build: RailBuild;
  from: CorridorPoint;
  target: CorridorPoint;
}): string | null {
  if (target.posY <= from.posY) {
    build.diagnostics.push({
      code: "non-monotonic-edge",
      order: target.order,
      detail: String(from.order),
    });
    return null;
  }
  if (target.posX === from.posX) {
    return verticalPath({ posX: from.posX, fromY: from.posY, toY: target.posY });
  }
  return descendThenBend({
    from,
    toX: target.posX,
    toY: target.posY,
    bend: bendRoom({
      build,
      available: target.posY - from.posY,
      wanted: build.policy.bend,
      order: target.order,
      detail: "cross-side",
    }),
  });
}

function mergeIntoMain({
  build,
  run,
  last,
}: RunBuild & { last: CorridorPoint }): void {
  if (run.mergesAt === null) {
    return;
  }
  const mergeY = build.mergePoints.get(run.mergesAt);
  if (mergeY === undefined) {
    return;
  }
  if (mergeY <= last.posY) {
    build.diagnostics.push({
      code: "non-monotonic-edge",
      order: run.mergesAt,
      detail: String(last.order),
    });
    return;
  }
  build.segments.push({
    kind: "branch",
    lane: last.side,
    atOrder: run.mergesAt,
    runKey: run.key,
    path: descendThenBend({
      from: last,
      toX: build.policy.mainX,
      toY: mergeY,
      bend: bendRoom({
        build,
        available: mergeY - last.posY,
        wanted: build.policy.bend,
        order: run.mergesAt,
        detail: "merge",
      }),
    }),
  });
}

function descendThenBend({
  from,
  toX,
  toY,
  bend,
}: {
  from: { posX: number; posY: number };
  toX: number;
  toY: number;
  bend: number;
}): string {
  const start = toY - bend;
  const descent =
    start > from.posY
      ? ` L ${formatCoordinate(from.posX)} ${formatCoordinate(start)}`
      : "";
  const origin = `M ${formatCoordinate(from.posX)} ${formatCoordinate(from.posY)}`;
  return `${origin}${descent}${bendPath({ fromX: from.posX, fromY: start, toX, toY })}`;
}

function trunkAnchorsOf(build: RailBuild): { order: number; posY: number }[] {
  const anchors: { order: number; posY: number }[] = [];
  for (const milestone of build.plan.milestones) {
    const posY = milestone.merge
      ? build.mergePoints.get(milestone.order)
      : build.measurements.milestoneCentres.get(milestone.order);
    if (posY !== undefined) {
      anchors.push({ order: milestone.order, posY });
    }
  }
  return anchors.toSorted((first, second) => first.posY - second.posY);
}

function layoutTrunk(build: RailBuild): void {
  const { policy, segments } = build;
  const trunkSegment = ({
    atOrder,
    fromY,
    toY,
  }: {
    atOrder: number;
    fromY: number;
    toY: number;
  }): RailSegment => ({
    kind: "trunk",
    lane: "main",
    atOrder,
    path: verticalPath({ posX: policy.mainX, fromY, toY }),
  });

  const anchors = trunkAnchorsOf(build);
  let previous = policy.trunkTop ?? 0;
  for (const anchor of anchors) {
    segments.push(
      trunkSegment({ atOrder: anchor.order, fromY: previous, toY: anchor.posY })
    );
    previous = anchor.posY;
  }
  const last = anchors.at(-1);
  if (last) {
    const trunkBottom = policy.trunkBottom ?? policy.overlay.height;
    segments.push(
      trunkSegment({ atOrder: last.order, fromY: previous, toY: trunkBottom })
    );
  }
}

function markMainLine(build: RailBuild): void {
  const { plan, measurements, policy, mergePoints, marks } = build;
  for (const milestone of plan.milestones) {
    const centreY =
      milestone.placement === "main" && !milestone.merge
        ? measurements.milestoneCentres.get(milestone.order)
        : undefined;
    if (centreY !== undefined) {
      marks.push({
        order: milestone.order,
        role: "milestone",
        posX: policy.mainX,
        posY: centreY,
      });
    }
  }
  for (const [order, mergeY] of mergePoints) {
    marks.push({ order, role: "merge", posX: policy.mainX, posY: mergeY });
  }
}
