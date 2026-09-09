/** Graph facts only. Caller content is supplied separately through slots. */
export interface TimelineItem {
  order: number;
  branch: string;
  placement: "left" | "right" | "main";
  merge: boolean;
  progress: "done" | "current" | "upcoming";
}

export type BranchSide = "left" | "right";
export type Lane = BranchSide | "main";

export interface TimelineRow {
  item: TimelineItem;
  isCurrent: boolean;
  future: boolean;
  taper: string;
  onSpine: boolean;
  nodeKind: "head" | "glyph" | "glyph-outline" | "dot" | "dot-outline";
  beforeSpine: boolean;
}

export function timelineRows(items: readonly TimelineItem[]): TimelineRow[] {
  const ordered = items.toSorted((first, second) => first.order - second.order);
  const orders = new Set<number>();
  for (const item of ordered) {
    if (!Number.isFinite(item.order) || orders.has(item.order)) {
      throw new Error(
        `Timeline order must be finite and unique: ${item.order}`
      );
    }
    orders.add(item.order);
    if (item.branch === "main" && (item.placement !== "main" || item.merge)) {
      throw new Error(
        "The main branch must use main placement and cannot merge into itself."
      );
    }
  }
  const currentIndex = ordered.findLastIndex(
    (item) => item.progress === "current"
  );
  return ordered.map((item, index) => {
    const isCurrent = index === currentIndex;
    const future = item.progress === "upcoming";
    const distance = currentIndex === -1 ? 0 : index - currentIndex;
    const onSpine = item.placement === "main" || item.merge;
    return {
      item,
      isCurrent,
      future,
      onSpine,
      taper:
        distance > 0 ? Math.max(0.16, 0.62 - distance * 0.13).toFixed(2) : "1",
      nodeKind: isCurrent
        ? "head"
        : onSpine
          ? future
            ? "glyph-outline"
            : "glyph"
          : future
            ? "dot-outline"
            : "dot",
      beforeSpine: ordered[index + 1]?.placement === "main",
    };
  });
}

export interface BranchRun {
  key: string;
  milestones: (Pick<TimelineItem, "order"> & { placement: BranchSide })[];
  beginsAfterMergeAt: number | null;
  mergesAt: number | null;
}

export interface TimelinePlan {
  readonly milestones: readonly {
    order: number;
    placement: Lane;
    merge: boolean;
  }[];
  readonly runs: readonly BranchRun[];
}

export function planTimeline(items: readonly TimelineItem[]): TimelinePlan {
  const runs: BranchRun[] = [];

  const active = new Map<string, BranchRun>();
  const runCount = new Map<string, number>();

  const lastMergeOf = new Map<string, number>();

  for (const milestone of items) {
    if (milestone.branch === "main") {
      continue;
    }

    let run = active.get(milestone.branch);
    if (!run) {
      const runIndex = runCount.get(milestone.branch) ?? 0;
      runCount.set(milestone.branch, runIndex + 1);
      run = {
        key: `${milestone.branch}#${runIndex}`,
        milestones: [],
        beginsAfterMergeAt: lastMergeOf.get(milestone.branch) ?? null,
        mergesAt: null,
      };
      runs.push(run);
      active.set(milestone.branch, run);
    }

    // The browser rail only needs geometry, not authored pane content.
    if (milestone.placement !== "main") {
      const { order, placement } = milestone;
      run.milestones.push({ order, placement });
    }

    if (milestone.merge) {
      run.mergesAt = milestone.order;
      lastMergeOf.set(milestone.branch, milestone.order);
      active.delete(milestone.branch);
    }
  }

  return {
    milestones: items.map((milestone) => ({
      order: milestone.order,
      placement: milestone.placement,
      merge: milestone.merge,
    })),
    runs,
  };
}
