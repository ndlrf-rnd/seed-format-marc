const path = require('path');
const fs = require('fs');
const { parseFieldRelationSeq } = require('../relations');
const { omit } = require('../utils/objects');
const {
  isMarc21,
  isRusmarc,
  isUnimarc,
  isAlef,
} = require('../detect');
const {
  MARC_MEDIA_TYPE,
  OPDS2_MEDIA_TYPE,
  MARC_DIALECT_RUSMARC,
  MARC_DIALECT_MARC21,
} = require('../constants');
const { JSONLD_MEDIA_TYPE } = require('../constants');
const { splitRecords } = require('../serial/iso2709');
const MarcIf = require('../index');

test('MARC21 with CP1251 -> split', async () => {
  const input = fs.readFileSync(path.join(__dirname, 'data/1251.mrc'), 'ascii');
  const output = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'data/1251.record-strings.json'),
    'ascii',
  ));

  const res = (await splitRecords(input)).map((rec) => rec.toString('utf-8'));
  expect(res).toEqual(output);
});

test('MARC21 with CP1251 -> entities', async () => {
  const input = fs.readFileSync(path.join(__dirname, 'data/1251.mrc'), 'ascii');
  const res = (await MarcIf.serial[MARC_MEDIA_TYPE].from(input)).map(
    (v) => omit(v, ['time_source']),
  );
  expect(
    res,
  ).toEqual(
    JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data/1251.objects.json'), 'utf-8'),
    ).map(
      (v) => omit(v, ['time_source']),
    ),
  );
});

test('MARC21 with CP1251 -> objets', async () => {
  const input = fs.readFileSync(path.join(__dirname, 'data/1251.mrc'), 'ascii');
  const res = await MarcIf.serial[MARC_MEDIA_TYPE].from(input);
  //   .map(
  //   (v) => omit(v, ['time_source']),
  // );
  expect(res).toEqual(
    JSON.parse(fs.readFileSync(path.join(__dirname, 'data/1251.objects.json'), 'utf-8')),
  );
});

test('MARC21 with Unicode with leader flag -> objects', async () => {
  const input = fs.readFileSync(path.join(__dirname, 'data/utf8_with_leader_flag.mrc'));
  const converted = await MarcIf.serial[MARC_MEDIA_TYPE].from(input);

  const ref = fs.readFileSync(path.join(__dirname, 'data/utf8_with_leader_flag.objects.json'), 'utf-8');

  expect(
    converted.map((v) => omit(v, ['time_source'])),
  ).toEqual(
    JSON.parse(ref).map((v) => omit(v, ['time_source'])),
  );
});

test('MARC21 with Unicode without leader flag -> objects', async () => {
  const input = fs.readFileSync(path.join(__dirname, 'data/utf8_without_leader_flag.mrc'));
  const ref = fs.readFileSync(path.join(__dirname, 'data/utf8_without_leader_flag.objects.json'), 'utf-8');
  const converted = await MarcIf.serial[MARC_MEDIA_TYPE].from(input);
  expect(
    converted.map((v) => omit(v, ['time_source'])),
  ).toEqual(
    JSON.parse(ref).map((v) => omit(v, ['time_source'])),
  );
});

test('parseFieldRelationSeq', () => {
  expect(parseFieldRelationSeq('1.1\\a')).toEqual([1, 1, 'a']);
  expect(parseFieldRelationSeq('1.1\\aa')).toEqual(null);
  expect(parseFieldRelationSeq('1\\a')).toEqual([1, null, 'a']);
});

test('detect', () => {
  const jsonEntities = [
    path.join(__dirname, 'data/history_xvii/marc21.json'),
    path.join(__dirname, 'data/history_xvii/rusmarc.json'),
    path.join(__dirname, 'data/dates_1_marc21.json'),
  ].map(
    (p) => JSON.parse(fs.readFileSync(p, 'utf-8')),
  );

  expect(
    jsonEntities.map(
      (rec) => ([
        isMarc21,
        isRusmarc,
        isUnimarc,
        isAlef,
      ].map((fn) => fn(rec))
      ),
    ),
  ).toEqual(
    [
      [true, false, false, false],
      [false, true, false, false],
      [true, false, false, false],
    ],
  );
});

describe('rusmarc -> marc 21', () => {
  test('MARC21 -> OPDS vs same RUSMARC -> OPDS rsl01002988236', async () => {
    expect.assertions(1);
    const marc21Json = (await MarcIf.export[JSONLD_MEDIA_TYPE](
      fs.readFileSync(path.join(__dirname, 'data', 'history_xvii', 'RuMoRGB', '01002988236_marc21.mrc'), 'utf-8'),
    ));
    const rusmarcMappedJson = await MarcIf.export[JSONLD_MEDIA_TYPE](
      fs.readFileSync(path.join(__dirname, 'data', 'history_xvii', 'RuMoRGB', '01002988236_rusmarc.iso'), 'utf-8'),
    );
    expect(
      rusmarcMappedJson,
    ).toEqual(
      marc21Json,
    );
  }, 60 * 1000);

  test.skip('mapping rusmarc -> marc - ISBN-978-5-901202-50-0', async () => {
    expect.assertions(1);
    const marc21Json = (await MarcIf.serial[MARC_MEDIA_TYPE].from(
      fs.readFileSync(path.join(__dirname, 'data', 'ISBN-978-5-901202-50-0', '01003120729.mrc'), 'utf-8'),
    ));
    const rusmarcMappedJson = (await MarcIf.dialects[MARC_DIALECT_RUSMARC].to[MARC_DIALECT_MARC21](
      await MarcIf.serial[MARC_MEDIA_TYPE].from(
        fs.readFileSync(path.join(__dirname, 'data/ISBN-978-5-901202-50-0', '01003120729.iso'), 'utf-8'),
      ),
    ));
    expect(
      rusmarcMappedJson.map((rec) => ({
        ...rec,
        leader: rec.leader.replace(/^[0-9]{5}/ug, '00000'),
      })).sort((a, b) => a['001'] > b['001']),
    ).toEqual(
      marc21Json.sort((a, b) => a['001'] > b['001']),
    );
  }, 60 * 1000);

  test('mapping rusmarc -> marc - rsl01002988236 VS NLR005177748.mrc', async () => {
    expect.assertions(1);
    const marc21Json = await MarcIf.export[JSONLD_MEDIA_TYPE](
      fs.readFileSync(path.join(__dirname, 'data', 'history_xvii', 'RuMoRGB', '01002988236_marc21.mrc')),
    );
    const rusmarcMappedJson = await MarcIf.export[JSONLD_MEDIA_TYPE](
      fs.readFileSync(path.join(__dirname, 'data', 'history_xvii', 'RuSpRNB', 'NLR005177748.mrc')),
    );
    expect(
      rusmarcMappedJson,
    ).toEqual(
      marc21Json,
    );
  }, 15 * 1000);
});

test('009913303 to OPDS', async () => {
  expect.assertions(1);
  const data = fs.readFileSync(path.join(__dirname, 'data/009913303_marc21.mrc'));
  // expect(MarcIf.dialects[MARC_DIALECT_RUSMARC].is(UB)).toBeTruthy();
  const rObjs = await MarcIf.serial[MARC_MEDIA_TYPE].from(data);
  // expect(rObjs).toEqual([]);
  // expect(rObjs).toEqual([]);
  expect(
    await MarcIf.export[OPDS2_MEDIA_TYPE](rObjs),
  ).toEqual(
    JSON.parse(fs.readFileSync(path.join(__dirname, 'data/009913303_opds.json'), 'utf-8')),
  );
}, 60 * 1000);

test('rusmarc detection OPDS2', async () => {
  expect.assertions(1);
  const data = fs.readFileSync(path.join(__dirname, 'data/rusmarc2marc-rusmarc.mrc'));
  // expect(MarcIf.dialects[MARC_DIALECT_RUSMARC].is(UB)).toBeTruthy();
  const rObjs = await MarcIf.serial[MARC_MEDIA_TYPE].from(data);

  const marc21recs = await MarcIf.dialects[MARC_DIALECT_RUSMARC].to[MARC_DIALECT_MARC21](rObjs);
  expect(
    await MarcIf.export[OPDS2_MEDIA_TYPE](marc21recs),
  ).toEqual(
    JSON.parse(fs.readFileSync(path.join(__dirname, 'data/rusmarc2marc-opds.json'), 'utf-8')),
  );
}, 60 * 1000);
