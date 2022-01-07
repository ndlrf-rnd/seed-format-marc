const defaults = require('lodash.defaults');
const path = require('path');
const xmldom = require('xmldom');
const { MARC_BLANK_CHAR } = require('../constants');
const {
  XML_HEADER,
  MARCXML_ENCODING,
} = require('./constants-marcxml');
const { registerJsonata } = require('../utils/jsonata');
const { x2j } = require('../utils/x2j');

const {
  isControlFieldTag,
  isDataFieldTag,
} = require('../fields');

const {
  flatten,
  forceArray,
} = require('../utils/arrays');

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
const toSlimXml = (record, { omitDeclaration = true } = {}) => {
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
const MARCXML_TO_OBJ_JSONATA = registerJsonata(
  path.join(__dirname, 'marcxml-to-obj-0.1.0.jsonata'),
);

const DEFAULT_SLIM_XML_to_JSON_CONFIG = {
  compact: false,
  // alwaysChildren: true,
  alwaysArray: true,
  // trim: false,
  // sanitize: false,
  addParent: false,
};

const fromSlimXml = (xmlStr, config = DEFAULT_SLIM_XML_to_JSON_CONFIG) => {
  config = defaults(DEFAULT_SLIM_XML_to_JSON_CONFIG, config);
  const input = Buffer.isBuffer(xmlStr) ? xmlStr.toString(MARCXML_ENCODING) : xmlStr;
  const obj = x2j(
    input,
    config,
  );
  return MARCXML_TO_OBJ_JSONATA(obj);
};
module.exports = {
  fromSlimXml,
  toSlimXml,
};
