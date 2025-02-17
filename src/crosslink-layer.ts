import { Crosslink, CrosslinkedResidue } from "./types.js";

/**
 * Displays crosslink markers and handles their selection.
 */
export class CrosslinkLayer<
  C extends Crosslink<CrosslinkedResidue> = Crosslink<CrosslinkedResidue>,
> extends EventTarget {
  private readonly _root: SVGGElement;

  public constructor(root: SVGGElement, crosslinks: C[]) {
    super();
    this._root = root;
    this._root.replaceChildren();
  }
}
