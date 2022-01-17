const {
  DEFAULT_TEXT_FIELD_SEPARATOR,
  DEFAULT_TEXT_LINE_SEPARATOR,
  MARC_BLANK_CHAR,
} = require('../constants');
const { isControlFieldTag } = require('../fields');
const { Iso2709 } = require('../serial/iso2709');

/**
 * Converts field object to string representation.
 *
 * @param tag - MARC tag
 * @param fieldObj {Object|String}
 * @returns {string} - MARC21 field string representation having one of the following formats:
 * // With subfield
 * - DDSOURCES$S
 * - DDD#S$S
 * - DDDS#$S
 * - DDD##$S
 * // No subfield
 * - DDD#S
 * - DDDS#
 * - DDD##
 */
const makeFieldStr = (tag, fieldObj) => {
  // const tag = fieldObj.tag;
  let resultInd1;
  let resultInd2;
  let resultSubfield;
  let resultValue;
  if (!isControlFieldTag(fieldObj.tag)) {
    resultInd1 = fieldObj.ind1 || MARC_BLANK_CHAR;
    resultInd2 = fieldObj.ind2 || MARC_BLANK_CHAR;
    resultSubfield = Object.keys(fieldObj).filter((code) => code.length === 1).map(
      // eslint-disable-next-line no-useless-escape
      (code) => `\$${code} ${fieldObj[code]}`,
    ).join('\t');
  } else {
    resultValue = fieldObj;
  }
  return [tag, resultInd1, resultInd2, resultSubfield, resultValue].filter(
    (v) => !!v,
  ).join('');
};

/**
 * Pretty-Print fields objects list representation
 * @param input
 * @param fieldSep - fields separator
 * @param lineSep - lines separator
 * @returns {*}
 */
const text = (
  input,
  fieldSep = DEFAULT_TEXT_FIELD_SEPARATOR,
  lineSep = DEFAULT_TEXT_LINE_SEPARATOR,
) => {
  const inputObj = (typeof input === 'string') ? Iso2709.from(input) : input;
  return [
    Object.keys(inputObj).sort().map(
      (tag) => (
        [
          makeFieldStr(tag, inputObj[tag]),
        ].join(fieldSep)
      ),
    ),
  ].join(lineSep);
};

module.exports = {
  marcToText: text,
};
