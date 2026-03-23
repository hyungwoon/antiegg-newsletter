"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Copy, RefreshCw, Monitor, Smartphone } from "lucide-react"

type ViewMode = "pc" | "mobile" | "resizable"
const WIDTH_MAP: Record<ViewMode, string> = { pc: "100%", mobile: "375px", resizable: "100%" }

interface HtmlPreviewProps {
  newsletterId: string
}

export function HtmlPreview({ newsletterId }: HtmlPreviewProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>("pc")
  const [loading, setLoading] = useState(false)
  const [iframeWidth, setIframeWidth] = useState(640)
  const dragging = useRef(false)

  const fetchHtml = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/newsletters/${newsletterId}/render?mode=send`)
      const data = await res.json() as { html?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? "렌더링 실패")
      setHtml(data.html ?? null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "렌더링에 실패했습니다")
    } finally {
      setLoading(false)
    }
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

  const handleMouseDown = () => { dragging.current = true }
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const container = e.currentTarget.getBoundingClientRect()
    const newWidth = Math.max(320, Math.min(e.clientX - container.left, container.width))
    setIframeWidth(newWidth)
  }
  const handleMouseUp = () => { dragging.current = false }

  const iframeStyle = view === "resizable"
    ? { width: `${iframeWidth}px`, height: "800px", margin: "0 auto", transition: dragging.current ? "none" : "width 0.2s" }
    : { width: WIDTH_MAP[view], height: "800px", maxWidth: "100%", margin: "0 auto" }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button className={`p-1.5 rounded ${view === "pc" ? "bg-white shadow" : ""}`} onClick={() => setView("pc")} title="PC">
            <Monitor className="h-4 w-4" />
          </button>
          <button className={`p-1.5 rounded ${view === "mobile" ? "bg-white shadow" : ""}`} onClick={() => setView("mobile")} title="모바일">
            <Smartphone className="h-4 w-4" />
          </button>
          <button className={`px-2 py-1 rounded text-xs font-medium ${view === "resizable" ? "bg-white shadow text-gray-900" : "text-gray-500"}`} onClick={() => setView("resizable")}>
            자유
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchHtml()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          불러오기
        </Button>
        {html && (
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-1" />
            HTML 복사
          </Button>
        )}
        {view === "resizable" && <span className="text-xs text-gray-400">{iframeWidth}px</span>}
      </div>

      {html ? (
        <div
          className="relative"
          onMouseMove={view === "resizable" ? handleMouseMove : undefined}
          onMouseUp={view === "resizable" ? handleMouseUp : undefined}
          onMouseLeave={view === "resizable" ? handleMouseUp : undefined}
        >
          <iframe
            srcDoc={html}
            sandbox="allow-same-origin"
            className="border rounded-lg bg-white block"
            style={iframeStyle}
            title="뉴스레터 미리보기"
          />
          {view === "resizable" && (
            <div
              className="absolute top-0 w-2 h-full cursor-col-resize bg-gray-300 hover:bg-gray-400 rounded-r"
              style={{ left: `calc(50% + ${iframeWidth / 2}px)` }}
              onMouseDown={handleMouseDown}
            />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-gray-50 text-gray-500 text-sm">
          불러오기 버튼을 눌러 미리보기를 확인하세요
        </div>
      )}
    </div>
  )
}
