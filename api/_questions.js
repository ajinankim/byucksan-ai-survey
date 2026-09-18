// 설문 문항 정의 — 설문 화면과 통계 화면이 같은 정의를 쓴다.
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
    type: "single",
    title: "유료 구독 여부",
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
    title: "주로 쓰는 용도",
    hint: "최대 3개",
    max: 3,
    options: [
      "문서 작성·초안",
      "긴 자료 요약",
      "번역·영문",
      "시장·기업 조사",
      "데이터 분석",
      "회의록 정리",
      "아이디어 발상",
    ],
  },
  {
    id: "agent",
    type: "single",
    title: "AI 에이전트를 써 보셨습니까",
    hint:
      "에이전트 = 답만 하는 게 아니라 파일 읽기 → 정리 → 문서 작성 → 메일 초안까지 여러 단계를 스스로 수행하는 AI",
    options: ["잘 알고 직접 쓴다", "개념은 알지만 안 써 봤다", "들어는 봤다", "처음 듣는다"],
  },
  {
    id: "trust",
    type: "single",
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
    id: "support",
    type: "single",
    title: "회사가 유료 계정을 제공한다면",
    options: ["적극 사용하겠다", "사용할 것 같다", "잘 모르겠다", "필요 없다"],
  },
];

export const COMMENT = {
  id: "comment",
  title: "한마디 (선택)",
  placeholder: "자유롭게 적어 주세요",
};
