export interface PaeInput<
  E extends Entity = Entity,
  C extends Crosslink = Crosslink,
> {
  pae: Pae;
  entities: E[];
  crosslinks: C[];
}

export interface PaeData<
  E extends Entity = Entity,
  C extends Crosslink = Crosslink,
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

export interface Crosslink<E extends Entity = Entity> {
  source: RelativeIndex<E>;
  target: RelativeIndex<E>;
}

export interface RelativeIndex<E extends Entity = Entity> {
  entity: Entity;
  index: number;
}

export type RgbColor = [number, number, number];

/** Takes a value from 0 to 1 and returns an RGB color. */
export type LinearColorScale = (value: number) => RgbColor;

export type EntityColorScale<E extends Entity> = (
  Entity: E,
  index: number,
) => string;
