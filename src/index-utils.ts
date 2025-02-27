import { Utils } from "./utils.js";
import {
  AbsoluteIndex,
  Entity,
  IndexArea,
  Point,
  RelativeIndex,
  Token,
  Subunit,
} from "./types.js";

export class IndexUtils {
  public static getAbsoluteIndex<
    T extends Token = Token,
    E extends Entity<T> = Entity<T>,
  >(relative: RelativeIndex<T, E>): AbsoluteIndex {
    return relative.subunit.offset + relative.index;
  }

  public static getAbsoluteRange<
    T extends Token = Token,
    E extends Entity<T> = Entity<T>,
  >(relative: IndexArea<RelativeIndex<T, E>>): IndexArea<AbsoluteIndex> {
    return {
      x1: IndexUtils.getAbsoluteIndex(relative.x1),
      y1: IndexUtils.getAbsoluteIndex(relative.y1),
      x2: IndexUtils.getAbsoluteIndex(relative.x2),
      y2: IndexUtils.getAbsoluteIndex(relative.y2),
    };
  }

  public static getAbsoluteIndexFromFraction(
    value: number,
    totalLength: number,
  ): number {
    return Utils.clamp(Math.floor(value * totalLength), 0, totalLength - 1);
  }

  public static getAbsoluteRangeFromPoint(
    totalLength: number,
    point: Point<number>,
  ): IndexArea<AbsoluteIndex> {
    const x = IndexUtils.getAbsoluteIndexFromFraction(point.x, totalLength);
    const y = IndexUtils.getAbsoluteIndexFromFraction(point.y, totalLength);
    return { x1: x, y1: y, x2: x, y2: y };
  }

  public static getAbsoluteRangeFromPoints(
    totalLength: number,
    start: Point<number>,
    end: Point<number>,
  ): IndexArea<AbsoluteIndex> {
    const [x1, x2] = [start.x, end.x]
      .sort()
      .map((value) =>
        IndexUtils.getAbsoluteIndexFromFraction(value, totalLength),
      );

    const [y1, y2] = [start.y, end.y]
      .sort()
      .map((value) =>
        IndexUtils.getAbsoluteIndexFromFraction(value, totalLength),
      );

    return { x1, y1, x2, y2 };
  }

  public static getRelativeIndex<
    T extends Token = Token,
    E extends Entity<T> = Entity<T>,
  >(absolute: AbsoluteIndex, subunits: Subunit<E>[]): RelativeIndex<T, E> {
    const subunit = subunits.find(
      (subunit) =>
        subunit.offset <= absolute &&
        subunit.offset + subunit.length > absolute,
    )!;
    const index = absolute - subunit.offset;

    return {
      subunit: subunit,
      token: subunit.entity.sequence[index],
      index: index,
    };
  }

  public static getRelativeRange<
    T extends Token = Token,
    E extends Entity<T> = Entity<T>,
  >(
    absolute: IndexArea<AbsoluteIndex>,
    subunits: Subunit<E>[],
  ): IndexArea<RelativeIndex<T, E>> {
    return {
      x1: IndexUtils.getRelativeIndex(absolute.x1, subunits),
      y1: IndexUtils.getRelativeIndex(absolute.y1, subunits),
      x2: IndexUtils.getRelativeIndex(absolute.x2, subunits),
      y2: IndexUtils.getRelativeIndex(absolute.y2, subunits),
    };
  }
}
