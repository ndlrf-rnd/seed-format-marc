const SaxonJS = require('saxon-js');
const { BF2_VANILLA_XSLT_NAME } = require('../constants');
const { forceArray } = require('../utils/arrays');

const mrc2bf2rdf = (recs /* ctx */) => Promise.all(
  forceArray(recs).map(
    (rec) => new Promise(
      (resolve, reject) => {
        SaxonJS.transform({
          stylesheetFileName: BF2_VANILLA_XSLT_NAME,
          sourceText: rec,
          destination: 'serialized',
        }, 'async').catch((err) => reject(err)).then(
          (output) => {
            resolve(output.principalResult);
          },
        );
      },
    ),
  ),
);

module.exports = { mrc2bf2rdf };
