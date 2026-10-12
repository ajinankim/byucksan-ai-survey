import { all, hasStore, backend, getActive, listSessions } from "./_store.js";
import { QUESTIONS } from "./_questions.js";

export default async function handler(req, res) {
  try {
    // ?session=<id> 로 회차를 고른다. 없으면 진행 중인 회차, 그것도 없으면 가장 최근 회차.
    const sessions = await listSessions();
    const active = await getActive();
    const want = req.query?.session;
    const session =
      sessions.find((s) => s.id === want) ||
      sessions.find((s) => s.id === active) ||
      sessions[0] ||
      null;
    const rows = session ? await all(session.id) : [];
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
        // 유료 구독은 복수 응답이라 옵션 합계로 인원을 셀 수 없다 — 유료 사용자 수를 따로 센다
        ...(q.id === "paid" && {
          anyPaid: rows.filter((r) =>
            [].concat(r.answers?.paid ?? []).some((o) => o.includes("유료 사용"))
          ).length,
        }),
      };
    });

    const comments = rows
      .filter((r) => r.comment)
      .slice(-30)
      .map((r) => r.comment)
      .reverse();

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ session, active, sessions, total, stats, comments, persisted: hasStore, backend });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
