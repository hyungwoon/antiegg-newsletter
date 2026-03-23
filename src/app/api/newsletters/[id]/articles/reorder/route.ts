import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import * as articleService from "@/lib/services/article-service"
import { reorderArticlesSchema } from "@/lib/validations/newsletter"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth()
  if (authError) return authError

  const { id } = await params
  try {
    const body = await req.json()
    const { articleIds } = reorderArticlesSchema.parse(body)
    const articles = await articleService.reorderArticles(id, articleIds)
    return NextResponse.json({ articles })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "순서 변경에 실패했습니다"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
