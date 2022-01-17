const defaults = require('lodash.defaults');
const path = require('path');
const xmldom = require('xmldom');

const { x2j } = require('../utils/x2j');
const {
  isControlFieldTag,
  isDataFieldTag,
} = require('../fields');
const {
  flatten,
  forceArray,
} = require('../utils/arrays');
const { MARC_BLANK_CHAR } = require('../constants');

const MARCXML_MEDIA_TYPE = 'application/marcxml+xml';
const MARCXML_ENCODING = 'utf-8';
const MARCXML_EXTENSION = 'mrx';

/**
 * Schemas
 * @type {string}
 */

/*
MARC21
 */
const MARCXML_MARC21_SCHEMA = {
  url: 'https://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd',
  path: path.join(__dirname, '../schemas/MARC21slim.xsd'),
  ns: {
    xmlns: 'http://www.loc.gov/MARC21/slim',
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:schemaLocation': 'http://www.loc.gov/MARC21/slim\nhttp://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd',
  },

};

/*
UNIMARCSLIM: UNIMARC XML Schema prepared by Giovanni Bergamin and Detlev Schumacher based on MARCXML
(The MARC 21 XML Schema prepared by Corey Keith
http://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd).

This schema accommodates UNIMARC bibliographic and authority records and allows the embedded
fields technique August 8, 2004 Initial Release 0.1 Janyary 21, 2008 fixed record label regexp
pattern value last for chars /450./ instead of /450 | /)
 */
const MARCXML_UNIMARC_SCHEMA = {
  url: 'https://www.bncf.firenze.sbn.it/progetti/unimarc/slim/documentation/unimarcslim.xsd',
  path: path.join(__dirname, '../schemas/unimarcslim.xsd'),
};

/*
RUSMARC

UNISlim: UNIMARC XML Schema prepared by National Library of Russia and National Library of Florence
based on MarcXchange (ISO 25577) - the general XML schema for MARC formatted records.
</xsd:documentation>
This schema allows XML markup of UNIMARC records as specified in the UNIMARC documentation
(see http://www.ifla.org/VI/3/p1996-1/sec-uni.htm). This schema accommodates UNIMARC records
and allows the embedded fields technique. Implementation of the embedded fields technique
in the Schema follows UNIMARCSLIM Schema prepared by
Giovanni Bergamin and Detlev Schumacher
(http://www.bncf.firenze.sbn.it/unimarc/slim/documentation/unimarcslim.xsd)
*/
const MARCXML_RUSMARC_SCHEMA = {
  url: 'http://rusmarc.ru/shema/UNISlim.xsd',
  path: path.join(__dirname, '../schemas/UNISlim.xsd'),
};
/*
MarcXchange: The general XML schema for MARC formatted records. Prepared by Tommy Schomacker
 - version 1.1 - July 2007.
MarcXchange is made as a generalization
(mainly by weakening restrictions) of the MARCXML schema for MARC21.
MARCXML is made by Corey Keith from the Library of Congress. </xsd:documentation>
<xsd:documentation> The schema supports XML markup of MARC records as specified in ISO 2701.
ISO 2709 defines the following general structure: Record Label - Directory - Record Identifier -
 Reference Fields - Data Fields. In the schema the element "leader"
 is used for ISO 2709 Record Label, the element "control field" for ISO 2709 Record Identifier
 and Reference Fields, and the element "data field" for ISO 2709 Data Fields. The schema has no
 counterpart to ISO 2709 Directory. </xsd:documentation>
<xsd:documentation> Extensions and elucidations: The schema allows the usage of "data fields" for
all legal tags, including 001 to 009, 00A to 00Z and 00a to 00z. Subfield identifiers may consist
 of 8 bits characters from ISO 10646 BMP row 00 (Basic Latin and Latin-1 Supplement).
 Two attributes are introduced to specify the content of a record - "format"
 to specify the MARC format, "type" to specify the kind of record.
 */
const MARCXML_ISO25577_MARC_XCHANGE_SCHEMA = {
  url: 'https://www.loc.gov/standards/iso25577/marcxchange-1-1.xsd',
  path: path.join(__dirname, '../schemas/marcxchange-1-1.xsd'),
};

/**
 * Detection
 * @type {RegExp}
 */
const MARCXML_DETECT_RE = /<([^> ]+:)?record[^<>]+>[^<]*<([^> ]+:)?leader[^>]+>/uig;
const MARCXML_START_MARKER = '<record';
const MARCXML_END_MARKER = '</record>';
const MARCXML_COLLECTION_RE = /(<collection[^>]*>|<[^> ]+:collection[^>]*>)?(.+)(<\/collection[^>]*>|<\/[^> ]+:collection[^>]*>)?/uig;

const XML_MEDIA_TYPE = 'text/xml';
const XML_EXTENSION = 'xml';
const XML_ENCODING = 'UTF-8';
const XML_HEADER = `<?xml version="1.0" standalone="yes" encoding="${XML_ENCODING}" ?>\n`;

const marcObjectFromJson = (rec) => ({
  leader: rec.leader,
  controlfield: flatten(
    Object.keys(rec).filter(
      (k) => isControlFieldTag(k),
    ).map(
      (k) => forceArray(rec[k]).map(
        (fieldRec) => ({
          field: k,
          value: fieldRec,
        }),
      ),
    ),
  ),
  datafield: flatten(
    Object.keys(rec).filter(
      (k) => isDataFieldTag(k),
    ).map(
      (k) => forceArray(rec[k]).map(
        (fieldRec) => ({
          field: k,
          ...fieldRec,
        }),
      ),
    ),
  ),
});
const _formatIndicator = (ind) => ((ind === '_') ? MARC_BLANK_CHAR : ind);

const _mkElementValue = (name, value, doc) => {
  const el = doc.createElement(name);
  const t = doc.createTextNode(value);
  el.appendChild(t);
  return el;
};

const _mkDatafield = (field, doc) => {
  const datafield = doc.createElement('datafield');
  datafield.setAttribute('tag', field.tag);
  datafield.setAttribute('ind1', _formatIndicator(field.ind1));
  datafield.setAttribute('ind2', _formatIndicator(field.ind2));

  field.subfield.forEach((subfield) => {
    const sub = _mkElementValue('subfield', subfield.value, doc);
    sub.setAttribute('code', subfield.code);

    datafield.appendChild(sub);
  });

  return datafield;
};

const _mkControlfield = (tag, value, doc) => {
  const cf = doc.createElement('controlfield');
  cf.setAttribute('tag', tag);
  const t = doc.createTextNode(value);
  cf.appendChild(t);
  return cf;
};

const _XML_SERIALIZER = new xmldom.XMLSerializer();

/**
 * Convert to SLIM-XML
 * @param record
 * @param omitDeclaration
 * @returns {string}
 */
const toSlimXml = async (record, { omitDeclaration = true } = {}) => {
  record = marcObjectFromJson(record);
  const doc = new xmldom.DOMImplementation({}).createDocument();
  const xmlRecord = doc.createElement('record');
  const leader = _mkElementValue('leader', record.leader, doc);

  xmlRecord.appendChild(leader);

  (record.controlfield || []).forEach(
    (field) => {
      xmlRecord.appendChild(
        _mkControlfield(field.tag, field.value, doc),
      );
    },
  );

  (record.datafield || []).forEach(
    (field) => {
      xmlRecord.appendChild(
        _mkDatafield(field, doc),
      );
    },
  );

  const xmlStr = _XML_SERIALIZER.serializeToString(xmlRecord);
  return omitDeclaration
    ? xmlStr
    : [XML_HEADER, xmlStr].join('');
};
// const MARCXML_TO_OBJ_JSONATA = registerJsonata(
//   path.join(__dirname, 'marcxml-to-obj-0.1.0.jsonata'),
// );

const DEFAULT_SLIM_XML_to_JSON_CONFIG = {
  compact: false,
  // alwaysChildren: true,
  alwaysArray: true,
  // trim: false,
  // sanitize: false,
  addParent: false,
};

const fromSlimXml = async (xmlStrs, config = DEFAULT_SLIM_XML_to_JSON_CONFIG) =>
// config = defaults(DEFAULT_SLIM_XML_to_JSON_CONFIG, config);

  flatten(forceArray(xmlStrs).map((xmlStr) => {
    const obj = x2j(
      Buffer.isBuffer(xmlStr) ? xmlStr.toString(MARCXML_ENCODING) : xmlStr,
      defaults(DEFAULT_SLIM_XML_to_JSON_CONFIG, config),
    );
    return flatten(obj.elements.map(
      (parentEl) => parentEl.elements.filter(
        (recordEl) => recordEl.name === 'record',
      ).map(
        (recordEl) => recordEl.elements.reduce(
          (aa, fieldEl) => {
            // {
            //   name,
            //   elements,
            //   attributes,
            // }) => {
            if (fieldEl.name.toLocaleLowerCase() === 'leader') {
              aa.leader = fieldEl.elements.map(({ text }) => text).filter(
                (text) => typeof text !== 'undefined',
              ).join('');
            } else if (fieldEl.name.toLocaleLowerCase() === 'controlfield') {
              aa[fieldEl.attributes.tag] = fieldEl.elements.map(({ text }) => text).filter((x) => typeof x !== 'undefined').join('');
            } else if (fieldEl.name.toLocaleLowerCase() === 'datafield') {
              aa[fieldEl.attributes.tag] = aa[fieldEl.attributes.tag] || [];
              aa[fieldEl.attributes.tag].push(
                fieldEl.elements.reduce(
                  (aaa, el) => {
                    aaa[el.attributes.code] = aaa[el.attributes.code] || [];
                    aaa[el.attributes.code].push(
                      el.elements.map(({ text }) => text).filter(
                        (text) => typeof text !== 'undefined',
                      ).join(''),
                    );
                    return aaa;
                  },
                  {
                    ind1: fieldEl.attributes.ind1,
                    ind2: fieldEl.attributes.ind2,
                  },
                ),
              );
            }
            return aa;
          },
          {},
        ),
      ),
    ));
  }));
module.exports = {
  fromSlimXml,
  toSlimXml,
  XML_MEDIA_TYPE,
  XML_EXTENSION,
  XML_HEADER,
  MARCXML_MEDIA_TYPE,
  MARCXML_ENCODING,
  MARCXML_DETECT_RE,
  MARCXML_EXTENSION,
  MARCXML_MARC21_SCHEMA,
  MARCXML_UNIMARC_SCHEMA,
  MARCXML_RUSMARC_SCHEMA,
  MARCXML_ISO25577_MARC_XCHANGE_SCHEMA,

  MARCXML_START_MARKER,
  MARCXML_END_MARKER,
  MARCXML_COLLECTION_RE,
};
