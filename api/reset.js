import { reset, hasAdminReset } from "./_store.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  try {
    // 관리자 키는 Authorization 헤더로 받는다 (본문·URL 노출 방지)
    const auth = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!auth || !hasAdminReset) {
      return res.status(403).json({ error: "forbidden" });
    }
    const result = await reset(auth);
    return res.status(200).json({ ok: true, ...result, persisted: true });
  } catch (e) {
    const code = /forbidden/i.test(String(e.message || "")) ? 403 : 500;
    return res.status(code).json({ error: String(e.message || e) });
  }
}