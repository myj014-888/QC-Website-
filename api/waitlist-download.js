const { readWorkbookBuffer, writeRows, HEADERS, XLSX_CONTENT_TYPE } = require('./_blob');

// Gated by a long random secret (ADMIN_SECRET) rather than public/no-auth,
// since the underlying data is real client contact info.
// GET  /api/waitlist-download?key=<ADMIN_SECRET>          -> download latest .xlsx
// DELETE /api/waitlist-download?key=<ADMIN_SECRET>&reset=1 -> wipe back to headers only
module.exports = async (req, res) => {
  const key = req.query && req.query.key;
  if (!process.env.ADMIN_SECRET || key !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (req.method === 'DELETE') {
    if (req.query.reset !== '1') {
      res.status(400).json({ error: 'Pass reset=1 to confirm wiping all rows' });
      return;
    }
    try {
      await writeRows([HEADERS]);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('waitlist reset failed', err);
      res.status(500).json({ error: 'Internal error' });
    }
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const buf = await readWorkbookBuffer();
    if (!buf) {
      res.status(404).json({ error: 'No submissions yet' });
      return;
    }
    res.setHeader('Content-Type', XLSX_CONTENT_TYPE);
    res.setHeader('Content-Disposition', 'attachment; filename="ticked-waitlist.xlsx"');
    res.status(200).send(buf);
  } catch (err) {
    console.error('waitlist download failed', err);
    res.status(500).json({ error: 'Internal error' });
  }
};
