import { NextRequest, NextResponse } from "next/server"
import { login, logout, isAuthenticated } from "@/lib/auth"
import { loginSchema } from "@/lib/validations/auth"
import { getRedis } from "@/lib/redis"

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW = 900

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"

  const redis = getRedis()
  const key = `nl:rate:login:${ip}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, RATE_LIMIT_WINDOW)
  if (count > RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "로그인 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요" },
      { status: 429, headers: { "Retry-After": "900" } }
    )
  }

  try {
    const body = await req.json()
    const { password } = loginSchema.parse(body)

    const success = await login(password)
    if (!success) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다" },
        { status: 401 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "로그인에 실패했습니다" },
      { status: 400 }
    )
  }
}

export async function DELETE() {
  await logout()
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const authenticated = await isAuthenticated()
  return NextResponse.json({ authenticated })
}
