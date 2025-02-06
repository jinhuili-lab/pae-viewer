export class Utils {
  public static createRandomId(prefix: string = ""): string {
    if (prefix) {
      prefix += "-";
    }

    return prefix + Math.random().toString(36).slice(2);
  }

  public static positiveModulo(x: number, n: number): number {
    return ((x % n) + n) % n;
  }

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

  public static async fetchDSV(
    url: string,
    columns: string[] | null = null,
    sep: string = "\t",
  ): Promise<Map<string, string>[]> {
    return fetch(url)
      .then((response) => response.text())
      .then((text) => Utils.readDSV(text, columns, sep));
  }

  /**
   * Partition an iterable based on a condition.
   *
   * @param iter iterable
   * @param doesConditionHold callable taking single argument and
   *                          outputting boolean
   * @returns {*} array of two arrays, the first one containing the
   *              elements for which the condition holds, the second one
   *              containing the rest
   */
  // based on https://codereview.stackexchange.com/a/162879
  public static partitionOn<T>(
    iter: T[],
    doesConditionHold: (value: T) => boolean,
  ): [T[], T[]] {
    return iter.reduce(
      (result, element) => {
        result[doesConditionHold(element) ? 0 : 1].push(element);
        return result;
      },
      [[] as T[], [] as T[]],
    );
  }

  public static createSVG(
    type: string,
    cssClass: string | string[] | null = null,
    attributes: Record<string, any> = {},
  ): SVGElement {
    const el = document.createElementNS("http://www.w3.org/2000/svg", type);

    if (cssClass !== null) {
      if (typeof cssClass === "string") {
        el.classList.add(cssClass);
      } else {
        // multiple classes
        el.classList.add(...cssClass);
      }
    }
    Utils.setAttributes(el, attributes);

    return el;
  }

  public static setAttributes(
    element: Element,
    params: Record<string, any>,
  ): void {
    for (const [attribute, value] of Object.entries(params)) {
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

  /**
   * Creates bicolored, striped CSS gradient.
   *
   * @param {string} colorHex1
   * @param {string}  colorHex2
   * @param {number} opacity
   * @param {number} width
   * @returns {string}
   */
  public static createStripes(
    colorHex1: string,
    colorHex2: string,
    opacity: number,
    width: number = 0.3,
  ): string {
    const opacityHex = Math.round(opacity * 255).toString(16);
    const rgba1 = colorHex1 + opacityHex;
    const rgba2 = colorHex2 + opacityHex;

    return (
      `repeating-linear-gradient(` +
      `-45deg, ${rgba1}, ${rgba1} ${width}em,` +
      ` ${rgba2} ${width}em, ${rgba2} ${2 * width}em` +
      `)`
    );
  }

  public static cumsum(values: number[]): number[] {
    let sum = 0;
    return values.map((value) => (sum += value));
  }

  public static readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  public static getFileExtension(file: File): string {
    return file.name.split(".").pop()!;
  }

  public static *range(start: number, end: number, step = 1): Generator<number> {
    for (let i = start; i < end; i += step) {
      yield i;
    }
  }
}
