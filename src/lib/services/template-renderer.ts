import { readFileSync } from "fs"
import { join } from "path"
import { prisma } from "@/lib/db/prisma"

const readTemplate = (): string => {
  const templatePath = join(process.cwd(), "templates", "newsletter.html")
  return readFileSync(templatePath, "utf-8")
}

interface ArticleData {
  title: string
  description: string
  image_url: string
  link_url: string
}

const renderArticleBlock = (template: string, article: ArticleData): string =>
  template
    .replace(/\{\{title\}\}/g, article.title)
    .replace(/\{\{description\}\}/g, article.description)
    .replace(/\{\{image_url\}\}/g, article.image_url)
    .replace(/\{\{link_url\}\}/g, article.link_url)

const renderSection = (html: string, tag: string, articles: ArticleData[]): string => {
  const openTag = `{{#${tag}}}`
  const closeTag = `{{/${tag}}}`
  const start = html.indexOf(openTag)
  const end = html.indexOf(closeTag)
  if (start === -1 || end === -1) return html

  const articleTemplate = html.slice(start + openTag.length, end)
  const renderedArticles = articles.map((a) => renderArticleBlock(articleTemplate, a)).join("")
  return html.slice(0, start) + renderedArticles + html.slice(end + closeTag.length)
}

export const renderNewsletter = async (
  newsletterId: string,
  mode: "preview" | "send"
): Promise<string> => {
  const newsletter = await prisma.newsletter.findUnique({
    where: { id: newsletterId },
    include: { articles: { orderBy: { sortOrder: "asc" } } },
  })
  if (!newsletter) throw new Error("뉴스레터를 찾을 수 없습니다")

  const getImageUrl = (a: { processedImageUrl: string | null; ghostImageUrl: string | null }, mode: string) =>
    mode === "send"
      ? (a.processedImageUrl ?? a.ghostImageUrl ?? "")
      : (a.ghostImageUrl ?? "")

  const curationArticles: ArticleData[] = newsletter.articles
    .filter((a) => a.section === "CURATION")
    .map((a) => ({
      title: a.title,
      description: a.description,
      image_url: getImageUrl(a, mode),
      link_url: a.wpLink ?? "",
    }))

  const grayArticles: ArticleData[] = newsletter.articles
    .filter((a) => a.section === "GRAY")
    .map((a) => ({
      title: a.title,
      description: a.description,
      image_url: getImageUrl(a, mode),
      link_url: a.wpLink ?? "",
    }))

  let html = readTemplate()
  html = html.replace(/\{\{subject\}\}/g, newsletter.subject)
  html = html.replace(/\{\{editorial\}\}/g, newsletter.editorial)
  html = renderSection(html, "curation_articles", curationArticles)
  html = renderSection(html, "gray_articles", grayArticles)
  return html
}
