const { marc2tsv } = require('./export/marc2tsv');
const { dialects } = require('./dialects');

const {
  MARC_EXTENSION,
  JSON_MEDIA_TYPE,
  TSV_MEDIA_TYPE,
  RDF_MEDIA_TYPE,
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
const { mrc2bf2rdf } = require('./export/bf2-rdf');

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
  dialects,
  export: {
    [TSV_MEDIA_TYPE]: marc2tsv,
    [RDF_MEDIA_TYPE]: mrc2bf2rdf,
    [OPDS2_MEDIA_TYPE]: marcToOpds,
    [JSONLD_MEDIA_TYPE]: marcToOpds,
    [JSON_MEDIA_TYPE]: (input) => fromISO2709(input),
  },
};
