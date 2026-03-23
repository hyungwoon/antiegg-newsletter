"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Copy, RefreshCw } from "lucide-react"

interface HtmlPreviewProps {
  newsletterId: string
}

export function HtmlPreview({ newsletterId }: HtmlPreviewProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [mode, setMode] = useState<"preview" | "send">("preview")
  const [loading, setLoading] = useState(false)

  const fetchHtml = async (renderMode: "preview" | "send") => {
    setLoading(true)
    try {
      const res = await fetch(`/api/newsletters/${newsletterId}/render?mode=${renderMode}`)
      const data = await res.json() as { html?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? "렌더링 실패")
      setHtml(data.html ?? null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "렌더링에 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  const handleModeChange = async (newMode: "preview" | "send") => {
    setMode(newMode)
    await fetchHtml(newMode)
  }

  const handleCopy = async () => {
    if (!html) return
    try {
      await navigator.clipboard.writeText(html)
      toast.success("HTML이 클립보드에 복사되었습니다")
    } catch {
      toast.error("복사에 실패했습니다")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${mode === "preview" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            onClick={() => handleModeChange("preview")}
          >
            미리보기 (Ghost)
          </button>
          <button
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${mode === "send" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            onClick={() => handleModeChange("send")}
          >
            발송용 (WP)
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchHtml(mode)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          불러오기
        </Button>
        {html && (
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-1" />
            HTML 복사
          </Button>
        )}
      </div>

      {html ? (
        <iframe
          srcDoc={html}
          sandbox="allow-same-origin"
          className="w-full border rounded-lg"
          style={{ height: "700px" }}
          title="뉴스레터 미리보기"
        />
      ) : (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-gray-50 text-gray-500 text-sm">
          불러오기 버튼을 눌러 미리보기를 확인하세요
        </div>
      )}
    </div>
  )
}
