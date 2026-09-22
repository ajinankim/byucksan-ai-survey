import puppeteer from 'puppeteer-core';
const C = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const b = await puppeteer.launch({ executablePath: C, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 430, height: 900 });
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
await p.waitForSelector('.q .opt', { timeout: 12000 });

// 1) programmatic click via evaluate
const r1 = await p.evaluate(() => {
  const lab = document.querySelector('.q .opt');
  const before = lab.className;
  lab.click();
  return new Promise(r => setTimeout(() => r({
    before, after: lab.className,
    pcnt: document.getElementById('pcnt').textContent,
    sendDisabled: document.getElementById('send').disabled,
  }), 400));
});
console.log('1) PROGRAMMATIC:', JSON.stringify(r1));

// reset
await p.evaluate(() => document.querySelector('.q .opt').click());
await new Promise(r => setTimeout(r, 250));

// 2) real puppeteer mouse click
const lab = await p.$('.q .opt');
const r2before = await lab.evaluate(e => ({ cls: e.className, rect: e.getBoundingClientRect().toJSON() }));
await lab.click();
await new Promise(r => setTimeout(r, 400));
const r2after = await lab.evaluate(e => ({ cls: e.className, pcnt: document.getElementById('pcnt').textContent }));
console.log('2) REALCLICK before:', JSON.stringify(r2before));
console.log('2) REALCLICK after:', JSON.stringify(r2after));
await b.close();