/**
 * 임원 AI 사용 현황 설문 — 구글 시트 저장소 (JSON 방식)
 *
 * 응답 1건이 한 행으로 쌓인다.  A열: 시각 / B열: 응답 JSON
 * 문항이 바뀌어도 시트 구조를 고칠 필요가 없다.
 *
 * 설치는 apps-script/README.md 참고.
 */

// ⚠️ 반드시 바꿀 것. Vercel 환경변수 SHEET_TOKEN 과 같은 값이어야 한다.
const SECRET = 'dc8df83459d85718d9aa5cc1';

const SHEET_NAME = 'responses';

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['시각', 'json']);
    sh.getRange(1, 1, 1, 2).setFontWeight('bold')
      .setBackground('#1F3864').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 150);
    sh.setColumnWidth(2, 900);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.token !== SECRET) return json_({ error: 'unauthorized' });

    const record = {
      at: new Date().toISOString(),
      answers: body.answers || {},
    };
    if (body.comment) record.comment = String(body.comment);

    const sh = getSheet_();
    sh.appendRow([new Date(), JSON.stringify(record)]);
    return json_({ ok: true, count: sh.getLastRow() - 1 });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

/* ── 분석용: JSON을 표로 펼친다 ─────────────────────────────
 * 시트 상단 메뉴 「설문」 → 「응답을 표로 펼치기」 를 누르면
 * flat 시트가 새로 만들어진다. 원본(responses)은 건드리지 않는다.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('설문')
    .addItem('응답을 표로 펼치기', 'expand')
    .addToUi();
}

function expand() {
  const src = getSheet_();
  const last = src.getLastRow();
  if (last < 2) {
    SpreadsheetApp.getUi().alert('아직 응답이 없습니다.');
    return;
  }

  const records = [];
  src.getRange(2, 2, last - 1, 1).getValues().forEach(function (r) {
    const s = String(r[0] || '').trim();
    if (!s) return;
    try { records.push(JSON.parse(s)); } catch (ignore) {}
  });

  // 실제로 등장한 문항 키를 순서대로 모은다 (문항이 바뀌어도 따라간다)
  const keys = [];
  records.forEach(function (rec) {
    Object.keys(rec.answers || {}).forEach(function (k) {
      if (keys.indexOf(k) === -1) keys.push(k);
    });
  });

  const rows = [['시각'].concat(keys).concat(['comment'])];
  records.forEach(function (rec) {
    const row = [rec.at ? new Date(rec.at) : ''];
    keys.forEach(function (k) {
      const v = (rec.answers || {})[k];
      row.push(Array.isArray(v) ? v.join(', ') : (v || ''));
    });
    row.push(rec.comment || '');
    rows.push(row);
  });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let out = ss.getSheetByName('flat');
  if (out) out.clear(); else out = ss.insertSheet('flat');
  out.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  out.getRange(1, 1, 1, rows[0].length).setFontWeight('bold')
    .setBackground('#1F3864').setFontColor('#FFFFFF');
  out.setFrozenRows(1);
  out.autoResizeColumns(1, rows[0].length);
  ss.setActiveSheet(out);
}

function doGet(e) {
  try {
    if (!e || e.parameter.token !== SECRET) return json_({ error: 'unauthorized' });

    const sh = getSheet_();
    const last = sh.getLastRow();
    if (last < 2) return json_({ rows: [] });

    const vals = sh.getRange(2, 2, last - 1, 1).getValues();
    const rows = [];
    vals.forEach(function (r) {
      const s = String(r[0] || '').trim();
      if (!s) return;
      try {
        rows.push(JSON.parse(s));
      } catch (ignore) {}
    });
    return json_({ rows: rows });
  } catch (err) {
    return json_({ error: String(err) });
  }
}
