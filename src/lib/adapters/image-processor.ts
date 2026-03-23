import sharp from "sharp"
import { mkdirSync, existsSync } from "fs"
import { join } from "path"

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "newsletter")
const TARGET_W = 1260
const TARGET_H = 720
const RADIUS = 24

const ensureDir = () => {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })
}

export interface ProcessResult {
  slug: string
  publicUrl: string
  error?: string
}

export const processImage = async (
  slug: string,
  imageUrl: string,
  baseUrl: string
): Promise<ProcessResult> => {
  try {
    ensureDir()

    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) return { slug, publicUrl: "", error: `HTTP ${res.status}` }

    const buffer = Buffer.from(await res.arrayBuffer())
    const img = sharp(buffer)
    const meta = await img.metadata()
    const srcW = meta.width ?? TARGET_W
    const srcH = meta.height ?? TARGET_H

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

    const roundedMask = Buffer.from(
      `<svg width="${TARGET_W}" height="${TARGET_H}"><rect x="0" y="0" width="${TARGET_W}" height="${TARGET_H}" rx="${RADIUS}" ry="${RADIUS}" fill="white"/></svg>`
    )

    const filename = `${slug}.png`
    const outPath = join(UPLOAD_DIR, filename)

    await img
      .extract({ left, top, width: cropW, height: cropH })
      .resize(TARGET_W, TARGET_H)
      .composite([{ input: roundedMask, blend: "dest-in" }])
      .png({ quality: 90 })
      .toFile(outPath)

    const publicUrl = `${baseUrl}/uploads/newsletter/${filename}`
    return { slug, publicUrl }
  } catch (err) {
    return { slug, publicUrl: "", error: err instanceof Error ? err.message : String(err) }
  }
}
