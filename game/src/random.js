// A small seeded random source (mulberry32), so a screenshot seed replays the
// same game every time and the live game can still roll a fresh seed per run.
export function createRandom(seed) {
  let state = seed >>> 0;
  function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    /** Uniform float in [min, max). */
    range(min, max) {
      return min + (max - min) * next();
    },
    /** Uniform integer in [min, max] inclusive. */
    int(min, max) {
      return Math.floor(min + (max - min + 1) * next());
    },
    /** One element of `items`, uniformly. */
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    /** True with probability `p`. */
    chance(p) {
      return next() < p;
    },
  };
}
