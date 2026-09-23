const { readRows, writeRows } = require('./_blob');

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
    const rows = await readRows();
    rows.push([new Date().toISOString(), full_name, business_name, business_type, whatsapp_number]);
    await writeRows(rows);
    res.status(200).json({ ok: true, total: rows.length - 1 });
  } catch (err) {
    console.error('waitlist submission failed', err);
    res.status(500).json({ error: 'Internal error' });
  }
};
