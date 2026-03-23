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

const normalizeQuotes = (s: string): string =>
  s.replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'")
   .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')

const normalize = (s: string): string =>
  normalizeQuotes(s).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase()

export const searchPostByTitle = async (title: string): Promise<GhostPostResult> => {
  const token = getAdminToken()
  const cleaned = normalizeQuotes(title).replace(/[\r\n]+/g, " ").replace(/'/g, "\\'").trim()
  const query = encodeURIComponent(cleaned.slice(0, 100))
  const url = `${GHOST_API_URL}/ghost/api/admin/posts/?filter=title:~'${query}'&fields=slug,title,custom_excerpt,feature_image&limit=5`
  const res = await fetch(url, {
    headers: { Authorization: `Ghost ${token}` },
  })
  if (!res.ok) return { slug: title, error: `HTTP ${res.status}` }
  const data = (await res.json()) as GhostPostsResponse
  if (!data.posts.length) return { slug: title, error: "not found by title" }

  const clean = normalize(title)
  const exact = data.posts.find((p) => normalize(p.title) === clean)
  const match = exact ?? data.posts.find((p) => normalize(p.title).includes(clean) || clean.includes(normalize(p.title)))
  const post = match ?? data.posts[0]

  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.custom_excerpt,
    featureImage: post.feature_image,
  }
}
