/**
 *
 * @licstart  The following is the entire license notice for the JavaScript code in this file.
 *
 * ISC License
 *
 * Modified work: Copyright (c) 2015, 2017 University Of Helsinki (The National Library Of Finland)
 * Original work: Copyright (c) 2015 Pasi Tuominen
 *
 * Permission to use, copy, modify, and/or distribute this software for
 * any purpose with or without fee is hereby granted, provided that the
 * above copyright notice and this permission notice appear in all
 * copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND ISC DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL ISC BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT
 * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * @licend  The above is the entire license notice
 * for the JavaScript code in this file.
 *
 * */
const { isObject } = require('../utils/types');
const { padLeft } = require('../utils/formatting');
const { isControlFieldTag } = require('../fields');
const {
  MARC_DIRECTORY_INDEX_SIZE,
  MARC_LEADER_LENGTH,
  MARC_FTC_CHAR,
  MARC_RECORD_SEPARATION_CHAR,
  MARC_SD_CHAR,
  MARC_BLANK_CHAR,
  MARC_FIELD_LENGTH_START,
  MARC_DIRECTORY_INDEX_START,
} = require('../constants');

// Returns the length of the input string in UTF8 bytes
const lengthInBytes = (str) => {
  const match = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (match ? match.length : 0);
};

/**
 * Converts the byte array to a UTF-8 string.
 */
const toString = (input) => (Buffer.isBuffer(input) ? input.toString('utf-8') : input);
// In original library is was defines as
// const byteArrayToString = (byte_array) => byte_array.toString('utf-8');

/**
 * Removes leading zeros from a numeric data field.
 */
const trimNumericField = (input) => {
  while (input.length > 1 && input.charAt(0) === '0') {
    input = input.substring(1);
  }
  return parseInt(input, 10);
};

// /**
//  * Returns an array of 12-character directory entries.
//  */
// const parseDirectory = (recordStr) => {
//   const directory = parseDirectory(recordStr);
//   const entries = [];
//   let pos = 0;
//   // let count = 0;
//   while (directoryStr.length - pos >= MARC_DIRECTORY_INDEX_SIZE) {
//     const entryStr = directoryStr.substring(pos, pos + MARC_DIRECTORY_INDEX_SIZE);
//     entries.push(entryStr);
//     pos += MARC_DIRECTORY_INDEX_SIZE;
//   }
//   return entries;
// };

/**
 * Returns a UTF-8 substring
 * @param str
 * @param start_in_bytes
 * @param length_in_bytes
 */
const substrUTF8 = (str, start_in_bytes, length_in_bytes) => toString(
  str.slice(start_in_bytes, start_in_bytes + length_in_bytes),
);

// Converts the input UTF-8 string to a byte array.
const toBuffer = (input) => (
  // eslint-disable-next-line no-nested-ternary
  isObject(input)
    ? input.type === 'Buffer' ? Buffer.from(input.data) : input
    : (
      Buffer.isBuffer(input)
        ? input
        : Buffer.from(input, 'utf8')
    )
);

// Adds leading zeros to the specified numeric field
const addLeadingZeros = (num_field, length) => {
  while (num_field.toString().length < length) {
    num_field = `0${num_field.toString()}`;
  }

  return num_field;
};

const processSubfieldStr = (str) => {
  const subfields = [];
  let currElementStr = '';

  str.split('').forEach(
    (symbol, index, arr) => {
      // MARC_SD_CHAR begins a new subfield, '\x1E' MARC_FTC_CHAR ends all fields
      if (
        (
          symbol === MARC_SD_CHAR
        ) || (
          symbol.charAt(index) === MARC_FTC_CHAR
        ) || (
          index === arr.length - 1
        )
      ) {
        if (currElementStr !== '') {
          if (index === arr.length - 1) {
            currElementStr += symbol;
          }

          // Remove trailing control characters
          const lastChar = currElementStr.charAt(currElementStr.length - 1);
          if ((lastChar === MARC_SD_CHAR) || (lastChar === MARC_FTC_CHAR)) {
            currElementStr = currElementStr.substring(0, currElementStr.length - 1);
          }

          subfields.push({
            code: currElementStr.charAt(0),
            value: currElementStr.substring(1),
          });
          currElementStr = '';
        }
      } else {
        currElementStr += symbol;
      }
    },
  );
  return subfields;
};

const sanitizeIndicator = (indStr) => {
  const ind = indStr.replace(/[^a-z0-9]/ig, MARC_BLANK_CHAR);
  return ((ind === MARC_SD_CHAR) ? MARC_BLANK_CHAR : ind);
};

/**
 * Returns the entire directory starting at position 24. Control character
 * '\x1E' marks the end of directory
 */
const convertRecordFromISO2709 = (input) => {
  const recordStr = toString(input);
  const fieldsAcc = {
    leader: recordStr.substring(0, MARC_LEADER_LENGTH),
  };
  // Locate start of data fields (First occurrence of '\x1E')
  const dataFieldStr = recordStr.substring(
    recordStr.search(MARC_FTC_CHAR) + 1,
  );
  const dataFieldStrUtf8 = toBuffer(dataFieldStr);

  let currentChar = '';
  let directoryStr = '';
  let pos = MARC_LEADER_LENGTH;
  while (currentChar !== MARC_FTC_CHAR) {
    currentChar = recordStr.charAt(pos);
    if (currentChar !== MARC_FTC_CHAR) {
      directoryStr += currentChar;
    }
    pos += 1;
    if (
      (recordStr.length === 0) || (
        // FIXME: SIGNIFICANT CHANGE WAS MADE HERE TO FIX INVALID EXPR PRECEDENCE
        // eslint-disable-next-line no-control-regex
        (recordStr.length < 13) && (recordStr.replace(/[\u0000\r\n\t]+$/uig, '').length === 0)
      )
    ) {
      break;
    }
    if (pos > recordStr.length) {
      throw new Error(`Invalid record: ${recordStr} with length ${recordStr.length}`);
    }
  }

  pos = 0;
  while (directoryStr.length - pos >= MARC_DIRECTORY_INDEX_SIZE) {
    const entryStr = directoryStr.substring(pos, pos + MARC_DIRECTORY_INDEX_SIZE);
    // entries.push({
    const tag = entryStr.substring(0, 3);
    const fieldLength = trimNumericField(
      entryStr.substring(MARC_FIELD_LENGTH_START, MARC_DIRECTORY_INDEX_START),
    );
    const startCharPos = trimNumericField(
      entryStr.substring(MARC_DIRECTORY_INDEX_START, MARC_DIRECTORY_INDEX_SIZE),
    );

    // Append control fields for tags 00X
    if (isControlFieldTag(tag)) {
      fieldsAcc[tag] = dataFieldStr.substring(startCharPos, startCharPos + fieldLength - 1);
    } else {
      // Otherwise, append a data field
      let dataElementStr = substrUTF8(dataFieldStrUtf8, startCharPos, fieldLength);

      if (dataElementStr[2] !== MARC_SD_CHAR) {
        dataElementStr = dataFieldStr[startCharPos - 1] + dataElementStr;
      }

      // Convert MARC_SD_CHAR characters to spaces for valid XML output
      dataElementStr = dataElementStr || `${MARC_BLANK_CHAR}${MARC_BLANK_CHAR}`;

      // Parse subfields
      const sfStr = dataElementStr.substring(2);
      fieldsAcc[tag] = fieldsAcc[tag] || [];
      /*
        subfield code - The two-character combination of a delimiter followed by a data element
        identifier. Subfield codes are not used in control fields.
        subfield code length.
        A data element in the leader which contains the sum of the lengths of the delimiter
        and the data element identifier used in the record. Always set to 2 in MARC 21 records.
       */
      fieldsAcc[tag].push(
        processSubfieldStr(sfStr).reduce(
          (acc, {
            code,
            value,
          }) => {
            acc[code] = acc[code] || [];
            acc[code].push(value);
            return acc;
          },
          {
            ind1: sanitizeIndicator(dataElementStr.charAt(0)),
            ind2: sanitizeIndicator(dataElementStr.charAt(1)),
          },
        ),
      );
    }
    pos += MARC_DIRECTORY_INDEX_SIZE;
  }
  return fieldsAcc;
};

const splitRecords = async (input, separator = MARC_RECORD_SEPARATION_CHAR) => {
  let offset = 0;
  const result = [];
  const recordBuffer = toBuffer(input);
  while (offset !== -1) {
    const id = recordBuffer.indexOf(separator, offset);
    if (id !== -1) {
      result.push(recordBuffer.slice(offset, id + 1));
      offset = id + 1;
    } else {
      break;
    }
  }
  if (offset < recordBuffer.byteLength) {
    const newRecord = recordBuffer.slice(offset);
    if (newRecord.length > 1) {
      result.push(newRecord);
    }
  }
  return result;
};

const convertRecordToISO2709 = (recordObj) => {
  let record_str = '';
  let directoryStr = '';
  let datafieldStr = '';
  let leader = recordObj.leader;
  let char_pos = 0;

  const cf = recordObj.controlfield || (
    recordObj.getControlfields ? recordObj.getControlfields() : []
  );
  const df = recordObj.datafield || (
    recordObj.getDatafields ? recordObj.getDatafields() : []
  );

  cf.forEach((field) => {
    directoryStr += field.tag;

    if ((typeof field.value === 'undefined') || (field.value.length === 0)) {
      // Special case: control field contents empty
      directoryStr += addLeadingZeros(1, 4);
      directoryStr += addLeadingZeros(char_pos, 5);
      char_pos += 1;
      datafieldStr += MARC_FTC_CHAR;
    } else {
      directoryStr += addLeadingZeros(field.value.length + 1, 4);

      // Add character position
      directoryStr += addLeadingZeros(char_pos, 5);

      // Advance character position counter
      char_pos += lengthInBytes(field.value) + 1;
      datafieldStr += (field.value + MARC_FTC_CHAR);
    }
  });

  df.forEach(
    (field) => {
      let currentDatafield = '';
      const {
        tag,
        ind1,
        ind2,
      } = field;

      // Add tag to directory
      directoryStr += tag;

      // Add indicators
      datafieldStr += ((ind1 || MARC_BLANK_CHAR) + (ind2 || MARC_BLANK_CHAR) + MARC_SD_CHAR);
      const sf = (field.subfield || field.subfields);
      sf.forEach((subfield, index) => {
        let subfieldStr = subfield.code + subfield.value;

        // Add separator for subfield or data field
        subfieldStr += index === sf.length - 1 ? MARC_FTC_CHAR : MARC_SD_CHAR;
        currentDatafield += subfieldStr;
      });

      datafieldStr += currentDatafield;

      // Add length of field containing indicators and a separator (3 characters total)
      directoryStr += addLeadingZeros(toBuffer(currentDatafield).length + 3, 4);

      // Add character position
      directoryStr += addLeadingZeros(char_pos, 5);

      // Advance character position counter
      char_pos += lengthInBytes(currentDatafield) + 3;
    },
  );

  // Recalculate and write new string length into leader
  const newStrLen = toBuffer(
    [
      leader,
      directoryStr,
      MARC_FTC_CHAR,
      datafieldStr,
      MARC_RECORD_SEPARATION_CHAR,
    ].join(''),
  ).length;
  leader = padLeft(newStrLen, '0', 5) + leader.substring(5);

  // Recalculate base address position
  const newBaseAddressPos = MARC_LEADER_LENGTH + directoryStr.length + 1;
  leader = [
    leader.substring(0, MARC_DIRECTORY_INDEX_SIZE),
    padLeft(newBaseAddressPos, '0', 5),
    leader.substring(17),
  ].join('');
  record_str += [
    leader,
    directoryStr,
    MARC_FTC_CHAR,
    datafieldStr,
    MARC_RECORD_SEPARATION_CHAR,
  ].join('');
  return record_str;
};

// The last element will always be empty because records end in char 1D
// eslint-disable-next-line no-control-regex
const fromISO2709 = async (record_data /* config */) => (
  await splitRecords(record_data)
).map(
  (rec) => convertRecordFromISO2709(rec),
).reduce(
  // eslint-disable-next-line no-nested-ternary
  (product, item) => (item
    ? (Array.isArray(product) ? product.concat(item) : [product, item])
    : product),
  [],
);

const toISO2709 = async (record_data) => (
  Array.isArray(record_data)
    ? record_data.reduce((product, item) => product + convertRecordToISO2709(item), '')
    : convertRecordToISO2709(record_data)
);

module.exports = {
  splitRecords,
  fromISO2709,
  toISO2709,
  toString,
  toBuffer,
};
