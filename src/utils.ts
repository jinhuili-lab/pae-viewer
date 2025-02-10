export class Utils {
  public static splitLines(text: string): string[] {
    return text.split(/\r?\n/);
  }

  /**
   * Create table (arrays of rows as Maps) from DSV
   * (Delimiter-Separated Values) string (multiple lines).
   *
   * @param dsv string in DSV format
   * @param headers array of column names; if null, treat first row as
   *                column names
   * @param sep separator character
   * @returns {*}
   */
  public static readDSV(
    dsv: string,
    headers: string[] | null = null,
    sep: string = "\t",
  ): Map<string, string>[] {
    let rows = Utils.splitLines(dsv)
      .filter((line) => line !== "")
      .map((line) => line.split(sep));

    if (headers === null) {
      headers = rows[0];
      rows = rows.slice(1);
    }

    for (const [i, row] of rows.entries()) {
      if (row.length !== headers.length) {
        throw {
          name: "MalformattedDsvRow",
          message:
            `Malformatted DSV: while parsing a DSV with` +
            ` ${headers.length} headers (${headers.join(",")}), row` +
            ` {i} (${row.join(",")}) had wrong number of fields` +
            ` (${row.length})!`,
          headers: headers,
          separator: sep,
          row: row,
          index: i,
        };
      }
    }

    return rows.map(
      (row) => new Map(row.map((value, i) => [headers[i], value])),
    );
  }

  public static setAttributes<E extends Element = Element>(
    element: E,
    attributes: Partial<E> & Record<string, any>,
  ): void {
    for (const [attribute, value] of Object.entries(attributes)) {
      element.setAttribute(attribute, value);
    }
  }

  public static toPercentage(value: number): string {
    return `${value * 100}%`;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/
  //  Global_Objects/Array/Reduce#sum_of_values_in_an_object_array
  public static sum(array: number[]): number {
    return array.reduce((previous, current) => previous + current, 0);
  }

  /** Return arithmetic mean of values. */
  public static mean(array: number[]): number {
    return array.reduce((a, b) => a + b, 0) / array.length;
  }

  public static clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Iterates over pairs of elements of iterable.
   *
   * Source: https://stackoverflow.com/a/54458643
   *
   * @param iterable
   * @returns {Generator<unknown[], void, *>}
   */
  public static *pairwise<T>(iterable: Iterable<T>): Generator<[T, T]> {
    const iterator = iterable[Symbol.iterator]();
    let current = iterator.next();
    let next = iterator.next();
    while (!next.done) {
      yield [current.value, next.value];
      current = next;
      next = iterator.next();
    }
  }

  /**
   * Returns generator for the cartesian product of multiple
   * arrays.
   *
   * Source: https://stackoverflow.com/a/44012184
   */
  public static *cartesian(head: any[], ...tail: any[][]): Generator<any[]> {
    const remainder =
      tail.length > 0 ? Utils.cartesian(tail[0], ...tail.slice(1)) : [[]];
    for (let r of remainder) for (let h of head) yield [h, ...r];
  }

  public static cumsum(values: number[]): number[] {
    let sum = 0;
    return values.map((value) => (sum += value));
  }

  public static *range(
    start: number,
    end: number,
    step = 1,
  ): Generator<number> {
    for (let i = start; i < end; i += step) {
      yield i;
    }
  }

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

    return element;
  }

  public static createDiagonalGradient(
    id: string,
    startColor: string,
    endColor: string,
  ) {
    const gradient = Utils.createSvgElement("linearGradient", {
      id: id,
      attributes: {
        gradientTransform: "rotate(45 0.5 0.5)",
      },
    });

    for (const [offset, stopColor] of [
      ["0%", startColor],
      ["50%", startColor],
      ["50%", endColor],
      ["100%", endColor],
    ]) {
      Utils.createSvgElement("stop", {
        attributes: {
          offset: offset,
          ["stop-color" as keyof SVGStopElement]: stopColor,
        },
      });
    }

    return gradient;
  }
}

export interface ElementOptions<E extends Element = Element> {
  root?: Element;
  id?: string;
  classes?: string[];
  attributes?: Partial<Record<keyof E | string, any>>;
}
