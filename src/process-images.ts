import "dotenv/config"
import sharp from "sharp"
import { mkdirSync, existsSync } from "fs"
import { join } from "path"

const OUTPUT_DIR = join(import.meta.dirname, "..", "output")
const TARGET_W = 1260
const TARGET_H = 720

const RADIUS = 24
const ARROW_SVG = `<svg width="80" height="60" viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="80" height="60" rx="8" fill="rgba(0,0,0,0.35)"/>
  <path d="M24 30h28M44 20l12 10-12 10" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`

interface ProcessResult {
  slug: string
  localPath?: string
  error?: string
}

async function processImage(slug: string, imageUrl: string): Promise<ProcessResult> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) return { slug, error: `HTTP ${res.status}` }

    const buffer = Buffer.from(await res.arrayBuffer())
    const img = sharp(buffer)
    const meta = await img.metadata()
    const srcW = meta.width ?? TARGET_W
    const srcH = meta.height ?? TARGET_H

    // Center crop to 16:9
    const srcRatio = srcW / srcH
    const targetRatio = TARGET_W / TARGET_H
    let cropW = srcW
    let cropH = srcH
    if (srcRatio > targetRatio) {
      cropW = Math.round(srcH * targetRatio)
    } else {
      cropH = Math.round(srcW / targetRatio)
    }
    const left = Math.round((srcW - cropW) / 2)
    const top = Math.round((srcH - cropH) / 2)

    // Rounded corners mask
    const roundedMask = Buffer.from(
      `<svg width="${TARGET_W}" height="${TARGET_H}"><rect x="0" y="0" width="${TARGET_W}" height="${TARGET_H}" rx="${RADIUS}" ry="${RADIUS}" fill="white"/></svg>`
    )

    const outPath = join(OUTPUT_DIR, `${slug}.png`)
    await img
      .extract({ left, top, width: cropW, height: cropH })
      .resize(TARGET_W, TARGET_H)
      .composite([{ input: roundedMask, blend: "dest-in" }])
      .png({ quality: 90 })
      .toFile(outPath)

    return { slug, localPath: outPath }
  } catch (err) {
    return { slug, error: err instanceof Error ? err.message : String(err) }
  }
}

function parseArgs(): Array<{ slug: string; url: string }> {
  const args = process.argv.slice(2)
  const items: Array<{ slug: string; url: string }> = []

  // --data "slug1|url1,slug2|url2"
  const dataIdx = args.indexOf("--data")
  if (dataIdx !== -1 && args[dataIdx + 1]) {
    for (const pair of args[dataIdx + 1].split(",")) {
      const [slug, url] = pair.split("|")
      if (slug && url) items.push({ slug: slug.trim(), url: url.trim() })
    }
  }

  // --json '[{"slug":"x","url":"y"}]'
  const jsonIdx = args.indexOf("--json")
  if (jsonIdx !== -1 && args[jsonIdx + 1]) {
    const parsed = JSON.parse(args[jsonIdx + 1]) as Array<{ slug: string; url: string }>
    items.push(...parsed)
  }

  return items
}

async function main() {
  const items = parseArgs()
  if (!items.length) {
    process.stderr.write('Usage: --data "slug1|url1,slug2|url2" or --json \'[{"slug":"x","url":"y"}]\'\n')
    process.exit(1)
  }

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

  const results = await Promise.all(items.map((i) => processImage(i.slug, i.url)))
  process.stdout.write(JSON.stringify(results, null, 2) + "\n")
}

main().catch((err) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
