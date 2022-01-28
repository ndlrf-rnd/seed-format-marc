// noinspection HttpUrlsUsage

const { parseFieldRelationSeq } = require('../relations');
const { parseIdentifier, parseFieldStr } = require('../fields');

test('field string parsing', () => {
  expect(parseFieldStr('013#3$a'))
    .toEqual({
      description: 'Patent Control Information',
      ind1: '#',
      ind1Description: null,
      ind2: '3',
      ind2Description: null,
      subfield: '$a',
      subfieldDescription: null,
      tag: '013',
      uri: 'http://www.loc.gov/marc/bibliographic/bd013.html',
      value: null,
      valueDescription: null,
    });
  expect(parseFieldStr('0131#1'))
    .toEqual({
      description: 'Patent Control Information',
      ind1: '1',
      ind1Description: null,
      ind2: '#',
      ind2Description: null,
      subfield: '1',
      subfieldDescription: null,
      tag: '013',
      uri: 'http://www.loc.gov/marc/bibliographic/bd013.html',
      value: null,
      valueDescription: null,
    });
  expect(parseFieldStr('0131#'))
    .toEqual({
      description: 'Patent Control Information',
      ind1: '1',
      ind1Description: null,
      ind2: '#',
      ind2Description: null,
      subfield: null,
      subfieldDescription: null,
      tag: '013',
      uri: 'http://www.loc.gov/marc/bibliographic/bd013.html',
      value: null,
      valueDescription: null,

    });
  expect(parseFieldStr('013'))
    .toEqual({
      description: 'Patent Control Information',
      ind1Description: null,
      ind2Description: null,
      subfield: null,
      subfieldDescription: null,
      tag: '013',
      uri: 'http://www.loc.gov/marc/bibliographic/bd013.html',
      value: null,
      valueDescription: null,
    });
});

test('parseUriRelationSeq', () => {
  expect(parseIdentifier('catalog.rsl.ru/resources/instance/RuMoRGB-rsl')).toEqual({
    key_to: 'resources/instance/RuMoRGB-rsl',
    source_to: 'catalog.rsl.ru',
  });
  expect(parseIdentifier('(RuMoRGB)01010079565')).toEqual({
    key_to: '01010079565',
    source_to: 'RuMoRGB',
  });
});

test('parseFieldRelationSeq', () => {
  expect(parseFieldRelationSeq('1.1\\a')).toEqual([1, 1, 'a']);
  expect(parseFieldRelationSeq('1.1\\aa')).toEqual(null);
  expect(parseFieldRelationSeq('1\\a')).toEqual([1, null, 'a']);
});
