import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { findNewsletterMessage } from "@/lib/adapters/slack"

const NEWSLETTER_CHANNEL_ID = "C03CXG0P6A3"

export async function GET() {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const data = await findNewsletterMessage(NEWSLETTER_CHANNEL_ID)
    if (!data) {
      return NextResponse.json(
        { error: "슬랙에서 뉴스레터 메시지를 찾을 수 없습니다" },
        { status: 404 }
      )
    }
    return NextResponse.json(data)
  } catch (error) {
    const msg = error instanceof Error ? error.message : "슬랙 조회에 실패했습니다"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
