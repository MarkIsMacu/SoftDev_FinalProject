export const generatePDFReport = ({ type, fromDate, toDate, tickets, customers, stats }) => {
  const now = new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' });

  const toDateStr = (d) =>
    typeof d === 'string' ? d.split('T')[0] : new Date(d).toISOString().split('T')[0];

  const total = tickets.length;
  const done = tickets.filter(t => t.status === 'Completed').length;
  const active = tickets.filter(t => t.status === 'In Progress').length;
  const waiting = tickets.filter(t => t.status === 'Awaiting Parts').length;
  const received = tickets.filter(t => t.status === 'Received').length;

  const filtered = tickets.filter(t => {
    if (!fromDate && !toDate) return true;
    const d = new Date(t.date);
    const f = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    return (!f || d >= f) && (!to || d <= to);
  });

  const statusColor = (s) => {
    if (s === 'Completed') return '#00ffa3';
    if (s === 'In Progress') return '#00e5ff';
    if (s === 'Awaiting Parts') return '#ff5e8a';
    return '#888';
  };

  const rows = filtered.map(t => `
    <tr>
      <td class="mono">${t.ticketCode ?? t.id}</td>
      <td>${t.customerName}</td>
      <td>${t.device}</td>
      <td>${t.issue}</td>
      <td>${toDateStr(t.date)}</td>
      <td><span class="badge" style="color:${statusColor(t.status)};border-color:${statusColor(t.status)}30;background:${statusColor(t.status)}15">${t.status}</span></td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CompRepair — ${type} (${fromDate ?? 'All'} to ${toDate ?? 'All'})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; color: #1a1a2e; background: #fff; padding: 0; font-size: 13px; line-height: 1.5; }
    .header { background: linear-gradient(135deg, #0a0a1a 0%, #001133 100%); color: #fff; padding: 2.5rem 3rem 2rem; position: relative; overflow: hidden; }
    .header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #00e5ff, #0066ff, #b06aff); }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .logo { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
    .logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #00e5ff, #0066ff); display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 900; color: #000; font-family: 'Space Grotesk', sans-serif; }
    .logo-name { font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; font-weight: 700; color: #fff; }
    .report-meta { text-align: right; font-size: 0.75rem; color: rgba(255,255,255,0.55); line-height: 1.8; }
    .report-title { font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; font-weight: 700; color: #fff; letter-spacing: -0.03em; }
    .report-subtitle { color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-top: 0.3rem; }
    .body { padding: 2rem 3rem; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
    .kpi-card { border: 1px solid #e8e8f0; border-radius: 10px; padding: 1.2rem; background: #f8f8fc; }
    .kpi-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin-bottom: 0.4rem; font-family: 'Space Grotesk', sans-serif; font-weight: 600; }
    .kpi-value { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; font-weight: 700; color: #1a1a2e; line-height: 1; }
    .kpi-value.green { color: #00a873; }
    .kpi-value.blue  { color: #0066cc; }
    .kpi-value.pink  { color: #cc0044; }
    .section-title { font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #555; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 0.5rem; }
    .section-title::before { content: ''; width: 3px; height: 14px; border-radius: 2px; background: linear-gradient(180deg, #00e5ff, #0066ff); display: block; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-size: 0.82rem; }
    th { text-align: left; padding: 0.7rem 1rem; background: #f0f0f8; font-family: 'Space Grotesk', sans-serif; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #666; border-bottom: 1px solid #e0e0ee; }
    td { padding: 0.8rem 1rem; border-bottom: 1px solid #f0f0f8; vertical-align: middle; }
    tr:hover td { background: #f8f8fc; }
    .mono { font-family: 'Space Mono', monospace; font-size: 0.75rem; color: #0055cc; font-weight: 400; }
    .badge { padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.68rem; font-family: 'Space Grotesk', sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid; }
    .summary-box { border: 1px solid #e0e0ee; border-radius: 10px; padding: 1.5rem 2rem; background: #f8f8fc; margin-bottom: 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
    .summary-key { color: #666; }
    .summary-val { font-weight: 600; color: #1a1a2e; font-family: 'Space Grotesk', sans-serif; }
    .footer { margin-top: 3rem; padding: 1.5rem 3rem; background: #f8f8fc; border-top: 1px solid #e8e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: #999; }
    .footer strong { color: #555; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      @page { margin: 0; size: A4; }
    }
    .print-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 999; background: #1a1a2e; color: #fff; padding: 0.75rem 2rem; display: flex; align-items: center; justify-content: space-between; font-family: 'Space Grotesk', sans-serif; box-shadow: 0 2px 12px rgba(0,0,0,0.3); }
    .print-bar span { font-size: 0.85rem; color: rgba(255,255,255,0.7); }
    .print-btn { background: linear-gradient(135deg, #00e5ff, #0066ff); color: #000; border: none; border-radius: 8px; padding: 0.55rem 1.5rem; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
    body { padding-top: 48px; }
    @media print { .print-bar { display: none; } body { padding-top: 0; } }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <span>📄 Preview — CompRepair ${type}</span>
    <button class="print-btn" onclick="window.print()">⬇ Save as PDF / Print</button>
  </div>

  <div class="header">
    <div class="header-top">
      <div>
        <div class="logo">
          <div class="logo-icon">⚡</div>
          <span class="logo-name">CompRepair System</span>
        </div>
        <div class="report-title">${type}</div>
        <div class="report-subtitle">Period: ${fromDate ?? 'All time'} — ${toDate ?? 'Present'}</div>
      </div>
      <div class="report-meta">
        <div>Generated: ${now}</div>
        <div>Total tickets in period: ${filtered.length}</div>
        <div>Total clients: ${customers.length}</div>
        <div style="margin-top:0.5rem;font-size:0.65rem;color:rgba(255,255,255,0.3)">CONFIDENTIAL — INTERNAL USE ONLY</div>
      </div>
    </div>
  </div>

  <div class="body">
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Total Tickets</div><div class="kpi-value">${total}</div></div>
      <div class="kpi-card"><div class="kpi-label">Completed</div><div class="kpi-value green">${done}</div></div>
      <div class="kpi-card"><div class="kpi-label">In Progress</div><div class="kpi-value blue">${active}</div></div>
      <div class="kpi-card"><div class="kpi-label">Awaiting Parts</div><div class="kpi-value pink">${waiting}</div></div>
    </div>

    <div class="section-title">Summary Overview</div>
    <div class="summary-box">
      <div>
        <div class="summary-row"><span class="summary-key">Received</span><span class="summary-val">${received}</span></div>
        <div class="summary-row"><span class="summary-key">In Progress</span><span class="summary-val">${active}</span></div>
        <div class="summary-row"><span class="summary-key">Awaiting Parts</span><span class="summary-val">${waiting}</span></div>
        <div class="summary-row"><span class="summary-key">Completed</span><span class="summary-val">${done}</span></div>
      </div>
      <div>
        <div class="summary-row"><span class="summary-key">Total Registered Clients</span><span class="summary-val">${customers.length}</span></div>
        <div class="summary-row"><span class="summary-key">Completion Rate</span><span class="summary-val">${total > 0 ? Math.round((done / total) * 100) : 0}%</span></div>
        <div class="summary-row"><span class="summary-key">Active Repairs</span><span class="summary-val">${active + waiting}</span></div>
        <div class="summary-row"><span class="summary-key">Report Period</span><span class="summary-val">${fromDate ?? 'All'} → ${toDate ?? 'Now'}</span></div>
      </div>
    </div>

    <div class="section-title">Repair Ticket Details (${filtered.length} records)</div>
    ${filtered.length === 0
      ? '<p style="color:#999;text-align:center;padding:2rem 0;font-style:italic;">No tickets found for the selected period.</p>'
      : `<table>
          <thead><tr><th>Ticket ID</th><th>Client</th><th>Device</th><th>Issue</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`
    }

    <div class="section-title">Registered Clients (${customers.length})</div>
    <table>
      <thead><tr><th>Name</th><th>Contact Email</th><th>Phone</th><th>Total Repairs</th><th>Joined</th></tr></thead>
      <tbody>
        ${customers.map(c => `
          <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.email}</td>
            <td>${c.phone}</td>
            <td style="text-align:center;font-weight:700">${c.totalRepairs ?? 0}</td>
            <td>${c.joined}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <div><strong>CompRepair Computer Repair Management System</strong> — ${type}</div>
    <div>Generated ${now} · Confidential</div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to generate the PDF report.'); return; }
  win.document.write(html);
  win.document.close();
};