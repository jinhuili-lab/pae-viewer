import { Subunit } from "./types.js";
import { Utils } from "./utils.js";
import { SvgUtils } from "./svg-utils.js";

/**
 * Adds the axes to the PAE matrix, including labeled ticks and subunit labels.
 */
export class Axes<S extends Subunit = Subunit> extends EventTarget {
  private readonly _tickLength = 0.02;

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
      <g class="pv-sequence-ticks"></g>
      <g class="pv-unit-ticks"></g>
      <g class="pv-unit-tick-labels"></g>
      <g class="pv-sequence-tick-labels"></g>
    </svg>
  `,
  ).querySelector("svg")!;

  private readonly _root: SVGGElement;

  public constructor(root: SVGGElement, subunits: S[]) {
    super();
    this._root = root;

    this._addTicks(
      this._template.querySelector(".pv-unit-ticks")!,
      subunits,
      1,
    );
    this._root.replaceChildren(...this._template.children);
  }

  private _addTicks(root: SVGGElement, subunits: Subunit[], interval: number) {
    const axes = ["x", "y"] as unknown as [Axis, Axis];
    const total = Utils.sum(subunits.map((subunit) => subunit.length));

    for (let [axis, subunit] of Utils.cartesian2(axes, subunits)) {
      const isLast = subunit.index !== subunits.length - 1;

      root.appendChild(
        this._createTick(
          axis,
          (subunit.offset + subunit.length) / total,
          `${subunit.length}${isLast ? "" : " / 0"}`,
          this._tickLength,
          "pv-divider-tick",
        ),
      );

      for (let value of Utils.range(
        interval,
        subunit.length - 0.1 * interval,
        interval,
      )) {
        console.log(subunit.offset, value);

        root.appendChild(
          this._createTick(
            axis,
            (subunit.offset + value) / total,
            value.toString(),
            this._tickLength,
            "pv-unit-tick",
          ),
        );
      }
    }
  }

  private _createTick(
    axis: Axis,
    position: number,
    label: string,
    length: number,
    cssClass?: string,
  ) {
    const otherAxis = axis === "x" ? "y" : "x";
    const classes = ["pv-tick", `pv-tick-${axis}`];

    if (cssClass) {
      classes.push(cssClass);
    }

    return SvgUtils.createElement("line", {
      classes: classes,
      attributes: {
        [`${axis}1`]: Utils.toPercentage(position),
        [`${axis}2`]: Utils.toPercentage(position),
        [`${otherAxis}1`]: "0",
        [`${otherAxis}2`]: Utils.toPercentage(-length),
      },
    });

    // const labelCoords = [ratio, -length];
    //
    // rootTick.appendChild(tick);
    // this.#addTickLabel(
    //   labelsRoot,
    //   ...(axis === "x" ? labelCoords : labelCoords.reverse()),
    //   text !== null ? text : value,
    //   anchor,
    //   baseline,
    // );
  }

  // #addTickLabel(
  //   root,
  //   x,
  //   y,
  //   text,
  //   anchor,
  //   baseline,
  //   addBackground = true,
  //   params = {},
  //   backgroundParams = {},
  // ) {
  //   const fontSize = this.#style.elements.ticks.fontSize;
  //
  //   const label = Utils.createSVG("text", "pv-tick-label", {
  //     x: Utils.toPercentage(x),
  //     y: Utils.toPercentage(y),
  //     "text-anchor": anchor,
  //     "dominant-baseline": baseline,
  //     "font-size": fontSize * this.#viewBox.height,
  //     "font-family": this.#style.general.fontFamily,
  //     ...params,
  //   });
  //   label.textContent = text;
  //   root.appendChild(label);
  //
  //   if (addBackground) {
  //     const background = this.#createBackgroundBox(
  //       label.getBBox(),
  //       0.1 * fontSize,
  //       0,
  //       backgroundParams,
  //     );
  //     root.insertBefore(background, label);
  //   }
  // }

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
