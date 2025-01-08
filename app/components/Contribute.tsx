import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Github } from 'lucide-react'

export default function Contribute() {
  const roadmapItems = [
    { title: "Export All Old Features", status: "In Progress" },
    { title: "More stats(activity,..)", status: "In Progress" },
    { title: "Our Find peers", status: "Planned" },
    { title: "Exam tracker", status: "Planned" },
    { title: "Mobile app", status: "In Discussion" },
    { title: "Tree-Graph Relation", "status": "In Discussion" },
    { title: "Extension for Search Engine/Overlay intra", status: "In Discussion" },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold mb-6">Contribute to 42 Insights</h2>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>GitHub Repository</CardTitle>
          <CardDescription>Check out our code and contribute to the project</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full sm:w-auto"
            asChild
          >
            <a 
              href="https://github.com/fzphr/42insight" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Github className="mr-2 h-4 w-4" />
              View on GitHub
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Project Roadmap</CardTitle>
          <CardDescription>Here's what we're working on and planning for the future</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {roadmapItems.map((item, index) => (
              <li key={index} className="flex items-center justify-between">
                <span>{item.title}</span>
                <Badge 
                  variant={item.status === "Completed" ? "default" : 
                           item.status === "In Progress" ? "secondary" : "outline"}
                >
                  {item.status}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

