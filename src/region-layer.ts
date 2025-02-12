import { Entity, Subunit } from "./types.js";
import { Utils } from "./utils.js";
import { StyleUtils } from "./style-utils.js";

/**
 * A layer that displays regions between entities. Regions refer to the
 * intersection of two entities in the PAE matrix (or the intersection of one
 * entity with itself).
 */
export class RegionLayer<
  E extends Entity = Entity,
  S extends Subunit<E> = Subunit<E>,
> {
  private readonly _defs: SVGDefsElement = Utils.fromHtml(
    `
    <svg xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="pv-stripes-template" patternUnits="userSpaceOnUse"
                 width="2%" height="2%" patternTransform="rotate(45)">
          <rect x="0" y="0"></rect>
          <line x1="0" y1="0" x2="0" y2="2%" stroke-width="2%" />
        </pattern>
      </defs>
    </svg>
  `,
  ).querySelector("defs")!;

  private readonly _root: SVGGElement;
  private _selected: SVGGElement | undefined;

  public constructor(root: SVGGElement, subunits: S[]) {
    this._root = root;

    const patterns = this._createPatterns(
      subunits,
      this._defs.querySelector("pattern")!,
    );

    this._defs.append(...patterns.values());
    this._root.appendChild(this._defs);
    this._root.append(...this._createRegions(subunits, patterns));
  }

  private _createPatterns(
    subunits: S[],
    template: SVGPatternElement,
  ): PatternMap {
    const ids = subunits.map((subunit) => subunit.entity.id);
    const patterns: PatternMap = new Map();

    // create stripe patterns for individual regions
    const getPatternId = (i: number, j: number) =>
      `stripes-${this._getPatternKey(subunits[i], subunits[j])}`;

    for (let i = 0; i < subunits.length; i++) {
      for (let j = i + 1; j < subunits.length; j++) {
        const pattern = template.cloneNode(true) as SVGPatternElement;
        console.log("template", template);
        console.log("cloned", pattern);

        pattern
          .querySelector("rect")!
          .setAttribute(
            "fill",
            StyleUtils.getVariableValue(subunits[i].entity.id.toString()),
          );
        pattern
          .querySelector("line")!
          .setAttribute(
            "stroke",
            StyleUtils.getVariableValue(subunits[j].entity.id.toString()),
          );
        pattern.setAttribute("id", getPatternId(i, j));
        patterns.set(this._getPatternKey(subunits[i], subunits[j]), pattern);
      }
    }

    return patterns;
  }

  private _getPatternKey(subunit1: S, subunit2: S): PatternKey {
    return [subunit1.index, subunit2.index].sort().join("-");
  }

  private _createRegions(subunits: S[], patterns: PatternMap): SVGGElement[] {
    const total = Utils.sum(subunits.map((subunit) => subunit.length));

    console.log(Array.from(patterns.entries()));

    return Array.from(Utils.cartesian(subunits, subunits)).map(
      ([subunitX, subunitY]) => {
        console.log(
          this._getPatternKey(subunitX, subunitY),
          patterns.get(this._getPatternKey(subunitX, subunitY)),
        );

        return this._createRegion(
          subunitX,
          subunitY,
          total,
          patterns.get(this._getPatternKey(subunitX, subunitY))?.id,
        );
      },
    );
  }

  private _createRegion(
    subunitX: Subunit,
    subunitY: Subunit,
    totalLength: number,
    patternId?: string,
  ) {
    const region = Utils.createSvgElement("g", { classes: ["pv-region"] });

    const background = Utils.createSvgElement("rect", {
      attributes: {
        x: Utils.toPercentage(subunitX.offset / totalLength),
        y: Utils.toPercentage(subunitY.offset / totalLength),
        width: Utils.toPercentage(subunitX.length / totalLength),
        height: Utils.toPercentage(subunitY.length / totalLength),
        fill:
          subunitX.index === subunitY.index
            ? StyleUtils.getVariableValue(subunitX.entity.id.toString())
            : `url(#${patternId})`,
      },
    });

    region.appendChild(background);

    const label = Utils.createSvgElement("text", {
      attributes: {
        x: Utils.toPercentage(subunitX.offset + subunitX.length / 2),
        y: Utils.toPercentage(subunitY.offset + subunitY.length / 2),
      },
    });

    label.textContent =
      subunitX.index === subunitY.index
        ? (subunitX.entity.name ?? subunitX.entity.id.toString())
        : `${subunitY.entity.id} / ${subunitY.entity.id}`;

    region.addEventListener("click", () => {
      this._select(region);
      this._root.dispatchEvent(
        new CustomEvent<RegionSelection<S>>("pv-select-region", {
          bubbles: true,
          detail: { subunitX: subunitX, subunitY: subunitY },
        }),
      );
    });

    return region;
  }

  private _select(region: SVGGElement | undefined) {
    this._selected?.classList.remove("pv-region-selected");
    region?.classList.add("pv-region-selected");
    this._selected = region;
  }

  public resetSelection() {
    this._select(undefined);
  }
}

// indices of subunits joined by "-"
type PatternKey = string;
type PatternMap = Map<PatternKey, SVGPatternElement>;

export type RegionSelectionEvent = CustomEvent<RegionSelection>;

export interface RegionSelection<S extends Subunit = Subunit> {
  subunitX: Subunit;
  subunitY: Subunit;
}
