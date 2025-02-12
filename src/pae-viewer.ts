import {
  Crosslink,
  Entity,
  EntityColorScale,
  LinearColorScale,
  PaeData,
  PaeInput,
  Residue,
  RgbColor,
  Subunit,
} from "./types.js";
import { Utils } from "./utils.js";
import { PaeUtils } from "./pae-utils.js";
import { Style, StyleUtils } from "./style-utils.js";
import { RegionLayer } from "./region-layer.js";

export class PaeViewer<
  R extends Residue = Residue,
  E extends Entity<R> = Entity<R>,
  C extends Crosslink<E> = Crosslink<E>,
> {
  private readonly _template: string = `
<svg class="pv-graph"  xmlns="http://www.w3.org/2000/svg" overflow="visible">
  <style>
    :root {
      --pv-chart-color: black;
      --pv-chart-line-thickness: 0.2%;
      --pv-font-size: 0.04;
      --pv-selection-outline-color: white;
      --pv-marker-outline-color: white;
      --pv-marker-outline-thickness: 0.2%;
      --pv-marker-size: 1%;
      --pv-stripe-width: 2%;
      --pv-color-x: cyan;
      --pv-color-y: orange;
      --pv-color-overlap: magenta;
    }

    .pv-axes > line {
      color: var(--pv-chart-color);
      stroke-width: var(--pv-chart-line-thickness);
    }

    .pv-regions {
      pattern, pattern > rect {
          width: var(--pv-stripe-width);
          height: var(--pv-stripe-width);
        }
      }

      pattern > line {
        y2: var(--pv-stripe-width);
        stroke-width: var(--pv-stripe-width);
      }
    }

    text {
      font-family: Arial, Helvetica, sans-serif;
    }
    .pv-divider {
      stroke: var(--pv-chart-color);
      stroke-width: 0.4%;
    }
  </style>
  <style data-id="entity-colors"></style>
  <style data-id="overrides"></style>
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
    <pattern id="stripes-template" patternUnits="userSpaceOnUse"
             width="2%" height="2%" patternTransform="rotate(45)">
      <rect x="0" y="0" width="2%" height="2%" fill="red"></rect>
      <line x1="0" y1="0" x2="0" y2="2%"
            stroke="#00FF00" stroke-width="2%" />
    </pattern>
  </defs>

  <g class="pv-graph-area">
    <image
      class="pv-pae-matrix"
      width="100%"
      height="100%"
      style="image-rendering:pixelated"
    />
    <g class="pv-axes">
      <text class="pv-axis-x-label" x="50%" y="-25%" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif">
        Scored residue / atom
      </text>
      <text class="pv-axis-y-label" x="-35%" y="50%" text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif"
            transform-origin="-35% 50%" transform="rotate(-90)">
        Aligned residue / atom
      </text>
      <line class="pv-axis-x" x1="-5%" y1="0" x2="105%" y2="0" />
      <line class="pv-axis-y" x1="0" y1="-5%" x2="0" y2="105%" />
      <line class="pv-axis-diagonal" x1="0" y1="0" x2="102%" y2="102%" />
      <g class="pv-sequence-ticks"></g>
      <g class="pv-unit-ticks"></g>
      <g class="pv-unit-tick-labels"></g>
      <g class="pv-sequence-tick-labels"></g>
    </g>
    <g class="pv-dividers"></g>
    <g class="pv-interactive-layer">
      <rect class="pv-backdrop" x="0" y="0"
            width="100%" height="100%" opacity="0" />
      <g class="pv-selections"></g>
      <g class="pv-crosslinks"></g>
      <g class="pv-regions"></g>
    </g>
  </g>
</svg>
`;

  public getPaeData(): PaeData | undefined {
    return this._paeData;
  }

  public setPae(input: PaeInput<E, C> | undefined) {
    if (input) {
      this._paeData = this._processInput(input, this._entityColorScale);
      this._updateImage(this._paeData.pae, this._paeColorScale);
      this._updateEntityColors(this._paeData.subunits);
      this._addDividers(
        this._paeData.subunits.map((subunit) => subunit.length),
        this._element.querySelector(".pv-dividers") as SVGGElement,
      );

      this._regionLayer = new RegionLayer(
        this._element.querySelector(".pv-regions") as SVGGElement,
        this._paeData.subunits,
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

  private _regionLayer: RegionLayer<E> | undefined;

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

    const rect = this._element.getBoundingClientRect();
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
    const max = PaeUtils.getMax(pae);

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

        Utils.createSvgElement("line", {
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
    const total = Utils.sum(entities.map((entity) => entity.sequence.length));
    const lengths = entities.map((entity) => entity.sequence.length / total);
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
}
