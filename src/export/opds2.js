const path = require('path');
const { registerJsonata } = require('../utils/jsonata');
const { forceArray } = require('../utils/arrays');

const MARC21_TO_OPDS2_JSONATA = registerJsonata(path.join(__dirname, 'marc21-to-opds2-0.7.0.jsonata'));

const marcToOpds = (input) => forceArray(input).map(MARC21_TO_OPDS2_JSONATA);

module.exports = {
  marcToOpds,
  MARC21_TO_OPDS2_JSONATA,
};
