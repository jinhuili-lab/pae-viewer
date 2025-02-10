import {
  Crosslink,
  Entity,
  EntityColorScale,
  PaeColorScale,
  Residue,
  RgbColor
} from "./types";
import { Utils } from "./utils.js";

export class PaeViewer<
  R extends Residue = Residue,
  E extends Entity = Entity,
  C extends Crosslink = Crosslink,
> {
  private readonly _template: string = `
<svg class="pv-graph"  xmlns="http://www.w3.org/2000/svg" overflow="visible">
  <defs>
    <linearGradient id="rangeMarkerLower"
                    gradientTransform="rotate(45 0.5 0.5)">
      <stop offset="0%" stop-color="cyan" />
      <stop offset="50%" stop-color="cyan" />
      <stop offset="50%" stop-color="magenta" />
      <stop offset="100%" stop-color="magenta" />
    </linearGradient>
    <linearGradient id="rangeMarkerLowerReversed"
                    gradientTransform="rotate(45 0.5 0.5)">
      <stop offset="0%" stop-color="orange" />
      <stop offset="50%" stop-color="orange" />
      <stop offset="50%" stop-color="magenta" />
      <stop offset="100%" stop-color="magenta" />
    </linearGradient>
    <linearGradient id="rangeMarkerUpper"
                    gradientTransform="rotate(45 0.5 0.5)">
      <stop offset="0%" stop-color="magenta" />
      <stop offset="50%" stop-color="magenta" />
      <stop offset="50%" stop-color="orange" />
      <stop offset="100%" stop-color="orange" />
    </linearGradient>
    <linearGradient id="rangeMarkerUpperReversed"
                    gradientTransform="rotate(45 0.5 0.5)">
      <stop offset="0%" stop-color="magenta" />
      <stop offset="50%" stop-color="magenta" />
      <stop offset="50%" stop-color="cyan" />
      <stop offset="100%" stop-color="cyan" />
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

  public get pae(): number[][] | undefined {
    return this._pae;
  }

  public set pae(matrix: number[][] | undefined) {
    this._pae = matrix;

    if (matrix) {
      this._updateImage(matrix, this._paeColorScale);
    } else {
      this._image = undefined;
      this._element.querySelector(".pv-pae-matrix")?.setAttribute("href", "");
    }
  }

  private _pae: number[][] | undefined;

  public get entities(): E[] | undefined {
    return this._entities;
  }

  public set entities(entities: E[] | undefined) {
    this._entities = entities;
  }

  private _entities: E[] | undefined;

  public get paeColorScale(): PaeColorScale {
    return this._paeColorScale;
  }

  public set paeColorScale(scale: PaeColorScale) {
    this._paeColorScale = scale;

    if (this.pae) {
      this._updateImage(this.pae, scale);
    }
  }

  private _paeColorScale: PaeColorScale = (scale) =>
    Array(3).fill(scale * 255) as any as RgbColor;

  public get entityColorScale(): EntityColorScale<E> {
    return this._entityColorScale;
  }

  public set entityColorScale(scale: EntityColorScale<E>) {
    this._entityColorScale = scale;
  }

  private _entityColorScale: EntityColorScale<E> = (_, i) =>
    this._entityColors[i % this._entityColors.length];

  private _element: SVGSVGElement;
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
    "#cc79a7"
  ];

  constructor(root: HTMLElement) {
    this._element = Utils.fromHtml(this._template).querySelector(
      ".pv-graph"
    ) as SVGSVGElement;

    root.appendChild(this._element);

    const rect = this._element.getBoundingClientRect();
    this._viewBox = { width: rect.width, height: rect.height };
    this._element.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    this._element.setAttribute("width", rect.width.toString());
    this._element.setAttribute("height", rect.height.toString());
  }

  private _getMax(pae: number[][]): number {
    let max = 0;

    for (const row of pae) {
      for (const value of row) {
        if (value > max) {
          max = value;
        }
      }
    }

    return max;
  }

  private _createImage(
    pae: number[][],
    colorScale: (value: number) => RgbColor
  ): Promise<Blob> {
    const dim = pae.length;
    const rgbaValues: number[] = new Array(dim ** 2 * 4);
    const max = this._getMax(pae);

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
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject()))
      );
    });
  }

  private _updateImage(pae: number[][], colorScale: PaeColorScale) {
    this._createImage(pae, colorScale).then((image) => {
      this._image = image;
      this._element
        .querySelector(".pv-pae-matrix")
        ?.setAttribute("href", URL.createObjectURL(image));
    });
  }
}
