const { readRows, readWorkbookBuffer, writeRows, HEADERS, XLSX_CONTENT_TYPE } = require('./_blob');
const { requireAuth } = require('./_auth');

// Gated by HTTP Basic Auth (browser password prompt) since the underlying
// data is real client contact info.
// GET    /api/waitlist-download                 -> download latest .xlsx
// DELETE /api/waitlist-download?row=2,3          -> remove specific spreadsheet row number(s), 2-indexed (row 1 is headers)
// DELETE /api/waitlist-download?reset=1          -> wipe every submission, back to headers only
module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  if (req.method === 'DELETE') {
    try {
      if (req.query.reset === '1') {
        await writeRows([HEADERS]);
        res.status(200).json({ ok: true, remaining: 0 });
        return;
      }
      if (req.query.row) {
        const targets = new Set(String(req.query.row).split(',').map(function (n) { return parseInt(n, 10); }));
        const rows = await readRows();
        const kept = rows.filter(function (_, i) { return i === 0 || !targets.has(i + 1); });
        await writeRows(kept);
        res.status(200).json({ ok: true, remaining: kept.length - 1 });
        return;
      }
      res.status(400).json({ error: 'Pass row=<n>[,<n>...] to delete specific rows, or reset=1 to wipe all' });
    } catch (err) {
      console.error('waitlist delete failed', err);
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
