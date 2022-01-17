const fs = require('fs');
const path = require('path');
const {
  parseDateStr,
  getMarcRecordDates,
} = require('../dates');

test('get marc record dates', () => {
  const jsonEntity = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'data', 'dates_1_marc21.json'),
      'utf-8',
    ),
  );
  expect(
    getMarcRecordDates(jsonEntity),
  ).toEqual(
    {
      dateEnd: new Date('1957-12-31T00:00:00.000Z'),
      dateStart: new Date('1957-12-31T00:00:00.000Z'),
      publicationDate: new Date('1999-12-31T00:00:00.000Z'),
      recordDateStart: new Date('2012-10-25T00:00:00.000Z'),
      recordDateUpdated: new Date('2018-09-14T15:34:23.000Z'),
      typeOfRange: 'd',
    },
  );
});

test('get rusmarc record dates', () => {
  const jsonEntity = {
    leader: '01796nam2 22002291i 450 ',
    '001': '009674037',
    '005': '20191007133100.0',
  };
  expect(
    getMarcRecordDates(jsonEntity),
  ).toEqual(
    {
      recordDateStart: new Date('2019-10-07T13:31:00.000Z'),
      recordDateUpdated: new Date('2019-10-07T13:31:00.000Z'),
    },
  );
});

test('get full marc record dates', () => {
  const jsonEntity = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/test-marc-obj-dates.json'), 'utf-8'));
  expect(
    getMarcRecordDates(jsonEntity),
  ).toEqual(
    {
      publicationDate: new Date('1779-12-31T00:00:00.000Z'),
      dateStart: new Date('1779-01-01T00:00:00.000Z'),
      recordDateStart: new Date('2007-11-01T00:00:00.000Z'),
      recordDateUpdated: new Date('2019-09-23T12:12:54.000Z'),
      typeOfRange: 's',
    },
  );
});

test('date conversion', () => {
  expect(
    parseDateStr('19940223151047.0'),
  ).toEqual(
    new Date('1994-02-23T15:10:47.000Z'),
  );
  expect(
    parseDateStr('20190805170958.0'),
  ).toEqual(
    new Date('2019-08-05T17:09:58.000Z'),
  );
});
