import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import * as articleService from "@/lib/services/article-service"
import { updateArticleSchema } from "@/lib/validations/newsletter"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; articleId: string }> }
) {
  const authError = await requireAuth()
  if (authError) return authError

  const { articleId } = await params
  try {
    const body = await req.json()
    const data = updateArticleSchema.parse(body)
    const article = await articleService.updateArticle(articleId, data)
    return NextResponse.json({ article })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "아티클 수정에 실패했습니다"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; articleId: string }> }
) {
  const authError = await requireAuth()
  if (authError) return authError

  const { articleId } = await params
  try {
    await articleService.removeArticle(articleId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "아티클 삭제에 실패했습니다"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
