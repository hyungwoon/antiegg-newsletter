import { prisma } from "@/lib/db/prisma"
import { NewsletterStatus } from "@/generated/prisma/client"
import type { CreateNewsletterInput, UpdateNewsletterInput } from "@/lib/validations/newsletter"

const ALL_STATUSES: NewsletterStatus[] = ["DRAFT", "READY", "SENT"]

export const getNewsletters = async (status?: NewsletterStatus) => {
  return prisma.newsletter.findMany({
    where: status ? { status } : undefined,
    include: { _count: { select: { articles: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export const getNewsletter = async (id: string) => {
  return prisma.newsletter.findUnique({
    where: { id },
    include: { articles: { orderBy: { sortOrder: "asc" } } },
  })
}

export const createNewsletter = async (data: CreateNewsletterInput) => {
  return prisma.newsletter.create({
    data: {
      subject: data.subject,
      editorial: data.editorial ?? "",
      status: "DRAFT",
    },
  })
}

export const updateNewsletter = async (id: string, data: UpdateNewsletterInput) => {
  const newsletter = await prisma.newsletter.findUnique({ where: { id } })
  if (!newsletter) throw new Error("뉴스레터를 찾을 수 없습니다")
  return prisma.newsletter.update({
    where: { id },
    data: {
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.editorial !== undefined && { editorial: data.editorial }),
    },
  })
}

export const deleteNewsletter = async (id: string) => {
  const newsletter = await prisma.newsletter.findUnique({ where: { id } })
  if (!newsletter) throw new Error("뉴스레터를 찾을 수 없습니다")
  return prisma.newsletter.delete({ where: { id } })
}

export const updateStatus = async (id: string, status: NewsletterStatus) => {
  const newsletter = await prisma.newsletter.findUnique({ where: { id } })
  if (!newsletter) throw new Error("뉴스레터를 찾을 수 없습니다")
  if (!ALL_STATUSES.includes(status)) {
    throw new Error(`유효하지 않은 상태: ${status}`)
  }
  return prisma.newsletter.update({
    where: { id },
    data: {
      status,
      ...(status === "SENT" && { sentAt: new Date() }),
    },
  })
}
