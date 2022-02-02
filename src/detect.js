const {
  flattenDeep,
  flatten,
  forceArray,
  compact,
  zip,
} = require('./utils/arrays');
const { dialects } = require('./dialects');
const { isEmpty } = require('./utils/types');
const { toISO2709 } = require('./serial/iso2709');
const {
  MARC_MEDIA_TYPE,
  RECORD_LEVELS,
  MARC_LEADER_MARC_RECORD_STATUS_OFFSET,
  MARC_LEADER_TYPE_OFFSET,
  MARC_LEADER_BIBLIOGRAPHIC_LEVEL_OFFSET,
  MARC_LEADER_ENCODING_LEVEL_OFFSET,
  MARC_ENCODING_LEVEL,
  MARC_BLANK_CHAR,
  MARC_DIALECT_MARC21,
} = require('./constants');

const { MARC_RECORD_FORMATS } = require('./constants-record-formats');
const { UNIMARC_RECORD_TYPE_GROUP_CODES } = require('./dialects/unimarc/constants-unimarc');
const { MARC21_RECORD_TYPE_GROUP_CODES } = require('./dialects/marc21/constants-marc21');
const { MARC_RECORD_STATUS } = require('./constants-record-status');

const getRecordStatus = (rec) => {
  if (!rec.leader) {
    return MARC_RECORD_STATUS.UNKNOWN;
  }
  const statusCode = rec.leader[MARC_LEADER_MARC_RECORD_STATUS_OFFSET];
  return MARC_RECORD_STATUS[statusCode];
};

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

const getControlNumber = (rec) => `${rec['001'] || ''}`;

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
              mediaType: MARC_MEDIA_TYPE,
            },
          ]),
      );
    },
  ),
)).filter((v) => !!v);

/*
Source XSD: http://www.w3.org/1999/XSL/Transform

<xsl:variable name="type" select="dc:type"/>
<xsl:variable name="leader06">
  <xsl:choose>
    <xsl:when test="$type='collection'">p</xsl:when>
    <xsl:when test="$type='dataset'">m</xsl:when>
    <xsl:when test="$type='event'">r</xsl:when>
    <xsl:when test="$type='image'">k</xsl:when>
    <xsl:when test="$type='interactive resource'">m</xsl:when>
    <xsl:when test="$type='service'">m</xsl:when>
    <xsl:when test="$type='software'">m</xsl:when>
    <xsl:when test="$type='sound'">i</xsl:when>
    <xsl:when test="$type='text'">a</xsl:when>
    <xsl:otherwise>a</xsl:otherwise>
  </xsl:choose>
</xsl:variable>
<xsl:variable name="leader07">
  <xsl:choose>
    <xsl:when test="$type='collection'">c</xsl:when>
    <xsl:otherwise>m</xsl:otherwise>
  </xsl:choose>
</xsl:variable>
<xsl:value-of select="concat('      ',$leader06,$leader07,'         3u     ')"/>
*/

/**
 * Detect MARC record type
 * @param rec {*}
 * @returns {string}
 */
const getMarcRecordFormat = (rec) => {
  // TODO: Here RUSMARC and UNIMARC are about pretty the same,
  //       but i'm not confident about all RUSMARC authority and holdings files
  const codeMap = dialects[MARC_DIALECT_MARC21].is(rec)
    ? MARC21_RECORD_TYPE_GROUP_CODES
    : UNIMARC_RECORD_TYPE_GROUP_CODES;
  const leader = rec.leader;

  const leaderCode = ((
    Array.isArray(leader) ? leader.map((v) => v || ' ').join('') : leader
  )[MARC_LEADER_TYPE_OFFSET] || '').toLowerCase();

  return Object.keys(codeMap).filter(
    (tg) => codeMap[tg].indexOf(leaderCode) !== -1,
  )[0] || MARC_RECORD_FORMATS.UNKNOWN;
};

const getEncodingLevel = (rec) => {
  if (!rec.leader) {
    return null;
  }
  const elCode = rec.leader[MARC_LEADER_ENCODING_LEVEL_OFFSET] || MARC_BLANK_CHAR;
  return MARC_ENCODING_LEVEL[elCode];
};
//
// /**
//  * Detect MARC record type
//  * @param rec {*}
//  * @returns {string}
//  */
// const getKind = (rec) => {
//   const marcRecordType = getMarcRecordFormat(rec);
//   if (marcRecordType === MARC_RECORD_FORMATS.BIBLIOGRAPHIC) {
//     return `${getBibliographicLevel(rec) || ''}`;
//   }
//   return `${marcRecordType || ''}`;
// };

/**
 * Detection
 * @returns {null|string|*}
 * @param rec
 */
const getBibliographicLevel = (rec) => {
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
    const rlCode = rec.leader[MARC_LEADER_BIBLIOGRAPHIC_LEVEL_OFFSET];
    return RECORD_LEVELS[rlCode] || RECORD_LEVELS.u;
  }
  if (typeof rec === 'string') {
    const rlCode = rec[MARC_LEADER_BIBLIOGRAPHIC_LEVEL_OFFSET];
    return RECORD_LEVELS[rlCode] || RECORD_LEVELS.u;
  }
  return null;
};

module.exports = {
  getMarcRecordFormat,
  getRecordStatus,
  getControlNumber,
  getMarcSource,
  getBibliographicLevel,
  getEncodingLevel,
  getUrlRecords,
  getPhysicalLocationRecord,
};
