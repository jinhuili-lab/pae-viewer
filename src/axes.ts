import { Subunit } from "./types.js";
import { Utils } from "./utils.js";
import { SvgUtils } from "./svg-utils.js";

/**
 * Adds the axes to the PAE matrix, including labeled ticks and subunit labels.
 */
export class Axes<S extends Subunit = Subunit> extends EventTarget {
  private readonly _defaultStyle: AxesStyle = {
    unitTickLength: 0.02,
    dividerTickLength: 0.08,
    tickLabelGap: 0.01,
    minSpacing: 0.1,
    intervalOptions: [1, 5, 10, 25, 50, 100],
    interval: (domain: number) => {
      const minInterval = domain * this._style.minSpacing;
      const options = this._style.intervalOptions;
      const maxInterval = options[options.length - 1];

      return (
        options.find((option) => option >= minInterval) ??
        Math.ceil(minInterval / maxInterval) * maxInterval
      );
    },
  };

  private _style: AxesStyle;

  private readonly _template: SVGSVGElement = Utils.fromHtml(
    `
    <svg xmlns="http://www.w3.org/2000/svg">
      <text class="pv-axis-label pv-axis-label-x" x="50%" y="-25%" >
        Scored residue / atom
      </text>
      <text class="pv-axis-label pv-axis-label-y" x="-35%" y="50%"
            transform-origin="-35% 50%" transform="rotate(-90)">
        Aligned residue / atom
      </text>
      <line class="pv-axis-x" x1="-5%" y1="0" x2="105%" y2="0"></line>
      <line class="pv-axis-y" x1="0" y1="-5%" x2="0" y2="105%"></line>
      <line class="pv-axis-diagonal" x1="0" y1="0" x2="102%" y2="102%"></line>
      <g class="pv-ticks"></g>
    </svg>
  `,
  ).querySelector("svg")!;

  private readonly _root: SVGGElement;

  public constructor(
    root: SVGGElement,
    subunits: S[],
    style: Partial<AxesStyle> = {},
  ) {
    super();
    this._root = root;
    this._style = { ...this._defaultStyle, ...style };

    this._root.replaceChildren(...this._template.children);
    this._addTicks(
      this._root.querySelector(".pv-ticks")!,
      subunits,
      this._style,
    );
  }

  private _addTicks(root: SVGGElement, subunits: Subunit[], style: AxesStyle) {
    const axes = ["x", "y"] as unknown as [Axis, Axis];
    const total = Utils.sum(subunits.map((subunit) => subunit.length));

    const interval =
      typeof style.interval === "number"
        ? style.interval
        : style.interval(total);

    for (let [axis, subunit] of Utils.cartesian2(axes, subunits)) {
      const isLast = subunit.index !== subunits.length - 1;

      this._addTick(
        root,
        axis,
        (subunit.offset + subunit.length) / total,
        `${subunit.length}${isLast ? "" : " / 0"}`,
        style.dividerTickLength,
        style.tickLabelGap,
        "pv-divider-tick",
      );

      for (let value of Utils.range(
        interval,
        subunit.length - style.minSpacing * interval,
        interval,
      )) {
        this._addTick(
          root,
          axis,
          (subunit.offset + value) / total,
          value.toString(),
          style.unitTickLength,
          style.tickLabelGap,
          "pv-unit-tick",
        );
      }
    }
  }

  private _addTick(
    root: SVGGElement,
    axis: Axis,
    value: number,
    label: string,
    tickLength: number,
    labelGap: number,
    cssClass?: string,
  ) {
    const otherAxis = axis === "x" ? "y" : "x";
    const classes = ["pv-tick", `pv-tick-${axis}`];

    if (cssClass) {
      classes.push(cssClass);
    }

    const tick = SvgUtils.createElement("line", {
      classes: classes,
      attributes: {
        [`${axis}1`]: Utils.toPercentage(value),
        [`${axis}2`]: Utils.toPercentage(value),
        [`${otherAxis}1`]: "0",
        [`${otherAxis}2`]: Utils.toPercentage(-tickLength),
      },
    });

    root.appendChild(tick);

    const coords = [value, -(tickLength + labelGap)];

    this.#addTickLabel(
      root,
      ...((axis === "x" ? coords : coords.reverse()) as [number, number]),
      label ?? value.toString(),
      axis === "x" ? "middle" : "end",
      axis === "x" ? "auto" : "central",
    );
  }

  #addTickLabel(
    root: SVGGElement,
    x: number,
    y: number,
    content: string,
    anchor: string,
    baseline: string,
    addBackground = true,
    labelClass?: string,
    backgroundClass?: string,
  ) {
    const label = SvgUtils.createElement("text", {
      classes: ["pv-tick-label", ...(labelClass ? [labelClass] : [])],
      attributes: {
        x: Utils.toPercentage(x),
        y: Utils.toPercentage(y),
        "text-anchor": anchor,
        "dominant-baseline": baseline,
      },
      textContent: content,
    });

    root.appendChild(label);

    // if (addBackground) {
    //   const background = this.#createBackgroundBox(
    //     label.getBBox(),
    //     0.1 * fontSize,
    //     0,
    //     backgroundParams,
    //   );
    //   root.insertBefore(background, label);
    // }
  }

  // private _addTicks(subunits: Subunit) {
  //   let offset = 0;
  //   let lastSubunit = null;
  //   const style = this.#style.elements;
  //   const interval = style.ticks.unitInterval;
  //
  //   this.#addTickLabel(
  //     this.#axesGroup,
  //     -style.ticks.labelGap,
  //     -style.ticks.labelGap,
  //     "0",
  //     "end",
  //     "auto",
  //     false,
  //   );
  //
  //   // add tick marks for both axes
  //   for (const [i, member] of members.entries()) {
  //     for (const axis of ["x", "y"]) {
  //       // add value ticks as multiples of interval
  //       for (
  //         let value = interval;
  //         // prevents overlap
  //         value < member.length - 0.1 * interval;
  //         value += interval
  //       ) {
  //         this.#addTick(
  //           this.#unitTicksGroup,
  //           this.#unitTickLabelsGroup,
  //           axis,
  //           value,
  //           offset,
  //           style.ticks.units.length,
  //         );
  //       }
  //
  //       // add complex subunit ticks
  //       this.#addTick(
  //         this.#sequenceTicksGroup,
  //         this.#sequenceTickLabelsGroup,
  //         axis,
  //         member.length,
  //         offset,
  //         style.ticks.subunits.length,
  //         member.length + (i < members.length - 1 ? " / 0" : ""),
  //       );
  //
  //       const labelCoords = [
  //         this.#relative(offset + member.length / 2),
  //         -style.subunitLabels.gap,
  //       ];
  //
  //       this.#addTickLabel(
  //         this.#sequenceTickLabelsGroup,
  //         ...(axis === "x" ? labelCoords : labelCoords.reverse()),
  //         member.title,
  //         ...(axis === "x" ? ["middle", "auto"] : ["end", "central"]),
  //         true,
  //         {
  //           "font-weight": style.subunitLabels.fontWeight,
  //           "font-style": style.subunitLabels.fontStyle,
  //           fill: style.subunitLabels.color,
  //         },
  //         { fill: members[i].color },
  //       );
  //     }
  //
  //     offset += member.length;
  //     lastSubunit = member.length;
  //   }
  // }
}

type Axis = "x" | "y";

export interface AxesStyle {
  unitTickLength: number;
  dividerTickLength: number;
  tickLabelGap: number;
  minSpacing: number;
  intervalOptions: number[];
  interval: number | ((domain: number) => number);
}
