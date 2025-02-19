import { Utils } from "./utils.js";
import {
  AbsoluteIndex,
  Entity,
  IndexRange,
  Point,
  RelativeIndex,
  Residue,
  Subunit,
} from "./types.js";

export class IndexUtils {
  public static getAbsoluteIndex<
    R extends Residue = Residue,
    E extends Entity<R> = Entity<R>,
  >(relative: RelativeIndex<R, E>): AbsoluteIndex {
    return relative.subunit.offset + relative.index;
  }

  public static getAbsoluteRange<
    R extends Residue = Residue,
    E extends Entity<R> = Entity<R>,
  >(relative: IndexRange<RelativeIndex<R, E>>): IndexRange<AbsoluteIndex> {
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
    point: Point,
  ): IndexRange<AbsoluteIndex> {
    const x = IndexUtils.getAbsoluteIndexFromFraction(point.x, totalLength);
    const y = IndexUtils.getAbsoluteIndexFromFraction(point.y, totalLength);
    return { x1: x, y1: y, x2: x, y2: y };
  }

  public static getAbsoluteRangeFromPoints(
    totalLength: number,
    start: Point,
    end: Point,
  ): IndexRange<AbsoluteIndex> {
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
    R extends Residue = Residue,
    E extends Entity<R> = Entity<R>,
  >(absolute: AbsoluteIndex, subunits: Subunit<E>[]): RelativeIndex<R, E> {
    const subunit = subunits.find(
      (subunit) =>
        subunit.offset <= absolute &&
        subunit.offset + subunit.length > absolute,
    )!;
    const index = absolute - subunit.offset;

    return {
      subunit: subunit,
      residue: subunit.entity.sequence[index],
      index: index,
    };
  }

  public static getRelativeRange<
    R extends Residue = Residue,
    E extends Entity<R> = Entity<R>,
  >(
    absolute: IndexRange<AbsoluteIndex>,
    subunits: Subunit<E>[],
  ): IndexRange<RelativeIndex<R, E>> {
    return {
      x1: IndexUtils.getRelativeIndex(absolute.x1, subunits),
      y1: IndexUtils.getRelativeIndex(absolute.y1, subunits),
      x2: IndexUtils.getRelativeIndex(absolute.x2, subunits),
      y2: IndexUtils.getRelativeIndex(absolute.y2, subunits),
    };
  }
}
