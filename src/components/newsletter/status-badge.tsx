import { NewsletterStatus } from "@/generated/prisma/client"

interface StatusBadgeProps {
  status: NewsletterStatus
}

const STATUS_CONFIG: Record<NewsletterStatus, { label: string; className: string }> = {
  DRAFT: { label: "초안", className: "bg-gray-100 text-gray-600" },
  READY: { label: "준비완료", className: "bg-blue-100 text-blue-700" },
  SENT: { label: "발송완료", className: "bg-green-100 text-green-700" },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
