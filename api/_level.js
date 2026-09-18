// 사용자 AI 레벨 판정 로직 — 설문 통계 화면에서 공유
// 4단계: 자연인 / 체험자 / 활용자 / 달인
//
// 문항별 배점 (level_analysis.py 와 동일 기준)
const SCORES = {
  "tools": { "사용하지 않음": -3, "_per_tool": 1.5 },
  "paid":  { "회사 비용으로 유료 사용": 2, "개인 비용으로 유료 사용": 2, "무료만 사용": 0.5, "사용하지 않음": 0 },
  "freq":  { "하루에 여러 번": 3, "하루 1회 정도": 2, "주 2~3회": 1.5, "주 1회 미만": 0.5, "거의 안 씀": 0 },
  "use":   { "문서 작성·초안": 1, "긴 자료 요약": 1.5, "번역·영문": 1, "시장·기업 조사": 1.5,
             "데이터 분석": 2, "회의록 정리": 1.5, "아이디어 발상": 1 },
  "agent": { "잘 알고 직접 쓴다": 3, "개념은 알지만 안 써 봤다": 1.5, "들어는 봤다": 0.5, "처음 듣는다": 0 },
  "trust": { "판단이 서지 않음": 0, "초안만 — 검토·실행은 내가": 1, "내부 자료 조회까지": 2,
             "문서 작성·저장까지": 3, "메일 발송 등 외부 행위까지": 4 },
  "data":  { "없다": 0, "기억나지 않음": 0.5, "민감하지 않은 자료만": 1.5, "있다": 2 },
  "support": { "필요 없다": 0, "잘 모르겠다": 1, "사용할 것 같다": 2, "적극 사용하겠다": 3 },
};

export const LEVELS = [
  { key: "달인",  min: 8.5, emoji: "🏆", desc: "여러 도구를 전략적으로 결합해 업무를 재설계, 동료에게 권하는 수준" },
  { key: "활용자", min: 5.5, emoji: "⚙️", desc: "도구를 일상 업무에 꾸준히 사용. 확장 가능" },
  { key: "체험자", min: 2.5, emoji: "🔍", desc: "써 보았으나 개인·간헐적. 업무에 녹이기 전" },
  { key: "자연인", min: 0,   emoji: "🍃", desc: "아직 AI를 업무에 쓰지 않음. 계기만 있으면 시작" },
];

export function scoreAnswer(answers) {
  if (!answers) return 0;
  let s = 0.0;
  const tools = answers.tools || [];
  if (tools.includes("사용하지 않음")) {
    s += SCORES.tools["사용하지 않음"];
  } else {
    tools.forEach(() => (s += SCORES.tools._per_tool));
  }
  for (const k of ["paid", "freq", "agent", "trust", "data", "support"]) {
    const v = answers[k];
    if (v && SCORES[k][v] !== undefined) s += SCORES[k][v];
  }
  (answers.use || []).forEach((u) => {
    if (SCORES.use[u] !== undefined) s += SCORES.use[u];
  });
  return Math.round(s * 10) / 10;
}

export function levelFor(total) {
  for (const L of LEVELS) {
    if (total >= L.min) return L;
  }
  return LEVELS[LEVELS.length - 1];
}

// 전체 응답 목록 → 레벨별 인원 분포
export function levelDistribution(rows, sampleLimit = 400) {
  const counts = Object.fromEntries(LEVELS.map((L) => [L.key, 0]));
  let scored = 0, sampled = 0;
  for (const r of rows) {
    const a = r.answers || {};
    // 답변 요건: 도구 or 그 어떤 문항이라도 하나 응답돼야 점수화
    if (!Object.keys(a).length) continue;
    counts[levelFor(scoreAnswer(a)).key] += 1;
    scored += 1;
    sampled += 1;
    if (sampled >= sampleLimit) break;
  }
  return { levels: LEVELS, counts, scored };
}