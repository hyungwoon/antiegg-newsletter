"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { ParsedArticle } from "@/lib/adapters/notion"

interface NotionImportDialogProps {
  newsletterId: string
  open: boolean
  onClose: () => void
  onImported: () => void
}

export function NotionImportDialog({ newsletterId, open, onClose, onImported }: NotionImportDialogProps) {
  const [articles, setArticles] = useState<ParsedArticle[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState("")
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/notion/articles")
      .then((r) => r.json())
      .then((data: { articles?: ParsedArticle[]; error?: string }) => {
        if (data.error) throw new Error(data.error)
        setArticles(data.articles ?? [])
      })
      .catch((err: Error) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = articles.filter((a) =>
    a.title.toLowerCase().includes(filter.toLowerCase())
  )

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleImport = async () => {
    const toImport = articles.filter((a) => selected.has(a.notionPageId))
    if (!toImport.length) return
    setImporting(true)
    try {
      await Promise.all(
        toImport.map((a) => {
          const section = a.contentType === "GRAY" ? "GRAY" : "CURATION"
          const ghostSlug = a.articleUrl
            ? (() => { try { const u = new URL(a.articleUrl); const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean); return parts[parts.length - 1] ?? undefined } catch { return undefined } })()
            : undefined
          return fetch(`/api/newsletters/${newsletterId}/articles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              notionPageId: a.notionPageId,
              title: a.title,
              description: a.viralMent,
              section,
              ghostSlug,
            }),
          })
        })
      )
      toast.success(`${toImport.length}개 아티클을 가져왔습니다`)
      onImported()
      onClose()
    } catch {
      toast.error("가져오기에 실패했습니다")
    } finally {
      setImporting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Notion에서 아티클 가져오기</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="아티클 검색..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <p className="text-center text-sm text-gray-500 py-8">불러오는 중...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">아티클이 없습니다</p>
          ) : (
            filtered.map((a) => (
              <label key={a.notionPageId} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selected.has(a.notionPageId)}
                  onChange={() => toggleSelect(a.notionPageId)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                  <div className="flex gap-2 mt-1">
                    {a.publishDate && <span className="text-xs text-gray-500">{a.publishDate}</span>}
                    {a.status && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{a.status}</span>}
                    {a.contentType && <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">{a.contentType}</span>}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="p-4 border-t flex items-center justify-between">
          <span className="text-sm text-gray-500">{selected.size}개 선택됨</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>취소</Button>
            <Button onClick={handleImport} disabled={!selected.size || importing}>
              {importing ? "가져오는 중..." : "가져오기"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
