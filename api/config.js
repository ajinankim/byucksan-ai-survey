import { QUESTIONS, COMMENT } from "./_questions.js";

export default function handler(req, res) {
  // 문항은 수정 가능성이 있으므로 캐시 금지 (60초 캐시가 배포 직후 stale 구조 재사용 문제 유발)
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ questions: QUESTIONS, comment: COMMENT });
}
