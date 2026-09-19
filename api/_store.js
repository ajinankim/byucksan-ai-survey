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

// ── 인메모리 TTL 캐시 (stats 4초 폴링이 Apps Script를 매번 때리는 것 방지)
//    Vercel 함수 인스턴스가 살아있는 동안만 유효 — 콜드스타트 시엔 재조회.
const SHEET_CACHE = { t: 0, data: null, TTL: 12000 }; // 12초

export const backend = SHEET_URL && SHEET_TOKEN
  ? "sheet"
  : REDIS_URL && REDIS_TOKEN
    ? "redis"
    : "memory";

export const hasStore = backend !== "memory";

// ── 안정 fetch: 타임아웃 + 재시도 (Apps Script 콜드스타트로 인한 간헐 지연 흡수)
async function robustFetch(url, init = {}, retries = 2) {
  const opts = { ...init, redirect: "follow" };
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await Promise.race([
        fetch(url, opts),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 20000)),
      ]);
      // Apps Script가 첫 요청 시 302 리디렉트를 거치거나 429(스로틀)를 주면 재시도
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`retriable ${res.status}`);
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw lastErr || new Error("request failed");
}

// ── 구글 시트 ────────────────────────────────────────────────
async function sheetPush(record) {
  const res = await robustFetch(SHEET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Apps Script 웹앱은 리디렉트를 거쳐 응답한다.
    body: JSON.stringify({ token: SHEET_TOKEN, ...record }),
  });
  if (!res.ok) throw new Error(`sheet ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(`sheet: ${j.error}`);
  return j.count;
}

async function sheetAll() {
  const u = `${SHEET_URL}${SHEET_URL.includes("?") ? "&" : "?"}token=${encodeURIComponent(SHEET_TOKEN)}`;
  const res = await robustFetch(u, { method: "GET" });
  if (!res.ok) throw new Error(`sheet ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(`sheet: ${j.error}`);
  // 시트에는 응답 1건이 JSON 한 줄로 저장되어 있다.
  return (j.rows || []).filter((r) => r && r.answers);
}

// ── 데이터 리셋 (회의 시작 전 초기화, 관리자 전용) ───────────
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
export const hasAdminReset = Boolean(ADMIN_TOKEN);

async function sheetReset(adminToken) {
  if (!ADMIN_TOKEN || adminToken !== ADMIN_TOKEN) {
    throw new Error("forbidden");
  }
  // Apps Script doPost 에 action:"reset" 을 보내 응답 시트를 비운다.
  const res = await robustFetch(SHEET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: SHEET_TOKEN, action: "reset" }),
  });
  if (!res.ok) throw new Error(`sheet ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(`sheet: ${j.error}`);
  // 읽기 캐시 무효화
  SHEET_CACHE.t = 0;
  SHEET_CACHE.data = null;
  return j;
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
  if (backend === "sheet") {
    // 시트 저장 후 읽기 캐시 무효화 (다음 all()이 최신 반영)
    SHEET_CACHE.t = 0;
    SHEET_CACHE.data = null;
    return await sheetPush(record);
  }
  if (backend === "redis") return await redis(["RPUSH", KEY, JSON.stringify(record)]);
  memory.push(JSON.stringify(record));
  return memory.length;
}

export async function all() {
  if (backend === "sheet") {
    const now = Date.now();
    if (SHEET_CACHE.data && now - SHEET_CACHE.t < SHEET_CACHE.TTL) {
      return SHEET_CACHE.data;
    }
    const rows = await sheetAll();
    SHEET_CACHE.t = Date.now();
    SHEET_CACHE.data = rows;
    return rows;
  }
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

// 데이터 리셋 (관리자 전용) — 구글 시트 backend일 때만
export async function reset(adminToken) {
  if (backend !== "sheet") throw new Error("reset only for sheet backend");
  return await sheetReset(adminToken);
}