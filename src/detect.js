const { JSON_MEDIA_TYPE } = 'application/json';
const { flattenDeep } = require('./utils/arrays');
const { toISO2709 } = require('./serial/iso2709');
const { MARC_MEDIA_TYPE } = require('./constants');
const {
  MARC_LEADER_BIBLIOGRAPHIC_LEVEL_OFFSET,
  BASIC_ENTITIES,
} = require('./constants');
const {
  flatten,
  forceArray,
  compact,
  zip,
} = require('./utils/arrays');
const { get } = require('./utils/objects');
const { isEmpty } = require('./utils/types');
const { MARC_RECORD_FORMATS } = require('./constants-formats');
const { UNIMARC_RECORD_TYPE_GROUP_CODES } = require('./constants-unimarc');
const {
  MARC21_BIBLIOGRAPHIC_LEVEL,
  MARC21_RECORD_TYPE_GROUP_CODES,
} = require('./constants-marc21');
const {
  MARC_TEST_RE,
  MARC_LEADER_DESCRIPTION_LEVEL_OFFSET,
  RECORD_LEVELS,
  MARC_LEADER_MARC_RECORD_STATUS_OFFSET,
  MARC_LEADER_TYPE_OFFSET,
  MARC_FORMAT_MARC21,
  MARC_FORMAT_RUSMARC,
} = require('./constants');

const getRecordStatus = (rec) => get(
  rec,
  ['leader', MARC_LEADER_MARC_RECORD_STATUS_OFFSET],
  'd',
).toLowerCase();

const getMarcSource = (pub, defaultSourceCode) => {
  if (isEmpty(pub)) {
    return '';
  }
  // noinspection NonAsciiCharacters
  const possibleSources = compact(flattenDeep([
    forceArray(pub['040']).map((f) => f.a).filter((f) => !!f),
    (pub['017'] || []).filter(
      ({ subfield }) => (
        subfield.filter(
          ({
            code,
            value,
          }) => (code === 'a') && value,
        ).length > 0
      ) && (
        subfield.filter(
          ({
            code,
            value,
          }) => (code === 'b') && value,
        ).length > 0
      ),
    ).map(
      ({ subfield }) => subfield.filter(
        ({ code }) => (code === 'b'),
      ).map(
        ({ value }) => value,
      ),
    ).reverse(),
    pub['003'],
    forceArray(pub['801']).map((f) => f.b).filter((f) => !!f),
    forceArray(pub['035']).map((f) => f.a).filter((f) => !!f),
    forceArray(pub['852']).map((f) => f.a).filter((f) => !!f),
    defaultSourceCode,
  ])).map((v) => ({
    РГБ: 'RuMoRGB',
    RkpciviluMoRGB: 'RuMoRGB',
    РНБ: 'RuSpRNB',
  })[v] || v);
  const source = possibleSources[0];
  // eslint-disable-next-line no-useless-escape
  if ((!isEmpty(source)) && `${source}`.match(/^[\p{L}\p{N}\/\-\\.@_ ]+$/uig)) {
    return `${source}`;
  }
  return '';
};

const getMarcKey = (rec) => `${rec['001'] || ''}`;

/**
 * Get electronic locations
 * @param rec
 * @returns {Array<*>}
 */
const getUrlRecords = (rec) => flatten(forceArray(rec['856']).map((field856) => {
  const urls = field856.subfield.filter(({ code }) => code === 'u').map(({ value }) => value);
  const types = field856.subfield.filter(({ code }) => code === 'q').map(({ value }) => value);
  return urls.map((url, idx) => {
    let key;
    let source;
    try {
      const urlObj = new URL(url);
      source = urlObj.host;
      key = urlObj.pathname;
    } catch (e) {
      const urlParts = url.split('/');
      if (url.startsWith('/')) {
        key = url;
      } else if (urlParts.length > 1) {
        source = urlParts[0];
        key = urlParts.slice(1).map((v) => `/${v}`).join('');
      } else {
        key = url;
      }
    }
    const titleParts = field856.subfield.filter(({ code }) => ['3', 'x'].indexOf(code) !== -1).map(({ value }) => value);
    return ({
      title: titleParts.join(' - '),
      rel: {
        0: 'http://opds-spec.org/acquisition',
        1: 'alternate',
        2: 'relatedTo',
      }[field856.ind2 || '0'] || 'relatedTo',
      kind: BASIC_ENTITIES.URL,
      source,
      key,
      type: types.length >= idx + 1 ? types[idx] : null,
    });
  });
}).filter((v) => !!v));

/**
 * Get electronic locations
 * @param rec
 * @returns {Array<*>}
 */
const getPhysicalLocationRecord = (rec) => flattenDeep(['852', '853'].map(
  (fieldNumber) => forceArray(rec[fieldNumber]).map(
    (field) => {
      const fieldA = field.subfield.filter(({ code }) => code === 'a').map(({ value }) => value);
      const fieldJ = field.subfield.filter(({ code }) => code === 'j').map(({ value }) => value);
      const record = toISO2709({
        ...rec,
        datafield: [...rec.datafield, field],
      });

      return zip(fieldA, fieldJ).map(
        ([source, key]) => (
          [
            {
              source,
              key,
              record,
              kind: BASIC_ENTITIES.ITEM,
              mediaType: MARC_MEDIA_TYPE,
            },
          ]),
      );
    },
  ),
)).filter((v) => !!v);

/**
 * Detect MARC standard fork (MARC21, RUSMARC, UNIMARC e.t.c.)
 *
 * TODO: RUSMARC is UNIMARC compliant so it would be better to have of multi-level classification
 *       at the other hand [IFLA see](https://www.ifla.org/publications/unimarc-formats-and-related-documentation)
 *       them as the same level branches.
 * TODO: Differentiate other forms of UNIMARC from RUSMARC
 *
 * @param marcObj
 * @param defaultMarcSchemaUri
 * @returns {Object<{uri: string, path: string, doc_uri: string}>|null}
 */
const detectMarcFormat = (
  marcObj,
  defaultMarcSchemaUri = MARC_FORMAT_MARC21,
) => {
  if (!marcObj) {
    return null;
  }
  const field100a = forceArray(marcObj['100']).map((f) => f.a).join('');
  if (field100a && field100a.match(/^[0-9]{8}[a-z].{25,27}$/ui)) {
    return MARC_FORMAT_RUSMARC;
  }
  if ([
    ...['007', '008'].filter(
      (o) => (typeof marcObj[o] === 'string') && (marcObj[o].length > 0),
    ),
    ...['040', '852', '856'].filter(
      (a, o) => forceArray(marcObj[o]).filter(
        (f) => (forceArray(f.a).length > 0),
      ).length > 0,
    ),
  ].length > 0) {
    return MARC_FORMAT_MARC21;
  }
  if (marcObj.leader) {
    return MARC_FORMAT_RUSMARC;
  }
  return defaultMarcSchemaUri;
};

/**
 * Detect MARC record type
 * @param rec {*}
 * @returns {string}
 */
const getMarkRecordType = (rec) => {
  const marcSchemaUri = detectMarcFormat(rec);
  const leader = rec.leader;
  // TODO: Here RUSMARC and UNIMARC are about pretty the same,
  //       but i'm not confident about all RUSMARC authority and holdings files
  const codeMap = (marcSchemaUri === MARC_FORMAT_MARC21)
    ? MARC21_RECORD_TYPE_GROUP_CODES
    : UNIMARC_RECORD_TYPE_GROUP_CODES;

  const leaderCode = ((
    Array.isArray(leader) ? leader.map((v) => v || ' ').join('') : leader
  )[MARC_LEADER_TYPE_OFFSET] || '').toLowerCase();

  return Object.keys(codeMap).filter(
    (tg) => codeMap[tg].indexOf(leaderCode) !== -1,
  )[0] || MARC_RECORD_FORMATS.UNKNOWN;
};

const getBibliographicLevel = (rec) => (rec.leader ? (
  MARC21_BIBLIOGRAPHIC_LEVEL[
    (rec.leader[MARC_LEADER_BIBLIOGRAPHIC_LEVEL_OFFSET] || '').toLowerCase()
  ] || { type: null }
).type : null);

/**
 * Detect MARC record type
 * @param rec {*}
 * @returns {string}
 */
const getKind = (rec) => {
  const marcRecordType = getMarkRecordType(rec);
  if (marcRecordType === MARC_RECORD_FORMATS.BIBLIOGRAPHIC) {
    return `${getBibliographicLevel(rec) || ''}`;
  }
  return `${marcRecordType || ''}`;
};

/**
 * Detection
 * @returns {null|string|*}
 * @param rec
 */
const getRecordLevel = (rec) => {
  if (rec.leader) {
    /*
    WorkMusic
    substring(../marc:leader,7,1) = 'c' or
                      substring(../marc:leader,7,1) = 'd' or
                      substring(../marc:leader,7,1) = 'i' or
                      substring(../marc:leader,7,1) = 'j'"
    Contine resources
    <!-- continuing resources -->
      <xsl:when test="substring(../marc:leader,7,1) = 'a' and
                      (substring(../marc:leader,8,1) = 'b' or
                        substring(../marc:leader,8,1) = 'i' or
                        substring(../marc:leader,8,1) = 's')">
    workVisualMaterials
<xsl:when test="substring(../marc:leader,7,1) = 'g' or
                      substring(../marc:leader,7,1) = 'k' or
                      substring(../marc:leader,7,1) = 'o' or
                      substring(../marc:leader,7,1) = 'r'">
    WorkMaps
    substring(../marc:leader,7,1) = 'e' or substring(../marc:leader,7,1) = 'f'
    Electronic
    substring(../marc:leader,7,1)
    WorkBooks
    (substring(../marc:leader,7,1) = 'a' or substring(../marc:leader,7,1 = 't')
    (substring(../marc:leader,8,1) = 'a'
    or substring(../marc:leader,8,1) = 'c'
     or substring(../marc:leader,8,1) = 'd'
      or substring(../marc:leader,8,1) = 'm')
     */
    return RECORD_LEVELS[rec.leader[MARC_LEADER_DESCRIPTION_LEVEL_OFFSET]] || RECORD_LEVELS.u;
  }
  if (typeof rec === 'string') {
    return RECORD_LEVELS[rec[MARC_LEADER_DESCRIPTION_LEVEL_OFFSET]] || RECORD_LEVELS.u;
  }
  return null;
};

const isSingleRecord = (rec) => (['b', 'd', 'a', 'm'].indexOf(getRecordLevel(rec)) !== -1);

const isMultiRecord = (rec) => (['s', 'i', 'c'].indexOf(getRecordLevel(rec)) !== -1);

const getRslCollections = (rec) => {
  const field979a = forceArray(rec['979']).map((f) => f.a).filter((f) => !!f);
  return (field979a || []).map((key) => ({
    kind: BASIC_ENTITIES.COLLECTION,
    source: 'rumorgb',
    key,
    record: JSON.stringify({
      metadata: {
        description: 'Auto-generated collection',
        title: key,
      },
    }),
    mediaType: JSON_MEDIA_TYPE,
  }));
};

const isMarc = async (input) => (typeof input === 'string') && (!!input.trim().match(MARC_TEST_RE));

module.exports = {
  isMarc,
  getRecordStatus,
  isSingleRecord,
  isMultiRecord,
  getMarcKey,
  getMarcSource,
  detectMarcFormat,
  getKind,
  getMarkRecordType,
  getRecordLevel,
  getUrlRecords,
  getPhysicalLocationRecord,
  getRslCollections,
  getBibliographicLevel,
};
