"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/newsletter/status-badge"
import { ArticleCard } from "@/components/newsletter/article-card"
import { HtmlPreview } from "@/components/newsletter/html-preview"
import { NotionImportDialog } from "@/components/newsletter/notion-import-dialog"
import { toast } from "sonner"
import { RefreshCw, Download, ImageIcon, MessageSquare } from "lucide-react"
import type { NewsletterStatus, ArticleSection } from "@/generated/prisma/client"

interface SlackNewsletterData {
  titles: string[]
  editorial: string
  issueNumber: string
}

interface Article {
  id: string
  title: string
  description: string
  section: ArticleSection
  ghostImageUrl: string | null
  wpImageUrl: string | null
  wpLink: string | null
  processedImageUrl: string | null
  sortOrder: number
}

interface Newsletter {
  id: string
  subject: string
  editorial: string
  status: NewsletterStatus
  articles: Article[]
}

type Tab = "articles" | "preview"

export default function NewsletterEditorPage() {
  const params = useParams()
  const id = params.id as string
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null)
  const [tab, setTab] = useState<Tab>("articles")
  const [importOpen, setImportOpen] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [slackMessages, setSlackMessages] = useState<SlackNewsletterData[]>([])
  const [slackLoading, setSlackLoading] = useState(false)
  const [slackStep, setSlackStep] = useState<"closed" | "list" | "detail">("closed")
  const [selectedMsg, setSelectedMsg] = useState<SlackNewsletterData | null>(null)
  const [selectedTitle, setSelectedTitle] = useState("")

  const fetchNewsletter = useCallback(async () => {
    try {
      const res = await fetch(`/api/newsletters/${id}`)
      const data = await res.json() as { newsletter?: Newsletter; error?: string }
      if (!res.ok) throw new Error(data.error ?? "조회 실패")
      setNewsletter(data.newsletter ?? null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "조회에 실패했습니다")
    }
  }, [id])

  useEffect(() => { fetchNewsletter() }, [fetchNewsletter])

  const handleResolveAll = async () => {
    setResolving(true)
    try {
      const res = await fetch(`/api/newsletters/${id}/articles/resolve`, { method: "POST" })
      const data = await res.json() as { articles?: Array<{ ghostOk: boolean; wpOk: boolean }>; error?: string }
      if (!res.ok) throw new Error(data.error ?? "연동 실패")
      const results = data.articles ?? []
      const ghostOk = results.filter((r) => r.ghostOk).length
      const wpOk = results.filter((r) => r.wpOk).length
      toast.success(`연동 완료: Ghost ${ghostOk}/${results.length}, WP ${wpOk}/${results.length}`)
      fetchNewsletter()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "연동에 실패했습니다")
    } finally {
      setResolving(false)
    }
  }

  const handleProcessImages = async () => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/newsletters/${id}/articles/process-images`, { method: "POST" })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "이미지 가공 실패")
      toast.success("이미지 가공이 완료되었습니다")
      fetchNewsletter()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이미지 가공에 실패했습니다")
    } finally {
      setProcessing(false)
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

  const handleFetchSlackList = async () => {
    setSlackLoading(true)
    try {
      const res = await fetch("/api/slack/newsletter")
      const data = await res.json() as { messages?: SlackNewsletterData[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? "슬랙 조회 실패")
      setSlackMessages(data.messages ?? [])
      setSlackStep("list")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "슬랙 조회에 실패했습니다")
    } finally {
      setSlackLoading(false)
    }
  }

  const handleSelectSlackMsg = (msg: SlackNewsletterData) => {
    setSelectedMsg(msg)
    setSelectedTitle(msg.titles[0] ?? "")
    setSlackStep("detail")
  }

  const handleApplySlackData = async () => {
    if (!selectedMsg) return
    try {
      const res = await fetch(`/api/newsletters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selectedMsg.titles.join("\n"),
          editorial: selectedMsg.editorial,
        }),
      })
      if (!res.ok) throw new Error("저장 실패")
      toast.success("제목과 서문이 적용되었습니다")
      setSlackStep("closed")
      fetchNewsletter()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "적용에 실패했습니다")
    }
  }

  if (!newsletter) return <p className="text-sm text-gray-500">불러오는 중...</p>

  const sortedArticles = [...newsletter.articles].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            {newsletter.subject.split("\n").map((t, i) => (
              <h1 key={i} className="text-lg font-bold truncate max-w-md">{t}</h1>
            ))}
          </div>
          <StatusBadge status={newsletter.status} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleFetchSlackList} disabled={slackLoading} className="gap-2">
            <MessageSquare className={`h-4 w-4 ${slackLoading ? "animate-pulse" : ""}`} />
            슬랙에서 가져오기
          </Button>
          {newsletter.status !== "DRAFT" && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("DRAFT")}>초안으로</Button>
          )}
          {newsletter.status !== "READY" && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("READY")}>준비 완료</Button>
          )}
          {newsletter.status !== "SENT" && (
            <Button size="sm" onClick={() => handleStatusChange("SENT")} className="bg-green-600 hover:bg-green-700">발송 완료</Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
        {(["articles", "preview"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            onClick={() => setTab(t)}
          >
            {t === "articles" ? "아티클" : "미리보기"}
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
            <Button variant="outline" size="sm" onClick={handleProcessImages} disabled={processing} className="gap-2">
              <ImageIcon className={`h-4 w-4 ${processing ? "animate-pulse" : ""}`} />
              {processing ? "가공 중..." : "이미지 가공"}
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


      {slackStep !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[80vh] flex flex-col">
            {slackStep === "list" && (
              <>
                <h2 className="text-lg font-bold">슬랙 뉴스레터 메시지 선택</h2>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {slackMessages.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">뉴스레터 메시지를 찾을 수 없습니다</p>
                  ) : (
                    slackMessages.map((msg, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectSlackMsg(msg)}
                        className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <p className="text-sm font-bold text-gray-900">{msg.issueNumber} 뉴스레터</p>
                        <p className="text-xs text-gray-500 mt-1 truncate">{msg.titles[0]}</p>
                      </button>
                    ))
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSlackStep("closed")}>닫기</Button>
                </div>
              </>
            )}
            {slackStep === "detail" && selectedMsg && (
              <>
                <h2 className="text-lg font-bold">{selectedMsg.issueNumber} — 제목/서문 확인</h2>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">제목 2종</p>
                  <div className="space-y-1">
                    {selectedMsg.titles.map((title, i) => (
                      <p key={i} className="text-sm text-gray-800 p-2 bg-gray-50 rounded-lg">{title}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">서문</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {selectedMsg.editorial}
                  </p>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSlackStep("list")}>뒤로</Button>
                  <Button size="sm" onClick={handleApplySlackData}>적용</Button>
                </div>
              </>
            )}
          </div>
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
