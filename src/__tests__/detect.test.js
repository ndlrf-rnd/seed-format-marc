const path = require('path');
const fs = require('fs');

const { MARC_SCHEMAS } = require('../constants');
const { detectMarcSchemaUri } = require('../detect');

const jsonEntity = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'data', 'dates_1_marc21.json'),
    'utf-8',
  ),
);

test('detect MARC fork', () => {
  expect(
    detectMarcSchemaUri(jsonEntity),
  ).toEqual(
    MARC_SCHEMAS.MARC21.uri,
  );
});
