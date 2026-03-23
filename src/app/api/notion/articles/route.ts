import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { queryDatabase, parseNotionArticle } from "@/lib/adapters/notion"

export async function GET(_req: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const response = await queryDatabase({
      sorts: [{ property: "발행일", direction: "descending" }],
      pageSize: 50,
    })
    const articles = response.results.map(parseNotionArticle)
    return NextResponse.json({ articles })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Notion 아티클 조회에 실패했습니다"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
