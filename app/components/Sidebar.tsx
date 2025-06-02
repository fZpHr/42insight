"use client"

import { BarChart3, Users, Grid, X, GitPullRequest, LinkIcon } from "lucide-react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  activeView: string
  setActiveView: (view: string) => void
}

export default function Sidebar({ isOpen, setIsOpen, activeView, setActiveView }: SidebarProps) {
  const navItems = [
    { name: "Rankings", icon: Grid, value: "rankings" },
    //{ name: 'Cluster-map', icon: Map, value: 'cluster-map' },
    { name: "Trombinoscope", icon: Users, value: "trombinoscope" },
    { name: "Exam Tracker", icon: BarChart3, value: "exam-tracker" },
    { name: "Relation Tree", icon: Users, value: "relation-tree", isNew: true },
    { name: "Useful Links", icon: LinkIcon, value: "useful-links" },
    // { name: 'Games', icon: Gamepad2, value: 'games'},
    { name: "Contribute", icon: GitPullRequest, value: "contribute" },
  ]

  return (
    <div
      className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg transform transition-transform duration-300 ease-in-out
      ${isOpen ? "translate-x-0" : "-translate-x-full"}
      md:relative md:translate-x-0
    `}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">42 Insight</h2>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsOpen(false)}>
          <X className="h-6 w-6" />
        </Button>
      </div>
      <nav className="mt-5">
        <ul>
          {navItems.map((item) => (
            <li key={item.value}>
              <Button
                variant={activeView === item.value ? "secondary" : "ghost"}
                className="w-full justify-start px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setActiveView(item.value)
                  setIsOpen(false)
                }}
              >
                <item.icon className="mr-3 h-5 w-5" />
                <div className="flex items-center gap-2">
                  {item.name}
                  {item.isNew && (
                    <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs py-0 px-1.5">NEW</Badge>
                  )}
                </div>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
