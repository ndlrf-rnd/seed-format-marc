const compact = require('lodash.compact');
const sortBy = require('lodash.sortby');
const intersection = require('lodash.intersection');
const uniqBy = require('lodash.uniqby');
const flattenDeep = require('lodash.flattendeep');

/**
 *
 * @param x {any}
 * @returns Array<any>
 */
const forceArray = (x) => (Array.isArray(x) ? x : [x].filter((v) => !!v));

const flatten = (arr) => (forceArray(arr).reduce((acc, out) => acc.concat(out), []));

module.exports = {
  forceArray,
  flatten,
  compact,
  uniqBy,
  sortBy,
  intersection,
  flattenDeep,
};
