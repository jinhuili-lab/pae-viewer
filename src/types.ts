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

/**
 * A token is a single element in the sequence of entities which is scored by
 * the PAE. It represents a residue in proteins, a nucleotide for nucleic acids
 * (DNA / RNA), and a heavy atom (= not hydrogen) for ligands and
 * post-translational modifications.
 */
export interface Token {
  symbol: string;
  name?: string;
}

export interface Entity<T extends Token = Token> {
  id: string | number;
  name?: string;
  sequence: T[];
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
  entityId: E["id"];
  index: number;
}

export interface CrosslinkedResidue {}

export interface RelativeIndex<
  T extends Token = Token,
  E extends Entity<T> = Entity<T>,
> {
  subunit: Subunit<E>;
  token: T;
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
export type IndexType = RelativeIndex | AbsoluteIndex | number;

export interface IndexArea<I extends IndexType> {
  x1: I;
  y1: I;
  x2: I;
  y2: I;
}

export interface Point<I extends IndexType> {
  x: number;
  y: number;
}

export interface Interval<I extends IndexType> {
  start: I;
  end: I;
}
