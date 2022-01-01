const fs = require('fs');
const path = require('path');
const { forceArray } = require('./utils/arrays');

const OUTPUT_PATH = path.join(__dirname, 'relator-codes-rusmarc-to-marc.json');
const COMPACT = true;

const rslMarc21Trans = JSON.parse(fs.readFileSync(path.join(__dirname, 'rsl_marc_relators_translations.json'), 'utf-8'));
const rusmarcCodes = JSON.parse(fs.readFileSync(path.join(__dirname, 'rusmarc_relator_codes.json'), 'utf-8'));

Object.keys(rusmarcCodes).sort().forEach((rusmarcCode) => {
  const rmTe = rusmarcCodes[rusmarcCode].title_eng;
  const mappedMarc21Code = Object.keys(rslMarc21Trans).sort().filter(
    (marc21Code) => forceArray(rslMarc21Trans[marc21Code].title_eng).filter(
      (v) => rmTe.filter(
        (vv) => vv.toLowerCase() === v.toLowerCase(),
      ).length > 0,
    ).length > 0,
  )[0];
  if (COMPACT) {
    rusmarcCodes[rusmarcCode] = mappedMarc21Code;
  } else {
    rusmarcCodes[rusmarcCode].code_rusmarc = rusmarcCode;
    rusmarcCodes[rusmarcCode].code_marc21 = mappedMarc21Code;
  }
  if (!mappedMarc21Code) {
    // eslint-disable-next-line no-console
    process.stderr.write(`ERROR: Code ${rusmarcCode} not found, ${rusmarcCodes[rusmarcCode]} ${rmTe} ${mappedMarc21Code}\n`);
  }

  if (fs.existsSync(OUTPUT_PATH)) {
    fs.unlinkSync(OUTPUT_PATH);
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(rusmarcCodes, null, 2), 'utf-8');
});
