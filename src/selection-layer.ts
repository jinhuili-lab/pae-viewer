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
    <svg xmlns="http://www.w3.org/2000/svg">
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
    </svg>
  `,
  ).querySelector("defs")!;

  private readonly _root: SVGGElement;
  private readonly _displayGroup: SVGGElement = SvgUtils.createElement("g");

  public constructor(root: SVGGElement, matrix: SVGImageElement) {
    super();
    this._root = root;
    this._root.replaceChildren();

    const createStripes = (
      handle1: string,
      handle2: string,
    ): SVGPatternElement =>
      SvgUtils.createStripePattern(
        this._getPatternId(handle1, handle2),
        `var(--pv-color-${handle1})`,
        `var(--pv-color-${handle2})`,
      );

    this._defs.append(
      createStripes("x", "y"),
      createStripes("a", "b"),
      createStripes("a", "c"),
      createStripes("b", "c"),
    );

    this._root.replaceChildren(this._defs, this._displayGroup);

    this._setupListeners(this._root, matrix, this._displayGroup);
  }

  private _getPatternId(handle1: string, handle2: string): string {
    return `pv-selection-pattern-${handle1}-${handle2}`;
  }

  private _getPatternUrl(handle1: string, handle2: string): string {
    return `url(#${this._getPatternId(handle1, handle2)})`;
  }

  private _setupListeners(
    root: SVGGElement,
    matrix: SVGImageElement,
    displayGroup: SVGGElement,
  ) {
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

          this._displayAreaSelection(displayGroup, selection);

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

        this._displayAreaSelection(displayGroup, selection);

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
        this._displayAreaSelection(displayGroup, selection);

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

    if (this._areOverlapping(x, y)) {
      const [a, b, c] = Array.from(
        Utils.pairwise([area.x1, area.y1, area.x2, area.y2].sort()),
      ).map(([start, end]) => ({ start, end }));

      return { composite: true, a, b, c };
    } else {
      return { composite: false, x, y };
    }
  }

  private _areOverlapping(a: Interval<number>, b: Interval<number>): boolean {
    return a.end > b.start && a.start < b.end;
  }

  private _displayAreaSelection(root: SVGGElement, selection: AreaSelection) {
    root.replaceChildren(
      ...this._createSelectionRect(selection.area),
      ...this._createIntervalLines(selection.intervals),
    );
  }

  /**
   * Creates a rectangular selection element with markers in each corner
   * and lines projected onto the diagonal axis.
   *
   * The input rectangle is defined with x1/2 and y1/2, corresponding to these
   * corner points:
   *
   *   (x1|y1`)-(x2|y1)
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
      return this._createLine(x1, y1, x2, y2, ["pv-selection-rect-line"]);
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

  private _createIntervalLines(intervals: AreaIntervals): SVGElement[] {
    const createMarker = (value: number, handle: string): SVGCircleElement => {
      return this._createMarker(
        { x: value, y: value },
        `pv-selected-interval-marker-${handle}`,
      );
    };

    const createDiagonalLine = (
      interval: Interval<number>,
      handle: string,
    ): SVGLineElement => {
      return this._createLine(
        interval.start,
        interval.start,
        interval.end,
        interval.end,
        [`pv-selected-interval-line`, `pv-selected-interval-line-${handle}`],
      );
    };

    if (intervals.composite) {
      return [
        createDiagonalLine(intervals.a, "a"),
        createDiagonalLine(intervals.b, "b"),
        createDiagonalLine(intervals.c, "c"),
        createMarker(intervals.a.start, "a"),
        createMarker(intervals.b.start, "a-b"),
        createMarker(intervals.b.end, "b-c"),
        createMarker(intervals.c.end, "c"),
      ];
    } else {
      return [
        createDiagonalLine(intervals.x, "x"),
        createDiagonalLine(intervals.y, "y"),
        createMarker(intervals.x.start, "x"),
        createMarker(intervals.x.end, "x"),
        createMarker(intervals.y.start, "y"),
        createMarker(intervals.y.end, "y"),
      ];
    }
  }

  private _createRect(area: IndexArea<number>): SVGRectElement {
    return SvgUtils.createElement("rect", {
      classes: ["pv-selection-rect"],
      attributes: {
        x: Utils.toPercentage(area.x1),
        y: Utils.toPercentage(area.y1),
        width: Utils.toPercentage(area.x2 - area.x1),
        height: Utils.toPercentage(area.y2 - area.y1),
        fill: this._getPatternUrl("x", "y"),
      },
    });
  }

  private _createMarker(
    point: Point<number>,
    cssClass?: string,
  ): SVGCircleElement {
    return SvgUtils.createElement("circle", {
      classes: ["pv-selection-marker", ...(cssClass ? [cssClass] : [])],
      attributes: {
        cx: Utils.toPercentage(point.x),
        cy: Utils.toPercentage(point.y),
        r: "1%",
      },
    });
  }

  private _createLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    classes: string[],
  ): SVGLineElement {
    return SvgUtils.createElement("line", {
      classes: classes,
      attributes: {
        x1: Utils.toPercentage(x1),
        y1: Utils.toPercentage(y1),
        x2: Utils.toPercentage(x2),
        y2: Utils.toPercentage(y2),
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
  intervals: AreaIntervals | AreaCompositeIntervals;
}

export interface AreaPoints {
  start: Point<number>;
  end: Point<number>;
}

type AreaIntervals = AreaSimpleIntervals | AreaCompositeIntervals;

export interface AreaSimpleIntervals {
  composite: false;
  x: Interval<number>;
  y: Interval<number>;
}

export interface AreaCompositeIntervals {
  composite: true;
  a: Interval<number>;
  b: Interval<number>;
  c: Interval<number>;
}
