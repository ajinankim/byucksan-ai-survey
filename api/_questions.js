// 설문 문항 정의 — 설문 화면과 통계 화면이 같은 정의를 쓴다.
// "쓰는 용도"와 "배우고 싶은 것"이 같은 목록을 쓴다 — 수요 갭을 비교하기 위해.
const USE_OPTIONS = [
  "문서 작성·초안",
  "긴 자료 요약",
  "번역·영문",
  "시장·기업 조사",
  "데이터 분석",
  "회의록 정리",
  "아이디어 발상",
  "보고서·슬라이드 제작",
  "엑셀·실적 분석",
  "메일 작성",
];

// 에이전트를 모르는 응답자는 '어디까지 맡길지' 문항을 건너뛴다.
const AGENT_UNFAMILIAR = ["들어는 봤다", "처음 듣는다"];

export const QUESTIONS = [
  {
    id: "tools",
    type: "multi",
    title: "현재 쓰고 계신 AI 서비스",
    hint: "복수 선택",
    options: [
      "ChatGPT",
      "Claude",
      "Gemini",
      "Microsoft Copilot",
      "기타",
      "사용하지 않음",
    ],
  },
  {
    id: "paid",
    type: "multi",
    title: "유료 구독 여부",
    hint: "복수 선택",
    options: [
      "회사 비용으로 유료 사용",
      "개인 비용으로 유료 사용",
      "무료만 사용",
      "사용하지 않음",
    ],
  },
  {
    id: "freq",
    type: "single",
    title: "사용 빈도",
    options: ["하루에 여러 번", "하루 1회 정도", "주 2~3회", "주 1회 미만", "거의 안 씀"],
  },
  {
    id: "use",
    type: "multi",
    title: "지금 주로 쓰는 용도",
    hint: "최대 4개",
    max: 4,
    options: USE_OPTIONS,
  },
  {
    id: "want",
    type: "multi",
    title: "앞으로 AI로 해결하고 싶은 업무",
    hint: "최대 3개 · 교육 데모 주제를 정하는 데 씁니다",
    max: 3,
    options: USE_OPTIONS,
  },
  {
    id: "level",
    type: "single",
    title: "지금 내 AI 활용 수준에 가장 가까운 것",
    options: [
      "거의 안 써 봤다",
      "질문하고 답을 받는 정도",
      "파일을 올려 요약·정리를 시킨다",
      "여러 단계 작업을 연결해서 시킨다",
      "AI에게 업무 흐름을 맡겨 둔다",
    ],
  },
  {
    id: "agent",
    type: "single",
    title: "AI 에이전트를 써 보셨습니까",
    hint:
      "에이전트 = 답만 하는 게 아니라 파일 읽기 → 정리 → 문서 작성 → 메일 초안까지 여러 단계를 스스로 수행하는 AI",
    options: ["잘 알고 직접 쓴다", "개념은 알지만 안 써 봤다", ...AGENT_UNFAMILIAR],
  },
  {
    id: "trust",
    type: "single",
    skipIf: { id: "agent", in: AGENT_UNFAMILIAR },
    title: "AI에 업무를 맡긴다면 어디까지 허용하시겠습니까",
    options: [
      "초안만 — 검토·실행은 내가",
      "내부 자료 조회까지",
      "문서 작성·저장까지",
      "메일 발송 등 외부 행위까지",
      "판단이 서지 않음",
    ],
  },
  {
    id: "data",
    type: "single",
    title: "업무 자료를 외부 AI에 입력해 본 적이 있습니까",
    hint: "익명 집계입니다. 개인을 특정하지 않습니다",
    options: ["있다", "민감하지 않은 자료만", "없다", "기억나지 않음"],
  },
  {
    id: "intent",
    type: "single",
    title: "교육 후 업무에 실제로 써 볼 의향",
    options: ["적극 쓰겠다", "써 볼 것 같다", "잘 모르겠다", "필요 없다"],
  },
];

export const COMMENT = {
  id: "comment",
  title: "한마디 (선택)",
  placeholder: "자유롭게 적어 주세요",
};
