const { readRows, writeRows, HEADERS } = require('./_blob');

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
  const consent = body.consent === true || body.consent === 'true';

  if (!full_name || !business_name || !business_type || !whatsapp_number) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // Checked here as well as in the browser: the page's own check can be
  // skipped, and a signup we cannot show was consented to is one we should
  // not have taken.
  if (!consent) {
    res.status(400).json({ error: 'Terms and privacy policy must be accepted' });
    return;
  }

  try {
    const rows = await readRows();
    // The sheet predates this column, so its header row is brought up to date
    // the first time a consented signup is written to it.
    if (!rows[0] || rows[0].length < HEADERS.length) rows[0] = HEADERS;
    rows.push([
      new Date().toISOString(), full_name, business_name, business_type, whatsapp_number, 'Accepted'
    ]);
    await writeRows(rows);
    res.status(200).json({ ok: true, total: rows.length - 1 });
  } catch (err) {
    console.error('waitlist submission failed', err);
    res.status(500).json({ error: 'Internal error' });
  }
};
