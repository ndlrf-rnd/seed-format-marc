/* eslint-disable no-template-curly-in-string */
const fs = require('fs');
const { MARC21_JSON_SCHEMA_PATH } = require('./constants-marc21');

const {
  MARC_CONTROL_FIELD_TAGS,
  MARC_NOT_SET,
  RECORD_TYPE_GROUP_MANUAL_RELATIONS,
} = require('./constants');
const { MARC21_FIELD_STR_RE } = require('./constants-marc21');
const { MARC_RECORD_FORMATS } = require('./constants-formats');

const MARC21_JSON_SCHEMA_OBJ = JSON.parse(fs.readFileSync(MARC21_JSON_SCHEMA_PATH, 'utf-8'));

const MARC_CONTROL_FIELD_TAGS_DICT = MARC_CONTROL_FIELD_TAGS.reduce(
  (a, o) => ({
    ...a,
    [o]: true,
  }),
  {},
);

/**
 * Is given MARC field tag a control field `00X`
 * @param fieldTag {string}
 * @returns {boolean}
 */
const isControlFieldTag = (fieldTag) => (typeof MARC_CONTROL_FIELD_TAGS_DICT[fieldTag] !== 'undefined');
const isDataFieldTag = (fieldTag) => fieldTag && (!isControlFieldTag(fieldTag));
/**
 * Get object with decomposed field description with MARC21 manual comments being added.
 *
 * @param tag
 * @param subfield
 * @param ind1
 * @param ind2
 * @param value
 * @param rType
 * @param marcSchema
 * @returns Object<{
 *    tag: {str},
 *    description: {?str},
 *    ind1: {?str},
 *    ind1Description: {?str},
 *    ind2: {?str},
 *    ind2Description: {?str},
 *    subfield: {?str},
 *    subfieldDescription: {?str},
 *    positions: {?Object},
 *    uri: {?str},
 * }>
 */
const describeField = (
  {
    tag,
    subfield,
    ind1,
    ind2,
  } = {},
  value = null,
  rType = MARC_RECORD_FORMATS.BIBLIOGRAPHIC,
  marcSchema = MARC21_JSON_SCHEMA_OBJ,
) => {
  if (tag) {
    const schemaObj = marcSchema.properties[tag] || {};
    const enumIdx = (
      ((schemaObj.properties || {})[subfield] || { enum: [] }).enum || []
    ).indexOf(value);
    const enumDescription = (
      (schemaObj.properties || {})[subfield] || { enumDescription: [] }
    ).enumDescription;

    return {
      value,
      uri: RECORD_TYPE_GROUP_MANUAL_RELATIONS[rType || ''].replace(
        '${tag}',
        tag,
      ),
      description: (schemaObj || {}).title || null,
      ind1,
      ind2,
      tag,
      subfield,
      subfieldDescription: subfield
        ? ((schemaObj.properties || {})[subfield] || { description: null }).description || null
        : null,
      valueDescription: enumIdx !== -1 ? enumDescription[enumIdx] : null,
      ind1Description: ((schemaObj.properties || {}).ind1 || {}).label || null,
      ind2Description: ((schemaObj.properties || {}).ind2 || {}).label || null,

      // ind1ValueDescription: ((((schemaObj.indicators || {})['1'] || {})).values || {})[ind1],
      // ind2ValueDescription: ((((schemaObj.indicators || {})['2'] || {})).values || {})[ind2],
    };
  }
  return null;
};

/**
 * Parse following formats:
 * DDSOURCES$S
 * DDSOURCESS
 * DDD$S
 * DDDS
 * @param fieldStr {string} - field textStr representation
 * @param value {?string} - field value
 * @returns Object<{
 *    tag: str,
 *    description: {?str},
 *    ind1: {?str},
 *    ind1Description: {?str},
 *    ind1ValueDescription: ?str
 *    ind2: {?str},
 *    ind2ValueDescription: {?str},
 *    ind2Description: {?str},
 *    subfield: {?str},
 *    subfieldDescription: {?str},
 *    positions: ?object,
 *    uri: {?str},
 *    value: {?str},
 *  }>
 */
const parseFieldStr = (fieldStr, value = null) => {
  // parts example:  [ '009#3$a', '009', '#3', '#', '3', '$a' ]
  const parts = [...(MARC21_FIELD_STR_RE.exec(fieldStr || '') || [])];
  // noinspection JSUndefinedPropertyAssignment
  MARC21_FIELD_STR_RE.lastIndex = 0;

  const tag = parts[1];
  const ind1 = parts[3] && parts[3] !== ' ' ? parts[3] : MARC_NOT_SET;
  const ind2 = parts[4] && parts[4] !== ' ' ? parts[4] : MARC_NOT_SET;
  const subfield = parts[5] && parts[5].length > 0 ? parts[5] : null;

  if (isControlFieldTag(tag)) {
    return describeField({ tag }, value);
  }
  return describeField({
    tag,
    ind1,
    ind2,
    subfield,
  }, value);
};

module.exports = {
  describeField,
  parseFieldStr,
  isDataFieldTag,
  isControlFieldTag,
};
