/**
 * Notion 어댑터
 * 외부 API 호출만 담당 — 비즈니스 로직 금지
 */

const NOTION_API_BASE = "https://api.notion.com/v1"
const NOTION_API_VERSION = "2022-06-28"
const NOTION_TIMEOUT_MS = 15_000

const getNotionConfig = () => {
  const token = process.env.NOTION_TOKEN
  const databaseId = process.env.NOTION_DATABASE_ID
  if (!token) throw new Error("환경변수 누락: NOTION_TOKEN")
  if (!databaseId) throw new Error("환경변수 누락: NOTION_DATABASE_ID")
  return { token, databaseId }
}

interface NotionFilter {
  property: string
  [key: string]: unknown
}

interface NotionSort {
  property?: string
  timestamp?: "created_time" | "last_edited_time"
  direction: "ascending" | "descending"
}

export interface NotionPage {
  id: string
  url: string
  created_time: string
  last_edited_time: string
  properties: Record<string, unknown>
}

interface NotionQueryResponse {
  results: NotionPage[]
  has_more: boolean
  next_cursor: string | null
}

const notionRequest = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const { token } = getNotionConfig()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), NOTION_TIMEOUT_MS)
  try {
    const res = await fetch(`${NOTION_API_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_API_VERSION,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const err = (await res.json()) as { message?: string; code?: string }
      throw new Error(`Notion API 오류 (HTTP ${res.status}) [${err.code}]: ${err.message}`)
    }
    return res.json() as Promise<T>
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Notion API 타임아웃 (${NOTION_TIMEOUT_MS}ms)`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export const queryDatabase = async (options?: {
  filter?: NotionFilter
  sorts?: NotionSort[]
  pageSize?: number
  startCursor?: string
}): Promise<NotionQueryResponse> => {
  const { databaseId } = getNotionConfig()
  return notionRequest<NotionQueryResponse>("POST", `/databases/${databaseId}/query`, {
    filter: options?.filter,
    sorts: options?.sorts,
    page_size: options?.pageSize ?? 100,
    start_cursor: options?.startCursor,
  })
}

export const getPage = async (pageId: string): Promise<NotionPage> => {
  return notionRequest<NotionPage>("GET", `/pages/${pageId}`)
}

export interface ParsedArticle {
  notionPageId: string
  title: string
  subtitle: string
  viralMent: string
  tags: string[]
  articleUrl: string
  publishDate: string | null
  author: string | null
  status: string | null
  contentType: string | null
}

const extractRichText = (prop: unknown): string => {
  if (!prop || typeof prop !== "object") return ""
  const p = prop as { type?: string; rich_text?: Array<{ plain_text: string }>; title?: Array<{ plain_text: string }>; url?: string | null }
  if (p.type === "rich_text" && Array.isArray(p.rich_text)) return p.rich_text.map((t) => t.plain_text).join("")
  if (p.type === "title" && Array.isArray(p.title)) return p.title.map((t) => t.plain_text).join("")
  if (p.type === "url") return p.url ?? ""
  return ""
}

const extractMultiSelect = (prop: unknown): string[] => {
  if (!prop || typeof prop !== "object") return []
  const p = prop as { type?: string; multi_select?: Array<{ name: string }> }
  if (p.type === "multi_select" && Array.isArray(p.multi_select)) return p.multi_select.map((s) => s.name)
  return []
}

const extractSelect = (prop: unknown): string | null => {
  if (!prop || typeof prop !== "object") return null
  const p = prop as { type?: string; select?: { name: string } | null }
  if (p.type === "select" && p.select) return p.select.name
  return null
}

const extractDate = (prop: unknown): string | null => {
  if (!prop || typeof prop !== "object") return null
  const p = prop as { type?: string; date?: { start: string } | null }
  if (p.type === "date" && p.date) return p.date.start
  return null
}

const extractPeople = (prop: unknown): string | null => {
  if (!prop || typeof prop !== "object") return null
  const p = prop as { type?: string; people?: Array<{ name?: string }> }
  if (p.type === "people" && Array.isArray(p.people) && p.people.length > 0) {
    return p.people.map((person) => person.name ?? "").filter(Boolean).join(", ")
  }
  return null
}

export const parseNotionArticle = (page: NotionPage): ParsedArticle => {
  const props = page.properties
  const categories = extractMultiSelect(props["🔴 카테고리"])
  const themes = extractMultiSelect(props["🔴 테마"])
  const keywords = extractMultiSelect(props["🔴 키워드"])
  const etcText = extractRichText(props["🔴 기타"])
  const etcTags = etcText ? etcText.split(",").map((t) => t.trim()).filter(Boolean) : []
  return {
    notionPageId: page.id,
    title: extractRichText(props["아티클 제목"]),
    subtitle: extractRichText(props["부제목"]),
    viralMent: extractRichText(props["바이럴 멘트"]),
    tags: [...categories, ...themes, ...keywords, ...etcTags],
    articleUrl: extractRichText(props["Square CMS"]),
    publishDate: extractDate(props["발행일"]),
    author: extractPeople(props["작성자"]),
    status: extractSelect(props["상태"]),
    contentType: extractSelect(props["🔴 콘텐츠 종류"]),
  }
}
