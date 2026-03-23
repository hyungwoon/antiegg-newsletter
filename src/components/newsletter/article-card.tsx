import { ArticleSection } from "@/generated/prisma/client"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react"
import Image from "next/image"

interface ArticleCardProps {
  id: string
  title: string
  description: string
  section: ArticleSection
  ghostImageUrl: string | null
  wpImageUrl: string | null
  wpLink: string | null
  isFirst: boolean
  isLast: boolean
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onDelete: (id: string) => void
}

const SECTION_CONFIG: Record<ArticleSection, { label: string; className: string }> = {
  CURATION: { label: "큐레이션", className: "bg-purple-100 text-purple-700" },
  GRAY: { label: "GRAY", className: "bg-gray-100 text-gray-600" },
}

export function ArticleCard({
  id, title, description, section,
  ghostImageUrl, wpImageUrl, wpLink,
  isFirst, isLast, onMoveUp, onMoveDown, onDelete,
}: ArticleCardProps) {
  const { label, className } = SECTION_CONFIG[section]

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg bg-white">
      <div className="w-20 h-12 flex-shrink-0 bg-gray-100 rounded overflow-hidden relative">
        {ghostImageUrl ? (
          <Image src={ghostImageUrl} alt={title} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">없음</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
            {label}
          </span>
          <span className={`text-xs ${ghostImageUrl ? "text-green-600" : "text-gray-400"}`}>
            Ghost {ghostImageUrl ? "✓" : "✗"}
          </span>
          <span className={`text-xs ${wpLink ? "text-green-600" : "text-gray-400"}`}>
            WP {wpLink ? "✓" : "✗"}
          </span>
          {wpImageUrl && <span className="text-xs text-green-600">이미지 ✓</span>}
        </div>
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500 line-clamp-1">{description}</p>
      </div>

      <div className="flex flex-col gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMoveUp(id)} disabled={isFirst}>
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMoveDown(id)} disabled={isLast}>
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => onDelete(id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
