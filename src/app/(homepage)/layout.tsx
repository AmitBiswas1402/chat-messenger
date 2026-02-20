import Sidebar from "./components/Sidebar"
import { syncUser } from "@/actions/user.action"

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await syncUser()

  return (
    <div className="h-screen bg-black flex items-center justify-center p-4">
      
      {/* OUTER FRAME */}
      <div className="w-full h-full max-w-350 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 flex">
        
        {/* LEFT CHAT LIST (ALWAYS) */}
        <Sidebar />

        {/* RIGHT PANEL (CHANGES BY ROUTE) */}
        <div className="flex-1 bg-background">
          {children}
        </div>

      </div>
    </div>
  )
}