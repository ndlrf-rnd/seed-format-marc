// const {MARCXML_MEDIA_TYPE} = require('../marcxml/constants');
// const {toSlimXml} = require('../marcxml/toSlimXml');
const {
  forceArray,
  flatten,
} = require('./utils/arrays');
const {
  isMarc,
  detectMarcSchemaUri,
} = require('./detect');
const { marcObjectToJson } = require('./marcObjectToJson');
// const { getMarcRecordDates } = require('./dates');

const {
  MARC21_TO_OPDS2_JSONATA,
  MARC_EXTENSION,
  RUSMARC_TO_MARC21_JSONATA,
  JSON_MEDIA_TYPE,
} = require('./constants');
const { UNIMARC_JSON_SCHEMA_URI } = require('./constants-unimarc');
const { RUSMARC_JSON_SCHEMA_URI } = require('./constants-rusmarc');

const {
  toISO2709,
  fromISO2709,
  splitRecords,
} = require('./iso2709');
const {
  MARC_ENCODING,
  MARC_RECORD_SEPARATION_CHAR,
  MARC_MEDIA_TYPE,
  JSONLD_MEDIA_TYPE,
  OPDS2_MEDIA_TYPE,
} = require('./constants');

const marcToOpds = (input) => {
  if ((typeof input === 'string') || (Buffer.isBuffer(input))) {
    input = fromISO2709(input);
  }
  const marcObjs = flatten(forceArray(input).map(
    (o) => {
      const isRusmarc = (detectMarcSchemaUri(o) === RUSMARC_JSON_SCHEMA_URI);
      const isUnimarc = (detectMarcSchemaUri(o) === UNIMARC_JSON_SCHEMA_URI);
      return (isRusmarc || isUnimarc)
        ? RUSMARC_TO_MARC21_JSONATA(forceArray(o).map(marcObjectToJson))
        : forceArray(o).map(marcObjectToJson);
    },
  ));
  return marcObjs.map(MARC21_TO_OPDS2_JSONATA);
};
module.exports = {
  // marcObjToEntities: toEntities(),
  endMarker: MARC_RECORD_SEPARATION_CHAR,
  mediaType: MARC_MEDIA_TYPE,
  encoding: MARC_ENCODING,
  extension: MARC_EXTENSION,
  is: isMarc,
  splitRecords,
  toObjects: fromISO2709,
  fromObjects: toISO2709,
  to: {
    [OPDS2_MEDIA_TYPE]: marcToOpds,
    [MARC_MEDIA_TYPE]: (input) => fromISO2709(input).map(
      (o) => {
        const isRusmarc = (detectMarcSchemaUri(o) === RUSMARC_JSON_SCHEMA_URI);
        const isUnimarc = (detectMarcSchemaUri(o) === UNIMARC_JSON_SCHEMA_URI);
        return (isRusmarc || isUnimarc)
          ? RUSMARC_TO_MARC21_JSONATA(forceArray(o).map(marcObjectToJson))
          : forceArray(o).map(marcObjectToJson);
      },
    ),
    // [MARCXML_MEDIA_TYPE]: input => fromISO2709(input).map(toSlimXml).join('\n'),
    [JSONLD_MEDIA_TYPE]: marcToOpds,
    [JSON_MEDIA_TYPE]: (input) => fromISO2709(input),
  },
};
