import puppeteer from 'puppeteer-core';
const C = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const b = await puppeteer.launch({ executablePath: C, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 430, height: 900 });
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
await p.waitForSelector('.q .opt', { timeout: 12000 });
const info = await p.evaluate(() => {
  // QS is module-scoped but accessible since not in a module
  const describe = QS.map(q => ({
    id: q.id, type: q.type,
    max: q.max,
    maxType: typeof q.max,
    firstOptDim: document.querySelector('#o_' + q.id + ' .opt')?.classList.contains('dim') ?? null,
  }));
  // why dim for Q1: recompute
  const q = QS[0];
  const cur = state[q.id] || [];
  const full = q.type === 'multi' && q.max && cur.length >= q.max;
  return {
    described: describe,
    q1full: full, q1state: state[q.id], firstOptClass: document.querySelector('.q .opt').className
  };
});
console.log(JSON.stringify(info, null, 2));
await b.close();