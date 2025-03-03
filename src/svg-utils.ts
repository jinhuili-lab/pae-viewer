import { Utils } from "./utils.js";

export class SvgUtils {
  public static createElement<K extends keyof SVGElementTagNameMap>(
    name: K,
    options?: ElementOptions<SVGElementTagNameMap[K]>,
  ): SVGElementTagNameMap[K] {
    const element = document.createElementNS(
      "http://www.w3.org/2000/svg",
      name,
    );

    options?.root?.appendChild(element);

    if (options?.id) {
      element.id = options.id;
    }

    if (options?.classes) {
      element.classList.add(...options?.classes);
    }

    if (options?.attributes) {
      Utils.setAttributes(element, options?.attributes);
    }

    if (options?.textContent) {
      element.textContent = options.textContent;
    }

    if (options?.children) {
      element.append(...options.children);
    }

    return element;
  }

  public static createMultilineText(
    lines: string[],
    verticalGapFactor: number = 1,
    options: ElementOptions<SVGTextElement> = {},
  ): SVGSVGElement {
    const group = SvgUtils.createElement("svg", {
      attributes: { overflow: "visible" },
    });

    group.append(
      ...lines.map((line, i) => {
        return SvgUtils.createElement("text", {
          attributes: {
            x: 0,
            y: `${i * verticalGapFactor - ((lines.length - 1) * verticalGapFactor) / 2}em`,
          },
          textContent: line,
          ...options,
        });
      }),
    );

    return group;
  }

  public static getBlob(element: SVGElement): Blob {
    return new Blob([element.outerHTML], {
      type: "image/svg+xml;charset=utf-8",
    });
  }

  public static createBox(
    rect: Rect,
    padding: number | Partial<Bounds> = 0,
    options: ElementOptions<SVGRectElement> = {},
  ): SVGRectElement {
    const { x, y, width, height } = rect;
    const {
      top = 0,
      right = 0,
      bottom = 0,
      left = 0,
    } = typeof padding === "number"
      ? { top: padding, right: padding, bottom: padding, left: padding }
      : padding;

    return SvgUtils.createElement("rect", {
      ...options,
      attributes: {
        x: x - left,
        y: y - top,
        width: width + left + right,
        height: height + top + bottom,
        ...options.attributes,
      },
    });
  }

  public static addBackgroundBox(
    root: SVGElement,
    element: SVGGraphicsElement,
    padding: number | Partial<Bounds> = 0,
    options: ElementOptions<SVGRectElement> = {},
  ): SVGRectElement {
    const background = SvgUtils.createBox(element.getBBox(), padding, options);
    root.insertBefore(background, element);
    return background;
  }

  public static getCombinedBox(...elements: SVGGraphicsElement[]): Rect {
    const boxes = elements.map((element) => element.getBBox());

    const corners = {
      x0: Math.min(...boxes.map((box) => box.x)),
      y0: Math.min(...boxes.map((box) => box.y)),
      x1: Math.max(...boxes.map((box) => box.x + box.width)),
      y1: Math.max(...boxes.map((box) => box.y + box.height)),
    };

    return {
      x: corners.x0,
      y: corners.y0,
      width: corners.x1 - corners.x0,
      height: corners.y1 - corners.y0,
    };
  }

  public static createStripePattern<E>(
    id: string,
    color1: string,
    color2: string,
    width1: number = 1,
    width2: number = 1,
    angle: number = 45,
  ): SVGPatternElement {
    const size = width1 + width2;

    return SvgUtils.createElement("pattern", {
      id: id,
      attributes: {
        width: `${size}%`,
        height: `${size}%`,
        patternUnits: "userSpaceOnUse",
        patternTransform: `rotate(${angle})`,
      },
      children: [
        SvgUtils.createElement("rect", {
          attributes: {
            x: "0",
            y: "0",
            width: `${size}%`,
            height: `${size}%`,
            fill: color1,
          },
        }),
        SvgUtils.createElement("line", {
          attributes: {
            x1: "0",
            y1: "0",
            x2: "0",
            y2: `${size}%`,
            "stroke-width": `${size}%`,
            stroke: color2,
          },
        }),
      ],
    });
  }
}

export interface ElementOptions<E extends Element = Element> {
  root?: Element;
  id?: string;
  classes?: string[];
  attributes?: Partial<Record<keyof E | string, any>>;
  textContent?: string;
  children?: SVGElement[];
}

export interface Bounds {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
