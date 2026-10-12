import { listSessions, getActive } from "./_store.js";

// 회차 목록과 현재 진행 중인 회차. 설문·통계 화면이 공용으로 읽는다.
export default async function handler(req, res) {
  try {
    const [active, sessions] = await Promise.all([getActive(), listSessions()]);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ active, sessions });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
