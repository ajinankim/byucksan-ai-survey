import puppeteer from 'puppeteer-core';
const C = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const b = await puppeteer.launch({ executablePath: C, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 430, height: 900 });
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
await p.waitForSelector('.q .opt', { timeout: 12000 });
const os = await p.$$('.q .opt');
// scroll Q2(index6) into viewport-center then click
await os[6].scrollIntoView({ block: 'center' });
await new Promise(r => setTimeout(r, 200));
const hit = await os[6].evaluate(el => {
  const b = el.getBoundingClientRect();
  const top = document.elementFromPoint(b.left+b.width/2, b.top+b.height/2);
  return { text: el.querySelector('.txt').textContent.trim(), centerY: Math.round(b.top+b.height/2),
           target: top ? `${top.tagName}.${top.className}` : 'null' };
});
console.log('Q2 hit-test after scroll:', JSON.stringify(hit));
await os[6].click();
await new Promise(r => setTimeout(r, 300));
console.log('after Q2 click:', await p.evaluate(() => JSON.stringify({
  state, pcnt: document.getElementById('pcnt').textContent,
  Q2on: document.querySelectorAll('#o_paid .opt.on').length })));
await b.close();