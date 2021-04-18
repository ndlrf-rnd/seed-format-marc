const path = require('path');
const fs = require('fs');

const NatLibFiSerializers = require('@natlibfi/marc-record-serializers');

const vanilla = NatLibFiSerializers.ISO2709.from;

const { padLeft } = require('../utils/formatting');
const { flattenDeep } = require('../utils/arrays');
const { to } = require('../index');
// const { fromISO2709 } = require('../iso2709');

const PERF_TEST_RECORDS = 1000;
const COMPARE_WITH_VANILLA = false;
const REPORT_EVERY_N_RECORDS = 100;
const OPDS2_MEDIA_TYPE = 'application/opds+json';

const RECORDS = [
  {
    input: 'test.mrc',
    output: 'test.mrc.json',
  },
  {
    input: '1251.mrc',
    output: '1251.mrc.record.json',
  },
  {
    input: 'utf8_with_leader_flag.mrc',
    output: 'utf8_with_leader_flag.mrc.record.json',
  },
  {
    input: 'utf8_without_leader_flag.mrc',
    output: 'utf8_without_leader_flag.mrc.record.json',
  },
].map(({ input, output }) => ({
  input: fs.readFileSync(path.join(__dirname, 'data', input), 'ascii'),
  output: JSON.parse(fs.readFileSync(path.join(__dirname, 'data', output), 'utf-8')),
}));

const tn1 = (new Date()).getTime();
let res1 = 0;
for (let i = 0; i < PERF_TEST_RECORDS; i += 1) {
  // Take keys and log them to avoid JIT skipping execution
  // const parsedRec = fromISO2709(RECORDS[0].input)[0];
  RECORDS.forEach(
    // eslint-disable-next-line no-loop-func
    (rec) => {
      const opdsRec = to[OPDS2_MEDIA_TYPE](rec.input);
      res1 += flattenDeep(opdsRec).length;
    },
  );
  if ((((i + 1) % REPORT_EVERY_N_RECORDS === 0)) || (i + 1 === PERF_TEST_RECORDS)) {
    const nRecPerSec = res1 / (((new Date()).getTime() - tn1) / 1000);
    process.stderr.write(`Record ${i + 1}/${PERF_TEST_RECORDS}\t${padLeft(nRecPerSec.toFixed(1), 13)} rec/sec\n`);
  }
}

if (COMPARE_WITH_VANILLA) {
  const tv1 = (new Date()).getTime();
  let res2 = 0;
  for (let i = 0; i < PERF_TEST_RECORDS; i += 1) {
    res2 += Object.keys(vanilla(RECORDS[0].input)).length;
  }
  // Don't allow jit tp swallow operations producing useless output
  // eslint-disable-next-line no-console
  console.assert(!!res2);
  const tv2 = (new Date()).getTime();

  const vRecPerSec = (1000 / ((tv2 - tv1) / PERF_TEST_RECORDS));
  process.stderr.write(`Vanilla:\t${padLeft(vRecPerSec.toFixed(1), 13)} rec/sec\t${padLeft(`(${100.0.toFixed(1)}`, 13)}%)\n`);
// expect(tn2 - tn1 < tv2 - tv1).toBeTruthy();
}
