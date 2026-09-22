import puppeteer from 'puppeteer-core';
const C = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const b = await puppeteer.launch({ executablePath: C, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 430, height: 900 });
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
await p.waitForSelector('.q .opt', { timeout: 12000 });

// document capture listener to log what actually receives clicks
await p.evaluate(() => {
  window.__clicks = [];
  document.addEventListener('click', e => {
    const el = e.target;
    window.__clicks.push({
      tag: el.tagName, cls: (el.className||'').toString().slice(0,40),
      parentCls: (el.parentElement?.className||'').toString().slice(0,40),
      at: document.getElementById('pcnt').textContent,
    });
  }, true);
});

async function hitTest(i) {
  const h = await p.$$('.q .opt');
  const r = await h[i].evaluate((el, idx) => {
    const b = el.getBoundingClientRect();
    const cx = b.left + b.width/2, cy = b.top + b.height/2;
    const top = document.elementFromPoint(cx, cy);
    return { i: idx, text: el.querySelector('.txt').textContent.trim(),
             rect: {top:b.top,bottom:b.bottom}, centerY: Math.round(cy),
             elementFromPoint: top ? `TAG=${top.tagName} CLS="${(top.className||'').toString()}"` : 'null' };
  }, i);
  return r;
}

console.log('Q1[0]:', JSON.stringify(await hitTest(0)));
console.log('Q2[6]:', JSON.stringify(await hitTest(6)));
console.log('Q4[12]:', JSON.stringify(await hitTest(12)));

// real clicks
await (await p.$$('.q .opt'))[0].click();
await new Promise(r=>setTimeout(r,250));
await (await p.$$('.q .opt'))[6].click();
await new Promise(r=>setTimeout(r,250));
const clicks = await p.evaluate(() => window.__clicks);
console.log('received clicks:', JSON.stringify(clicks));
console.log('state:', await p.evaluate(()=>JSON.stringify(state)));
await b.close();