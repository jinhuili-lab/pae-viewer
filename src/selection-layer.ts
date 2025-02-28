import { IndexArea, Interval, Point } from "./types.js";
import { Utils } from "./utils.js";
import { SvgUtils } from "./svg-utils.js";

/**
 * Handles selections of points and areas of the PAE matrix by processing
 * mouse interactions and dispatching corresponding events, as well as
 * displaying selection markers. It uses relative coordinates [0, 1], receiving
 * mouse events from the `matrix` element and rendering markers on the
 * `root` layer element.
 */
export class SelectionLayer extends EventTarget {
  private readonly _defs: SVGDefsElement = Utils.fromHtml(
    `
    <defs>
      <linearGradient id="rangeMarkerLower"
                      gradientTransform="rotate(45 0.5 0.5)">
        <stop offset="0%" stop-color="var(--pv-color-x)" />
        <stop offset="50%" stop-color="var(--pv-color-x)" />
        <stop offset="50%" stop-color="magenta" />
        <stop offset="100%" stop-color="magenta" />
      </linearGradient>
      <linearGradient id="rangeMarkerLowerReversed"
                      gradientTransform="rotate(45 0.5 0.5)">
        <stop offset="0%" stop-color="orange" />
        <stop offset="50%" stop-color="orange" />
        <stop offset="50%" stop-color="var(--pv-color-overlap)" />
        <stop offset="100%" stop-color="var(--pv-color-overlap)" />
      </linearGradient>
      <linearGradient id="rangeMarkerUpper"
                      gradientTransform="rotate(45 0.5 0.5)">
        <stop offset="0%" stop-color="var(--pv-color-overlap)" />
        <stop offset="50%" stop-color="var(--pv-color-overlap)" />
        <stop offset="50%" stop-color="orange" />
        <stop offset="100%" stop-color="orange" />
      </linearGradient>
      <linearGradient id="rangeMarkerUpperReversed"
                      gradientTransform="rotate(45 0.5 0.5)">
        <stop offset="0%" stop-color="var(--pv-color-overlap)" />
        <stop offset="50%" stop-color="var(--pv-color-overlap)" />
        <stop offset="50%" stop-color="var(--pv-color-x)" />
        <stop offset="100%" stop-color="var(--pv-color-x)" />
      </linearGradient>
    </defs>
  `,
  ).querySelector("defs")!;

  private readonly _root: SVGGElement;

  public constructor(root: SVGGElement, matrix: SVGImageElement) {
    super();
    this._root = root;
    this._root.replaceChildren();

    this._setupListeners(this._root, matrix);
  }

  private _setupListeners(root: SVGGElement, matrix: SVGImageElement) {
    let start: Point<number> | null = null;
    let selectingArea: boolean = false;

    matrix.addEventListener("mousedown", (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      start = Utils.getRelativeMousePosition(event);
    });

    matrix.addEventListener("mouseup", (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (start) {
        if (selectingArea) {
          const selection = this._getAreaSelection(
            start,
            Utils.getRelativeMousePosition(event),
          );

          this._displayAreaSelection(root, selection);

          this.dispatchEvent(
            Utils.createEvent<SelectAreaEvent>("select-area", selection),
          );
        } else {
          this.dispatchEvent(
            Utils.createEvent<SelectPointEvent>("select-point", start),
          );
        }
      }

      start = null;
      selectingArea = false;
    });

    matrix.addEventListener("mousemove", (event) => {
      this.dispatchEvent(
        Utils.createEvent<CursorMoveEvent>(
          "cursor-move",
          Utils.getRelativeMousePosition(event),
        ),
      );
    });

    matrix.addEventListener("mouseleave", (event) => {
      this.dispatchEvent(
        Utils.createEvent<CursorLeaveEvent>("cursor-leave", undefined),
      );
    });

    document.addEventListener("mousemove", (event) => {
      if (start) {
        selectingArea = true;

        const { x, y } = Utils.getMousePositionRelativeTo(event, matrix);

        const end = {
          x: Utils.clamp(x, 0, 1),
          y: Utils.clamp(y, 0, 1),
        };

        const selection = this._getAreaSelection(start, end);

        this._displayAreaSelection(root, selection);

        this.dispatchEvent(
          Utils.createEvent<SelectingAreaEvent>("selecting-area", selection),
        );
      }
    });

    // reset selection for mouse
    document.addEventListener("mouseup", (event) => {
      if (start && selectingArea) {
        const { x, y } = Utils.getMousePositionRelativeTo(event, matrix);

        const end = {
          x: Utils.clamp(x, 0, 1),
          y: Utils.clamp(y, 0, 1),
        };

        const selection = this._getAreaSelection(start, end);
        this._displayAreaSelection(root, selection);

        this.dispatchEvent(
          Utils.createEvent<SelectAreaEvent>("select-area", selection),
        );
      }

      start = null;
      selectingArea = false;
    });
  }

  private _getAreaSelection(
    start: Point<number>,
    end: Point<number>,
  ): AreaSelection {
    const area = this._getArea(start, end);

    return {
      points: { start, end },
      area: area,
      intervals: this._getIntervals(area),
    };
  }

  private _getArea(
    start: Point<number>,
    end: Point<number>,
  ): IndexArea<number> {
    return {
      x1: Math.min(start.x, end.x),
      y1: Math.min(start.y, end.y),
      x2: Math.max(start.x, end.x),
      y2: Math.max(start.y, end.y),
    };
  }

  private _getIntervals(area: IndexArea<number>): AreaIntervals {
    const x = { start: area.x1, end: area.x2 };
    const y = { start: area.y1, end: area.y2 };
    return { x, y, overlap: this._getOverlap(x, y) };
  }

  private _getOverlap(
    a: Interval<number>,
    b: Interval<number>,
  ): Interval<number> | undefined {
    return a.start > b.end || a.end < b.start
      ? undefined
      : { start: Math.max(a.start, b.start), end: Math.min(a.end, b.end) };
  }

  private _displayAreaSelection(root: SVGGElement, selection: AreaSelection) {
    root.replaceChildren(...this._createSelectionRect(selection.area));
  }

  /**
   * Creates a rectangular selection element with markers in each corner
   * and lines projected onto the diagonal axis.
   *
   * The input rectangle is defined with x1/2 and y1/2, corresponding to these
   * corner points:
   *
   *   (x1|y1)-(x2|y1)
   *      |       |
   *      |       |
   *   (x1|y2)-(x2|y2)
   *
   *
   * ASCII art of examples for display:
   *
   *    Scored t.  x                Scored t.  x
   *  A +---------->              A +---------->
   *  l |\                        l |\
   *  i | \----o--o               i | \
   *  g |  \   |  |               g | |\
   *  n |   \--o--o               n | | \
   *  e |    \ |  |               e | o--+----o
   *  d |     \|  |               d | \   \   |
   *    |      \  |                 | \    \  |
   *  t |       \ |               t | o-----+-o
   *  . |        \|               . |        \|
   *    |         \                 |         \
   *  y v          \              y v          \
   */
  private _createSelectionRect(area: IndexArea<number>): SVGElement[] {
    const createMarker = (x: number, y: number) => {
      return this._createMarker({ x, y }, "pv-selection-marker");
    };

    const createLine = (x1: number, y1: number, x2: number, y2: number) => {
      return this._createLine({ x: x1, y: y1 }, { x: x2, y: y2 });
    };

    return [
      this._createRect(area),
      // top horizontal line
      createLine(
        Math.min(area.x1, area.y1),
        area.y1,
        Math.max(area.x2, area.y1),
        area.y1,
      ),
      // bottom horizontal line
      createLine(
        Math.min(area.x1, area.y2),
        area.y2,
        Math.max(area.x2, area.y2),
        area.y2,
      ),
      // left vertical line
      createLine(
        area.x1,
        Math.min(area.y1, area.x1),
        area.x1,
        Math.max(area.y2, area.x1),
      ),
      // right vertical line
      createLine(
        area.x2,
        Math.min(area.y1, area.x2),
        area.x2,
        Math.max(area.y2, area.x2),
      ),
      createMarker(area.x1, area.y1),
      createMarker(area.x2, area.y1),
      createMarker(area.x1, area.y2),
      createMarker(area.x2, area.y2),
    ];
  }

  private _createRect(area: IndexArea<number>): SVGRectElement {
    return SvgUtils.createElement("rect", {
      classes: ["pv-selection-rect"],
      attributes: {
        x: Utils.toPercentage(area.x1),
        y: Utils.toPercentage(area.y1),
        width: Utils.toPercentage(area.x2 - area.x1),
        height: Utils.toPercentage(area.y2 - area.y1),
      },
    });
  }

  private _createMarker(
    point: Point<number>,
    cssClass?: string,
  ): SVGCircleElement {
    return SvgUtils.createElement("circle", {
      classes: ["pv-selection-marker", cssClass ?? ""],
      attributes: {
        cx: Utils.toPercentage(point.x),
        cy: Utils.toPercentage(point.y),
        r: "1%",
      },
    });
  }

  private _createLine(
    start: Point<number>,
    end: Point<number>,
  ): SVGLineElement {
    return SvgUtils.createElement("line", {
      classes: ["pv-selection-line"],
      attributes: {
        x1: Utils.toPercentage(start.x),
        y1: Utils.toPercentage(start.y),
        x2: Utils.toPercentage(end.x),
        y2: Utils.toPercentage(end.y),
      },
    });
  }
}

export type CursorMoveEvent = CustomEvent<Point<number>>;
export type CursorLeaveEvent = CustomEvent<undefined>;
export type SelectPointEvent = CustomEvent<Point<number>>;
export type SelectAreaEvent = CustomEvent<AreaSelection>;
export type SelectingAreaEvent = CustomEvent<AreaSelection>;

export interface AreaSelection {
  points: AreaPoints;
  area: IndexArea<number>;
  intervals: AreaIntervals;
}

export interface AreaPoints {
  start: Point<number>;
  end: Point<number>;
}

export interface AreaIntervals {
  x: Interval<number>;
  y: Interval<number>;
  overlap?: Interval<number>;
}
