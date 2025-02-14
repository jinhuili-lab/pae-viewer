import { Utils } from "./utils.js";

export class SvgUtils {
  public static createSvgElement<K extends keyof SVGElementTagNameMap>(
    name: K,
    options?: ElementOptions<SVGElementTagNameMap[K]>,
  ): SVGElementTagNameMap[K] {
    const element = document.createElementNS(
      "http://www.w3.org/2000/svg",
      name,
    );

    options?.root?.appendChild(element);

    if (options?.classes) {
      element.classList.add(...options?.classes);
    }

    if (options?.attributes) {
      Utils.setAttributes(element, options?.attributes);
    }

    if (options?.textContent) {
      element.textContent = options.textContent;
    }

    return element;
  }

  public static createMultilineText(
    lines: string[],
    verticalGapFactor: number = 1,
    options: ElementOptions<SVGTextElement> = {},
  ): SVGSVGElement {
    const group = SvgUtils.createSvgElement("svg", {
      attributes: { overflow: "visible" },
    });

    group.append(
      ...lines.map((line, i) => {
        return SvgUtils.createSvgElement("text", {
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
}

export interface ElementOptions<E extends Element = Element> {
  root?: Element;
  id?: string;
  classes?: string[];
  attributes?: Partial<Record<keyof E | string, any>>;
  textContent?: string;
}
