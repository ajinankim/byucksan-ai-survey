import { push, hasStore } from "./_store.js";
import { QUESTIONS } from "./_questions.js";

const IDS = new Set(QUESTIONS.map((q) => q.id));

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    // 정의된 문항만 통과시킨다.
    const answers = {};
    for (const q of QUESTIONS) {
      const v = body[q.id];
      if (v === undefined || v === null) continue;
      if (q.type === "multi") {
        if (!Array.isArray(v)) continue;
        const picked = v.filter((o) => q.options.includes(o));
        if (picked.length) answers[q.id] = q.max ? picked.slice(0, q.max) : picked;
      } else if (q.options.includes(v)) {
        answers[q.id] = v;
      }
    }
    if (!Object.keys(answers).length) {
      res.status(400).json({ error: "응답이 없습니다" });
      return;
    }

    const comment = String(body.comment || "").slice(0, 300).trim();
    const record = { at: new Date().toISOString(), answers };
    if (comment) record.comment = comment;

    const n = await push(record);
    res.status(200).json({ ok: true, count: n, persisted: hasStore });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "8kb" } } };
export { IDS };
