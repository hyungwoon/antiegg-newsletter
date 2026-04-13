import { NextRequest, NextResponse } from "next/server"
import { readFile, stat } from "fs/promises"
import { join, extname } from "path"

const UPLOAD_DIR = join(process.cwd(), "uploads", "newsletter")

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  if (filename.includes("/") || filename.includes("..") || filename.includes("\\")) {
    return new NextResponse("Invalid filename", { status: 400 })
  }

  const filePath = join(UPLOAD_DIR, filename)

  try {
    const stats = await stat(filePath)
    if (!stats.isFile()) {
      return new NextResponse("Not found", { status: 404 })
    }

    const buffer = await readFile(filePath)
    const ext = extname(filename).toLowerCase()
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream"

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": stats.size.toString(),
        "Cache-Control": "public, max-age=300, must-revalidate",
        "Last-Modified": stats.mtime.toUTCString(),
      },
    })
  } catch {
    return new NextResponse("Not found", { status: 404 })
  }
}
