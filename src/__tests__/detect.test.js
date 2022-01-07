const path = require('path');
const fs = require('fs');
const {
  MARC_FORMAT_MARC21,
} = require('../constants');
const { detectMarcFormat } = require('../detect');

test('detect', () => {
  const jsonEntity = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data/dates_1_marc21.json'), 'utf-8'),
  );
  expect(detectMarcFormat(jsonEntity)).toEqual(MARC_FORMAT_MARC21);
});
