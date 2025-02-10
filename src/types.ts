export interface Residue {
  symbol: string;
  name?: string;
}

export interface Entity<R extends Residue = Residue> {
  id: any;
  name?: string;
  sequence: R[];
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
export type PaeColorScale = (value: number) => RgbColor;

export type EntityColorScale<E extends Entity> = (Entity: E, index: number) => string;
