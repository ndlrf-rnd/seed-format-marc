const { forceArray, flatten } = require('../utils/arrays');
const { detectMarcFormat } = require('../detect');

const {
  MARC21_TO_OPDS2_JSONATA,
  RUSMARC_TO_MARC21_JSONATA,
  MARC_FORMAT_RUSMARC,
  MARC_FORMAT_UNIMARC,
} = require('../constants');

const marcToOpds = (input) => {
  const marcObjs = flatten(forceArray(input).map(
    (o) => (
      ([
        MARC_FORMAT_RUSMARC,
        MARC_FORMAT_UNIMARC,
      ].indexOf(detectMarcFormat(o)) !== -1)
        ? RUSMARC_TO_MARC21_JSONATA(forceArray(o))
        : forceArray(o)
    ),
  ));
  return marcObjs.map(MARC21_TO_OPDS2_JSONATA);
};

module.exports = {
  marcToOpds,
};
