/* build.js — regenerates data.json for the Sennyu-ji calendar. Runs weekly on GitHub. */
const fs = require("fs");
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const src = JSON.parse(fs.readFileSync("events-source.json", "utf8"));
const now = new Date();
const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const end = new Date(start.getFullYear(), start.getMonth() + 6, start.getDate());
const iso = d => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
const parse = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const mLabel = d => MON[d.getMonth()] + " " + d.getFullYear();
const inWindow = d => d >= start && d <= end;
const overlaps = (a,b) => a <= end && b >= start;
const nthWeekday = (y, mo, n, wd) => { const first = new Date(y, mo, 1).getDay(); return 1 + ((7 + wd - first) % 7) + (n - 1) * 7; };
const out = [];
const push = (date, o) => out.push(Object.assign({ m: mLabel(date), d: String(date.getDate()), dow: DOW[date.getDay()], iso: iso(date) }, o));
let cur = new Date(start.getFullYear(), start.getMonth(), 1);
while (cur <= end) {
  const y = cur.getFullYear(), mo = cur.getMonth();
  for (const r of (src.recurringMonthly || [])) {
    let day;
    if (r.kind === "dayOfMonth") day = r.day;
    else if (r.kind === "nthWeekday") day = nthWeekday(y, mo, r.n, r.weekday);
    else continue;
    const date = new Date(y, mo, day);
    if (date.getMonth() !== mo || !inWindow(date)) continue;
    const ev = { jp: r.jp, en: r.en, tier: r.tier, status: r.status, url: r.url };
    if (r.rangeLabel) ev.range = r.rangeLabel;
    if (r.noDay) { ev.d = "-"; ev.dow = ""; }
    if (r.nt) ev.nt = r.nt;
    push(date, ev);
  }
  cur = new Date(y, mo + 1, 1);
}
for (const a of (src.annualFixed || [])) {
  for (let y = start.getFullYear() - 1; y <= end.getFullYear() + 1; y++) {
    const s = new Date(y, a.mm - 1, a.dd);
    const e = (a.endMm ? new Date(y, a.endMm - 1, a.endDd) : s);
    if (!overlaps(s, e)) continue;
    const ev = { jp: a.jp, en: a.en, tier: a.tier, status: a.status, url: a.url };
    if (a.endMm) ev.range = MON[a.mm-1] + " " + a.dd + " - " + a.endDd;
    if (a.nt) ev.nt = a.nt;
    push(s, ev);
  }
}
for (const a of (src.annualNthWeekday || [])) {
  for (let y = start.getFullYear() - 1; y <= end.getFullYear() + 1; y++) {
    const day = nthWeekday(y, a.mm - 1, a.n, a.weekday);
    const s = new Date(y, a.mm - 1, day);
    if (s.getMonth() !== a.mm - 1) continue;
    const e = a.days ? new Date(y, a.mm - 1, day + a.days - 1) : s;
    if (!overlaps(s, e)) continue;
    const ev = { jp: a.jp, en: a.en, tier: a.tier, status: a.status, url: a.url };
    if (a.range) ev.range = a.range;
    if (a.nt) ev.nt = a.nt;
    push(s, ev);
  }
}
for (const t of (src.dated || [])) {
  const s = parse(t.iso);
  const e = t.endIso ? parse(t.endIso) : s;
  if (!overlaps(s, e)) continue;
  const ev = { jp: t.jp, en: t.en, tier: t.tier, status: t.status, url: t.url };
  if (t.range) ev.range = t.range;
  if (t.nt) ev.nt = t.nt;
  push(s, ev);
}
out.sort((a,b) => a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0);
const nextMon = new Date(start);
nextMon.setDate(start.getDate() + ((8 - start.getDay()) % 7 || 7));
const fmt = d => d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear();
const data = { updated: fmt(start), windowLabel: fmt(start) + " to end " + MON[end.getMonth()] + " " + end.getFullYear(), nextRefresh: "Mon " + fmt(nextMon) + ", 07:00 JST", events: out };
fs.writeFileSync("data.json", JSON.stringify(data, null, 2) + "\n");
console.log("Wrote data.json:", out.length, "events");
