# -*- coding: utf-8 -*-
"""임원 AI 사용 현황 설문 → 4단계 사용자 레벨 판정 로직 + 실제 응답 적용."""
import json, datetime

# ── 문항별 스코어 테이블 (0~상한) ──────────────────────────────
# tools: 사용 도구 수 + '사용하지 않음' 처리
# paid: 유료(회사/개인)는 고가치
# freq: 빈도
# use: 용도 다양성
# agent: 에이전트 이해·실사용
# trust: 허용 범위 (신뢰+권한)
# data: 외부 입력 실경험
# support: 회사 유료제공 시 수용 의향

SCORES = {
  "tools": {"사용하지 않음": -3, "_per_tool": 1.5},          # 도구당 +1.5, 미사용 -3
  "paid":  {"회사 비용으로 유료 사용": 2, "개인 비용으로 유료 사용": 2, "무료만 사용": 0.5, "사용하지 않음": 0},
  "freq":  {"하루에 여러 번": 3, "하루 1회 정도": 2, "주 2~3회": 1.5, "주 1회 미만": 0.5, "거의 안 씀": 0},
  "use":   {"문서 작성·초안": 1, "긴 자료 요약": 1.5, "번역": 1, "시장·기업 조사": 1.5,
            "데이터 분석": 2, "회의록 정리": 1.5, "아이디어 발상": 1},
  "agent": {"잘 알고 직접 쓴다": 3, "개념은 알지만 안 써 봤다": 1.5, "들어는 봤다": 0.5, "처음 듣는다": 0},
  "trust": {"판단이 서지 않음": 0, "초안만 — 검토·실행은 내가": 1, "내부 자료 조회까지": 2,
            "문서 작성·저장까지": 3, "메일 발송 등 외부 행위까지": 4},
  "data":  {"없다": 0, "기억나지 않음": 0.5, "민감하지 않은 자료만": 1.5, "있다": 2},
  "support":{"필요 없다": 0, "잘 모르겠다": 1, "사용할 것 같다": 2, "적극 사용하겠다": 3},
}

# ── 레벨 (다듬음) ────────────────────────────────────────────
# 8.5~ 달인 / 5.5~8.5 활용자 / 2.5~5.5 체험자 / ~2.5 자연인
def level_for(total):
    if total >= 8.5: return ("달인", "기업 AI 전도사 · 여러 도구를 전략적으로 결합해 업무를 재설계하고, 동료에게 권하는 수준")
    if total >= 5.5: return ("활용자", "도구를 일상 업무에 꾸준히 쓴다. 자료입력·허용범위 확장으로 달인급 업그레이드 가능")
    if total >= 2.5: return ("체험자", "도구를 써 보았으나 개인적·간헐적. 관심 있으나 업무에 체계적으로 녹이기 전 단계")
    return ("자연인", "아직 AI를 업무에 쓰지 않는 '그대로의 나'. 계기만 생기면 시작하기 좋은 단계")

def score_answer(answers):
    tools = answers.get("tools") or []
    s = 0.0
    # tools
    if "사용하지 않음" in tools:
        s += SCORES["tools"]["사용하지 않음"]
    else:
        for t in tools:
            if t != "사용하지 않음":
                s += SCORES["tools"]["_per_tool"]
    # 나머지 단일
    for key in ["freq","agent","trust","data","support"]:
        v = answers.get(key)
        if v in SCORES[key]:
            s += SCORES[key][v]
    # paid (복수 선택) — 선택된 항목 전부 합산
    for p in (answers.get("paid") or []):
        if p in SCORES["paid"]:
            s += SCORES["paid"][p]
    # use (복수, 다용도 가산)
    uses = answers.get("use") or []
    for u in uses:
        if u in SCORES["use"]:
            s += SCORES["use"][u]
    return round(s, 1)

def main():
    data = json.load(open(r'C:\Users\ajina\responses.json', encoding='utf-8'))
    rows = data.get('rows', [])
    print("="*70)
    print(f"임원 AI 사용 현황 설문 — 사용자 레벨 분석  ({len(rows)}건)")
    print(f"분석 시각: {datetime.datetime.now():%Y-%m-%d %H:%M}")
    print("="*70)
    results = []
    for r in rows:
        a = r.get('answers') or {}
        total = score_answer(a)
        lv_name, desc = level_for(total)
        results.append((r.get('at'), a, total, lv_name))
        # 편의명: 도구/빈도로 요약
        tools = ", ".join(a.get('tools') or ['(없음)'])
        print(f"\n[{r.get('at','')[:16]}]")
        print(f"  도구: {tools}")
        print(f"  핵심: {a.get('freq','?')} · {a.get('agent','?')} · 허용:{a.get('trust','?')} · 자료:{a.get('data','?')}")
        print(f"  ▶ 점수 {total} →  【{lv_name}】")
        print(f"    {desc}")
    print("\n" + "="*70)
    # 레벨 분포
    from collections import Counter
    dist = Counter(x[3] for x in results)
    print("레벨 분포:", dict(dist))

if __name__ == "__main__":
    main()