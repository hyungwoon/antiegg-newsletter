"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth", { method: "DELETE" })
      if (response.ok) {
        router.push("/login")
      }
    } catch {
      void 0
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-muted/30 p-4 flex flex-col gap-2">
        <h1 className="text-lg font-bold mb-4 px-2">ANTIEGG NL</h1>
        <Link href="/newsletters">
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Mail className="h-4 w-4" />
            뉴스레터
          </Button>
        </Link>
        <div className="mt-auto">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            size="sm"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
