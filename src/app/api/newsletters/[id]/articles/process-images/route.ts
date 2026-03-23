import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { processAllImages } from "@/lib/services/article-service"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const { id } = await params
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003"
    const articles = await processAllImages(id, baseUrl)
    return NextResponse.json({ articles })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "이미지 가공에 실패했습니다" },
      { status: 500 }
    )
  }
}
