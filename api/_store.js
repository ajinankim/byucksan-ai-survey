// 저장소 어댑터 (v2 — 구글 시트 없이 Vercel 안에서 동작).
//   1순위) Redis(REST) — Vercel Marketplace의 Upstash Redis (KV_REST_API_URL / UPSTASH_REDIS_REST_URL + 토큰)
//   2순위) 메모리      — 로컬 확인용. 서버리스에서는 유지되지 않는다.
//
// 응답은 지우지 않고 "설문 회차(세션)"별로 쌓는다.
//   survey:v2:sessions   — 회차 목록 (해시: id → {id, label, startedAt, endedAt})
//   survey:v2:active     — 지금 진행 중인 회차 id (없으면 접수 중지)
//   survey:v2:resp:<id>  — 회차별 응답 목록

const REDIS_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

const SESSIONS = "survey:v2:sessions";
const ACTIVE = "survey:v2:active";
const respKey = (id) => `survey:v2:resp:${id}`;

const mem = { sessions: {}, active: null, resp: {} };

export const backend = REDIS_URL && REDIS_TOKEN ? "redis" : "memory";
export const hasStore = backend !== "memory";

async function redis(cmd) {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return (await res.json()).result;
}

const parse = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

// 한국 시간 기준 id·표시 문자열
function stamp(d = new Date()) {
  const k = new Date(d.getTime() + 9 * 3600 * 1000).toISOString(); // 2026-10-06T15:45:12.000Z
  return {
    id: k.slice(0, 10).replace(/-/g, "") + "-" + k.slice(11, 16).replace(":", ""),
    label: k.slice(0, 10) + " " + k.slice(11, 16),
  };
}

// ── 회차 ─────────────────────────────────────────────────────
export async function listSessions() {
  let list;
  if (backend === "redis") {
    const flat = (await redis(["HGETALL", SESSIONS])) || [];
    list = [];
    for (let i = 1; i < flat.length; i += 2) list.push(parse(flat[i]));
  } else {
    list = Object.values(mem.sessions);
  }
  return list.filter(Boolean).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

export async function getActive() {
  return backend === "redis" ? (await redis(["GET", ACTIVE])) || null : mem.active;
}

async function saveSession(s) {
  if (backend === "redis") await redis(["HSET", SESSIONS, s.id, JSON.stringify(s)]);
  else mem.sessions[s.id] = s;
}

export async function endSession() {
  const id = await getActive();
  if (!id) return null;
  const list = await listSessions();
  const s = list.find((x) => x.id === id);
  if (s) await saveSession({ ...s, endedAt: new Date().toISOString() });
  if (backend === "redis") await redis(["DEL", ACTIVE]);
  else mem.active = null;
  return id;
}

// 새 회차 시작. 진행 중인 회차가 있으면 먼저 종료한다.
export async function startSession() {
  await endSession();
  const existing = new Set((await listSessions()).map((s) => s.id));
  const { id: base, label } = stamp();
  let id = base, n = 1;
  while (existing.has(id)) id = `${base}-${++n}`;
  const s = { id, label, startedAt: new Date().toISOString(), endedAt: null };
  await saveSession(s);
  if (backend === "redis") await redis(["SET", ACTIVE, id]);
  else mem.active = id;
  return s;
}

// ── 응답 ─────────────────────────────────────────────────────
export async function push(id, record) {
  const v = JSON.stringify(record);
  if (backend === "redis") return await redis(["RPUSH", respKey(id), v]);
  (mem.resp[id] ||= []).push(v);
  return mem.resp[id].length;
}

export async function all(id) {
  const raw = backend === "redis" ? await redis(["LRANGE", respKey(id), 0, -1]) : mem.resp[id];
  return (raw || []).map(parse).filter(Boolean);
}
