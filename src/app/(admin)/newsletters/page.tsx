"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/newsletter/status-badge"
import { toast } from "sonner"
import { format } from "date-fns"
import { Plus, Trash2 } from "lucide-react"
import type { NewsletterStatus } from "@/generated/prisma/client"

interface Newsletter {
  id: string
  subject: string
  status: NewsletterStatus
  createdAt: string
  _count: { articles: number }
}

const STATUS_TABS: Array<{ label: string; value: string }> = [
  { label: "전체", value: "" },
  { label: "초안", value: "DRAFT" },
  { label: "준비완료", value: "READY" },
  { label: "발송완료", value: "SENT" },
]

export default function NewslettersPage() {
  const router = useRouter()
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [activeTab, setActiveTab] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchNewsletters = useCallback(async (status: string) => {
    setLoading(true)
    try {
      const url = status ? `/api/newsletters?status=${status}` : "/api/newsletters"
      const res = await fetch(url)
      const data = await res.json() as { newsletters?: Newsletter[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? "조회 실패")
      setNewsletters(data.newsletters ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "목록 조회에 실패했습니다")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchNewsletters(activeTab) }, [activeTab, fetchNewsletters])

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/newsletters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "새 뉴스레터" }),
      })
      const data = await res.json() as { newsletter?: { id: string }; error?: string }
      if (!res.ok) throw new Error(data.error ?? "생성 실패")
      router.push(`/newsletters/${data.newsletter!.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "생성에 실패했습니다")
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("이 뉴스레터를 삭제하시겠습니까?")) return
    try {
      const res = await fetch(`/api/newsletters/${id}`, { method: "DELETE" })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "삭제 실패")
      toast.success("삭제되었습니다")
      fetchNewsletters(activeTab)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다")
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">뉴스레터</h1>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          새 뉴스레터
        </Button>
      </div>

      <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === tab.value ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">불러오는 중...</p>
      ) : newsletters.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">뉴스레터가 없습니다</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">제목</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">상태</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">아티클</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">생성일</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {newsletters.map((nl) => (
                <tr
                  key={nl.id}
                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/newsletters/${nl.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{nl.subject}</td>
                  <td className="px-4 py-3"><StatusBadge status={nl.status} /></td>
                  <td className="px-4 py-3 text-gray-600">{nl._count.articles}개</td>
                  <td className="px-4 py-3 text-gray-500">{format(new Date(nl.createdAt), "yyyy.MM.dd")}</td>
                  <td className="px-4 py-3">
                    {nl.status === "DRAFT" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={(e: React.MouseEvent) => handleDelete(nl.id, e)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
