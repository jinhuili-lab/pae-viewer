import { Pae } from "./types.js";
import { Utils } from "./utils.js";

/**
 * Utility functions to determine if a given PAE value is valid
 * (N * N matrix of numbers in [0, 31.75] with N > 0)
 */
export class PaeUtils {
  public static readonly MAX_PAE = 31.75;

  /** Returns true if PAE value is valid, otherwise false. */
  public static isValid(pae: any): pae is Pae {
    try {
      PaeUtils.validated(pae);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns input PAE value if it is valid, otherwise throws an error.
   */
  public static validated(pae: any): Pae {
    if (!Array.isArray(pae)) {
      throw Error(
        "The PAE value must be an N*N array of numbers!" +
          " However, the PAE value is not an array!",
      );
    }

    length = pae.length;

    if (length === 0) {
      throw Error("The PAE array can't be empty!");
    }

    for (const [rowIndex, row] of pae.entries()) {
      if (!Array.isArray(row)) {
        throw Error(
          `The PAE value must be an N*N array of numbers! However, row` +
            ` ${rowIndex} is not an array!`,
        );
      }

      if (row.length !== length) {
        throw Error(
          `The PAE value must be an N*N array of  numbers! However, the` +
            ` number of columns (${row.length}) in row ${rowIndex} does` +
            ` not match number of rows (${length})!`,
        );
      }

      for (const [columnIndex, value] of row.entries()) {
        if (
          !(typeof value === "number" && !isNaN(value)) ||
          value < 0 ||
          value > PaeUtils.MAX_PAE
        ) {
          throw Error(
            `The PAE values must be numbers in [0, ${PaeUtils.MAX_PAE}],` +
              ` but column ${columnIndex} in row ${rowIndex} contained` +
              ` '${JSON.stringify(value)}'!`,
          );
        }
      }
    }

    return pae as Pae;
  }

  /**
   * Returns a submatrix of the given PAE matrix. The submatrix is defined by
   * the coordinates (x1, y1) and (x2, y2) where x refers to a column index and
   * y to a row index. The end coordinates are inclusive.
   */
  public static getSubmatrix(
    pae: number[][],
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number[][] {
    if (y2 < 0 || y2 >= pae.length) {
      throw Error(`y2 must be in the range [0, ${pae.length}]!`);
    }

    if (y1 < 0 || y1 >= pae.length || y1 > y2) {
      throw Error(`y1 must be in the range [0, y2 (${y2})])!`);
    }

    if (x2 < 0) {
      throw Error("x2 must be greater than or equal to 0!");
    }

    if (x1 < 0 || x1 > x2) {
      throw Error(`x1 must be in the range [0, x2 (${x2})]!`);
    }

    const slice = [];

    for (let y = y1; y <= y2; y++) {
      const row = pae[y];

      if (x2 >= row.length) {
        throw Error(`x2 must be in the range [0, ${row.length}]!`);
      }

      if (x1 >= row.length) {
        throw Error(`x1 must be in the range [0, ${row.length})!`);
      }

      slice.push(row.slice(x1, x2 + 1));
    }

    return slice;
  }

  public static getMean(pae: number[][]): number {
    return Utils.sum(pae.flat()) / (pae.length * pae[0].length);
  }
}
