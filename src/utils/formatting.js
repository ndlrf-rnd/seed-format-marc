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

const prettyJson = (val) => (
  (typeof val === 'string') ? val : JSON.stringify(val, null, 2)
).replace(/( *)\[ *\n */ug, ' [\n$1   ')
  .replace(/ *\n *\]/ug, ']')
  .replace(/( *[^}\]]) *[,] *\n {4,}/ug, '$1, ')
  .replace(/ {2}([ ]*)\}\]/ug, '$1  }\n$1]')
  .replace(/( {2,})\{[ \n]*([^}]+)[ \n\r]*\n *\}/uig, '$1{$2}');
module.exports = {
  prettyJson,
};

module.exports = {
  padLeft,
  prettyJson,
};
