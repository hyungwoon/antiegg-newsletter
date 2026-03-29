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

const expandBlock = (html: string, blockName: string, articles: ArticleData[]): string => {
  const pattern = new RegExp(
    `\\{\\{#${blockName}\\}\\}([\\s\\S]*?)\\{\\{/${blockName}\\}\\}`,
    "g"
  )
  const match = pattern.exec(html)
  if (!match) return html

  const template = match[1]
  const expanded = articles
    .map((a) =>
      template
        .replace(/\{\{title\}\}/g, a.title)
        .replace(/\{\{description\}\}/g, a.description)
        .replace(/\{\{image_url\}\}/g, a.image_url)
        .replace(/\{\{link_url\}\}/g, a.link_url)
    )
    .join("")

  return html.replace(match[0], expanded)
}

const removeSectionBlock = (html: string, blockName: string): string => {
  const sectionLabel = blockName === "gray_articles" ? "GRAY" : "CURATION"
  const pattern = new RegExp(
    `<!-- ===== ${sectionLabel} SECTION ===== -->[\\s\\S]*?\\{\\{/${blockName}\\}\\}`,
    "g"
  )
  const cleaned = html.replace(pattern, "")
  return cleaned
}

export const renderNewsletter = async (
  newsletterId: string,
  mode: "preview" | "send" = "send"
): Promise<string> => {
  const newsletter = await prisma.newsletter.findUnique({
    where: { id: newsletterId },
    include: { articles: { orderBy: { sortOrder: "asc" } } },
  })
  if (!newsletter) throw new Error("뉴스레터를 찾을 수 없습니다")

  const getImageUrl = (a: { processedImageUrl: string | null; ghostImageUrl: string | null }) =>
    mode === "send"
      ? (a.processedImageUrl ?? a.ghostImageUrl ?? "")
      : (a.ghostImageUrl ?? "")

  const toArticleData = (a: {
    title: string
    description: string
    processedImageUrl: string | null
    ghostImageUrl: string | null
    wpLink: string | null
  }): ArticleData => ({
    title: a.title,
    description: a.description,
    image_url: getImageUrl(a),
    link_url: a.wpLink ?? "",
  })

  const curationArticles = newsletter.articles
    .filter((a) => a.section === "CURATION")
    .map(toArticleData)

  const grayArticles = newsletter.articles
    .filter((a) => a.section === "GRAY")
    .map(toArticleData)

  let html = readTemplate()
  html = html.replace(/\{\{subject\}\}/g, newsletter.subject)
  html = html.replace(/\{\{editorial\}\}/g, newsletter.editorial)
  html = expandBlock(html, "curation_articles", curationArticles)

  if (grayArticles.length > 0) {
    html = expandBlock(html, "gray_articles", grayArticles)
  } else {
    html = removeSectionBlock(html, "gray_articles")
  }
  return html
}
