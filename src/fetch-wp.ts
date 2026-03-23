import "dotenv/config"

const getWpConfig = () => {
  const apiUrl = process.env.WP_API_URL ?? "https://antiegg.kr"
  const username = process.env.WP_USERNAME
  const appPassword = process.env.WP_APP_PASSWORD
  const credentials =
    username && appPassword
      ? Buffer.from(`${username}:${appPassword}`).toString("base64")
      : null
  return { apiUrl, credentials }
}

interface WpResult {
  slug: string
  link?: string
  title?: string
  error?: string
}

const wpFetch = async (
  url: string,
  credentials: string | null
): Promise<Array<{ id: number; slug: string; link: string; title: { rendered: string } }>> => {
  const headers: Record<string, string> = {}
  if (credentials) headers["Authorization"] = `Basic ${credentials}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<Array<{ id: number; slug: string; link: string; title: { rendered: string } }>>
}

const fetchPostBySlug = async (
  slug: string,
  apiUrl: string,
  credentials: string | null
): Promise<WpResult> => {
  const posts = await wpFetch(
    `${apiUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=id,slug,link,title`,
    credentials
  )
  if (!posts.length) return { slug, error: "not found by slug" }
  return { slug, link: posts[0].link, title: posts[0].title.rendered.replace(/<[^>]*>/g, "") }
}

const fetchPostByTitle = async (
  title: string,
  apiUrl: string,
  credentials: string | null
): Promise<WpResult> => {
  const posts = await wpFetch(
    `${apiUrl}/wp-json/wp/v2/posts?search=${encodeURIComponent(title)}&_fields=id,slug,link,title&per_page=5`,
    credentials
  )
  const decode = (s: string) =>
    s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
     .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
     .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
     .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&hellip;/g, "...")
  const clean = (s: string) => decode(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim().toLowerCase()
  const match = posts.find((p) => clean(p.title.rendered).includes(clean(title)))
  if (!match) return { slug: title, error: "not found by title" }
  return { slug: match.slug, link: match.link, title: match.title.rendered.replace(/<[^>]*>/g, "") }
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const getArg = (flag: string) => {
    const i = args.indexOf(flag)
    return i !== -1 && args[i + 1] ? args[i + 1] : null
  }
  const slugs = getArg("--slugs")?.split(",").map((s) => s.trim()).filter(Boolean) ?? []
  const slug = getArg("--slug")
  if (slug) slugs.push(slug)
  const titles = getArg("--titles")?.split("|").map((s) => s.trim()).filter(Boolean) ?? []
  const title = getArg("--title")
  if (title) titles.push(title)
  return { slugs, titles }
}

const main = async () => {
  const { slugs, titles } = parseArgs()
  if (!slugs.length && !titles.length) {
    process.stderr.write("Usage: fetch-wp --slug <slug> | --slugs <s1,s2> | --title <title> | --titles <t1|t2>\n")
    process.exit(1)
  }

  const { apiUrl, credentials } = getWpConfig()
  const results: WpResult[] = await Promise.all([
    ...slugs.map((s) => fetchPostBySlug(s, apiUrl, credentials)),
    ...titles.map((t) => fetchPostByTitle(t, apiUrl, credentials)),
  ])

  process.stdout.write(JSON.stringify(results, null, 2) + "\n")
}

main().catch((err) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
