const { put, get } = require('@vercel/blob');
const XLSX = require('xlsx');

// Single stable private file in Vercel Blob storage — every submission reads
// it, appends a row, and re-uploads it, so it stays one real, growing .xlsx
// file rather than one blob per signup. Shared by the submit and download
// endpoints so both agree on the path/schema.
const BLOB_PATH = 'ticked-waitlist.xlsx';
const HEADERS = ['Timestamp', 'Full Name', 'Business Name', 'Business Type', 'WhatsApp Number'];
const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function readWorkbookBuffer() {
  try {
    // useCache:false is essential here — two submissions close together would
    // otherwise both read a cached pre-write snapshot and the second write
    // would silently clobber the first submission's row.
    const result = await get(BLOB_PATH, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  } catch (e) {
    return null; // no file yet
  }
}

async function readRows() {
  const buf = await readWorkbookBuffer();
  if (!buf) return [HEADERS];
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const parsed = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  return parsed && parsed.length ? parsed : [HEADERS];
}

function rowsToBuffer(rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Waitlist');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

async function writeRows(rows) {
  await put(BLOB_PATH, rowsToBuffer(rows), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: XLSX_CONTENT_TYPE
  });
}

module.exports = { readWorkbookBuffer, readRows, writeRows, HEADERS, XLSX_CONTENT_TYPE };
