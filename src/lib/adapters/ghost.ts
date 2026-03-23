import jwt from "jsonwebtoken"

const GHOST_API_URL = process.env.GHOST_API_URL ?? "https://square.antiegg.kr"

export const getAdminToken = (): string => {
  const adminKey = process.env.GHOST_ADMIN_API_KEY
  if (!adminKey) throw new Error("환경변수 누락: GHOST_ADMIN_API_KEY")
  const [id, secret] = adminKey.split(":")
  if (!id || !secret) throw new Error("GHOST_ADMIN_API_KEY 형식 오류 — {id}:{secret}")
  const iat = Math.floor(Date.now() / 1000)
  const header = { alg: "HS256" as const, typ: "JWT", kid: id }
  const payload = { iat, exp: iat + 300, aud: "/admin/" }
  return jwt.sign(payload, Buffer.from(secret, "hex"), { header })
}

interface GhostPost {
  slug: string
  title: string
  custom_excerpt: string | null
  feature_image: string | null
}

interface GhostPostsResponse {
  posts: GhostPost[]
}

export interface GhostPostResult {
  slug: string
  title?: string
  excerpt?: string | null
  featureImage?: string | null
  error?: string
}

export const fetchPostBySlug = async (slug: string): Promise<GhostPostResult> => {
  const token = getAdminToken()
  const url = `${GHOST_API_URL}/ghost/api/admin/posts/slug/${slug}/?include=tags,authors`
  const res = await fetch(url, {
    headers: { Authorization: `Ghost ${token}` },
  })
  if (res.status === 404) return { slug, error: "not found" }
  if (!res.ok) return { slug, error: `HTTP ${res.status}` }
  const data = (await res.json()) as GhostPostsResponse
  const post = data.posts[0]
  if (!post) return { slug, error: "not found" }
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.custom_excerpt,
    featureImage: post.feature_image,
  }
}

export const fetchPostsBySlugs = async (slugs: string[]): Promise<GhostPostResult[]> => {
  return Promise.all(slugs.map((slug) => fetchPostBySlug(slug)))
}
