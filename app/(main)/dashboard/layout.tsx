import type { ReactNode } from "react"
import { getFortyTwoCursus } from "@/lib/forty-two/cursus"
import { getFortyTwoLevels } from "@/lib/forty-two/forty-two-experience"
import { getFortyTwoProjects } from "@/lib/forty-two/forty-two-projects"
import { getFortyTwoTitles } from "@/lib/forty-two/forty-two-rncp"
import { FortyTwoStoreProvider } from "@/providers/forty-two-store-provider"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cursus = await getFortyTwoCursus()
  const projects = await getFortyTwoProjects()
  const titles = await getFortyTwoTitles()
  const levels = await getFortyTwoLevels()

  return (
    <FortyTwoStoreProvider cursus={cursus} levels={levels} titles={titles} projects={projects}>
      {children}
    </FortyTwoStoreProvider>
  )
}
