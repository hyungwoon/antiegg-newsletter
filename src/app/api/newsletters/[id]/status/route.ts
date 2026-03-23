import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import * as newsletterService from "@/lib/services/newsletter-service"
import { NewsletterStatus } from "@/generated/prisma/client"
import { z } from "zod"

const statusSchema = z.object({
  status: z.enum(["DRAFT", "READY", "SENT"]),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth()
  if (authError) return authError

  const { id } = await params
  try {
    const body = await req.json()
    const { status } = statusSchema.parse(body)
    const newsletter = await newsletterService.updateStatus(id, status as NewsletterStatus)
    return NextResponse.json({ newsletter })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "상태 변경에 실패했습니다"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
