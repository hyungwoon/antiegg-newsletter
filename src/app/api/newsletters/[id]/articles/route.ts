import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import * as articleService from "@/lib/services/article-service"
import * as newsletterService from "@/lib/services/newsletter-service"
import { addArticleSchema } from "@/lib/validations/newsletter"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth()
  if (authError) return authError

  const { id } = await params
  try {
    const newsletter = await newsletterService.getNewsletter(id)
    if (!newsletter) return NextResponse.json({ error: "뉴스레터를 찾을 수 없습니다" }, { status: 404 })
    return NextResponse.json({ articles: newsletter.articles })
  } catch {
    return NextResponse.json({ error: "아티클 목록 조회에 실패했습니다" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth()
  if (authError) return authError

  const { id } = await params
  try {
    const body = await req.json()
    const data = addArticleSchema.parse(body)
    const article = await articleService.addArticle(id, data)
    return NextResponse.json({ article }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "아티클 추가에 실패했습니다"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
