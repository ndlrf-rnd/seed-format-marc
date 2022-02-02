const {
  MARC_DIALECT_MARC21,
  MARC_DIALECT_UNIMARC,
  RUSMARC_TO_MARC21_JSONATA,
  MARC_DIALECT_RUSMARC,
  MARC_DIALECT_ALEF,
  MARC_TEST_RE,
} = require('../constants');
const {
  forceArray,
  intersection,
} = require('../utils/arrays');

/**
 * Detectors
 */

/**
 * TODO: RUSMARC is UNIMARC compliant so it would be better to have of multi-level classification
 *       at the other hand [IFLA see](https://www.ifla.org/publications/unimarc-formats-and-related-documentation)
 *       them as the same level branches.
 * TODO: Differentiate other forms of UNIMARC from RUSMARC
 */

const isMarc = (input) => (
  // eslint-disable-next-line no-nested-ternary
  (typeof input === 'string')
    ? (!!input.trim().match(MARC_TEST_RE))
    : (
      (typeof input === 'object') && (input.leader)
        ? input.leader.match(MARC_TEST_RE)
        : false)
);

const isRusmarc = (marcObj) => {
  const field100a = forceArray(marcObj['100']).map((f) => f.a).join('');
  return !!(field100a && field100a.match(/^[0-9]{8}[a-z].{25,27}$/ui));
};

const isMarc21 = (marcObj) => ([
  ...['007', '008'].filter(
    (o) => (typeof marcObj[o] === 'string') && (marcObj[o].length > 0),
  ),
  // 008 field might happen to be missing
  // supposing that host entry record defined in 773 has one defined
  ...['040', '852', '856', '773'].filter(
    (a, o) => forceArray(marcObj[o]).filter(
      (f) => Object.keys(f).length > 0,
    ).length > 0,
  ),
].length > 0);

const isAlef = (marcObj) => intersection(...[
  [
    'OWN',
    'GLOBAL',
    'LKR',
    'ITM',
    'UP',
    'DN',
    'PAR',
  ],
  Object.keys(marcObj),
].map((k) => k.toLocaleString()).sort()).length > 0;

const isUnimarc = (marcObj) => !(
  isRusmarc(marcObj) || isMarc21(marcObj) || isAlef(marcObj)
);

const dialects = {
  [MARC_DIALECT_MARC21]: {
    is: isMarc21,
  },
  [MARC_DIALECT_UNIMARC]: {
    is: isUnimarc,
    to: {
      [MARC_DIALECT_MARC21]: (recs) => RUSMARC_TO_MARC21_JSONATA(forceArray(recs)),
      [MARC_DIALECT_RUSMARC]: (recs) => recs,
    },
  },
  [MARC_DIALECT_RUSMARC]: {
    is: isRusmarc,
    to: {
      [MARC_DIALECT_MARC21]: (recs) => forceArray(recs).map(
        (rec) => RUSMARC_TO_MARC21_JSONATA(rec),
      ),
      [MARC_DIALECT_UNIMARC]: (recs) => recs,
    },
  },
  [MARC_DIALECT_ALEF]: {
    is: isAlef,
  },
};

const detectDialect = (rec) => {
  if (isMarc(rec)) {
    const keys = Object.keys(dialects || {}).sort();
    for (let i = 0; i < keys.length; i += 1) {
      const dialectName = keys[i];
      if (dialects[dialectName] && dialects[dialectName].is) {
        if (dialects[dialectName].is(rec)) {
          return dialectName;
        }
      }
    }
  }
  return null;
};

module.exports = { dialects, detectDialect };
