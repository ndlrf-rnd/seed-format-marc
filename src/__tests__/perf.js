const path = require('path');
const fs = require('fs');

const { padLeft } = require('../utils/formatting');
const { flattenDeep } = require('../utils/arrays');
const MarcIf = require('../index');

const PERF_TEST_RECORDS = 1000;
const REPORT_EVERY_N_RECORDS = 100;

const RECORDS = [
  {
    input: 'test.mrc',
    output: 'test.mrc.json',
  },
  {
    input: '1251.mrc',
    output: '1251.objects.json',
  },
  {
    input: 'utf8_with_leader_flag.mrc',
    output: 'utf8_with_leader_flag.objects.json',
  },
  {
    input: 'utf8_without_leader_flag.mrc',
    output: 'utf8_without_leader_flag.objects.json',
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
      const opdsRec = MarcIf.toObjects(rec.input);
      res1 += flattenDeep(opdsRec).length;
    },
  );
  if ((((i + 1) % REPORT_EVERY_N_RECORDS === 0)) || (i + 1 === PERF_TEST_RECORDS)) {
    const nRecPerSec = res1 / (((new Date()).getTime() - tn1) / 1000);
    process.stderr.write(`Record ${i + 1}/${PERF_TEST_RECORDS}\t${padLeft(nRecPerSec.toFixed(1), 13)} rec/sec\n`);
  }
}
