const fs = require('fs');
const { isDataFieldTag } = require('../fields');
const { MARC_BLANK_CHAR } = require('../constants');
const { isControlFieldTag } = require('../fields');
const {
  flatten,
  forceArray,
} = require('../utils/arrays');
const { get } = require('../utils/objects');
const { MARC21_JSON_SCHEMA_PATH } = require('../dialects/marc21/constants-marc21');

const MARC21_SCHEMA = JSON.parse(fs.readFileSync(MARC21_JSON_SCHEMA_PATH, 'utf-8'));
const schemaFields = Object.keys(MARC21_SCHEMA.properties).reduce((a, tag) => {
  const field = MARC21_SCHEMA.properties[tag];
  return {
    ...a,
    [tag]: field.items || field.properties,
  };
});
// const field = get(
//   MARC21_SCHEMA,
//   ['properties', tag],
//   {},
// );

// zero size
// rec.leader.replace(/^[0-9]{5}/ug, '00000')
const marcObjectToJson = (
  rec,
  options = {
    allIndicators: true,
  },
) => {
  // No size is for test purposes
  const o = options || {};
  const result = rec.leader
    ? {
      leader: rec.leader,
    }
    : {};
  const rlds = [
    ...(rec.controlfield || []),
    ...(rec.datafield || []),
  ];
  rlds.forEach(
    ({
      tag,
      value,
      ind1,
      ind2,
      subfield,
    }) => {
      const convertedVal = value || forceArray(subfield).reduce(
        (acc, {
          code,
          value: subFieldValue,
        }) => ({
          ...acc,
          // eslint-disable-next-line no-nested-ternary
          [code]: (get(schemaFields, [tag, code, 'type'], 'array') === 'array')
            ? forceArray(subFieldValue)
            : Array.isArray(subFieldValue) ? subFieldValue[0] : subFieldValue,
        }),
        {},
      );
      if (isControlFieldTag(tag)) {
        result[tag] = convertedVal;
      } else {
        if (o.allIndicators || (ind1 ? ind1.replace(MARC_BLANK_CHAR, '').trim() : ind1)) {
          convertedVal.ind1 = (ind1 ? ind1.trim() : MARC_BLANK_CHAR) || MARC_BLANK_CHAR;
        }

        if (o.allIndicators || (ind2 ? ind2.replace(MARC_BLANK_CHAR, '').trim() : ind2)) {
          convertedVal.ind2 = (ind2 ? ind2.trim() : MARC_BLANK_CHAR) || MARC_BLANK_CHAR;
        }
        if (MARC21_SCHEMA.properties[tag] && (MARC21_SCHEMA.properties[tag].type === 'object')) {
          result[tag] = convertedVal;
        } else if (MARC21_SCHEMA.properties[tag] && (MARC21_SCHEMA.properties[tag].type === 'string')) {
          result[tag] = convertedVal;
        } else if (
          MARC21_SCHEMA.properties[tag] && (MARC21_SCHEMA.properties[tag].type === 'oneOf')
        ) {
          // pass
        } else {
          result[tag] = result[tag] || [];
          result[tag].push(convertedVal);
        }
      }
    },
  );
  return result;
};

const marcObjectFromJson = (rec) => (Array.isArray(rec.controlfield) ? rec : {

  leader: rec.leader,
  controlfield: flatten(
    Object.keys(rec).filter(
      (k) => isControlFieldTag(k),
    ).map(
      (k) => forceArray(rec[k]).map(
        (fieldRec) => ({
          field: k,
          value: fieldRec,
        }),
      ),
    ),
  ),
  datafield: flatten(
    Object.keys(rec).filter(
      (k) => isDataFieldTag(k),
    ).map(
      (k) => forceArray(rec[k]).map(
        (fieldRec) => ({
          field: k,
          ...fieldRec,
        }),
      ),
    ),
  ),
});

module.exports = {
  marcObjectToJson,
  marcObjectFromJson,
};
