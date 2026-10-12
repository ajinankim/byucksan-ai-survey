import { timingSafeEqual } from "node:crypto";
import { startSession, endSession } from "./_store.js";

// 설문 시작·종료. 관리자 암호(환경변수 ADMIN_PIN, 없으면 2260)가 맞아야 한다.
// 암호는 주소가 아니라 요청 본문으로만 받는다.
const PIN = process.env.ADMIN_PIN || "2260";

function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    if (!same(body.pin ?? "", PIN)) {
      res.status(401).json({ error: "암호가 맞지 않습니다" });
      return;
    }
    if (body.action === "start") {
      res.status(200).json({ ok: true, session: await startSession() });
    } else if (body.action === "end") {
      res.status(200).json({ ok: true, ended: await endSession() });
    } else {
      res.status(400).json({ error: "알 수 없는 동작" });
    }
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "2kb" } } };
