"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/newsletter/status-badge"
import { ArticleCard } from "@/components/newsletter/article-card"
import { HtmlPreview } from "@/components/newsletter/html-preview"
import { NotionImportDialog } from "@/components/newsletter/notion-import-dialog"
import { toast } from "sonner"
import { RefreshCw, Download } from "lucide-react"
import type { NewsletterStatus, ArticleSection } from "@/generated/prisma/client"

interface Article {
  id: string
  title: string
  description: string
  section: ArticleSection
  ghostImageUrl: string | null
  wpImageUrl: string | null
  wpLink: string | null
  sortOrder: number
}

interface Newsletter {
  id: string
  subject: string
  editorial: string
  status: NewsletterStatus
  articles: Article[]
}

type Tab = "articles" | "preview" | "settings"

export default function NewsletterEditorPage() {
  const params = useParams()
  const id = params.id as string
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null)
  const [tab, setTab] = useState<Tab>("articles")
  const [importOpen, setImportOpen] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [subject, setSubject] = useState("")
  const [editorial, setEditorial] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchNewsletter = useCallback(async () => {
    try {
      const res = await fetch(`/api/newsletters/${id}`)
      const data = await res.json() as { newsletter?: Newsletter; error?: string }
      if (!res.ok) throw new Error(data.error ?? "조회 실패")
      setNewsletter(data.newsletter ?? null)
      setSubject(data.newsletter?.subject ?? "")
      setEditorial(data.newsletter?.editorial ?? "")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "조회에 실패했습니다")
    }
  }, [id])

  useEffect(() => { fetchNewsletter() }, [fetchNewsletter])

  const handleResolveAll = async () => {
    setResolving(true)
    try {
      const res = await fetch(`/api/newsletters/${id}/articles/resolve`, { method: "POST" })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "연동 실패")
      toast.success("Ghost + WP 연동이 완료되었습니다")
      fetchNewsletter()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "연동에 실패했습니다")
    } finally {
      setResolving(false)
    }
  }

  const handleMoveUp = async (articleId: string) => {
    if (!newsletter) return
    const articles = [...newsletter.articles].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = articles.findIndex((a) => a.id === articleId)
    if (idx <= 0) return
    const newOrder = [...articles]
    const tmp = newOrder[idx]
    newOrder[idx] = newOrder[idx - 1]
    newOrder[idx - 1] = tmp
    await reorder(newOrder.map((a) => a.id))
  }

  const handleMoveDown = async (articleId: string) => {
    if (!newsletter) return
    const articles = [...newsletter.articles].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = articles.findIndex((a) => a.id === articleId)
    if (idx === -1 || idx >= articles.length - 1) return
    const newOrder = [...articles]
    const tmp = newOrder[idx]
    newOrder[idx] = newOrder[idx + 1]
    newOrder[idx + 1] = tmp
    await reorder(newOrder.map((a) => a.id))
  }

  const reorder = async (articleIds: string[]) => {
    const res = await fetch(`/api/newsletters/${id}/articles/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleIds }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) { toast.error(data.error ?? "순서 변경 실패"); return }
    fetchNewsletter()
  }

  const handleDelete = async (articleId: string) => {
    if (!confirm("이 아티클을 삭제하시겠습니까?")) return
    const res = await fetch(`/api/newsletters/${id}/articles/${articleId}`, { method: "DELETE" })
    const data = await res.json() as { error?: string }
    if (!res.ok) { toast.error(data.error ?? "삭제 실패"); return }
    fetchNewsletter()
  }

  const handleStatusChange = async (status: NewsletterStatus) => {
    const res = await fetch(`/api/newsletters/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) { toast.error(data.error ?? "상태 변경 실패"); return }
    toast.success("상태가 변경되었습니다")
    fetchNewsletter()
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/newsletters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, editorial }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "저장 실패")
      toast.success("저장되었습니다")
      fetchNewsletter()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다")
    } finally {
      setSaving(false)
    }
  }

  if (!newsletter) return <p className="text-sm text-gray-500">불러오는 중...</p>

  const sortedArticles = [...newsletter.articles].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold truncate max-w-md">{newsletter.subject}</h1>
          <StatusBadge status={newsletter.status} />
        </div>
        <div className="flex gap-2">
          {newsletter.status === "DRAFT" && (
            <Button variant="outline" onClick={() => handleStatusChange("READY")}>준비 완료</Button>
          )}
          {newsletter.status === "READY" && (
            <Button onClick={() => handleStatusChange("SENT")} className="bg-green-600 hover:bg-green-700">발송 완료</Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
        {(["articles", "preview", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            onClick={() => setTab(t)}
          >
            {t === "articles" ? "아티클" : t === "preview" ? "미리보기" : "설정"}
          </button>
        ))}
      </div>

      {tab === "articles" && (
        <div>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-2">
              <Download className="h-4 w-4" />
              Notion에서 가져오기
            </Button>
            <Button variant="outline" size="sm" onClick={handleResolveAll} disabled={resolving} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${resolving ? "animate-spin" : ""}`} />
              전체 연동
            </Button>
          </div>
          <div className="space-y-2">
            {sortedArticles.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">아티클이 없습니다. Notion에서 가져오세요.</p>
            ) : (
              sortedArticles.map((article, idx) => (
                <ArticleCard
                  key={article.id}
                  {...article}
                  isFirst={idx === 0}
                  isLast={idx === sortedArticles.length - 1}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      )}

      {tab === "preview" && <HtmlPreview newsletterId={id} />}

      {tab === "settings" && (
        <div className="max-w-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">에디토리얼</label>
            <textarea
              value={editorial}
              onChange={(e) => setEditorial(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      )}

      <NotionImportDialog
        newsletterId={id}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={fetchNewsletter}
      />
    </div>
  )
}
