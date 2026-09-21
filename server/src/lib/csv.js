// RFC 4180 CSV for Excel: fields quoted when needed, CRLF line ends, UTF-8 BOM so names keep their characters.
// A cell starting with = + - @ (or tab/CR) would run as a formula in Excel ("CSV injection"): prefix it with '.
function cell(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header, rows) {
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

module.exports = { toCsv, cell };
