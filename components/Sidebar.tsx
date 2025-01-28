"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, PenTool, Image, Table, Video } from "lucide-react"

const sidebarItems = [
  { name: "Home", icon: Home, href: "/" },
  { name: "Drawing", icon: PenTool, href: "/drawing" },
  { name: "Image Manipulation", icon: Image, href: "/image-manipulation" },
  { name: "Table", icon: Table, href: "/table" },
  { name: "Video Call", icon: Video, href: "/video-call" },
]

const SidebarItem = ({ name, icon: Icon, href }: { name: string; icon: any; href: string }) => {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={`flex items-center p-3 rounded-lg transition-all ${
        isActive ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800"
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      {name}
    </Link>
  )
}

const Sidebar = () => {
  return (
    <aside className="w-64 h-screen bg-black text-white p-4">
      <nav>
        <ul className="space-y-2">
          {sidebarItems.map((item) => (
            <li key={item.href}>
              <SidebarItem {...item} />
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
