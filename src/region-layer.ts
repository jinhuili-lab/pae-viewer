import { Entity, EntityColorScale, PaeData } from "./types.js";
import { Utils } from "./utils.js";
import { StyleUtils } from "./style-utils.js";

export class RegionLayer<E extends Entity = Entity> {
  private readonly _defs: SVGDefsElement = Utils.fromHtml(
    `
    <defs>
      <pattern id="pv-stripes-template" patternUnits="userSpaceOnUse"
               width="2%" height="2%" patternTransform="rotate(45)">
        <rect x="0" y="0"></rect>
        <line x1="0" y1="0" x2="0" y2="2%" stroke-width="2%" />
      </pattern>
    </defs>
  `,
  ).querySelector("defs")!;

  public constructor(
    root: SVGGElement,
    paeData: PaeData<E>,
    colorScale: EntityColorScale<E>,
  ) {
    const patterns = this._createPatterns(
      paeData.entities,
      this._defs.querySelector("pattern")!,
      colorScale,
    );

    this._defs.append(...patterns);

    root.appendChild(this._defs);
  }

  private _getPatternId(i: number, j: number): string {
    return `stripes-${[i, j].sort().join("-")}`;
  }

  private _createPatterns(
    entities: E[],
    template: SVGPatternElement,
    colorScale: EntityColorScale<E>,
  ): SVGPatternElement[] {
    const ids = entities.map((subunit) => subunit.id);
    let patterns: SVGPatternElement[] = [];

    // create stripe patterns for individual regions
    const getPatternId = (i: number, j: number) =>
      `stripes-${[i, j]
        .sort()
        .map((x) => ids[x])
        .join("-")}`;

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const pattern = template.cloneNode(true) as SVGPatternElement;
        pattern
          .querySelector("rect")!
          .setAttribute(
            "fill",
            StyleUtils.getVariableValue(entities[i].id.toString()),
          );
        pattern
          .querySelector("line")!
          .setAttribute(
            "stroke",
            StyleUtils.getVariableValue(entities[j].id.toString()),
          );
        pattern.setAttribute("id", getPatternId(i, j));
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private _createRegion(entityX: E, offsetX: number, entityY: E, offsetY: number) {
    const region = Utils.createSvgElement("g", { classes: ["pv-region"] });
    const lengthX = entityX.sequence.length;
    const lengthY = entityY.sequence.length;

    const background = Utils.createSvgElement("rect", {
      attributes: {
        x: Utils.toPercentage(offsetX),
        y: Utils.toPercentage(offsetY),
        width: Utils.toPercentage(lengthX),
        height: Utils.toPercentage(lengthY),
      },
    });

    region.appendChild(background);

    const label = Utils.createSvgElement("text", {
      attributes: {
        x: Utils.toPercentage(offsetX + lengthX / 2),
        y: Utils.toPercentage(offsetY + lengthY / 2),
      },
    });

    return region;
  }

  public render(): void {
    // Render the region layer
  }
}

export interface RegionSelection<E extends Entity = Entity> {
  meanPae: number;
  entityX: E;
  entityY: E;
}
