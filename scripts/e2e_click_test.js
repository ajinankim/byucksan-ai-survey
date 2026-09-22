#!/usr/bin/env node
/**
 * byucksan-ai-survey — E2E 클릭 동작 검증 (headless Chromium)
 *
 * 목적: 배포된 설문 페이지에서 실제 브라우저 클릭 시
 *   - .opt 카드에 'on' 클래스가 붙는지
 *   - 진행률(progress)이 올라가는지
 *   - 콘솔 에러가 없는지
 * 를 검증한다. 회귀(예: sync()가 제거된 <input>을 참조) 탐지용.
 *
 * 사용:
 *   node scripts/e2e_click_test.js [URL] [--no-exit]
 *     URL   기본 https://byucksan-ai-survey.vercel.app/
 *
 * 예외 처리: 페이지가 문항을 렌더링하지 못하거나 클릭이 동작하지 않으면
 * 콘솔 에러와 함께 exit code 1 로 종료한다.
 */
import puppeteer from 'puppeteer-core';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const URL = process.argv[2] || 'https://byucksan-ai-survey.vercel.app/';

// 시스템 Chrome / Edge 실행파일 후보
const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];
const executablePath = CANDIDATES.find(c => fs.existsSync(c));
if (!executablePath) {
  console.error('✗ Chrome/Edge 를 찾지 못했습니다. executablePath 를 지정하세요.');
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const result = { url: URL, errors: [], pass: false, steps: [] };

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
});

const page = await browser.newPage();
await page.setViewport({ width: 430, height: 900 }); // 모바일 크기
await page.setDefaultTimeout(20000);

const consoleErrors = [];
const isBenign = t => /favicon\.ico/.test(t); // 파비콘 부재 404는 기능과 무관
page.on('console', m => {
  if (m.type() === 'error' && !isBenign(m.text())) {
    consoleErrors.push(m.text()); result.errors.push('[console] ' + m.text());
  }
});
page.on('pageerror', e => { result.errors.push('[pageerror] ' + e.message); });

const log = (ok, msg) => { result.steps.push(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); console.log(`${ok ? '✔' : '✘'} ${msg}`); };

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 25000 });

  // 1) 질문 카드 렌더링 대기 (initApp 재시도 포함, 최대 10s)
  await page.waitForSelector('.q .opt', { timeout: 12000 });
  const qCount = await page.$$eval('.q', els => els.filter(e => e.querySelector('.opt')).length);
  log(qCount >= 8, `문항 카드 렌더링 (${qCount}개 감지, 기대 ≥8)`);

  const before = await page.evaluate(() => ({
    pcnt: document.getElementById('pcnt').textContent,
    sendDisabled: document.getElementById('send').disabled,
  }));
  log(before.pcnt.trim() === '0 / 8', `초기 진행률 = ${before.pcnt}`);

  // 2) Q1 첫 옵션 클릭
  await page.evaluate(() => {
    const lab = document.querySelector('.q .opt');
    lab.scrollIntoView({ block: 'center' });
  });
  const q1 = await page.$('.q .opt');
  const q1Text = await q1.$eval('.txt', e => e.textContent.trim());
  await q1.click();

  await sleep(400);
  const after = await page.evaluate(() => {
    const lab = document.querySelector('.q .opt');
    const pcnt = document.getElementById('pcnt').textContent;
    const bar = document.getElementById('pbar').style.width;
    const sendDisabled = document.getElementById('send').disabled;
    return { on: lab.classList.contains('on'), pcnt, bar, sendDisabled };
  });
  log(after.on, `Q1 '${q1Text}' 클릭 후 .opt.on 클래스 부여 (on=${after.on})`);
  log(after.pcnt.trim() !== '0 / 8', `진행률 상승 = ${after.pcnt} (기대 '1 / 8' 계열)`);
  log(after.sendDisabled === false, `제출 버튼 활성화 (disabled=${after.sendDisabled})`);
  log(parseFloat(after.bar) > 0, `진행바 width=${after.bar} (>0)`);

  // 3) Q2(알려진 max=3 문항) 토글 + limit 동작 확인 — 첫 .opt 재클릭 시 토글로 빠짐 확인
  const multiToggle = await page.evaluate(() => {
    // Q1 첫 옵션을 한 번 더 클릭 → 토글로 해제돼야 함
    const lab = document.querySelector('.q .opt');
    lab.click();
    return new Promise(r => setTimeout(() => r(document.querySelector('.q .opt').classList.contains('on')), 300));
  });
  log(multiToggle === false, `Q1 첫 옵션 재클릭 → 'on' 토글 해제 (on=${multiToggle})`);

  // 3.5) single 문항(Q2 paid) 선택 → 진행률 2/8, 커밋 확인
  const q2 = await page.$$('.q .opt');
  const q2first = q2[6]; // Q1=6옵션 이후 첫 single 옵션
  await q2first.click();
  await sleep(300);
  const afterQ2 = await page.evaluate(() => document.getElementById('pcnt').textContent);
  log(afterQ2.trim() === '2 / 8', `single(Q2) 클릭 → 진행률 ${afterQ2} (기대 '2 / 8')`);

  // 3.6) max 문항(Q4 use, max 3): 4개 연속 클릭 → 3개만 on + 4번째 toast
  const q4opts = await page.$$('#o_use .opt');
  log(q4opts.length === 7, `Q4(use) 옵션 7개 감지`);
  for (let k = 0; k < 4; k++) await q4opts[k].click();
  await sleep(300);
  const q4 = await page.evaluate(() => {
    const onCount = document.querySelectorAll('#o_use .opt.on').length;
    return { onCount, pcnt: document.getElementById('pcnt').textContent,
             toast: document.getElementById('toast').classList.contains('show') };
  });
  log(q4.onCount === 3, `Q4 max=3: 4번째 클릭 후 on=${q4.onCount} (기대 3, 4번째 거부)`);
  log(q4.pcnt.trim() === '3 / 8', `Q4 반영 후 진행률 ${q4.pcnt} (기대 '3 / 8')`);
  log(q4.toast, `max 초과 시 토스트 표시 (toast=${q4.toast})`);

  // 4) 콘솔 에러 없음
  log(result.errors.length === 0, `브라우저 콘솔 에러 0건 (수집 ${result.errors.length})`);
  if (consoleErrors.length) console.error('   콘솔 에러 상세:\n   ' + consoleErrors.join('\n   '));

  result.pass = result.steps.every(s => s.startsWith('PASS'));
} catch (e) {
  result.errors.push('[harness] ' + e.message);
  result.pass = false;
  console.error('✘ 하네스 오류: ' + e.message);
} finally {
  await browser.close();
}

console.log('\n=== RESULT ===');
console.log(JSON.stringify({ pass: result.pass, errors: result.errors }, null, 2));
process.exit(result.pass ? 0 : 1);