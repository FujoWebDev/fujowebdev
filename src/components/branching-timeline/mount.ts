import { layoutTimeline } from "./layout.ts";
import type {
  RailLayout,
  RailMark,
  RailPolicy,
  RailSegment,
} from "./layout.ts";
import type { BranchSide, TimelineItem, TimelinePlan } from "./timeline.ts";

const COLUMN_STACK_GAP = 104;
// Keep node order readable even when columns pack independently.
const ORDER_STEP = 40;
// Main-placement bands already provide padding.
const SPINE_COLUMN_STACK_GAP = 48;
const SPINE_ORDER_STEP = 24;

interface MilestoneState {
  taper: string;
  progress: TimelineItem["progress"];
}

export interface RailConfig {
  plan: TimelinePlan;

  geometry: { leftLanes: number; bend: number };
  state: Record<string, MilestoneState>;
}

type RailMode = "split" | "stacked";

const SVG_NS = "http://www.w3.org/2000/svg";

interface RailMount {
  root: HTMLElement;
  overlay: SVGSVGElement;
  config: RailConfig;
}

export function mountTimeline(root: HTMLElement): (() => void) | null {
  const config = readConfig(root);
  const overlay = root.querySelector<SVGSVGElement>("[data-rail-overlay]");
  if (!config || !overlay) {
    return null;
  }
  const mount: RailMount = { root, overlay, config };

  let frame = 0;
  let alive = true;

  const run = () => {
    if (!alive) {
      return;
    }
    const styles = readStyles(mount);
    packOppositeColumns({
      root,
      mode: styles.mode,
      bend: config.geometry.bend,
      runs: config.plan.runs,
    });
    const layout = measureAndLayout({ mount, styles });
    if (layout) {
      paint({ mount, layout, mode: styles.mode });
    }
  };

  const schedule = () => {
    if (!alive || frame) {
      return;
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      run();
    });
  };

  const onResize = () => {
    schedule();
  };

  // Observe content boxes as well as the container: images, details and caller
  // content can change height without changing the graph's width.
  const observer = new ResizeObserver(schedule);

  window.addEventListener("resize", onResize);
  observer.observe(root);
  root
    .querySelectorAll<HTMLElement>("[data-timeline-card]")
    .forEach((card) => observer.observe(card));
  const scheduleAfterFonts = async () => {
    await document.fonts?.ready;
    schedule();
  };
  void scheduleAfterFonts();

  run();

  return () => {
    alive = false;
    if (frame) {
      cancelAnimationFrame(frame);
    }
    window.removeEventListener("resize", onResize);
    observer.disconnect();
  };
}

function readConfig(root: HTMLElement): RailConfig | null {
  const script = root.querySelector<HTMLScriptElement>("[data-rail-plan]");
  if (!script?.textContent) {
    return null;
  }
  try {
    // SAFETY: BranchingTimeline.astro serializes a value checked with `satisfies
    // RailConfig`; this script is the server-owned handoff, not external input.
    return JSON.parse(script.textContent) as RailConfig;
  } catch {
    return null;
  }
}

interface RailStyles {
  mode: RailMode;
  mainX: number;
  laneGap: number;
}

function readStyles({ root, config }: RailMount): RailStyles {
  const computed = getComputedStyle(root);
  const lengthOf = (name: string) =>
    parseFloat(computed.getPropertyValue(name)) || 0;
  const mode = computed.getPropertyValue("--rail-mode").trim();
  const laneGap = lengthOf("--rail-lane-gap");
  return {
    mode: mode === "stacked" ? "stacked" : "split",
    laneGap,
    mainX:
      lengthOf("--rail-spine-margin") + laneGap * config.geometry.leftLanes,
  };
}

type ToSvg = (point: { posX: number; posY: number }) => DOMPoint;

function svgPointConverter(overlay: SVGSVGElement): ToSvg | null {
  const screen = overlay.getScreenCTM();
  if (!screen) {
    return null;
  }
  const inverse = screen.inverse();
  return ({ posX, posY }) => new DOMPoint(posX, posY).matrixTransform(inverse);
}

function measureCentres({
  root,
  attribute,
  toSvg,
}: {
  root: HTMLElement;
  attribute: string;
  toSvg: ToSvg;
}): Map<number, number> {
  const centres = new Map<number, number>();
  for (const element of root.querySelectorAll<HTMLElement>(`[${attribute}]`)) {
    const order = Number(element.getAttribute(attribute));
    if (Number.isNaN(order)) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    centres.set(
      order,
      toSvg({ posX: rect.left, posY: rect.top + rect.height / 2 }).y
    );
  }
  return centres;
}

function measureAndLayout({
  mount,
  styles,
}: {
  mount: RailMount;
  styles: RailStyles;
}): RailLayout | null {
  const { root, overlay, config } = mount;
  const toSvg = svgPointConverter(overlay);
  if (!toSvg) {
    return null;
  }

  const box = overlay.getBoundingClientRect();
  const topLeft = toSvg({ posX: box.left, posY: box.top });
  const bottomRight = toSvg({ posX: box.right, posY: box.bottom });
  const overlaySize = {
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };

  const milestoneCentres = measureCentres({
    root,
    attribute: "data-timeline-card",
    toSvg,
  });
  const spinePins = measureCentres({
    root,
    attribute: "data-spine-pin",
    toSvg,
  });

  const rows = root.querySelectorAll<HTMLElement>("[data-order]");
  const [firstRow] = rows;
  const trunkTop = firstRow
    ? toSvg({ posX: box.left, posY: firstRow.getBoundingClientRect().top }).y
    : topLeft.y;

  const lastRow = rows[rows.length - 1];
  const lastPin =
    lastRow?.classList.contains("spine-row") && lastRow.dataset.order
      ? spinePins.get(Number(lastRow.dataset.order))
      : undefined;

  return layoutTimeline({
    plan: config.plan,
    measurements: { milestoneCentres, spinePins },
    policy: {
      mainX: styles.mainX,
      laneGap: styles.laneGap,
      bend: config.geometry.bend,
      overlay: overlaySize,
      trunkTop,
      trunkBottom: lastPin ?? overlaySize.height,
    } satisfies RailPolicy,
  });
}

function paint({
  mount,
  layout,
  mode,
}: {
  mount: RailMount;
  layout: RailLayout;
  mode: RailMode;
}): void {
  const { root, overlay, config } = mount;
  overlay.replaceChildren();
  root.querySelectorAll<HTMLElement>("[data-rail-mark]").forEach((mark) => {
    mark.style.removeProperty("--mark-x");
    mark.style.removeProperty("--mark-y");
  });
  root.setAttribute("data-rail-mode", mode);

  const ordered = [
    ...layout.segments.filter((segment) => segment.kind === "branch"),
    ...layout.segments.filter((segment) => segment.kind === "trunk"),
  ];
  const spinePaths: {
    path: SVGPathElement;
    state: MilestoneState | undefined;
  }[] = [];
  for (const segment of ordered) {
    const state = config.state[String(segment.atOrder)];
    const path = railPath({ segment, state });
    overlay.appendChild(path);
    if (segment.kind === "trunk") {
      spinePaths.push({ path, state });
    }
  }

  // Fade only the last solid segment into its dotted neighbour's opacity.
  const firstFuture = spinePaths.findIndex(
    ({ state }) => state?.progress === "upcoming"
  );
  const solid = spinePaths[firstFuture - 1];
  const future = spinePaths[firstFuture];
  if (solid && future?.state && solid.path.getTotalLength() > 0) {
    const start = solid.path.getPointAtLength(0);
    const end = solid.path.getPointAtLength(solid.path.getTotalLength());
    const gradient = document.createElementNS(SVG_NS, "linearGradient");
    const gradientId = `timeline-spine-fade-${crypto.randomUUID()}`;
    gradient.id = gradientId;
    gradient.setAttribute("gradientUnits", "userSpaceOnUse");
    gradient.setAttribute("x1", String(start.x));
    gradient.setAttribute("y1", String(start.y));
    gradient.setAttribute("x2", String(end.x));
    gradient.setAttribute("y2", String(end.y));
    for (const [offset, opacity] of [
      ["0", solid.state?.taper ?? "1"],
      ["1", future.state.taper],
    ]) {
      const stop = document.createElementNS(SVG_NS, "stop");
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-opacity", opacity);
      stop.style.stopColor = "var(--rail-spine)";
      gradient.appendChild(stop);
    }
    const defs = document.createElementNS(SVG_NS, "defs");
    defs.appendChild(gradient);
    overlay.appendChild(defs);
    solid.path.style.stroke = `url(#${gradientId})`;
    solid.path.style.opacity = "1";
  }

  placeMarks({ mount, marks: layout.marks });
}

function railPath({
  segment,
  state,
}: {
  segment: RailSegment;
  state: MilestoneState | undefined;
}): SVGPathElement {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", segment.path);
  path.setAttribute("fill", "none");
  path.setAttribute("data-at-order", String(segment.atOrder));
  const classes =
    segment.kind === "trunk"
      ? ["rail", "rail-spine"]
      : ["rail", "rail-lane", `lane-${segment.lane}`];
  if (state?.progress === "upcoming") {
    classes.push("future");
  }
  if (segment.kind === "branch" && state?.progress === "done") {
    classes.push("finished");
  }
  path.setAttribute("class", classes.join(" "));
  if (state) {
    path.style.setProperty("--taper", state.taper);
  }
  return path;
}

function placeMarks({
  mount,
  marks,
}: {
  mount: RailMount;
  marks: readonly RailMark[];
}): void {
  const { root, overlay } = mount;
  const toSvg = svgPointConverter(overlay);
  if (!toSvg) {
    return;
  }
  const overlayBox = overlay.getBoundingClientRect();
  const overlayOrigin = toSvg({ posX: overlayBox.left, posY: overlayBox.top });

  for (const mark of marks) {
    const element = root.querySelector<HTMLElement>(
      `[data-rail-mark="${mark.order}:${mark.role}"]`
    );
    if (!element) {
      continue;
    }
    const cellBox = element
      .closest<HTMLElement>("[data-rail-cell]")
      ?.getBoundingClientRect();
    const origin = cellBox
      ? toSvg({ posX: cellBox.left, posY: cellBox.top })
      : overlayOrigin;
    element.style.setProperty("--mark-x", `${mark.posX - origin.x}px`);
    element.style.setProperty("--mark-y", `${mark.posY - origin.y}px`);
  }
}

function packOppositeColumns({
  root,
  mode,
  bend,
  runs,
}: {
  root: HTMLElement;
  mode: RailMode;
  bend: number;
  runs: RailConfig["plan"]["runs"];
}): void {
  const rows = resetColumnPacking(root);
  if (mode !== "split") {
    return;
  }

  packColumnRows({
    rows,
    bend,
    freshForks: freshForkOrders(runs),
    lastBottom: initialColumnBottoms(rows),
  });
}

function resetColumnPacking(root: HTMLElement): HTMLElement[] {
  const rows = Array.from(
    root.querySelectorAll<HTMLElement>(":scope > .row, :scope > .spine-row")
  );
  for (const row of rows) {
    row.style.removeProperty("--column-overlap");
    row.style.removeProperty("margin-top");
  }
  // Clear painted offsets before measuring the natural layout.
  for (const mark of root.querySelectorAll<HTMLElement>("[data-rail-mark]")) {
    mark.style.removeProperty("--mark-x");
    mark.style.removeProperty("--mark-y");
  }
  return rows;
}

function freshForkOrders(runs: RailConfig["plan"]["runs"]): Set<number> {
  // Fresh forks must start below the previous node, including their bend.
  return new Set(
    runs
      .filter((run) => run.beginsAfterMergeAt === null)
      .map((run) => run.milestones[0]?.order)
      .filter((order): order is number => order !== undefined)
  );
}

type ColumnBottoms = Record<BranchSide, number>;

interface ColumnPackingRow {
  row: HTMLElement;
  card: HTMLElement;
  wide: boolean;
  side: BranchSide;
  opposite: BranchSide;
  stackGap: number;
  orderStep: number;
  floor: number;
  callout: HTMLElement | null;
  lastBottom: ColumnBottoms;
}

function cardOf(row: HTMLElement): HTMLElement | null {
  return row.classList.contains("spine-row")
    ? row
    : row.querySelector<HTMLElement>(".window");
}

function initialColumnBottoms(rows: readonly HTMLElement[]) {
  const lastBottom = {
    left: -Infinity,
    right: -Infinity,
  } satisfies ColumnBottoms;
  // Give both columns the same starting floor to avoid an empty first row.
  const firstCard = rows[0] ? cardOf(rows[0]) : null;
  if (firstCard) {
    const top = firstCard.getBoundingClientRect().top - COLUMN_STACK_GAP;
    lastBottom.left = top;
    lastBottom.right = top;
  }
  return lastBottom;
}

function packColumnRows({
  rows,
  bend,
  freshForks,
  lastBottom,
}: {
  rows: readonly HTMLElement[];
  bend: number;
  freshForks: ReadonlySet<number>;
  lastBottom: ColumnBottoms;
}): void {
  // Pack each column independently; main-placement bands block both columns.
  let previousAnchor = -Infinity;
  for (const row of rows) {
    const packing = packingRowOf({ row, lastBottom });
    if (!packing) {
      continue;
    }
    let shift = alignWithColumnFloor(packing);
    shift = clearOppositeColumn({ packing, shift });
    previousAnchor = preserveNodeOrder({
      packing,
      bend,
      freshForks,
      previousAnchor,
      shift,
    });
    updateColumnBottoms(packing);
  }
}

function packingRowOf({
  row,
  lastBottom,
}: {
  row: HTMLElement;
  lastBottom: ColumnBottoms;
}): ColumnPackingRow | null {
  const wide = row.classList.contains("spine-row");
  const card = cardOf(row);
  if (!card) {
    return null;
  }
  const side = row.dataset.side === "right" ? "right" : "left";
  const opposite = side === "right" ? "left" : "right";
  return {
    row,
    card,
    wide,
    side,
    opposite,
    stackGap: wide ? SPINE_COLUMN_STACK_GAP : COLUMN_STACK_GAP,
    orderStep: wide ? SPINE_ORDER_STEP : ORDER_STEP,
    floor: wide
      ? Math.max(lastBottom.left, lastBottom.right)
      : lastBottom[side],
    callout: row.querySelector<HTMLElement>("[data-timeline-callout]"),
    lastBottom,
  };
}

function applyPackingShift({
  packing,
  value,
}: {
  packing: ColumnPackingRow;
  value: number;
}): void {
  // Positive shifts pull up; negative shifts push below a barrier.
  if (packing.wide) {
    packing.row.style.marginTop = `${-value}px`;
  } else {
    packing.row.style.setProperty("--column-overlap", `${value}px`);
  }
}

function alignWithColumnFloor(packing: ColumnPackingRow): number {
  if (!Number.isFinite(packing.floor)) {
    return 0;
  }
  const shift =
    packing.card.getBoundingClientRect().top -
    (packing.floor + packing.stackGap);
  applyPackingShift({ packing, value: shift });
  return shift;
}

function clearOppositeColumn({
  packing,
  shift,
}: {
  packing: ColumnPackingRow;
  shift: number;
}): number {
  if (!packing.callout) {
    return shift;
  }
  // Keep the callout clear of the opposite column, even on short cards.
  const clearance =
    parseFloat(
      getComputedStyle(packing.callout).getPropertyValue(
        "--timeline-callout-clearance"
      )
    ) || 0;
  const overhang =
    packing.lastBottom[packing.opposite] +
    packing.stackGap +
    clearance -
    packing.callout.getBoundingClientRect().top;
  if (overhang <= 0) {
    return shift;
  }
  const clearedShift = shift - overhang;
  applyPackingShift({ packing, value: clearedShift });
  return clearedShift;
}

function preserveNodeOrder({
  packing,
  bend,
  freshForks,
  previousAnchor,
  shift,
}: {
  packing: ColumnPackingRow;
  bend: number;
  freshForks: ReadonlySet<number>;
  previousAnchor: number;
  shift: number;
}): number {
  // Card packing must preserve the vertical order of nodes and forks.
  const forkLift = freshForks.has(Number(packing.row.dataset.order)) ? bend : 0;
  const anchor = orderAnchor({ row: packing.row, wide: packing.wide });
  if (anchor !== undefined) {
    const deficit = previousAnchor + packing.orderStep - (anchor - forkLift);
    if (deficit > 0) {
      applyPackingShift({ packing, value: shift - deficit });
    }
  }

  const settled = orderAnchor({ row: packing.row, wide: packing.wide });
  if (settled === undefined) {
    return previousAnchor;
  }
  // Merge nodes sit one bend below the card centre.
  return packing.row.querySelector('[data-rail-mark$=":merge"]')
    ? settled + bend
    : settled;
}

function updateColumnBottoms(packing: ColumnPackingRow): void {
  const { lastBottom } = packing;
  const { bottom } = packing.card.getBoundingClientRect();
  if (packing.wide) {
    lastBottom.left = bottom;
    lastBottom.right = bottom;
    return;
  }

  lastBottom[packing.side] = bottom;
  if (packing.callout) {
    // The callout may extend the opposite column's occupied area.
    lastBottom[packing.opposite] = Math.max(
      lastBottom[packing.opposite],
      packing.callout.getBoundingClientRect().bottom
    );
  }
}

function orderAnchor({
  row,
  wide,
}: {
  row: HTMLElement;
  wide: boolean;
}): number | undefined {
  const target = wide
    ? row.querySelector<HTMLElement>("[data-spine-pin]")
    : row.querySelector<HTMLElement>("[data-timeline-card]");
  if (!target) {
    return undefined;
  }
  const box = target.getBoundingClientRect();
  return box.top + box.height / 2;
}
