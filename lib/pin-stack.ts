/**
 * Which of a set of places actually paint their own pin.
 *
 * `placesAtSameSpot` finds every real-world cluster (places within `OVERLAP_METRES` of each other) so
 * the frontmost pin of the group can carry a "+N" badge — but MapCanvas used to render every place as
 * its own full pin regardless of clustering, so a badge's siblings still drew a second circle almost
 * exactly on top of the first. Two places 76 m apart is well inside a pin's own on-screen footprint at
 * the default zoom, so this read as broken markers, not a badge doing its job.
 *
 * A place renders only if no sibling of its cluster sits further south — MapCanvas already z-orders
 * pins that way, southernmost on top, so a place failing this check is one a sibling is already drawn
 * over. The badge and the popup's sibling list stay the only way to reach it, exactly what CLAUDE.md's
 * third rule asks for: never move a pin off its coordinate, solve the overlap another way.
 *
 * Takes `project` and `sameSpotOf` as parameters rather than importing `lib/geo`/`lib/places` — kept
 * dependency-free like `lib/frame.ts` so `tests/*.test.mjs` (plain `node --test`, no bundler) can
 * import it directly without extension-resolution trouble between two `.ts` files.
 */
export function frontPlaces<T>(places: T[], project: (p: T) => { y: number }, sameSpotOf: (p: T, all: T[]) => T[]): T[] {
  return places.filter((place) => {
    const y = project(place).y;
    return !sameSpotOf(place, places).some((n) => project(n).y > y);
  });
}
