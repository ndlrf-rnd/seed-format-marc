const {
  forceArray,
} = require('./utils/arrays');
const {
  isAlef,
  isMarc21,
  isUnimarc,
  isRusmarc,
} = require('./detect');

const {
  MARC_EXTENSION,
  RUSMARC_TO_MARC21_JSONATA,
  JSON_MEDIA_TYPE,
  MARC_DIALECT_RUSMARC,
  MARC_DIALECT_UNIMARC,
  MARC_DIALECT_MARC21,
  MARC_DIALECT_ALEF,
} = require('./constants');
const {
  toISO2709,
  fromISO2709,
} = require('./serial/iso2709');
const {
  MARC_ENCODING,
  MARC_RECORD_SEPARATION_CHAR,
  MARC_MEDIA_TYPE,
  JSONLD_MEDIA_TYPE,
  OPDS2_MEDIA_TYPE,
} = require('./constants');
const {
  MARCXML_MEDIA_TYPE,
  MARCXML_EXTENSION,
  MARCXML_ENCODING,
  MARCXML_START_MARKER,
  MARCXML_END_MARKER,
  toSlimXml,
  fromSlimXml,
} = require('./serial/marcxml');
const { marcToOpds } = require('./export/opds2');

// const marcToOpds = (input) => {
//   if ((typeof input === 'string') || (Buffer.isBuffer(input))) {
//     input = fromISO2709(input);
//   }
//   const marcObjs = flatten(forceArray(input).map(
//     (o) => (
//       (isRusmarc(o) || isUnimarc(o))
//         ? RUSMARC_TO_MARC21_JSONATA(forceArray(o))
//         : forceArray(o)
//     ),
//   ));
//   return marcObjs.map(MARC21_TO_OPDS2_JSONATA);
// };

module.exports = {
  // is: isMarc,
  serial: {
    [MARC_MEDIA_TYPE]: {
      endMarker: MARC_RECORD_SEPARATION_CHAR,
      mediaType: MARC_MEDIA_TYPE,
      encoding: MARC_ENCODING,
      extension: MARC_EXTENSION,
      from: fromISO2709,
      to: toISO2709,
    },
    [MARCXML_MEDIA_TYPE]: {
      from: fromSlimXml,
      to: toSlimXml,
      extension: MARCXML_EXTENSION,
      mediaType: MARCXML_MEDIA_TYPE,
      encoding: MARCXML_ENCODING,
      startMarker: MARCXML_START_MARKER,
      endMarker: MARCXML_END_MARKER,
    },
  },
  defaultDialect: MARC_DIALECT_MARC21,
  dialects: {
    [MARC_DIALECT_MARC21]: {
      is: isMarc21,
    },
    [MARC_DIALECT_UNIMARC]: {
      is: isUnimarc,
      to: {
        [MARC_DIALECT_MARC21]: (recs) => RUSMARC_TO_MARC21_JSONATA(forceArray(recs)),
        [MARC_DIALECT_RUSMARC]: (recs) => recs,
      },
    },
    [MARC_DIALECT_RUSMARC]: {
      is: isRusmarc,
      to: {
        [MARC_DIALECT_MARC21]: (recs) => forceArray(recs).map(
          (rec) => RUSMARC_TO_MARC21_JSONATA(rec),
        ),
        [MARC_DIALECT_UNIMARC]: (recs) => recs,
      },
    },
    [MARC_DIALECT_ALEF]: {
      is: isAlef,
    },
  },
  export: {
    [OPDS2_MEDIA_TYPE]: marcToOpds,
    [JSONLD_MEDIA_TYPE]: marcToOpds,
    [JSON_MEDIA_TYPE]: (input) => fromISO2709(input),
  },
};
