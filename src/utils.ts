import { LinearColorScale, Point, RgbColor } from "./types";

export class Utils {
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

  public static fromHtml(html: string): DocumentFragment {
    return document.createRange().createContextualFragment(html);
  }

  public static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  public static lerpColors(colors: RgbColor[]): LinearColorScale {
    if (colors.length < 2) throw new Error("At least two colors are required.");

    return (value) => {
      const scaled = value * (colors.length - 1);
      const index = Math.floor(scaled);
      const t = scaled - index;
      const start = colors[index];
      const end = colors[Math.min(index + 1, colors.length - 1)];

      return [
        Math.round(start[0] + (end[0] - start[0]) * t),
        Math.round(start[1] + (end[1] - start[1]) * t),
        Math.round(start[2] + (end[2] - start[2]) * t),
      ];
    };
  }

  public static getRelativeMousePosition(event: MouseEvent): Point {
    return Utils.getMousePositionRelativeTo(event, (event.target as Element));
  }

  public static getMousePositionRelativeTo(event: MouseEvent, element: Element): Point {
    const rect = element.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) / (rect.right - rect.left),
      y: (event.clientY - rect.top) / (rect.bottom - rect.top),
    };
  }

  public static createEvent<E extends CustomEvent>(
    type: string,
    detail: E["detail"],
  ): CustomEvent<E["detail"]> {
    return new CustomEvent<E["detail"]>(type, { detail });
  }
}
