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
    root.replaceChildren(this.createRect(selection.area));
  }

  private createRect(area: IndexArea<number>) {
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

  private _addMarker(point: Point<number>, cssClass?: string) {
    const circle = SvgUtils.createElement("circle", {
      classes: ["pv-selection-marker", cssClass ?? ""],
      attributes: {
        cx: Utils.toPercentage(point.x),
        cy: Utils.toPercentage(point.y),
      },
    });

    this._root.appendChild(circle);
  }

  //
  // isCursorOnGraph(mouseEvent) {
  //   const coords = this.getRelativeMousePosition(mouseEvent, false);
  //
  //   for (const coord of coords) {
  //     if (coord < 0 || coord > 1) {
  //       return false;
  //     }
  //   }
  //
  //   return true;
  // }
  //
  // /**
  //  * Updates the coordinates of the bounding lines of the selection
  //  * rectangle between point `from` (f) and `to`(t).
  //  * The lines will be drawn as follows:
  //  *
  //  *  y^               d     y^               d
  //  *   |              /       |              0
  //  *   |             /        |             /|
  //  *   |  t---O-----0         |      O-----0-t
  //  *   |  |   |    /          |      |    /  |
  //  *   |  O---f---0           |      f---0---O
  //  *   |  |   |  /            |      |  /
  //  *   |  |   | /             |      | /
  //  *   |  |   |/              |      |/
  //  *   |  |   0               |      0
  //  *   |  |  /                |     /
  //  *   |  | /                 |    /
  //  *   |  |/                  |   /
  //  *   |  0                   |  /
  //  *   | /                    | /
  //  *   |/                     |/
  //  *   +--------------->      +--------------->
  //  *                   x                      x
  //  * @param from
  //  * @param to
  //  */
  // #updateSelectionLines(from, to) {
  //   for (const [index, [axis, constantPoint]] of [
  //     ...Utils.cartesian(["x", "y"], [from, to]),
  //   ].entries()) {
  //     const i = axis === "x" ? 0 : 1;
  //     const j = 1 - i;
  //     const constantCoord = axis === "x" ? "y" : "x";
  //     const constant = constantPoint[j];
  //
  //     const line = this.#selection.lines[index];
  //
  //     const [outer, inner] = [to[i], from[i]].sort(
  //       (a, b) => Math.abs(constant - b) - Math.abs(constant - a),
  //     );
  //
  //     Utils.setAttributes(line, {
  //       [axis + 1]: Utils.toPercentage(outer),
  //       [axis + 2]: Utils.toPercentage(
  //         outer < constant
  //           ? Math.max(inner, constant)
  //           : Math.min(inner, constant),
  //       ),
  //       [constantCoord + 1]: Utils.toPercentage(constant),
  //       [constantCoord + 2]: Utils.toPercentage(constant),
  //     });
  //   }
  // }
  //
  // #updatedSelectionMarkers(from, to) {
  //   const inUpperHalf = (x, y) => y >= x;
  //
  //   // start point is in upper left triangle
  //   const startInUpperHalf = inUpperHalf(from[0], from[1]);
  //
  //   // if start is in one half and end point (or one of the other
  //   // points created by constructing the rectangle) is in the
  //   // other, there is an overlap
  //   const otherPointsInUpperHalf = [
  //     [to[0], to[1]],
  //     [to[0], from[1]],
  //     [from[0], to[1]],
  //   ].map(([x, y]) => inUpperHalf(x, y));
  //
  //   const overlap =
  //     (startInUpperHalf && !otherPointsInUpperHalf.every(Boolean)) ||
  //     (!startInUpperHalf && otherPointsInUpperHalf.some(Boolean));
  //
  //   const style = this.#style.elements.selection;
  //   const colors = [style.colors.x, style.colors.y];
  //
  //   // make sure colors are correctly assigned to X and Y
  //   const [color1, color2] = from[1] >= from[0] ? colors : colors.reverse();
  //
  //   const gradients =
  //     from[1] > from[0]
  //       ? ["rangeMarkerLower", "rangeMarkerUpper"]
  //       : ["rangeMarkerLowerReversed", "rangeMarkerUpperReversed"];
  //
  //   const markerColors = [
  //     color1,
  //     ...(overlap
  //       ? gradients.map((gradient) => `url("#${gradient}")`)
  //       : [color1, color2]),
  //     color2,
  //   ];
  //
  //   const markerCoords = [from[0], from[1], to[0], to[1]].sort();
  //
  //   for (const [i, coord] of markerCoords.entries()) {
  //     const marker = this.#selection.rangeMarkers[i];
  //     Utils.setAttributes(marker, {
  //       cx: Utils.toPercentage(coord),
  //       cy: Utils.toPercentage(coord),
  //       fill: markerColors[i],
  //     });
  //   }
  //
  //   const lineColors = [color1, style.colors.overlap, color2];
  //
  //   for (const [i, [start, end]] of [
  //     ...Utils.pairwise(markerCoords),
  //   ].entries()) {
  //     const line = this.#selection.rangeLines[i];
  //
  //     if (i === 1 && !overlap) {
  //       line.setAttribute("visibility", "hidden");
  //       continue;
  //     } else {
  //       line.setAttribute("visibility", "visible");
  //     }
  //     Utils.setAttributes(line, {
  //       x1: Utils.toPercentage(start),
  //       y1: Utils.toPercentage(start),
  //       x2: Utils.toPercentage(end),
  //       y2: Utils.toPercentage(end),
  //       stroke: lineColors[i],
  //     });
  //   }
  //
  //   const coords = markerCoords.map(this.#getResidueFromRelative.bind(this));
  //
  //   const ranges = [coords.slice(0, 2), coords.slice(2, 4)];
  //   const [rangeX, rangeY] = startInUpperHalf ? ranges : ranges.reverse();
  //
  //   const [fromResidueX, fromResidueY] = from.map(
  //     this.#getResidueFromRelative.bind(this),
  //   );
  //
  //   const [toResidueX, toResidueY] = to.map(
  //     this.#getResidueFromRelative.bind(this),
  //   );
  //
  //   return {
  //     x: { range: rangeX, color: style.colors.x },
  //     y: { range: rangeY, color: style.colors.y },
  //     overlap: overlap
  //       ? {
  //           range: coords.slice(1, 3),
  //           color: style.colors.overlap,
  //         }
  //       : null,
  //     from: { x: fromResidueX, y: fromResidueY },
  //     to: { x: toResidueX, y: toResidueY },
  //   };
  // }
  //
  // setupSelectionListeners() {
  //   let lastMouseDownEvent = null;
  //   let selectingRange = false;
  //
  //   this.#interactiveGroup.addEventListener("mousedown", (event) => {
  //     this.deselectAll(false);
  //
  //     event.stopPropagation();
  //     event.preventDefault();
  //
  //     lastMouseDownEvent = event;
  //   });
  //
  //   document.addEventListener("mouseup", (event) => {
  //     if (lastMouseDownEvent === null) return;
  //
  //     event.stopPropagation();
  //     event.preventDefault();
  //
  //     if (selectingRange) {
  //       this.selectRangeEnd(this.getRelativeMousePosition(event));
  //
  //       selectingRange = false;
  //     } else {
  //       this.selectPoint(this.getRelativeMousePosition(lastMouseDownEvent));
  //     }
  //
  //     lastMouseDownEvent = null;
  //   });
  //
  //   document.addEventListener("mousemove", (event) => {
  //     if (lastMouseDownEvent === null) return;
  //
  //     event.stopPropagation();
  //     event.preventDefault();
  //
  //     if (selectingRange) {
  //       this.selectRangeUpdate(this.getRelativeMousePosition(event));
  //     } else {
  //       this.selectRangeStart(
  //         this.getRelativeMousePosition(event),
  //         this.getRelativeMousePosition(lastMouseDownEvent),
  //       );
  //
  //       selectingRange = true;
  //     }
  //   });
  // }
  //
  // selectPoint(point) {
  //   const [coordX, coordY] = point;
  //   const style = this.#style.elements.selection;
  //
  //   const lineTemplate = Utils.createSVG("line", "pv-selection-line", {
  //     stroke: style.lines.color,
  //     "stroke-width": style.lines.thickness,
  //     "stroke-dasharray": style.lines.dashLength,
  //     x2: Utils.toPercentage(coordX),
  //     y2: Utils.toPercentage(coordY),
  //   });
  //
  //   for (const coord of point) {
  //     const line = lineTemplate.cloneNode(false);
  //     Utils.setAttributes(line, {
  //       x1: Utils.toPercentage(coord),
  //       y1: Utils.toPercentage(coord),
  //     });
  //     this.#selectionGroup.appendChild(line);
  //   }
  //
  //   const markerTemplate = Utils.createSVG("circle", "pv-selection-marker", {
  //     stroke: style.markers.outlineColor,
  //     "stroke-width": style.markers.outlineThickness,
  //     r: style.markers.size,
  //   });
  //
  //   for (const [color, cx, cy] of [
  //     ["white", coordX, coordY],
  //     [style.colors.x, coordX, coordX],
  //     [style.colors.y, coordY, coordY],
  //   ]) {
  //     const marker = markerTemplate.cloneNode(false);
  //     Utils.setAttributes(marker, {
  //       cx: Utils.toPercentage(cx),
  //       cy: Utils.toPercentage(cy),
  //       fill: color,
  //     });
  //     this.#selectionGroup.appendChild(marker);
  //   }
  //
  //   const [selectionX, selectionY] = [coordX, coordY].map(
  //     this.#getResidueFromRelative.bind(this),
  //   );
  //
  //   this.#statusSelection.replaceChildren(
  //     this.#getStatusAtCoords(selectionX, selectionY, false),
  //   );
  //
  //   this.#element.dispatchEvent(
  //     new CustomEvent("pv-select-residue-pair", {
  //       bubbles: true,
  //       detail: {
  //         complex: this.#complex,
  //         selection: {
  //           x: { residue: selectionX, color: style.colors.x },
  //           y: { residue: selectionY, color: style.colors.y },
  //         },
  //       },
  //     }),
  //   );
  // }
  //
  // setRect(rect, x1, y1, x2, y2) {
  //   const [rectX1, rectX2] = [x1, x2].sort();
  //   const [rectY1, rectY2] = [y1, y2].sort();
  //
  //   Utils.setAttributes(rect, {
  //     x: Utils.toPercentage(rectX1),
  //     y: Utils.toPercentage(rectY1),
  //     width: Utils.toPercentage(rectX2 - rectX1),
  //     height: Utils.toPercentage(rectY2 - rectY1),
  //   });
  // }
  //
  // selectRangeStart(from, to) {
  //   const style = this.#style.elements.selection;
  //   this.#selection.start = from;
  //
  //   const rect = Utils.createSVG("rect", "pv-selection-rect", {
  //     fill: style.rect.color,
  //     opacity: style.rect.opacity,
  //     stroke: "none",
  //   });
  //   this.setRect(rect, ...from, ...to);
  //   this.#selection.rect = rect;
  //   this.#selectionGroup.appendChild(rect);
  //   this.#selection.lines = [];
  //
  //   const lineTemplate = Utils.createSVG("line", "pv-selection-line", {
  //     stroke: style.lines.color,
  //     "stroke-width": style.lines.thickness,
  //     "stroke-dasharray": style.lines.dashLength,
  //   });
  //
  //   for (let i = 0; i < 4; i++) {
  //     const line = lineTemplate.cloneNode(false);
  //     this.#selectionGroup.appendChild(line);
  //     this.#selection.lines.push(line);
  //   }
  //
  //   this.#updateSelectionLines(from, to);
  //
  //   const markerTemplate = Utils.createSVG("circle", "pv-selection-marker", {
  //     fill: style.markers.outlineColor,
  //     stroke: style.markers.outlineColor,
  //     "stroke-width": style.markers.outlineThickness,
  //     r: style.markers.size,
  //   });
  //   this.#selection.rangeMarkers = [];
  //
  //   for (let i = 0; i < 4; i++) {
  //     const marker = markerTemplate.cloneNode(false);
  //     this.#selectionGroup.appendChild(marker);
  //     this.#selection.rangeMarkers.push(marker);
  //   }
  //
  //   const rangeLineTemplate = Utils.createSVG("line", "pv-range-line", {
  //     "stroke-width": style.lines.thickness,
  //   });
  //   this.#selection.rangeLines = [];
  //
  //   for (let i = 0; i < 3; i++) {
  //     const line = rangeLineTemplate.cloneNode(false);
  //     this.#selectionGroup.appendChild(line);
  //     this.#selection.rangeLines.push(line);
  //   }
  //
  //   const rangeSelection = this.#updatedSelectionMarkers(from, to);
  //
  //   const startMarker = markerTemplate.cloneNode(false);
  //   Utils.setAttributes(startMarker, {
  //     cx: Utils.toPercentage(from[0]),
  //     cy: Utils.toPercentage(from[1]),
  //   });
  //   this.#selectionGroup.appendChild(startMarker);
  //
  //   this.#selection.rectMarkers = [];
  //
  //   // rectangle markers
  //   for (const [cx, cy] of [
  //     [to[0], to[1]],
  //     [from[0], to[1]],
  //     [to[0], from[1]],
  //   ]) {
  //     const marker = markerTemplate.cloneNode(false);
  //     Utils.setAttributes(startMarker, {
  //       cx: Utils.toPercentage(cx),
  //       cy: Utils.toPercentage(cy),
  //     });
  //     this.#selectionGroup.appendChild(marker);
  //     this.#selection.rectMarkers.push(marker);
  //   }
  //
  //   this.updateRangeSelectionStatus(rangeSelection);
  // }
  //
  // updateRangeSelectionStatus(selection) {
  //   const residuesX = this.#getCoordStrings(selection.x.range);
  //   const residuesY = this.#getCoordStrings(selection.y.range);
  //
  //   const statusX = document.createElement("span");
  //   statusX.classList.add("pv-x");
  //   statusX.textContent = `X: ${residuesX[0].string} - ${residuesX[1].string}`;
  //
  //   const statusY = document.createElement("span");
  //   statusY.classList.add("pv-y");
  //   statusY.textContent = `Y: ${residuesY[0].string} - ${residuesY[1].string}`;
  //
  //   this.#statusSelection.replaceChildren(statusX, ", ", statusY);
  //
  //   if (selection.overlap !== null) {
  //     const residuesOverlap = this.#getCoordStrings(selection.overlap.range);
  //
  //     const statusOverlap = document.createElement("span");
  //     statusOverlap.classList.add("pv-overlap");
  //     statusOverlap.textContent =
  //       `Overlap: ${residuesOverlap[0].string}` +
  //       ` - ${residuesOverlap[1].string}`;
  //
  //     this.#statusSelection.append(", ", statusOverlap);
  //   }
  // }
  //
  // #updateRegionSelectionStatus(region) {
  //   this.#statusSelection.replaceChildren();
  //
  //   const createMarker = (selection) => {
  //     const marker = document.createElement("span");
  //     marker.classList.add("pv-color-marker");
  //     marker.style.backgroundColor = selection.color;
  //
  //     const member = this.#complex.members.find(
  //       (member) => member.uniprot === selection.range[0][0],
  //     );
  //
  //     marker.textContent = member.title;
  //     return marker;
  //   };
  //
  //   if (region.type === "single") {
  //     this.#statusSelection.append("chain", createMarker(region.selection));
  //   } else {
  //     const [chainX, chainY] = [region.selection.x, region.selection.y].map(
  //       createMarker,
  //     );
  //
  //     this.#statusSelection.append("chains ", chainX, " / ", chainY);
  //   }
  //
  //   if (region.meanPae !== null) {
  //     const paeDisplay = document.createElement("b");
  //     paeDisplay.textContent = `mean PAE: ${region.meanPae.toFixed(2)}`;
  //
  //     this.#statusSelection.append("; ", paeDisplay);
  //   }
  // }
  //
  // selectRangeUpdate(to) {
  //   const from = this.#selection.start;
  //
  //   this.setRect(this.#selection.rect, ...from, ...to);
  //
  //   // rectangle markers
  //   for (const [i, [cx, cy]] of [
  //     [to[0], to[1]],
  //     [from[0], to[1]],
  //     [to[0], from[1]],
  //   ].entries()) {
  //     const marker = this.#selection.rectMarkers[i];
  //     Utils.setAttributes(marker, {
  //       cx: Utils.toPercentage(cx),
  //       cy: Utils.toPercentage(cy),
  //     });
  //   }
  //
  //   this.#updateSelectionLines(from, to);
  //
  //   const rangeSelection = this.#updatedSelectionMarkers(from, to);
  //   this.updateRangeSelectionStatus(rangeSelection);
  //
  //   return rangeSelection;
  // }
  //
  // selectRangeEnd(to) {
  //   const selection = this.selectRangeUpdate(to);
  //
  //   this.#element.dispatchEvent(
  //     new CustomEvent("pv-select-residue-range", {
  //       bubbles: true,
  //       detail: {
  //         complex: this.#complex,
  //         selection: selection,
  //       },
  //     }),
  //   );
  //
  //   if (this.#complex.pae) {
  //     // calculate mean of 2D slice of PAE matrix
  //     const meanPae = this.#calcMeanPae(
  //       selection.from.x,
  //       selection.to.x,
  //       selection.from.y,
  //       selection.to.y,
  //     );
  //
  //     const paeDisplay = document.createElement("b");
  //     paeDisplay.textContent = `mean PAE: ${meanPae.toFixed(2)}`;
  //
  //     this.#statusSelection.append("; ", paeDisplay);
  //   }
  // }
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
