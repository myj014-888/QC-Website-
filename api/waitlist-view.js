const { readRows } = require('./_blob');
const { requireAuth } = require('./_auth');

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function fmtDate(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return esc(iso);
  return d.toLocaleString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function waLink(number) {
  var digits = String(number).replace(/[^\d]/g, '');
  return 'https://wa.me/' + digits;
}

// GET /api/waitlist-view — a live, human-readable table of every submission,
// newest first, with a WhatsApp link per row and a delete action. Reload the
// page to see new signups; no file download needed.
module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const rows = await readRows();
    const dataRows = rows.slice(1); // drop header row

    const tableRows = dataRows
      .map(function (r, i) { return { r: r, rowNum: i + 2 }; }) // 1-indexed sheet row, matches waitlist-download's row= param
      .reverse() // newest first
      .map(function (item) {
        var r = item.r;
        return '<tr>' +
          '<td class="ts">' + esc(fmtDate(r[0])) + '</td>' +
          '<td>' + esc(r[1]) + '</td>' +
          '<td>' + esc(r[2]) + '</td>' +
          '<td>' + esc(r[3]) + '</td>' +
          '<td><a class="wa" href="' + esc(waLink(r[4])) + '" target="_blank" rel="noopener">' + esc(r[4]) + '</a></td>' +
          '<td><button class="del" data-row="' + item.rowNum + '">Delete</button></td>' +
          '</tr>';
      })
      .join('');

    const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<meta name="robots" content="noindex, nofollow">' +
      '<title>Ticked Waitlist</title>' +
      '<style>' +
      ':root{--bg:#111310;--card:#181b17;--line:rgba(255,255,255,0.1);--text:#ece7dd;--muted:rgba(236,231,221,0.6);--green:#22C55E;--green-bright:#4ADE80;}' +
      '*{box-sizing:border-box;}' +
      'body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,Segoe UI,Manrope,sans-serif;padding:32px 20px 80px;}' +
      '.wrap{max-width:1100px;margin:0 auto;}' +
      'h1{font-size:26px;margin:0 0 4px;}' +
      '.sub{color:var(--muted);font-size:14px;margin:0 0 26px;}' +
      '.bar{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:22px;}' +
      '.count{background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);color:var(--green-bright);padding:6px 14px;border-radius:999px;font-size:13px;font-weight:700;}' +
      'a.dl,button.refresh{background:var(--green);color:#07170d;border:none;padding:9px 16px;border-radius:999px;font-weight:700;font-size:13px;text-decoration:none;cursor:pointer;}' +
      '.tablewrap{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:auto;}' +
      'table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:820px;}' +
      'th{text-align:left;padding:12px 14px;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid var(--line);white-space:nowrap;}' +
      'td{padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top;}' +
      'tr:last-child td{border-bottom:none;}' +
      '.ts{color:var(--muted);white-space:nowrap;}' +
      'a.wa{color:var(--green-bright);text-decoration:none;}' +
      'a.wa:hover{text-decoration:underline;}' +
      'button.del{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.35);color:#fca5a5;padding:6px 12px;border-radius:8px;font-size:12px;cursor:pointer;}' +
      'button.del:hover{background:rgba(239,68,68,0.2);}' +
      '.empty{padding:40px;text-align:center;color:var(--muted);}' +
      '</style></head><body>' +
      '<div class="wrap">' +
      '<h1>Ticked Waitlist</h1>' +
      '<p class="sub">Reload this page any time to see new submissions — nothing to download.</p>' +
      '<div class="bar"><span class="count">' + dataRows.length + ' signup' + (dataRows.length === 1 ? '' : 's') + '</span>' +
      '<a class="dl" href="/api/waitlist-download">Download .xlsx</a>' +
      '<button class="refresh" onclick="location.reload()">Refresh</button></div>' +
      '<div class="tablewrap">' +
      (dataRows.length
        ? '<table><thead><tr><th>Submitted</th><th>Full Name</th><th>Business</th><th>Type</th><th>WhatsApp</th><th></th></tr></thead><tbody>' + tableRows + '</tbody></table>'
        : '<div class="empty">No submissions yet.</div>') +
      '</div></div>' +
      '<script>' +
      'document.querySelectorAll(".del").forEach(function(btn){' +
      'btn.addEventListener("click", function(){' +
      'if(!confirm("Delete this submission?")) return;' +
      'fetch("/api/waitlist-download?row=" + btn.dataset.row, {method:"DELETE"}).then(function(r){' +
      'if(r.ok) location.reload(); else alert("Delete failed");' +
      '});' +
      '});' +
      '});' +
      '</script>' +
      '</body></html>';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (err) {
    console.error('waitlist view failed', err);
    res.status(500).send('Internal error');
  }
};
