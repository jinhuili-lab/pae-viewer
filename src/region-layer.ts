import { Subunit } from "./types.js";
import { Utils } from "./utils.js";
import { StyleUtils } from "./style-utils.js";
import { SvgUtils } from "./svg-utils.js";

/**
 * A layer that displays regions between entities. Regions refer to the
 * intersection of two entities in the PAE matrix (or the intersection of one
 * entity with itself).
 */
export class RegionLayer<S extends Subunit = Subunit> extends EventTarget {
  private readonly _defs: SVGDefsElement = Utils.fromHtml(
    `
    <svg xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="pv-stripes-template" patternUnits="userSpaceOnUse"
                 width="2%" height="2%" patternTransform="rotate(45)">
          <rect x="0" y="0" width="2%" height="2%"></rect>
          <line x1="0" y1="0" x2="0" y2="2%" stroke-width="2%" />
        </pattern>
      </defs>
    </svg>
  `,
  ).querySelector("defs")!;

  private readonly _root: SVGGElement;
  private _selected: SVGGElement | undefined;

  public constructor(root: SVGGElement, subunits: S[]) {
    super();
    this._root = root;
    this._root.replaceChildren();

    const patterns = this._createPatterns(
      subunits,
      this._defs.querySelector("pattern")!,
    );

    this._defs.append(...patterns.values());
    this._root.appendChild(this._defs);

    this._addRegions(this._root, subunits, patterns);
    this.show(false);
  }

  private _createPatterns(
    subunits: S[],
    template: SVGPatternElement,
  ): PatternMap {
    const patterns: PatternMap = new Map();

    // create stripe patterns for individual regions
    const getPatternId = (i: number, j: number) =>
      `stripes-${this._getPatternKey(subunits[i], subunits[j])}`;

    for (let i = 0; i < subunits.length; i++) {
      for (let j = i + 1; j < subunits.length; j++) {
        const pattern = template.cloneNode(true) as SVGPatternElement;

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

  private _addRegions(
    root: SVGElement,
    subunits: S[],
    patterns: PatternMap,
  ): SVGGElement[] {
    const total = Utils.sum(subunits.map((subunit) => subunit.length));

    return Array.from(Utils.cartesian2(subunits, subunits)).map(
      ([subunitX, subunitY]) =>
        this._addRegion(
          root,
          subunitX,
          subunitY,
          total,
          patterns.get(this._getPatternKey(subunitX, subunitY))?.id,
        ),
    );
  }

  private _addRegion(
    root: SVGElement,
    subunitX: S,
    subunitY: S,
    totalLength: number,
    patternId?: string,
  ) {
    const region = SvgUtils.createElement("g", { classes: ["pv-region"] });

    const background = SvgUtils.createElement("rect", {
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

    // needs to be added to the root element for `getBBox` for label background
    // to work
    root.appendChild(region);

    this._addLabel(region, subunitX, subunitY, totalLength);

    region.addEventListener("click", () => {
      this._select(region);
      this.dispatchEvent(
        new CustomEvent<RegionSelection<S>>("pv-select-region", {
          bubbles: true,
          detail: { subunitX: subunitX, subunitY: subunitY },
        }) satisfies RegionSelectionEvent,
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

  private _getSubunitName(subunit: S): string {
    return subunit.entity.name ?? subunit.entity.id.toString();
  }

  private _addLabel(
    root: SVGElement,
    subunitX: S,
    subunitY: S,
    totalLength: number,
  ) {
    const label = this._createLabelText(subunitX, subunitY);

    label.classList.add("pv-region-label");
    Utils.setAttributes(label, {
      x: Utils.toPercentage(
        (subunitX.offset + subunitX.length / 2) / totalLength,
      ),
      y: Utils.toPercentage(
        (subunitY.offset + subunitY.length / 2) / totalLength,
      ),
    });

    root.appendChild(label);
    label.prepend(
      SvgUtils.createBox(
        SvgUtils.getCombinedBox(...(label.children as any as SVGTextElement[])),
        0,
        { classes: ["pv-background-box"] },
      ),
    );

    return label;
  }

  private _createLabelText(subunitX: S, subunitY: S): SVGGElement {
    if (subunitX.index === subunitY.index) {
      return SvgUtils.createMultilineText([this._getSubunitName(subunitX)]);
    } else {
      if (subunitX.length >= subunitY.length) {
        // horizontal layout
        return SvgUtils.createMultilineText([
          `${this._getSubunitName(subunitX)} / ${this._getSubunitName(subunitY)}`,
        ]);
      } else {
        // vertical layout
        return SvgUtils.createMultilineText([
          this._getSubunitName(subunitX),
          "/",
          this._getSubunitName(subunitY),
        ]);
      }
    }
  }

  public show(show: boolean) {
    this._root.style.visibility = show ? "visible" : "hidden";
  }

  private _createLabelBox(
    label: SVGTextElement,
    horizontalPadding = 0,
    verticalPadding = 0,
    params = {},
  ) {
    const box = label.getBBox();

    return SvgUtils.createElement("rect", {
      classes: ["pv-region-label-box"],
      attributes: {
        x: box.x - horizontalPadding,
        y: box.y - verticalPadding,
        width: box.width + 2 * horizontalPadding,
        height: box.height + 2 * verticalPadding,
      },
    });
  }
}

// indices of subunits joined by "-"
type PatternKey = string;
type PatternMap = Map<PatternKey, SVGPatternElement>;

export type RegionSelectionEvent<S extends Subunit = Subunit> = CustomEvent<
  RegionSelection<S>
>;

export interface RegionSelection<S extends Subunit = Subunit> {
  subunitX: S;
  subunitY: S;
}
