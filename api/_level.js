// 사용자 AI 레벨 판정 로직 — 설문 통계 화면에서 공유
// 4단계: 자연인 / 체험자 / 활용자 / 달인
//
// 구분 기준 (지-난 정의):
//   1) 빈도 점수   : 하루에여러번5 / 하루1회3 / 주2~3회2 / 주1회미만1
//      - '거의 안 씀' → 즉시 자연인 (fast fail)
//   2) 유료 구독    : '유료 사용' 포�함 +3 / '무료만 사용' +1
//   3) 활용 용도    : 3개 이상 +2 / 1개 이상 +1
//   4) 데이터 입력  : '있다' +2 / '민감하지 않은 자료만' +1
//   최종: score>=10 달인 / >=6 활용자 / >=3 체험자 / else 자연인

export const LEVELS = [
  { key: "달인",  min: 10,  emoji: "🏆", desc: "AI를 전략적으로 겸합해 업무를 재설계, 동료에게 권하는 수준" },
  { key: "활용자", min: 6,  emoji: "⚙️", desc: "도구를 일상 업무에 꾸준히 사용. 확장 가능" },
  { key: "체험자", min: 3,  emoji: "🔍", desc: "써 보았으나 개인·간헐적. 업무에 녹이기 전" },
  { key: "자연인", min: 0,  emoji: "🍃", desc: "아직 AI를 업무에 쓰지 않음. 계기만 있으면 시작" },
];

// 실제 응답 키 → 지-난 기준의 점수 계산
export function calculateScore(answers) {
  if (!answers) return { score: 0, levelKey: "자연인" };

  let score = 0;

  // 1. 빈도
  const freq = answers.freq;
  if (freq === "하루에 여러 번") score += 5;
  else if (freq === "하루 1회 정도") score += 3;
  else if (freq === "주 2~3회") score += 2;
  else if (freq === "주 1회 미만") score += 1;

  // 빈도 '거의 안 씀' → 즉시 자연인 (fast fail)
  if (freq === "거의 안 씀") return { score: 0, levelKey: "자연인" };

  // 2. 유료 구독 (복수 선택 배열)
  const paid = answers.paid || [];
  if (paid.some((p) => p.includes("유료 사용"))) score += 3;
  else if (paid.includes("무료만 사용")) score += 1;

  // 3. 활용 용도 다양성 (복수 선택 배열)
  const use = answers.use || [];
  if (use.length >= 3) score += 2;
  else if (use.length > 0) score += 1;

  // 4. 데이터 입력 적극성
  const data = answers.data;
  if (data === "있다") score += 2;
  else if (data === "민감하지 않은 자료만") score += 1;

  // 최종 판정
  let levelKey = "자연인";
  if (score >= 10) levelKey = "달인";
  else if (score >= 6) levelKey = "활용자";
  else if (score >= 3) levelKey = "체험자";

  return { score, levelKey };
}

// (이전 쓰던 순수 점수 함수 — 호환용)
export function scoreAnswer(answers) {
  return calculateScore(answers).score;
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
    // 응답 1건 이상이면 판정
    if (!Object.keys(a).length) continue;
    const lk = calculateScore(a).levelKey;
    if (counts[lk] !== undefined) counts[lk] += 1;
    scored += 1;
    sampled += 1;
    if (sampled >= sampleLimit) break;
  }
  return { levels: LEVELS, counts, scored };
}