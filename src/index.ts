import {
  Crosslink,
  Entity,
  EntityColorScale,
  PaeColorScale,
  Residue,
  RgbColor,
} from "./types";

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

  public get entities(): E[] | undefined {
    return this._entities;
  }

  public set entities(value: E[] | undefined) {
    this._entities = value;
  }

  public get entityColorScale(): EntityColorScale<E> {
    return this._entityColorScale;
  }

  public set entityColorScale(value: EntityColorScale<E>) {
    this._entityColorScale = value;
  }

  public get paeColorScale(): PaeColorScale {
    return this._paeColorScale;
  }

  public set paeColorScale(value: PaeColorScale) {
    this._paeColorScale = value;
  }

  public get pae(): number[][] | undefined {
    return this._pae;
  }

  public set pae(value: number[][] | undefined) {
    this._pae = value;
  }

  private _pae: number[][] | undefined;
  private _paeColorScale: PaeColorScale = (value) =>
    Array(3).fill(value * 255) as any as RgbColor;
  private _entityColorScale: EntityColorScale<E> = (_, i) =>
    this._entityColors[i % this._entityColors.length];
  private _entities: E[] | undefined;

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

  constructor() {}
}
