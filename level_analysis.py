# -*- coding: utf-8 -*-
"""임원 AI 사용 현황 설문 → 4단계 사용자 레벨 판정 로직 (지-난 기준) + 실제 응답 적용."""
import json, datetime

# ── 구분 기준 (지-난 정의) ─────────────────────────────────────
#  1) 빈도 점수  : 하루에여러번5 / 하루1회3 / 주2~3회2 / 주1회미만1
#     - '거의 안 씀' → 즉시 자연인 (fast fail)
#  2) 유료 구독   : '유료 사용' 포함 +3 / '무료만 사용' +1
#  3) 활용 용도   : 3개 이상 +2 / 1개 이상 +1
#  4) 데이터 입력 : '있다' +2 / '민감하지 않은 자료만' +1
#  최종: score>=10 달인 / >=6 활용자 / >=3 체험자 / else 자연인


def calculate_score(answers):
    s = 0
    freq = answers.get("freq")
    # 1. 빈도
    if freq == "하루에 여러 번":
        s += 5
    elif freq == "하루 1회 정도":
        s += 3
    elif freq == "주 2~3회":
        s += 2
    elif freq == "주 1회 미만":
        s += 1
    # 빈도 '거의 안 씀' → 즉시 자연인
    if freq == "거의 안 씀":
        return ("자연인", s)

    # 2. 유료 구독 (복수 배열)
    paid = answers.get("paid") or []
    if any("유료 사용" in p for p in paid):
        s += 3
    elif "무료만 사용" in paid:
        s += 1

    # 3. 활용 용도 다양성
    use = answers.get("use") or []
    if len(use) >= 3:
        s += 2
    elif len(use) > 0:
        s += 1

    # 4. 데이터 입력 적극성
    data = answers.get("data")
    if data == "있다":
        s += 2
    elif data == "민감하지 않은 자료만":
        s += 1

    # 최종 판정
    if s >= 10:
        return ("달인", s)
    if s >= 6:
        return ("활용자", s)
    if s >= 3:
        return ("체험자", s)
    return ("자연인", s)


DESC = {
    "달인": "AI를 전략적으로 결합해 업무를 재설계, 동료에게 권하는 수준",
    "활용자": "도구를 일상 업무에 꾸준히 사용. 확장 가능",
    "체험자": "써 보았으나 개인·간헐적. 업무에 녹이기 전",
    "자연인": "아직 AI를 업무에 쓰지 않음. 계기만 있으면 시작",
}


def level_for(total):
    # 호환용: 점수만으로 레벨명 반환
    if total >= 10:
        return ("달인", DESC["달인"])
    if total >= 6:
        return ("활용자", DESC["활용자"])
    if total >= 3:
        return ("체험자", DESC["체험자"])
    return ("자연인", DESC["자연인"])


def score_answer(answers):
    return calculate_score(answers)[1]


def main():
    data = json.load(open(r'C:\Users\ajina\responses.json', encoding='utf-8'))
    rows = data.get('rows', [])
    print("=" * 70)
    print(f"임원 AI 사용 현황 설문 — 사용자 레벨 분석  ({len(rows)}건)")
    print(f"분석 시각: {datetime.datetime.now():%Y-%m-%d %H:%M}")
    print("=" * 70)
    results = []
    dist = {}
    for r in rows:
        a = r.get('answers') or {}
        if not a:
            continue
        name, score = calculate_score(a)
        dist[name] = dist.get(name, 0) + 1
        results.append((a, name, score))

    # 분포 출력
    print("\n[레벨 분포]")
    for lv in ["자연인", "체험자", "활용자", "달인"]:
        c = dist.get(lv, 0)
        p = round(c / len(results) * 100) if results else 0
        print(f"  {lv:4s} : {c}명 ({p}%)")

    print("\n[응답 상세]")
    for a, name, score in results:
        print(f"  {name} (score {score}) | freq={a.get('freq')} "
              f"paid={a.get('paid')} use={a.get('use')} data={a.get('data')}")


if __name__ == "__main__":
    main()