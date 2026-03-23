import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import * as articleService from "@/lib/services/article-service"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth()
  if (authError) return authError

  const { id } = await params
  try {
    const articles = await articleService.resolveAllArticles(id)
    return NextResponse.json({ articles })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "아티클 연동에 실패했습니다"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
