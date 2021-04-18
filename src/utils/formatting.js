
/**
 * Pad string on left side
 * @param str
 * @param len
 * @param sym
 * @returns {string}
 */
const padLeft = (str, len, sym = ' ') => [
  `${sym}`.repeat(Math.max(len - `${str}`.length, 0)),
  str,
].join('');

module.exports = {
  padLeft
}
