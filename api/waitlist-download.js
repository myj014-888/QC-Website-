const { readWorkbookBuffer, XLSX_CONTENT_TYPE } = require('./_blob');

// Gated by a long random secret (ADMIN_SECRET) rather than public/no-auth,
// since the underlying data is real client contact info. Visit
// /api/waitlist-download?key=<ADMIN_SECRET> to pull the latest .xlsx.
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = req.query && req.query.key;
  if (!process.env.ADMIN_SECRET || key !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: 'Forbidden' });
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
