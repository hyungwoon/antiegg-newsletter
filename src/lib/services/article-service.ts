import { prisma } from "@/lib/db/prisma"
import * as ghost from "@/lib/adapters/ghost"
import * as wordpress from "@/lib/adapters/wordpress"
import * as imageProcessor from "@/lib/adapters/image-processor"
import type { AddArticleInput, UpdateArticleInput } from "@/lib/validations/newsletter"

export const extractGhostSlug = (squareCmsUrl: string): string | null => {
  try {
    const url = new URL(squareCmsUrl)
    const parts = url.pathname.replace(/\/$/, "").split("/").filter(Boolean)
    return parts[parts.length - 1] ?? null
  } catch {
    return null
  }
}

const getNextSortOrder = async (newsletterId: string): Promise<number> => {
  const last = await prisma.article.findFirst({
    where: { newsletterId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })
  return (last?.sortOrder ?? -1) + 1
}

export const addArticle = async (newsletterId: string, data: AddArticleInput) => {
  const sortOrder = data.sortOrder ?? (await getNextSortOrder(newsletterId))
  return prisma.article.create({
    data: {
      newsletterId,
      notionPageId: data.notionPageId,
      ghostSlug: data.ghostSlug,
      title: data.title,
      description: data.description ?? "",
      section: data.section,
      sortOrder,
    },
  })
}

export const updateArticle = async (id: string, data: UpdateArticleInput) => {
  return prisma.article.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.section !== undefined && { section: data.section }),
      ...(data.ghostSlug !== undefined && { ghostSlug: data.ghostSlug }),
      ...(data.notionPageId !== undefined && { notionPageId: data.notionPageId }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  })
}

export const removeArticle = async (id: string) => {
  return prisma.article.delete({ where: { id } })
}

export const reorderArticles = async (newsletterId: string, articleIds: string[]) => {
  const updates = articleIds.map((id, index) =>
    prisma.article.update({ where: { id, newsletterId }, data: { sortOrder: index } })
  )
  return prisma.$transaction(updates)
}

export interface ResolveResult {
  id: string
  title: string
  ghostOk: boolean
  wpOk: boolean
  error?: string
}

export const resolveArticle = async (id: string): Promise<ResolveResult> => {
  const article = await prisma.article.findUnique({ where: { id } })
  if (!article) return { id, title: "", ghostOk: false, wpOk: false, error: "아티클 없음" }

  let ghostOk = false
  let wpOk = false
  const updateData: Record<string, string | null> = {}

  try {
    if (article.ghostSlug) {
      const ghostResult = await ghost.fetchPostBySlug(article.ghostSlug)
      if (ghostResult.featureImage) {
        updateData.ghostImageUrl = ghostResult.featureImage
        ghostOk = true
      }
    }
  } catch {
    /* Ghost 연동 실패 — 무시하고 계속 */
  }

  try {
    if (article.title) {
      const wpResult = await wordpress.searchPostByTitle(article.title)
      if (wpResult.url) {
        updateData.wpLink = wpResult.url
        wpOk = true
      }
      if (wpResult.featuredImageUrl) {
        updateData.wpImageUrl = wpResult.featuredImageUrl
      }
    }
  } catch {
    /* WP 연동 실패 — 무시하고 계속 */
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.article.update({ where: { id }, data: updateData })
  }

  return { id, title: article.title, ghostOk, wpOk }
}

export const resolveAllArticles = async (newsletterId: string): Promise<ResolveResult[]> => {
  const articles = await prisma.article.findMany({ where: { newsletterId } })
  const results: ResolveResult[] = []
  for (const a of articles) {
    results.push(await resolveArticle(a.id))
  }
  return results
}

export const processArticleImage = async (id: string, baseUrl: string) => {
  const article = await prisma.article.findUnique({ where: { id } })
  if (!article) throw new Error("아티클을 찾을 수 없습니다")

  const sourceUrl = article.ghostImageUrl
  if (!sourceUrl) throw new Error("Ghost 이미지가 없습니다. 먼저 전체 연동을 실행하세요")

  const slug = article.ghostSlug ?? article.id
  const result = await imageProcessor.processImage(slug, sourceUrl, baseUrl)
  if (result.error) throw new Error(`이미지 가공 실패: ${result.error}`)

  return prisma.article.update({
    where: { id },
    data: { processedImageUrl: result.publicUrl },
  })
}

export const processAllImages = async (newsletterId: string, baseUrl: string) => {
  const articles = await prisma.article.findMany({
    where: { newsletterId, ghostImageUrl: { not: null } },
  })
  return Promise.all(articles.map((a) => processArticleImage(a.id, baseUrl)))
}
