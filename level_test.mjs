import("./api/_level.js").then((m) => {
  const t = (a, exp) => {
    const s = m.scoreAnswer(a);
    const l = m.levelFor(s).key;
    let sym = l === exp ? "OK " : "X  ";
    console.log(sym + JSON.stringify(a) + " -> " + s + "점 [" + l + "] (기대 " + exp + ")");
  };
  t({ paid: "개인 비용으로 유료 사용", freq: "하루에 여러 번", use: ["데이터 분석", "시장·기업 조사"], agent: "잘 알고 직접 쓴다", trust: "문서 작성·저장까지", data: "있다", support: "적극 사용하겠다" }, "달인");
  t({ paid: "무료만 사용", freq: "주 2~3회", use: ["문서 작성·초안"], agent: "개념은 알지만 안 써 봤다", trust: "초안만 — 검토·실행은 내가", data: "없다", support: "사용할 것 같다" }, "활용자");
  t({ tools: ["ChatGPT"], freq: "주 1회 미만", agent: "들어는 봤다", trust: "판단이 서지 않음", data: "없다", support: "잘 모르겠다" }, "체험자");
  t({ tools: ["사용하지 않음"], paid: "사용하지 않음", freq: "거의 안 씀", agent: "처음 듣는다", data: "없다", support: "필요 없다" }, "자연인");
});