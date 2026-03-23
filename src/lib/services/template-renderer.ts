import { readFileSync } from "fs"
import { join } from "path"
import { prisma } from "@/lib/db/prisma"

const F = "AppleSDGothic, apple sd gothic neo, noto sans korean, noto sans korean regular, noto sans cjk kr, noto sans cjk, nanum gothic, malgun gothic, dotum, arial, helvetica, MS Gothic, sans-serif!important"
const CELL_STYLE = "max-width:315px;width:100%!important;margin:0;vertical-align:top;border-collapse:collapse;box-sizing:border-box;font-size:unset;mso-table-lspace:0pt;mso-table-rspace:0pt;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;display:inline-block;"
const FILLER_IMAGE = "https://img2.stibee.com/36020_2617355_1737890530648157143.png"

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

const buildArticleCell = (article: ArticleData, side: "left" | "right"): string => {
  const cls = side === "left" ? "stb-left-cell" : "stb-right-cell"
  const align = side === "left" ? "justify" : "justify"
  const imgCls = side === "left" ? "stb-justify" : "stb-justify"
  return `<div class="${cls}" style="${CELL_STYLE}"><div class="stb-image-box" style="text-align:${align};margin:0px;width:100%;box-sizing:border-box;clear:both;;"><table border="0" cellpadding="0" cellspacing="0" style="width:100%;" align="center"><tbody><tr><td style="padding:15px 5px 25px 5px;padding-bottom:0;;text-align:${align};font-size:0;border:0;line-height:0;width:100%;box-sizing:border-box;"><a href="${article.link_url}" target="_blank" style="text-decoration: none; color: rgb(51, 51, 51); font-weight: normal;"><img src="${article.image_url}" style="width:305px;display:inline;vertical-align:bottom;text-align:${align};max-width:100%;height:auto;border:0;" width="305" class="${imgCls}"></a></td></tr></tbody></table></div><div class="stb-text-box" style="text-align:center;margin:0px;;line-height:1.7;word-break:break-word;font-size:14px;font-family:${F};;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color:#333333;clear:both;border:0;mso-line-height-rule-rule:exactly;"><table class="stb-text-box-inner" border="0" cellpadding="0" cellspacing="0" style="width:100%;"><tbody><tr><td style="padding:15px 5px 25px 5px;padding-top:20px;font-size:14px;line-height:1.7;word-break:break-word;color:#333333;border:0;font-family:${F};;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;width:100%;"><div style="text-align: left;"><span style="font-size: 18px;"><span class="stb-bold" style="font-weight: bold;">${article.title}</span></span></div><div style="text-align: left;"><br></div><div style="text-align: left;"><span style="color: #333333;" class="stb-fore-colored"><span style="font-size: 14px;">${article.description} <a href="${article.link_url}" target="_blank" style="color: rgb(51, 51, 51); font-weight: normal; text-decoration: none;"><span style="text-decoration: underline; font-weight: bold; color: #f7343c;" class="stb-underline stb-bold stb-fore-colored">읽으러 가기</span></a></span></span></div><div style="text-align: left;"><br></div></td></tr></tbody></table></div></div>`
}

const buildFillerCell = (): string =>
  `<div class="stb-right-cell" style="${CELL_STYLE}"><div class="stb-image-box" style="text-align:center;margin:0px;width:100%;box-sizing:border-box;clear:both;;"><table border="0" cellpadding="0" cellspacing="0" style="width:100%;" align="center"><tbody><tr><td style="padding:15px 5px 25px 5px;padding-bottom:0;;text-align:center;font-size:0;border:0;line-height:0;width:100%;box-sizing:border-box;"><img src="${FILLER_IMAGE}" style="width:305px;display:inline;vertical-align:bottom;text-align:center;max-width:100%;height:auto;border:0;" width="305" class="stb-center"></td></tr></tbody></table></div><div class="stb-text-box" style="text-align:center;margin:0px;;line-height:1.7;word-break:break-word;font-size:14px;font-family:${F};;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color:#333333;clear:both;border:0;mso-line-height-rule-rule:exactly;"><table class="stb-text-box-inner" border="0" cellpadding="0" cellspacing="0" style="width:100%;"><tbody><tr><td style="padding:15px 5px 25px 5px;padding-top:20px;font-size:14px;line-height:1.7;word-break:break-word;color:#333333;border:0;font-family:${F};;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;width:100%;"><div>&nbsp;&nbsp;</div></td></tr></tbody></table></div></div>`

const buildSectionHtml = (articles: ArticleData[]): string => {
  const rows: string[] = []
  for (let i = 0; i < articles.length; i += 2) {
    const left = articles[i]
    const right = articles[i + 1]
    const leftCell = buildArticleCell(left, "left")
    const rightCell = right ? buildArticleCell(right, "right") : buildFillerCell()
    rows.push(`<div class="stb-block-outer"><table class="stb-block stb-cols-2" border="0" cellpadding="0" cellspacing="0" style="overflow:hidden;margin:0px auto;padding:0px;width:100%;max-width:630px;clear:both;line-height:1.7;border-width:0px;border: 0px;font-size:14px;border:0;box-sizing:border-box;" width="100%"><tbody><tr><td><table class="stb-cell-wrap" border="0" cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td style="text-align:center;font-size:0;">${leftCell}${rightCell}</td></tr></tbody></table></td></tr></tbody></table></div>`)
  }
  return rows.join("")
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
  html = html.replace("{{curation_section}}", buildSectionHtml(curationArticles))

  if (grayArticles.length > 0) {
    html = html.replace("{{gray_section}}", buildSectionHtml(grayArticles))
  } else {
    html = html.replace(/<!--GRAY_START-->[\s\S]*?<!--GRAY_END-->/, "")
  }
  return html
}
