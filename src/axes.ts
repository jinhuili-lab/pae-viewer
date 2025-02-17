import { Subunit } from "./types.js";

/**
 * Adds the axes to the PAE matrix, including labeled ticks and subunit labels.
 */
export class Axes<S extends Subunit = Subunit> extends EventTarget {
  private readonly _root: SVGGElement;

  public constructor(root: SVGGElement, subunits: S[]) {
    super();
    this._root = root;
    this._root.replaceChildren();
  }
}
