// 저장소 어댑터.
//   1순위) 구글 시트  — SHEET_API_URL + SHEET_TOKEN
//   2순위) Redis(REST) — KV_REST_API_URL / UPSTASH_REDIS_REST_URL + 토큰
//   3순위) 메모리      — 로컬 확인용. 서버리스에서는 유지되지 않는다.

const SHEET_URL = process.env.SHEET_API_URL || "";
const SHEET_TOKEN = process.env.SHEET_TOKEN || "";

const REDIS_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

const KEY = "survey:v1:responses";
const memory = [];

export const backend = SHEET_URL && SHEET_TOKEN
  ? "sheet"
  : REDIS_URL && REDIS_TOKEN
    ? "redis"
    : "memory";

export const hasStore = backend !== "memory";

// ── 구글 시트 ────────────────────────────────────────────────
async function sheetPush(record) {
  const res = await fetch(SHEET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Apps Script 웹앱은 리디렉트를 거쳐 응답한다.
    redirect: "follow",
    body: JSON.stringify({ token: SHEET_TOKEN, ...record }),
  });
  if (!res.ok) throw new Error(`sheet ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(`sheet: ${j.error}`);
  return j.count;
}

async function sheetAll() {
  const u = `${SHEET_URL}${SHEET_URL.includes("?") ? "&" : "?"}token=${encodeURIComponent(SHEET_TOKEN)}`;
  const res = await fetch(u, { redirect: "follow" });
  if (!res.ok) throw new Error(`sheet ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(`sheet: ${j.error}`);
  // 시트에는 응답 1건이 JSON 한 줄로 저장되어 있다.
  return (j.rows || []).filter((r) => r && r.answers);
}

// ── Redis ───────────────────────────────────────────────────
async function redis(cmd) {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return (await res.json()).result;
}

// ── 공용 API ────────────────────────────────────────────────
export async function push(record) {
  if (backend === "sheet") return await sheetPush(record);
  if (backend === "redis") return await redis(["RPUSH", KEY, JSON.stringify(record)]);
  memory.push(JSON.stringify(record));
  return memory.length;
}

export async function all() {
  if (backend === "sheet") return await sheetAll();
  const raw = backend === "redis" ? await redis(["LRANGE", KEY, 0, -1]) : memory;
  return (raw || [])
    .map((s) => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
