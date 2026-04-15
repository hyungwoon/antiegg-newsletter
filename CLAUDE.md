# CLAUDE.md

## 프로젝트 개요

ANTIEGG 매거진 뉴스레터 자동화 헬퍼. Claude Code 스킬(`/newsletter`)이 호출하는 API 클라이언트 및 이미지 가공 도구.
Notion 로드맵 DB → Ghost 썸네일 수집 → WP 링크 조회 → 이미지 가공 → HTML 빌드 파이프라인.
최종 HTML을 스티비 웹 에디터에 붙여넣어 예약 발송한다 (API 발송 미지원).

## 기술 스택

- **Runtime**: Node.js v20+, TypeScript, tsx
- **Web**: Next.js 16 (Turbopack), Prisma, Redis 세션 인증
- **Ghost API**: Admin API, JWT 인증 (jsonwebtoken)
- **WP API**: REST API v2, Basic Auth (Application Password)
- **Slack API**: conversations.history (SLACK_USER_TOKEN)
- **이미지 가공**: sharp (16:9 크롭 + 둥근 모서리)

## 인프라

- Ghost (Square): https://square.antiegg.kr (Admin API, JWT 인증)
- WordPress (본사이트): https://antiegg.kr (REST API, Basic Auth)
- Stibee: api.stibee.com (AccessToken)
- Notion: ANTIEGG 워크스페이스 (아티클 로드맵 DB)
- 인증 정보는 `.env`에서 관리 (이 파일에 포함하지 않음)

## 배포

- **서버**: WP 서버 (SSH Host: `wp`, IP: 158.247.236.239, Port: 2222, User: antiegg)  <!-- nl host, 2026-04-13 stale IP 교정 (이전 158.247.234.227은 square host) -->
- **경로**: `/home/antiegg/apps/antiegg-newsletter`
- **프로세스**: PM2 (`antiegg-newsletter`, `npm start` → `next start --port 3003`)
- **배포 절차**:
  1. 로컬에서 커밋 & `git push origin main`
  2. `ssh wp "cd /home/antiegg/apps/antiegg-newsletter && git pull origin main && npm install && npm run build && pm2 restart antiegg-newsletter"`
  3. `pm2 logs antiegg-newsletter --lines 10`으로 정상 기동 확인

## 파일 구조

```
src/
├── fetch-ghost.ts      ← Ghost Admin API (slug → title, excerpt, feature_image)
├── fetch-wp.ts         ← WP REST API (title 기반 검색 → 공개 URL)
└── process-images.ts   ← 이미지 16:9 크롭 + 둥근 모서리 (sharp)
output/                 ← 가공된 이미지 저장 디렉토리
templates/              ← 참조용 HTML 템플릿
```

## 데이터 매핑

| 뉴스레터 필드 | 소스 | 필드 |
|-------------|------|------|
| 아티클 제목 | Notion | `아티클 제목` (title) |
| 설명문 (전문 사용) | Notion | `바이럴 멘트` (rich_text) |
| 섹션 구분 | Notion | `🔴 콘텐츠 종류` (CURATION/GRAY) |
| Ghost slug | Notion | `Square CMS` URL에서 추출 |
| 썸네일 이미지 | Ghost | `feature_image` |
| 아티클 링크 | WordPress | title 검색 → `post.link` |

## CLI 사용법

```bash
# Ghost에서 이미지 가져오기
npx tsx src/fetch-ghost.ts --slugs "slug1,slug2"

# WordPress에서 URL 가져오기 (title 기반 — Ghost/WP slug 다름!)
npx tsx src/fetch-wp.ts --titles "제목1|제목2"

# 이미지 가공 (16:9 크롭 + border-radius)
npx tsx src/process-images.ts --json '[{"slug":"x","url":"https://..."}]'

```

## 작업 시 주의사항

- **WP는 title 기반 검색** — Ghost slug와 WP slug가 다르므로 `--titles` 사용
- **바이럴 멘트 전문 사용** — 절대 축약 금지. Notion `바이럴 멘트` 필드 그대로
- **이미지 화살표는 HTML/CSS 오버레이** — 이미지에 합성하지 않음
- **Stibee 발송은 수동** — API로 발송 불가. HTML을 스티비 웹 에디터에 붙여넣고 예약 발송
