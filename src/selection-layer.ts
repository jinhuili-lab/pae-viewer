import { Subunit } from "./types.js";
import { Utils } from "./utils.js";
import { StyleUtils } from "./style-utils.js";
import { SvgUtils } from "./svg-utils.js";

/**
 * Handles selections of areas of the PAE matrix.
 */
export class SelectionLayer<S extends Subunit = Subunit> extends EventTarget {
  private readonly _root: SVGGElement;

  public constructor(root: SVGGElement, subunits: S[]) {
    super();
    this._root = root;
    this._root.replaceChildren();
  }
}
