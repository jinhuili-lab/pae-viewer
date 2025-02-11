import { Pae } from "./types.js";

/**
 * Utility functions to determine if a given PAE value is valid
 * (N * N matrix of numbers >= 0 with N > 0).
 */
export class PaeUtils {
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
        if (!(typeof value === "number" && !isNaN(value)) || value < 0) {
          throw Error(
            `The PAE values must be numbers >= 0, but column ` +
              ` ${columnIndex} in row ${rowIndex} contained` +
              ` '${JSON.stringify(value)}'!`,
          );
        }
      }
    }

    return pae as Pae;
  }
}
