# AI 활용 교육 사전 설문

회의 중 QR로 참여하는 8문항 설문과 실시간 통계 화면.

| 경로 | 용도 |
|---|---|
| `/` | 설문 (모바일 최적화, QR 대상) |
| `/stats.html` | 실시간 결과 — 4초마다 자동 갱신, 빔 프로젝터용 |
| `/qr.html` | QR 코드 화면 (배포 후 자동으로 자기 주소를 인코딩) |

문항은 `api/_questions.js` 한 곳에만 정의되어 있고 설문·통계 화면이 이를 공유한다.
문항을 고치려면 그 파일만 수정하면 된다.

## 배포

### 1. GitHub

```bash
git remote add origin https://github.com/<계정>/byucksan-ai-survey.git
git push -u origin main
```

### 2. Vercel

1. vercel.com → **Add New → Project** → 위 저장소 선택
2. 프레임워크는 **Other**, 빌드 설정은 그대로 두고 Deploy
   (`public/`가 정적 파일, `api/`가 서버리스 함수로 자동 인식된다)

### 3. 저장소 연결 — **이 단계를 건너뛰면 응답이 저장되지 않는다**

v2는 구글 시트 없이 Vercel 안에서만 동작한다. 응답은 Upstash Redis에 저장한다 (구글 시트보다 훨씬 빠르다).

1. Vercel 프로젝트 → **Storage** → **Create Database / Marketplace → Upstash Redis** (무료 플랜) → 프로젝트에 연결
2. `KV_REST_API_URL`, `KV_REST_API_TOKEN` 환경변수가 자동 등록된다
3. **재배포** (Deployments → Redeploy)

저장소가 없으면 `/stats.html` 상단에 경고 배너가 뜬다. **회의 전에 반드시 확인할 것.**
회의 후 엑셀 분석이 필요하면 Upstash 콘솔에서 `survey:v1:responses` 리스트를 내려받는다.

## 설문 회차 (시작·종료)

응답은 지우지 않고 **회차별로 쌓는다**. 분석할 회차는 결과 화면에서 고른다.

1. `/admin.html` 에서 관리자 암호를 입력하고 **새 설문 시작** — 날짜·시간으로 회차 ID(예: `20261006-1551`)가 만들어진다
2. 진행 중에만 응답을 받는다. 시작 전·종료 후에는 설문 화면에 「지금은 설문을 받지 않습니다」가 뜬다
3. **설문 종료**를 누르면 그 회차는 더 이상 갱신되지 않는다. 다음 설문은 다시 **새 설문 시작**
4. `/stats.html` 상단 「설문 회차」 목록에서 회차를 골라 본다 (기본값: 진행 중 → 없으면 가장 최근 회차)

관리자 암호는 환경변수 `ADMIN_PIN`, 없으면 `2260`. 암호는 주소가 아니라 요청 본문으로만 보낸다.

## 회의 진행

1. 회의 전 `/admin.html` 에서 새 설문 시작
2. 빔에 `/qr.html`을 띄운다
3. 참석자가 QR을 스캔해 응답한다 (약 2분)
4. `/stats.html`로 전환하면 결과가 4초마다 갱신된다
5. 끝나면 `/admin.html` 에서 설문 종료

## 로컬 확인

```bash
npx vercel dev
```

Redis 환경변수가 없으면 메모리에 저장되며 프로세스가 끝나면 사라진다.

## 데이터

- Redis 리스트 `survey:v2:resp:<회차ID>`에 응답 JSON이 순서대로 쌓인다 (회차 목록은 해시 `survey:v2:sessions`, 진행 중 회차는 `survey:v2:active`)
- 응답에는 시각과 선택지만 저장되며 IP·이름·계정 정보는 저장하지 않는다
- 정의되지 않은 값은 서버에서 걸러지고, 복수응답 상한도 서버에서 다시 적용된다
