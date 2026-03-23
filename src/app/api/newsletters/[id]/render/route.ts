import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { renderNewsletter } from "@/lib/services/template-renderer"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("mode") === "send" ? "send" : "preview"

  try {
    const html = await renderNewsletter(id, mode)
    return NextResponse.json({ html })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "렌더링에 실패했습니다"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
