import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getRedis } from "@/lib/redis"

const SESSION_COOKIE_NAME = "nl-session"
const SESSION_MAX_AGE = 60 * 60 * 8

const getAdminPassword = (): string => {
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    throw new Error("환경변수 누락: ADMIN_PASSWORD")
  }
  return password
}

export const login = async (password: string): Promise<boolean> => {
  const adminPassword = getAdminPassword()

  const encoder = new TextEncoder()
  const a = encoder.encode(password)
  const b = encoder.encode(adminPassword)

  if (a.byteLength !== b.byteLength) return false

  const aBuffer = new Uint8Array(a)
  const bBuffer = new Uint8Array(b)
  let mismatch = 0
  for (let i = 0; i < aBuffer.length; i++) {
    mismatch |= aBuffer[i] ^ bBuffer[i]
  }

  if (mismatch !== 0) return false

  const cookieStore = await cookies()
  const token = crypto.randomUUID()

  const redis = getRedis()
  await redis.set(`nl:session:${token}`, "1", "EX", SESSION_MAX_AGE)

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  })

  return true
}

export const logout = async (): Promise<void> => {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE_NAME)

  if (session?.value) {
    const redis = getRedis()
    await redis.del(`nl:session:${session.value}`)
  }

  cookieStore.delete(SESSION_COOKIE_NAME)
}

export const isAuthenticated = async (): Promise<boolean> => {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE_NAME)

  if (!session?.value) return false

  const redis = getRedis()
  const result = await redis.get(`nl:session:${session.value}`)
  return result !== null
}

export const requireAuth = async (): Promise<NextResponse | null> => {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    return NextResponse.json(
      { error: "인증이 필요합니다" },
      { status: 401 }
    )
  }
  return null
}
