/**
 * @fileOverview MARC21 utilities and formats
 */
const {
  splitRecords,
  fromISO2709,
  toISO2709,
} = require('./serial/iso2709');

const { describeField, parseFieldStr } = require('./fields');
const { parseFieldRelationSeq } = require('./relations');

module.exports = {
  describeField,

  parseFieldRelationSeq, // Not used
  parseFieldStr,
  splitRecords,
  fromISO2709,
  toISO2709,
};
