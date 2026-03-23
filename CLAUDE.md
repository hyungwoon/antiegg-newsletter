# CLAUDE.md

## 프로젝트 개요

ANTIEGG 매거진 뉴스레터 자동화 웹 어드민 + CLI 도구.
Notion 로드맵 DB → Ghost 썸네일 수집 → WP 링크/이미지 조회 → HTML 빌드 → 스티비 수동 붙여넣기.

## 기술 스택

- **웹 어드민**: Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui
- **데이터베이스**: PostgreSQL + Prisma 7 (PrismaPg adapter)
- **인증**: Redis 세션 (prefix `nl:`, httpOnly cookie, 8시간 TTL)
- **Ghost API**: Admin API, JWT 인증 (jsonwebtoken)
- **WP API**: REST API v2, Basic Auth + `_embed` (featured image 포함)
- **이미지**: Ghost → 미리보기용, WP featured image → 발송 HTML용
- **Port**: 3003

## 인프라

- Ghost (Square): https://square.antiegg.kr (Admin API, JWT 인증)
- WordPress (본사이트): https://antiegg.kr (REST API, Basic Auth)
- Stibee: 수동 붙여넣기 (API 발송 미지원)
- Notion: ANTIEGG 워크스페이스 (아티클 로드맵 DB)
- PostgreSQL: `antiegg_newsletter` 데이터베이스
- Redis: 세션 저장 (prefix `nl:`)
- 인증 정보는 `.env`에서 관리

## 파일 구조

```
src/
├── app/
│   ├── (admin)/              ← 인증 필요한 어드민 페이지
│   │   ├── layout.tsx        ← 사이드바 네비게이션
│   │   └── newsletters/      ← 뉴스레터 목록/편집
│   ├── api/                  ← API 라우트
│   │   ├── auth/             ← 로그인/로그아웃
│   │   ├── newsletters/      ← 뉴스레터 CRUD + 아티클 관리
│   │   └── notion/articles/  ← Notion DB 조회
│   ├── login/                ← 로그인 페이지
│   └── layout.tsx            ← 루트 레이아웃
├── lib/
│   ├── adapters/             ← 외부 API 클라이언트 (ghost, wordpress, notion)
│   ├── services/             ← 비즈니스 로직 (newsletter, article, template-renderer)
│   ├── validations/          ← Zod 스키마
│   ├── db/prisma.ts          ← Prisma 싱글턴
│   ├── auth.ts               ← Redis 세션 인증
│   └── redis.ts              ← Redis 연결
├── components/
│   ├── newsletter/           ← 뉴스레터 전용 컴포넌트
│   └── ui/                   ← shadcn/ui 컴포넌트
├── fetch-ghost.ts            ← CLI: Ghost API (독립 실행 가능)
├── fetch-wp.ts               ← CLI: WP API (독립 실행 가능)
└── process-images.ts         ← CLI: 이미지 가공 (독립 실행 가능)
templates/                    ← 뉴스레터 HTML 템플릿
prisma/schema.prisma          ← DB 스키마
```

## 이미지 전략

- **미리보기 (어드민)**: Ghost `feature_image` URL 사용 (예약 상태에서도 접근 가능)
- **발송 HTML**: WP `featured_media` URL 사용 (발송 시점에 아티클 공개 상태)
- Article 모델에 `ghostImageUrl`, `wpImageUrl` 두 필드 보유

## 데이터 매핑

| 뉴스레터 필드 | 소스 | 필드 |
|-------------|------|------|
| 아티클 제목 | Notion | `아티클 제목` (title) |
| 설명문 (전문 사용) | Notion | `바이럴 멘트` (rich_text) |
| 섹션 구분 | Notion | `🔴 콘텐츠 종류` (CURATION/GRAY) |
| Ghost slug | Notion | `Square CMS` URL에서 추출 |
| 미리보기 이미지 | Ghost | `feature_image` |
| 발송 이미지 | WordPress | `_embedded.wp:featuredmedia[0].source_url` |
| 아티클 링크 | WordPress | title 검색 → `post.link` |

## 웹 어드민 워크플로우

1. 새 뉴스레터 생성 (제목, 에디토리얼 입력)
2. Notion에서 아티클 가져오기 (다중 선택)
3. "전체 연동" → Ghost 이미지 + WP 링크/이미지 일괄 조회
4. 미리보기 탭에서 HTML 확인
5. "HTML 복사" → 스티비 웹 에디터에 붙여넣기
6. 상태 전환: 초안 → 준비완료 → 발송완료

## CLI 사용법 (독립 실행)

```bash
npm run dev                    # 웹 어드민 (port 3003)
npm run ghost -- --slugs "slug1,slug2"
npm run wp -- --titles "제목1|제목2"
npm run images -- --json '[{"slug":"x","url":"https://..."}]'
```

## 작업 시 주의사항

- **WP는 title 기반 검색** — Ghost slug와 WP slug가 다르므로 `--titles` 사용
- **바이럴 멘트 전문 사용** — 절대 축약 금지. Notion `바이럴 멘트` 필드 그대로
- **이미지 화살표는 HTML/CSS 오버레이** — 이미지에 합성하지 않음
- **Stibee 발송은 수동** — HTML을 스티비 웹 에디터에 붙여넣고 예약 발송
- **상태 전환은 단방향** — DRAFT → READY → SENT (역방향 불가)
- **Prisma 7** — `prisma.config.ts`에서 DB URL 관리, schema에는 url 없음
