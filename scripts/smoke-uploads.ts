/**
 * Smoke: uploads/newsletter/* 가공 직후 즉시 HTTP 200 으로 서빙되는지 회귀 가드.
 *
 * 배경: Next.js 16 `next start` 의 publicFileManifest 캐시가 기동 시점 public/ 파일 목록을
 * 고정 캐시해서, 빌드 이후 추가된 가공 이미지가 영원히 404 로 가는 회귀가 2026-04-13 발견됐다.
 * 동적 라우트 src/app/uploads/newsletter/[filename]/route.ts 로 우회해 영구 해결됐고,
 * 21 일간 잠재해 있던 이 함정이 다시 일어나지 않도록 회귀 가드 1 건을 둔다.
 *
 * 사용법:
 *   1) 다른 터미널에서 서버 기동: `npm run dev` (또는 build 후 `npm start`)
 *   2) `npm run smoke:uploads`
 *
 * 환경 변수:
 *   SMOKE_BASE_URL  검증 대상 base URL (기본 http://localhost:3003)
 */
import { mkdir, writeFile, unlink } from "fs/promises"
import { join } from "path"
import sharp from "sharp"

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3003"
const UPLOAD_DIR = join(process.cwd(), "uploads", "newsletter")

async function main(): Promise<number> {
  const filename = `__smoke_${Date.now()}.png`
  const filePath = join(UPLOAD_DIR, filename)

  await mkdir(UPLOAD_DIR, { recursive: true })

  const png = await sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .png()
    .toBuffer()
  await writeFile(filePath, png)

  const url = `${BASE_URL}/uploads/newsletter/${filename}`
  console.log(`[smoke] wrote ${filePath} (${png.length} bytes)`)
  console.log(`[smoke] GET ${url}`)

  let pass = false
  try {
    const res = await fetch(url, { cache: "no-store" })
    const ct = res.headers.get("content-type") ?? ""
    if (res.status === 200 && ct.startsWith("image/")) {
      const body = await res.arrayBuffer()
      if (body.byteLength === png.length) {
        console.log(`[smoke] PASS — status=200 content-type=${ct} bytes=${body.byteLength}`)
        pass = true
      } else {
        console.error(
          `[smoke] FAIL — bytes mismatch (expected ${png.length}, got ${body.byteLength})`,
        )
      }
    } else {
      const body = await res.text().catch(() => "")
      console.error(`[smoke] FAIL — status=${res.status} content-type=${ct}`)
      if (body) console.error(`[smoke] body: ${body.slice(0, 200)}`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[smoke] FAIL — fetch error: ${msg}`)
    console.error(`[smoke] hint: 서버가 ${BASE_URL} 에서 떠 있는지 확인 (npm run dev / npm start).`)
  } finally {
    await unlink(filePath).catch(() => {})
  }

  return pass ? 0 : 1
}

main().then((code) => process.exit(code))
