import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import * as newsletterService from "@/lib/services/newsletter-service"
import { createNewsletterSchema } from "@/lib/validations/newsletter"
import { NewsletterStatus } from "@/generated/prisma/client"

export async function GET(req: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get("status")
  const status = statusParam as NewsletterStatus | undefined

  try {
    const newsletters = await newsletterService.getNewsletters(status ?? undefined)
    return NextResponse.json({ newsletters })
  } catch {
    return NextResponse.json({ error: "뉴스레터 목록 조회에 실패했습니다" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const body = await req.json()
    const data = createNewsletterSchema.parse(body)
    const newsletter = await newsletterService.createNewsletter(data)
    return NextResponse.json({ newsletter }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "뉴스레터 생성에 실패했습니다" }, { status: 400 })
  }
}
