const SLACK_API_BASE = "https://slack.com/api"

export interface SlackNewsletterData {
  titles: string[]
  editorial: string
  issueNumber: string
}

interface SlackMessage {
  ts: string
  text: string
  user?: string
}

interface ConversationsHistoryResponse {
  ok: boolean
  messages?: SlackMessage[]
  error?: string
}

const getToken = (): string => {
  const token = process.env.SLACK_USER_TOKEN
  if (!token) throw new Error("환경변수 누락: SLACK_USER_TOKEN")
  return token
}

export const fetchRecentMessages = async (
  channelId: string,
  limit = 10
): Promise<SlackMessage[]> => {
  const token = getToken()
  const url = `${SLACK_API_BASE}/conversations.history?channel=${channelId}&limit=${limit}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Slack API 오류: HTTP ${res.status}`)
  const data = (await res.json()) as ConversationsHistoryResponse
  if (!data.ok) throw new Error(`Slack API 오류: ${data.error ?? "unknown"}`)
  return data.messages ?? []
}

export const parseNewsletterMessage = (text: string): SlackNewsletterData | null => {
  const issueMatch = text.match(/(\d+)호\s*뉴스레터/)
  const issueNumber = issueMatch ? `${issueMatch[1]}호` : ""

  const titleSection = extractSection(text, "[제목]", ["[서문]", "[아티클"])
  const editorialSection = extractSection(text, "[서문]", ["[아티클"])

  if (!titleSection && !editorialSection) return null

  const titles = parseTitles(titleSection ?? "")
  const editorial = parseEditorial(editorialSection ?? "")

  return { titles, editorial, issueNumber }
}

const extractSection = (text: string, startMarker: string, endMarkers: string[]): string | null => {
  const startIdx = text.indexOf(startMarker)
  if (startIdx === -1) return null

  const afterStart = text.slice(startIdx + startMarker.length)
  let endIdx = afterStart.length
  for (const marker of endMarkers) {
    const idx = afterStart.indexOf(marker)
    if (idx !== -1 && idx < endIdx) endIdx = idx
  }
  return afterStart.slice(0, endIdx).trim()
}

const stripEmoji = (s: string): string =>
  s.replace(/:[a-z0-9_+-]+:/g, "")
   .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, "")
   .replace(/🥚|📚|🔗|🔴/g, "")
   .replace(/\s+/g, " ")
   .trim()

const parseTitles = (section: string): string[] => {
  const lines = section.split("\n")
  const titles: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.includes("[서문]") || trimmed.startsWith("*[")) continue
    const cleaned = stripEmoji(
      trimmed.replace(/^>\s*/, "").replace(/^\*\s*/, "").replace(/\s*\*$/, "").trim()
    )
    if (cleaned) titles.push(cleaned)
  }
  return titles.filter(Boolean)
}

const parseEditorial = (section: string): string => {
  const lines = section.split("\n")
  const editorialLines: string[] = []
  let foundStart = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.match(/\*`.*`\*/) || trimmed.match(/`.*`/)) {
      foundStart = true
      continue
    }
    if (foundStart) {
      const cleaned = stripEmoji(trimmed.replace(/^>\s*/, "").trim())
      if (cleaned) editorialLines.push(cleaned)
    }
  }

  if (editorialLines.length === 0) {
    return section
      .split("\n")
      .map((l) => stripEmoji(l.replace(/^>\s*/, "").trim()))
      .filter((l) => Boolean(l) && !l.match(/\*`.*`\*/))
      .join(" ")
  }

  return editorialLines.join(" ")
}

export const findNewsletterMessage = async (channelId: string): Promise<SlackNewsletterData | null> => {
  const all = await findAllNewsletterMessages(channelId)
  return all[0] ?? null
}

export const findAllNewsletterMessages = async (channelId: string): Promise<SlackNewsletterData[]> => {
  try {
    const messages = await fetchRecentMessages(channelId, 30)
    const results: SlackNewsletterData[] = []
    for (const msg of messages) {
      if (!msg.text) continue
      if (msg.text.includes("뉴스레터") && msg.text.includes("[제목]")) {
        const parsed = parseNewsletterMessage(msg.text)
        if (parsed) results.push(parsed)
      }
    }
    return results
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Slack 메시지 조회 실패")
  }
}
