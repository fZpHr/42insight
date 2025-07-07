import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components//ui/card"
import { Badge } from "@/components//ui/badge"
import { Button } from "@/components//ui/button"
import { Github, Clock, Construction } from 'lucide-react'

export default function Contribute() {
  const roadmapItems = [
    { title: "Resolve all skill issues", "status": "∞" },
    { title: "Export All Old Features", status: "Completed" },
    { title: "More stats(activity,..)", status: "Completed" },
    { title: "Our Find peers", status: "In Progress" },
    { title: "Exam tracker", status: "Completed" },
    { title: "Responsive Design", status: "Completed" },
    { title: "RGPD Compliance", status: "Planned" },
    { title: "Mobile app", status: "In Discussion" },
    { title: "Tree-Graph Relation", "status": "In Beta" },
    { title: "Extension for Search Engine/Overlay intra", status: "In Discussion" },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      <Card className="shadow-lg">
        <div className="text-center space-y-3">
          <h4 className="font-semibold text-lg">Have an idea or suggestion?</h4>
          <p className="text-muted-foreground text-sm">
            Help us improve 42insight by sharing your feedback and feature requests
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              size="sm"
              className="min-w-[140px]"
              asChild
            >
              <a
                href="https://github.com/fzphr/42insight/issues/new?title=[ISSUE]&body=Describe%20your%20issue%20here...&labels=issue"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                Submit Issue
              </a>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="min-w-[140px]"
              asChild
            >
              <a
                href="https://github.com/fzphr/42insight/issues/new?title=[IDEA]&body=Describe%20your%20idea%20here...&labels=idea"
                target="_blank"
                rel="noopener noreferrer"
              >
                💡 Share Idea
              </a>
            </Button>
          </div>
        </div>
      </Card >

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>
            <Clock className="mr-2 h-4 w-4 inline" />Data Update Frequency</CardTitle>
          <CardDescription>How often our data sources are refreshed throughout the day</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-center justify-between">
              <span>Student Profiles</span>
              <Badge variant="secondary">Every 30mins</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>Activity data</span>
              <Badge variant="secondary">Every day</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>Corrections data</span>
              <Badge variant="secondary">Every hours</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>Exams</span>
              <Badge variant="secondary">Every 10mins</Badge>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle><Construction className="mr-2 h-4 w-4 inline" />Project Roadmap</CardTitle>
          <CardDescription>Here's what we're working on and planning for the future</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-4">
            {roadmapItems.map((item, index) => (
              <li key={index} className="flex items-center justify-between">
                <span>{item.title}</span>
                <Badge
                  variant={item.status === "Completed" ? "default" :
                    item.status === "In Progress" || item.status === "∞" ? "secondary" : "outline"}
                >
                  {item.status}
                </Badge>
              </li>
            ))}
          </ul>

        
        </CardContent>
      </Card>
    </div >
  )
}
