import puppeteer from 'puppeteer-core';
const C = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const b = await puppeteer.launch({ executablePath: C, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 430, height: 900 });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
await p.waitForSelector('.q .opt', { timeout: 12000 });

// Q2 single: click first paid option
const q2list = await p.$$('.q .opt');
console.log('total .opt =', q2list.length);
const q2 = q2list[6];
const q2txt = await q2.$eval('.txt', e => e.textContent.trim());
console.log('q2[6] text =', q2txt);
await q2.click();
await new Promise(r => setTimeout(r, 400));
let s = await p.evaluate(() => ({
  pcnt: document.getElementById('pcnt').textContent,
  Q2on: document.querySelectorAll('#o_paid .opt.on').length,
  state: JSON.stringify(state),
}));
console.log('after Q2 click:', JSON.stringify(s));

// Q4 max toast
for (const sel of ['#o_use .opt:nth-child(1)','#o_use .opt:nth-child(2)','#o_use .opt:nth-child(3)','#o_use .opt:nth-child(4)']) {
  await p.click(sel);
  await new Promise(r => setTimeout(r, 120));
}
await new Promise(r => setTimeout(r, 200));
s = await p.evaluate(() => ({
  onUse: document.querySelectorAll('#o_use .opt.on').length,
  toastShow: document.getElementById('toast').classList.contains('show'),
  toastMsg: document.getElementById('toastMsg').textContent,
}));
console.log('after Q4 clicks:', JSON.stringify(s));
console.log('pageerrors:', JSON.stringify(errs));
await b.close();