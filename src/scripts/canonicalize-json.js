const fs = require('fs');
const omit = require('lodash.omit');
const Traverse = require('traverse');
const { forceArray } = require('../utils/arrays');
const { prettyJson } = require('../utils/formatting');
const {
  warn,
  info,
} = require('../utils/log');

const src = process.argv[2];
const dest = process.argv[2].replace(/(\.[^./\\]+)$/uig, '.old$1');
let touched = false;
try {
  const DATA = JSON.parse(fs.readFileSync(src, 'utf-8'));
  // eslint-disable-next-line consistent-return
  Traverse(DATA).forEach((k /* v, a */) => {
    if (k['008'] && k['008']['18-34']) {
      k['008'] = '121025d19621957ru ||||| ||||||   |0rus d'.replace(/^(.{18}).{16}(.*)$/uig, '$1####fr#####||0#u|$2');
      touched = true;
      return k;
    }
    if (k && k.subfield) {
      touched = true;
      return k.subfield.reduce((a, o) => ({
        ...a,
        [o.code]: a[o.code] ? [...forceArray(a[o.code]), o.value] : o.value,
      }), omit(k, ['subfield']));
    }
  });
  if (touched) {
    info(`Canonicalizing marc object JSON ${src} -> ${dest}`);
    fs.copyFileSync(src, dest);
    fs.writeFileSync(src, prettyJson(DATA), 'utf-8');
  } else {
    info(`Skipped ${src} -> ${dest}`);
  }
} catch (e) {
  warn('Canonicalization failed due:', e);
}
