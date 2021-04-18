const compact = require('lodash.compact');
const sortBy = require('lodash.sortby');
const uniqBy = require('lodash.uniqby');
const flattenDeep = require('lodash.flattendeep');

const flatten = (arr) => (forceArray(arr).reduce((acc, out) => acc.concat(out), []));
/**
 *
 * @param x {any}
 * @returns Array<any>
 */
const forceArray = (x) => (Array.isArray(x) ? x : [x].filter((v) => !!v));


module.exports = {
  forceArray,
  flatten,
  compact,
  uniqBy,
  sortBy,
  flattenDeep,
};
