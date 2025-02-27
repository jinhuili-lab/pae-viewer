import {
  AbsoluteIndex,
  Crosslink,
  CrosslinkIndex,
  Entity,
  EntityColorScale,
  IndexArea,
  LinearColorScale,
  Pae,
  PaeData,
  PaeInput,
  Point,
  RelativeIndex,
  RgbColor,
  Subunit,
  Token,
} from "./types.js";
import { Utils } from "./utils.js";
import { PaeUtils } from "./pae-utils.js";
import { Style, StyleUtils } from "./style-utils.js";
import {
  RegionLayer,
  RegionSelection,
  RegionSelectionEvent,
} from "./region-layer.js";
import { SvgUtils } from "./svg-utils.js";
import {
  MoveCursorEvent,
  SelectAreaEvent,
  SelectingAreaEvent,
  SelectionLayer,
  SelectPointEvent,
} from "./selection-layer.js";
import { IndexUtils } from "./index-utils.js";
import { Axes } from "./axes.js";

export class PaeViewer<
  T extends Token = Token,
  E extends Entity<T> = Entity<T>,
  C extends Crosslink<CrosslinkIndex<E>> = Crosslink<CrosslinkIndex<E>>,
> extends EventTarget {
  private readonly _template: string = `
<svg class="pv-graph"
    xmlns="http://www.w3.org/2000/svg"
    overflow="visible">
  <style>
    :root {
      --pv-chart-color: black;
      --pv-chart-line-thickness: 0.2%;
      --pv-font-size: 0.95em;
      --pv-selection-outline-color: white;
      --pv-marker-outline-color: white;
      --pv-marker-outline-thickness: 0.2%;
      --pv-marker-size: 1%;
      --pv-color-x: cyan;
      --pv-color-y: orange;
      --pv-color-overlap: magenta;
      font-size: var(--pv-font-size);
      user-select: none;
    }

    .pv-region {
      opacity: 0.7;
    }

    .pv-background-box {
      rx: 1%;
      opacity: 0.8;
      fill: white;
    }

    text {
      font-family: Arial, Helvetica, sans-serif;
    }

    .pv-pae-matrix {
      cursor: crosshair;
    }

    .pv-axes > line {
      stroke: var(--pv-chart-color);
      stroke-width: var(--pv-chart-line-thickness);
    }

    .pv-tick {
      stroke: var(--pv-chart-color);
      stroke-width: var(--pv-chart-line-thickness);
    }

    .pv-axis-label {
      text-anchor: middle;
    }

    .pv-tick-label-origin {
      text-anchor: end;
      dominant-baseline: auto;
    }

    .pv-tick-label-x {
      text-anchor: middle;
      dominant-baseline: auto;
    }

    .pv-tick-label-y {
      text-anchor: end;
      dominant-baseline: central;
    }

    .pv-region-label > text {
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .pv-axes {
      pointer-events: none;
    }

    .pv-dividers {
      pointer-events: none;
    }

    .pv-divider {
      stroke: var(--pv-chart-color);
      stroke-width: 0.4%;
    }
  </style>
  <style data-id="entity-colors"></style>
  <style data-id="overrides"></style>
  <g class="pv-graph-area">
    <image
      class="pv-pae-matrix"
      width="100%"
      height="100%"
      style="image-rendering:pixelated"
    />
    <g class="pv-axes"></g>
    <g class="pv-dividers"></g>
    <g class="pv-interactive-layer">
      <g class="pv-selections"></g>
      <g class="pv-crosslinks"></g>
      <g class="pv-regions"></g>
    </g>
  </g>
</svg>
`;

  private _regionLayer: RegionLayer<Subunit<E>> | undefined;

  public getPaeData(): PaeData | undefined {
    return this._paeData;
  }

  public setPae(input: PaeInput<E, C> | undefined) {
    if (input) {
      const processed = this._processInput(input, this._entityColorScale);
      this._paeData = processed;
      this._updateImage(processed.pae, this._paeColorScale);
      this._updateEntityColors(processed.subunits);

      const dividersGroup = this._element.querySelector(".pv-dividers") as SVGGElement;
      dividersGroup.replaceChildren();

      this._addDividers(
        processed.subunits.map((subunit) => subunit.length),
        dividersGroup,
      );

      new Axes(this._element.querySelector(".pv-axes")!, processed.subunits);

      this._setupSelectionLayer(
        this._element.querySelector(".pv-selections")!,
        this._element.querySelector(".pv-pae-matrix")!,
        processed,
      );
      this._regionLayer = this.setupRegionLayer(
        this._element.querySelector(".pv-regions")!,
        processed,
      );

      // this._addDividers(sequenceLengths);
      // this._addRegions(complex.members);
      // this._addTicks(complex.members);
    } else {
      this._paeData = undefined;
      this._image = undefined;
      this._element.querySelector(".pv-pae-matrix")?.setAttribute("href", "");
    }
  }

  private _setupSelectionLayer(
    group: SVGGElement,
    matrix: SVGImageElement,
    data: PaeData<E, C>,
  ): SelectionLayer {
    const layer = new SelectionLayer(group, matrix);

    layer.addEventListener("move-cursor", (event) => {
      this.dispatchEvent(
        Utils.createEvent<PaeSelectionEvent>(
          "pv-move-cursor",
          this._getSelectionFromPoint(
            data.pae,
            data.subunits,
            (event as MoveCursorEvent).detail,
          ),
        ),
      );
    });

    layer.addEventListener("select-point", (event) => {
      this.dispatchEvent(
        Utils.createEvent<PaeSelectionEvent>(
          "pv-select-point",
          this._getSelectionFromPoint(
            data.pae,
            data.subunits,
            (event as SelectPointEvent).detail,
          ),
        ),
      );
    });

    layer.addEventListener("selecting-area", (event) => {
      this.dispatchEvent(
        Utils.createEvent<PaeSelectionEvent>(
          "pv-selecting-area",
          this._getSelectionFromPoints(
            data.pae,
            data.subunits,
            (event as SelectingAreaEvent).detail.start,
            (event as SelectingAreaEvent).detail.end,
          ),
        ),
      );
    });

    layer.addEventListener("select-area", (event) => {
      this.dispatchEvent(
        Utils.createEvent<PaeSelectionEvent>(
          "pv-select-area",
          this._getSelectionFromPoints(
            data.pae,
            data.subunits,
            (event as SelectAreaEvent).detail.start,
            (event as SelectAreaEvent).detail.end,
          ),
        ),
      );
    });

    return layer;
  }

  private setupRegionLayer(
    group: SVGGElement,
    data: PaeData<E, C>,
  ): RegionLayer<Subunit<E>> {
    const layer = new RegionLayer<Subunit<E>>(group, data.subunits);

    layer.addEventListener("pv-select-region", (event) => {
      const { subunitX, subunitY } = (event as RegionSelectionEvent<Subunit<E>>)
        .detail as RegionSelection<Subunit<E>>;

      const getRelative = (
        subunit: Subunit<E>,
        index: number,
      ): RelativeIndex<T, E> => ({
        subunit: subunit,
        token: subunit.entity.sequence[index],
        index: index,
      });

      const relative: IndexArea<RelativeIndex<T, E>> = {
        x1: getRelative(subunitX, 0),
        y1: getRelative(subunitY, 0),
        x2: getRelative(subunitX, subunitX.length - 1),
        y2: getRelative(subunitY, subunitY.length - 1),
      };

      const absolute = IndexUtils.getAbsoluteRange(relative);

      const submatrix = PaeUtils.getSubmatrix(
        data.pae,
        absolute.x1,
        absolute.y1,
        absolute.x2,
        absolute.y2,
      );

      this.dispatchEvent(
        Utils.createEvent<PaeRegionSelectionEvent>("pv-select-region-pae", {
          relative: relative,
          absolute: absolute,
          subunits: { x: subunitX, y: subunitY },
          submatrix: submatrix,
          mean: PaeUtils.getMean(submatrix),
        }),
      );
    });

    return layer;
  }

  private _paeData: PaeData<E> | undefined;

  private _updateEntityColors(subunits: Subunit<E>[]): void {
    this._styleEntityColorsElement.replaceChildren(
      ...subunits.map((subunit) =>
        StyleUtils.createVariableRule(
          subunit.entity.id.toString(),
          subunit.color,
        ),
      ),
    );
  }

  public setStyle(style: Style | CSSStyleSheet | null) {
    if (style instanceof CSSStyleSheet) {
      this._styleOverridesElement.replaceChildren(
        ...StyleUtils.getStyleRulesAsText(style),
      );
    } else if (style) {
      // `Style object`
      this._styleOverridesElement.replaceChildren(
        ...StyleUtils.getStyleRulesAsText(StyleUtils.sheetFromStyle(style)),
      );
    } else {
      // nullish
      this._styleOverridesElement.replaceChildren();
    }
  }

  private _entities: E[] | undefined;

  public get paeColorScale(): LinearColorScale {
    return this._paeColorScale;
  }

  public set paeColorScale(scale: LinearColorScale) {
    this._paeColorScale = scale;

    if (this._paeData) {
      this._updateImage(this._paeData.pae, scale);
    }
  }

  // dark to light green scale; linear interpolation of:
  // chroma.cubehelix().start(120).rotations(0).hue(0.8)
  //       .gamma(1).lightness([0.2, 0.95]);
  // simplified to eliminate chroma dependency
  private _paeColorScale: LinearColorScale = Utils.lerpColors([
    [27, 66, 35],
    [110, 170, 122],
    [235, 247, 237],
  ]);

  public get entityColorScale(): EntityColorScale<E> {
    return this._entityColorScale;
  }

  public set entityColorScale(scale: EntityColorScale<E>) {
    this._entityColorScale = scale;
  }

  private _entityColorScale: EntityColorScale<E> = (_, i) =>
    this._entityColors[i % this._entityColors.length];

  private _element: SVGSVGElement;
  private _styleEntityColorsElement: SVGStyleElement;
  private _styleOverridesElement: SVGStyleElement;
  private _viewBox: { width: number; height: number };
  private _image: Blob | undefined;

  // modified from Okabe_Ito
  private readonly _entityColors = [
    "#991999", // PyMol deeppurple (0.6, 0.1, 0.6)
    "#00BFBF", // PyMol teal (0, 0.75, 0.75)
    "#e9967a", // salmon
    "#009e73",
    "#f0e442",
    "#0072b2",
    "#d55e00",
    "#cc79a7",
  ];

  constructor(root: HTMLElement) {
    super();
    this._element = Utils.fromHtml(this._template).querySelector(
      ".pv-graph",
    ) as SVGSVGElement;

    this._styleEntityColorsElement = this._element.querySelector(
      "svg style[data-id=entity-colors]",
    )!;

    this._styleOverridesElement = this._element.querySelector(
      "svg style[data-id=overrides]",
    )!;

    root.appendChild(this._element);

    const rect = root.getBoundingClientRect();
    const dim = Math.min(rect.width, rect.height);

    this._viewBox = { width: dim, height: dim };
    this._element.setAttribute("viewBox", `0 0 ${dim} ${dim}`);
    this._element.setAttribute("width", dim.toString());
    this._element.setAttribute("height", dim.toString());
  }

  private _createImage(
    pae: number[][],
    colorScale: (value: number) => RgbColor,
  ): Promise<Blob> {
    const dim = pae.length;
    const rgbaValues: number[] = new Array(dim ** 2 * 4);
    const max = PaeUtils.MAX_PAE;

    for (let y = 0; y < dim; y++) {
      for (let x = 0; x < dim; x++) {
        const coord = (y * dim + x) * 4;
        rgbaValues.splice(coord, 4, ...colorScale(pae[y][x] / max), 255);
      }
    }

    const raw = new Uint8ClampedArray(rgbaValues);
    return this._blobFromImageData(new ImageData(raw, dim));
  }

  private _blobFromImageData(data: ImageData): Promise<Blob> {
    return createImageBitmap(data).then((bitmap) => {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("bitmaprenderer")!.transferFromImageBitmap(bitmap);

      return new Promise((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject())),
      );
    });
  }

  private _updateImage(pae: number[][], colorScale: LinearColorScale) {
    this._createImage(pae, colorScale)
      .then((image) => {
        this._image = image;
        return Utils.blobToBase64(this._image);
      })
      .then((base64) => {
        this._element
          .querySelector(".pv-pae-matrix")
          ?.setAttribute("href", base64);
      });
  }

  private _addDividers(lengths: number[], group: SVGGElement) {
    const total = Utils.sum(lengths);

    for (const index of Utils.cumsum(lengths.slice(0, -1))) {
      for (const coord of ["x", "y"]) {
        const otherCoord = { x: "y", y: "x" }[coord];
        const extent = Utils.toPercentage(index / total);

        SvgUtils.createElement("line", {
          root: group,
          classes: ["pv-divider"],
          attributes: {
            [coord + 1]: extent,
            [coord + 2]: extent,
            [otherCoord! + 1]: "0",
            [otherCoord! + 2]: "100%",
          },
        });
      }
    }
  }

  private _processInput(
    input: PaeInput<E, C>,
    colorScale: EntityColorScale<E>,
  ): PaeData<E, C> {
    this._validatePaeInput(input);

    return {
      pae: input.pae,
      subunits: this._processEntities(input.entities, colorScale),
      crosslinks: input.crosslinks,
    };
  }

  private _processEntities(
    entities: E[],
    colorScale: EntityColorScale<E>,
  ): Subunit<E>[] {
    const lengths = entities.map((entity) => entity.sequence.length);
    const offsets = [0, ...Utils.cumsum(lengths.slice(0, -1))];

    return entities.map((entity, i) => ({
      entity: entity,
      index: i,
      length: lengths[i],
      offset: offsets[i],
      color: colorScale(entity, i),
    }));
  }

  private _validatePaeInput(data: PaeInput<E, C>) {
    PaeUtils.validated(data.pae);

    if (data.entities.length === 0) {
      throw new Error("Entities must not be empty.");
    }

    if (
      new Set(data.entities.map((entity) => entity.id)).size !==
      data.entities.length
    ) {
      throw new Error("Entities must have unique IDs.");
    }

    const totalSequenceLength = Utils.sum(
      data.entities.map((entity) => entity.sequence.length),
    );

    if (totalSequenceLength !== data.pae.length) {
      throw new Error(
        `The sum of the entity sequence lengths (${totalSequenceLength}) ` +
          `does not match the PAE matrix dimension (${data.pae.length}).`,
      );
    }
  }

  public getSvg(): Blob {
    const svg = this._element.cloneNode(true) as SVGElement;

    svg.querySelector(".pv-selections")!.remove();
    svg.querySelector(".pv-regions")!.remove();

    // workaround for clients not supporting 'dominant-baseline',
    // e.g. Office applications (Word, PowerPoint)
    for (const text of svg.querySelectorAll(
      "text[dominant-baseline=central]",
    )) {
      const relativeY =
        parseFloat(text.getAttribute("y") ?? getComputedStyle(text).y) / 100;
      text.removeAttribute("dominant-baseline");
      text.setAttribute("y", (relativeY * this._viewBox.height + 5).toString());
    }

    const pad = { left: 25, right: 25, top: 25, bottom: 25 };
    const bbox = this._element.getBBox();
    const width = bbox.width + pad.left + pad.right;
    const height = bbox.height + pad.top + pad.bottom;

    const outerSvg = svg.cloneNode(false) as SVGElement;
    outerSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    outerSvg.setAttribute("width", width.toString());
    outerSvg.setAttribute("height", height.toString());

    const container = SvgUtils.createElement("g", {
      attributes: {
        transform: `translate(${-bbox.x + pad.left}, ${-bbox.y + pad.top})`,
      },
    });

    container.appendChild(svg);
    outerSvg.appendChild(container);

    return SvgUtils.getBlob(outerSvg);
  }

  public showRegions(show: boolean) {
    this._regionLayer?.show(show);
  }

  private _getSelectionFromPoint(
    pae: Pae,
    subunits: Subunit<E>[],
    point: Point<number>,
  ) {
    const total = Utils.sum(subunits.map((subunit) => subunit.length));
    const absolute = IndexUtils.getAbsoluteRangeFromPoint(total, point);
    const value = pae[absolute.y1][absolute.x1];

    return {
      relative: IndexUtils.getRelativeRange(absolute, subunits),
      absolute: absolute,
      submatrix: [[value]],
      mean: value,
    };
  }

  private _getSelectionFromPoints(
    pae: Pae,
    subunits: Subunit<E>[],
    start: Point<number>,
    end: Point<number>,
  ) {
    const total = Utils.sum(subunits.map((subunit) => subunit.length));
    const absolute = IndexUtils.getAbsoluteRangeFromPoints(total, start, end);

    const submatrix = PaeUtils.getSubmatrix(
      pae,
      absolute.x1,
      absolute.y1,
      absolute.x2,
      absolute.y2,
    );

    return {
      relative: IndexUtils.getRelativeRange(absolute, subunits),
      absolute: absolute,
      submatrix: submatrix,
      mean: PaeUtils.getMean(submatrix),
    };
  }
}

export type PaeSelectionEvent = CustomEvent<PaeSelection>;
export type PaeRegionSelectionEvent =
  CustomEvent<PaeRegionSelectionEventDetails>;

export interface PaeSelection {
  relative: IndexArea<RelativeIndex>;
  absolute: IndexArea<AbsoluteIndex>;
  submatrix: number[][];
  mean: number;
}

export interface PaeRegionSelectionEventDetails extends PaeSelection {
  subunits: {
    x: Subunit;
    y: Subunit;
  };
}
