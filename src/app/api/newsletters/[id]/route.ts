import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import * as newsletterService from "@/lib/services/newsletter-service"
import { updateNewsletterSchema } from "@/lib/validations/newsletter"

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
    return NextResponse.json({ newsletter })
  } catch {
    return NextResponse.json({ error: "뉴스레터 조회에 실패했습니다" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth()
  if (authError) return authError

  const { id } = await params
  try {
    const body = await req.json()
    const data = updateNewsletterSchema.parse(body)
    const newsletter = await newsletterService.updateNewsletter(id, data)
    return NextResponse.json({ newsletter })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "뉴스레터 수정에 실패했습니다"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth()
  if (authError) return authError

  const { id } = await params
  try {
    await newsletterService.deleteNewsletter(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "뉴스레터 삭제에 실패했습니다"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
