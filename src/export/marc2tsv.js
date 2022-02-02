const { getMarcRecordFormat } = require('../detect');
const { detectDialect } = require('../dialects/index');
const { forceArray } = require('../utils/arrays');
const {
  TSV_CELL_SEPARATOR,
  TSV_LINE_SEPARATOR,
} = require('../constants');

const { defaults } = require('../utils/objects');

const getControlNumber = (rec) => `${rec['001'] || ''}`;

const expandMarcObj = (rec) => {
  const kvObj = {};
  Object.keys(rec).forEach((k) => {
    forceArray(rec[k]).forEach(
      (fieldValue) => {
        if (typeof fieldValue === 'string') {
          kvObj[k] = kvObj[k] || [];
          kvObj[k].push(fieldValue);
        } else {
          Object.keys(fieldValue).filter(
            (subfieldCode) => subfieldCode.length === 1,
          ).sort().forEach((subfieldCode) => {
            forceArray(fieldValue[subfieldCode]).forEach(
              (subfieldValue) => {
                if (subfieldValue.trim().length > 0) {
                  const expandedKey = `${k}.${subfieldCode}.${fieldValue.ind1}.${fieldValue.ind2}`;
                  // console.error('kvobj', 'kvobj', kvObj)
                  if (!Array.isArray(kvObj[expandedKey])) {
                    kvObj[expandedKey] = [];
                  }
                  kvObj[expandedKey].push(subfieldValue);
                }
              },
            );
          });
        }
      },
    );
  });
  return kvObj;
};

const TSV_HEADER = [
  'dialect', 'format',
  'code', 'subfield',
  'ind1', 'ind2',
  'value', 'record',
];

const MARC2TSV_DEFAULT_CONFIG = {
  header: false,
  cellSeparator: TSV_CELL_SEPARATOR,
  rowSeparator: TSV_LINE_SEPARATOR,
};

const marcRec2tsv = (
  rec,
  config,
) => {
  const {
    header,
    cellSeparator,
    rowSeparator,
  } = defaults(config, MARC2TSV_DEFAULT_CONFIG);
  const rows = [];
  if (rec) {
    const dialect = detectDialect(rec);
    const format = getMarcRecordFormat(rec);
    const expandedEntity = expandMarcObj(rec);
    const controlNumber = getControlNumber(rec);
    Object.keys(expandedEntity).sort().forEach((marcField) => {
      forceArray(expandedEntity[marcField]).forEach((value) => {
        rows.push([
          // dialect, format
          dialect, format,
          // field, subfield, ind1, ind2
          ...(marcField + ('.'.repeat(3))).split('.').slice(0, 4),
          // value, controlNumber
          value, controlNumber,
        ]);
      });
    });
  }
  const outputRows = (header ? [TSV_HEADER, ...rows] : rows);

  return [
    ...outputRows.map(
      (row) => `${row.map(
        (v) => ((v === null) || (typeof v === 'undefined') ? '' : `${v}`),
      ).join(cellSeparator)}${rowSeparator}`,
    ),
  ].join('');
};

const marc2tsv = async (recs, config) => forceArray(recs).map(
  (obj, idx) => marcRec2tsv(
    obj,
    defaults(
      { header: config.header ? idx === 0 : false },
      config,
      MARC2TSV_DEFAULT_CONFIG,
    ),
  ),
).join('');

module.exports = {
  MARC2TSV_DEFAULT_CONFIG,
  expandMarcObj,
  marcRec2tsv,
  marc2tsv,
};
