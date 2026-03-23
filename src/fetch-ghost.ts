import "dotenv/config"
import jwt from "jsonwebtoken"

const GHOST_API_URL = process.env.GHOST_API_URL ?? "https://square.antiegg.kr"

const getAdminToken = (): string => {
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

interface PostResult {
  slug: string
  title?: string
  excerpt?: string | null
  feature_image?: string | null
  error?: string
}

async function fetchPostBySlug(slug: string, token: string): Promise<PostResult> {
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
    feature_image: post.feature_image,
  }
}

function parseSlugs(): string[] {
  const args = process.argv.slice(2)
  const slugIdx = args.indexOf("--slug")
  const slugsIdx = args.indexOf("--slugs")
  if (slugIdx !== -1 && args[slugIdx + 1]) return [args[slugIdx + 1]]
  if (slugsIdx !== -1 && args[slugsIdx + 1]) return args[slugsIdx + 1].split(",").map((s) => s.trim()).filter(Boolean)
  throw new Error("Usage: --slug <slug> or --slugs <slug1,slug2,...>")
}

async function main() {
  const slugs = parseSlugs()
  const token = getAdminToken()
  const results = await Promise.all(slugs.map((slug) => fetchPostBySlug(slug, token)))
  process.stdout.write(JSON.stringify(results, null, 2) + "\n")
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`)
  process.exit(1)
})
