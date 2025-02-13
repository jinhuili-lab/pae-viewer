export interface PaeInput<
  E extends Entity = Entity,
  C extends Crosslink<CrosslinkIndex<E>> = Crosslink<CrosslinkIndex<E>>,
> {
  pae: Pae;
  entities: E[];
  crosslinks: C[];
}

export interface PaeData<
  E extends Entity = Entity,
  C extends Crosslink<CrosslinkIndex<E>> = Crosslink<CrosslinkIndex<E>>,
> {
  pae: Pae;
  subunits: Subunit<E>[];
  crosslinks: C[];
}

export type Pae = number[][];

export interface Residue {
  symbol: string;
  name?: string;
}

export interface Entity<R extends Residue = Residue> {
  id: string | number;
  name?: string;
  sequence: R[];
}

export interface Subunit<E extends Entity = Entity> {
  entity: E;
  index: number;
  length: number;
  offset: number;
  color: string;
}

export interface Crosslink<T> {
  source: T;
  target: T;
}

export interface CrosslinkIndex<E extends Entity = Entity> {
  entityId: E['id'];
  index: number;
}

export interface CrosslinkedResidue {

}

export interface RelativeIndex<
  R extends Residue = Residue,
  E extends Entity<R> = Entity<R>,
> {
  subunit: Subunit<E>;
  residue: R;
  index: number;
}

export type RgbColor = [number, number, number];

/** Takes a value from 0 to 1 and returns an RGB color. */
export type LinearColorScale = (value: number) => RgbColor;

export type EntityColorScale<E extends Entity> = (
  Entity: E,
  index: number,
) => string;


export type AbsoluteIndex = number;

export interface IndexRange<I extends RelativeIndex | AbsoluteIndex> {
  x1: I;
  y1: I;
  x2: I;
  y2: I;
}
