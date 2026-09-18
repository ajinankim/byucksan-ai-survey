import { all, hasStore, backend } from "./_store.js";
import { QUESTIONS } from "./_questions.js";

export default async function handler(req, res) {
  try {
    const rows = await all();
    const total = rows.length;

    const stats = QUESTIONS.map((q) => {
      const counts = Object.fromEntries(q.options.map((o) => [o, 0]));
      let answered = 0;
      for (const r of rows) {
        const v = r.answers?.[q.id];
        if (v === undefined) continue;
        answered += 1;
        for (const o of Array.isArray(v) ? v : [v]) {
          if (o in counts) counts[o] += 1;
        }
      }
      return {
        id: q.id,
        title: q.title,
        type: q.type,
        hint: q.hint || "",
        answered,
        // 복수응답은 응답자 수 기준(중복 허용), 단일응답은 합계 기준
        base: q.type === "multi" ? answered : answered,
        options: q.options.map((o) => ({ label: o, count: counts[o] })),
      };
    });

    const comments = rows
      .filter((r) => r.comment)
      .slice(-30)
      .map((r) => r.comment)
      .reverse();

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ total, stats, comments, persisted: hasStore, backend });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
