const WP_API_URL = process.env.WP_API_URL ?? "https://antiegg.kr"
const WP_TIMEOUT_SINGLE = 10_000
const WP_TIMEOUT_BATCH = 30_000

const getCredentials = (): string | null => {
  const username = process.env.WP_USERNAME
  const appPassword = process.env.WP_APP_PASSWORD
  if (!username || !appPassword) return null
  return Buffer.from(`${username}:${appPassword}`).toString("base64")
}

interface WpPost {
  id: number
  title: { rendered: string }
  link: string
  status?: string
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url: string }>
  }
}

export interface WpSearchResult {
  url: string | null
  wpPostId: number | null
  wpStatus: string | null
  featuredImageUrl: string | null
  error?: string
}

const decodeHtmlEntities = (s: string): string =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&hellip;/g, "...")

const normalizeQuotes = (s: string): string =>
  s.replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'")
   .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')

const cleanTitle = (s: string): string =>
  normalizeQuotes(decodeHtmlEntities(s.replace(/<[^>]*>/g, "")))
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()

const wpFetch = async (url: string, timeoutMs: number): Promise<WpPost[]> => {
  const credentials = getCredentials()
  const headers: Record<string, string> = {}
  if (credentials) headers["Authorization"] = `Basic ${credentials}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { headers, signal: controller.signal })
    if (!res.ok) throw new Error(`WP API 오류: HTTP ${res.status}`)
    return res.json() as Promise<WpPost[]>
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`WP API 타임아웃 (${timeoutMs}ms)`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

const buildSearchUrl = (query: string, type: "title"): string => {
  const credentials = getCredentials()
  const statusParam = credentials ? "&status=publish,future" : ""
  return `${WP_API_URL}/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&_fields=id,title,link,status&_embed=wp:featuredmedia&per_page=5${statusParam}`
}

const extractFeaturedImage = (post: WpPost): string | null =>
  post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null

export const searchPostByTitle = async (title: string): Promise<WpSearchResult> => {
  try {
    const url = buildSearchUrl(title, "title")
    const posts = await wpFetch(url, WP_TIMEOUT_SINGLE)
    const clean = cleanTitle(title)
    const match = posts.find((p) => cleanTitle(p.title.rendered).includes(clean))
    if (!match) return { url: null, wpPostId: null, wpStatus: null, featuredImageUrl: null, error: "not found" }
    return {
      url: match.link,
      wpPostId: match.id,
      wpStatus: match.status ?? null,
      featuredImageUrl: extractFeaturedImage(match),
    }
  } catch (error) {
    return {
      url: null,
      wpPostId: null,
      wpStatus: null,
      featuredImageUrl: null,
      error: error instanceof Error ? error.message : "검색 실패",
    }
  }
}

export const batchResolveByTitles = async (titles: string[]): Promise<Record<string, WpSearchResult>> => {
  const results = await Promise.all(
    titles.map(async (title) => ({ title, result: await searchPostByTitle(title) }))
  )
  return Object.fromEntries(results.map(({ title, result }) => [title, result]))
}
