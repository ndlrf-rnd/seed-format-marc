const fs = require('fs');
const path = require('path');
const MarcFt = require('../index');
const {
  OPDS2_MEDIA_TYPE,
  MARC_DIALECT_RUSMARC,
  MARC_DIALECT_MARC21,
} = require('../constants');
const { MARCXML_MEDIA_TYPE } = require('../serial/marcxml');
const { forceArray } = require('../utils/arrays');

const normalizeRecords = (entities) => forceArray(entities).map(
  (entity) => JSON.parse(JSON.stringify({
    ...entity,
    ...(entity.record
      ? { record: entity.record.replace(/ *[\r\n]+ */uig, ' ') }
      : {}),
  })),
);

test('Svod marcxml files to object', async () => {
  expect.assertions(1);
  const input = fs.readFileSync(path.join(__dirname, 'data', 'marcxml', 'svod-18-partial.mrx'), 'utf-8');
  const xmls = await MarcFt.serial[MARCXML_MEDIA_TYPE].from(input);
  const rusmarcRecords = await MarcFt.dialects[MARC_DIALECT_RUSMARC].to[MARC_DIALECT_MARC21](xmls);
  const result = await MarcFt.export[OPDS2_MEDIA_TYPE](rusmarcRecords);
  expect(
    normalizeRecords(result),
  ).toEqual(
    normalizeRecords(JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'svod-18-reduced.opds2.json'), 'utf-8'))),
  );
});
