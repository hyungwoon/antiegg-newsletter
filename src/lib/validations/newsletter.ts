import { z } from "zod"

export const createNewsletterSchema = z.object({
  subject: z.string().min(1, "제목을 입력해주세요"),
  editorial: z.string().optional().default(""),
})

export const updateNewsletterSchema = createNewsletterSchema.partial()

export const addArticleSchema = z.object({
  notionPageId: z.string().optional(),
  title: z.string().min(1, "아티클 제목을 입력해주세요"),
  description: z.string().optional().default(""),
  section: z.enum(["CURATION", "GRAY"]),
  ghostSlug: z.string().optional(),
  sortOrder: z.number().int().optional(),
})

export const updateArticleSchema = addArticleSchema.partial()

export const reorderArticlesSchema = z.object({
  articleIds: z.array(z.string()).min(1, "아티클 ID 목록이 필요합니다"),
})

export type CreateNewsletterInput = z.infer<typeof createNewsletterSchema>
export type UpdateNewsletterInput = z.infer<typeof updateNewsletterSchema>
export type AddArticleInput = z.infer<typeof addArticleSchema>
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>
export type ReorderArticlesInput = z.infer<typeof reorderArticlesSchema>
