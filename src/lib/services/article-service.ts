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

export const resolveArticle = async (id: string) => {
  const article = await prisma.article.findUnique({ where: { id } })
  if (!article) throw new Error("아티클을 찾을 수 없습니다")

  const ghostSlug = article.ghostSlug
  const ghostResult = ghostSlug ? await ghost.fetchPostBySlug(ghostSlug) : null
  const wpResult = article.title ? await wordpress.searchPostByTitle(article.title) : null

  return prisma.article.update({
    where: { id },
    data: {
      ...(ghostResult?.featureImage !== undefined && { ghostImageUrl: ghostResult.featureImage }),
      ...(wpResult?.url && { wpLink: wpResult.url }),
      ...(wpResult?.featuredImageUrl && { wpImageUrl: wpResult.featuredImageUrl }),
    },
  })
}

export const resolveAllArticles = async (newsletterId: string) => {
  const articles = await prisma.article.findMany({ where: { newsletterId } })
  return Promise.all(articles.map((a) => resolveArticle(a.id)))
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
