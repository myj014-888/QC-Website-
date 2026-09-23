const { put, head } = require('@vercel/blob');
const XLSX = require('xlsx');

// Single stable file in Vercel Blob storage — every submission downloads it,
// appends a row, and re-uploads it, so it stays one real, growing .xlsx file
// rather than one blob per signup.
const BLOB_PATH = 'ticked-waitlist.xlsx';
const HEADERS = ['Timestamp', 'Full Name', 'Business Name', 'Business Type', 'WhatsApp Number'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (!body || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; }
  }

  const full_name = String(body.full_name || '').trim();
  const business_name = String(body.business_name || '').trim();
  const business_type = String(body.business_type || '').trim();
  const whatsapp_number = String(body.whatsapp_number || '').trim();

  if (!full_name || !business_name || !business_type || !whatsapp_number) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    let rows = [HEADERS];

    let existingUrl = null;
    try {
      const info = await head(BLOB_PATH);
      existingUrl = info.url;
    } catch (e) {
      existingUrl = null; // no file yet — first submission creates it
    }

    if (existingUrl) {
      const resp = await fetch(existingUrl, { cache: 'no-store' });
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        const wb = XLSX.read(buf, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (parsed && parsed.length) rows = parsed;
      }
    }

    rows.push([new Date().toISOString(), full_name, business_name, business_type, whatsapp_number]);

    const newWs = XLSX.utils.aoa_to_sheet(rows);
    newWs['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 18 }];
    const newWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWb, newWs, 'Waitlist');
    const outBuf = XLSX.write(newWb, { type: 'buffer', bookType: 'xlsx' });

    await put(BLOB_PATH, outBuf, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    res.status(200).json({ ok: true, total: rows.length - 1 });
  } catch (err) {
    console.error('waitlist submission failed', err);
    res.status(500).json({ error: 'Internal error' });
  }
};
