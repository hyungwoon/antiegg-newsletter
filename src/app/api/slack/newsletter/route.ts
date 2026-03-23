import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { findAllNewsletterMessages } from "@/lib/adapters/slack"

const NEWSLETTER_CHANNEL_ID = "C03CXG0P6A3"

export async function GET() {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const messages = await findAllNewsletterMessages(NEWSLETTER_CHANNEL_ID)
    return NextResponse.json({ messages })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "슬랙 조회에 실패했습니다"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
