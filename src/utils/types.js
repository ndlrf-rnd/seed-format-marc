const isDate = require('lodash.isdate');

const isArray = (arg) => Array.isArray(arg);
const isBoolean = (arg) => (typeof arg === 'boolean');
const isFunction = (arg) => (typeof arg === 'function');
const isNumber = (arg) => (typeof arg === 'number');
const isObject = (arg) => (typeof arg === 'object') && (arg !== null);
const isReadableStream = (arg) => isObject(arg) && isFunction(arg._read);
const isString = (arg) => (typeof arg === 'string');

const isError = (obj) => (Object.prototype.toString.call(obj) === '[object Error]');
const isEmpty = (x) => ((typeof x === 'undefined') || (x == null));
const isNaN = Number.isNaN;

module.exports = {
  isArray,
  isBoolean,
  isDate,
  isFunction,
  isNaN,
  isNumber,
  isObject,
  isReadableStream,
  isString,
  isEmpty,
  isError,
};
