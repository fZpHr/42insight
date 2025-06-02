"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Users, UserCheck, RotateCcw } from "lucide-react"
import * as d3 from "d3"

interface Student {
  id: number
  name: string
  level: number
  photoUrl: string
  year: number
  campus: string
  correctionPoints: number
  relation: {
    correcteur: Record<string, number>
    team: Record<string, number>
  } | null
}

interface RelationNode extends d3.SimulationNodeDatum {
  id: number
  name: string
  photoUrl: string
  level: number
  year: number
  campus: string
  teams: string[]
  corrections: string[]
  relationCount: number
  correctionPoints: number
}

interface RelationLink extends d3.SimulationLinkDatum<RelationNode> {
  source: RelationNode
  target: RelationNode
  type: "team" | "correction" | "both"
  strength: number
}

const fetchStudents = async (): Promise<Student[]> => {
  try {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1]
    
    console.log("Fetching students with token:", token ? "Token exists" : "No token found");
    
    const response = await fetch("/api/students", {
      headers: { Authorization: `Bearer ${token}` },
    })
    
    if (!response.ok) {
      throw new Error("Failed to fetch students")
    }
    
    const data = await response.json()
    
    // Log the first student to see the structure
    console.log("First student data structure:", data[0]);
    
    // Check for relation data specifically
    const studentsWithRelation = data.filter(student => student.relation);
    console.log(`Students with relation field: ${studentsWithRelation.length}/${data.length}`);
    
    // If any students have relation data, log one example
    if (studentsWithRelation.length > 0) {
      console.log("Sample relation data:", studentsWithRelation[0].relation);
    } else {
      console.log("No students have relation data");
      
      // Check if there's any field that might contain relation information
      const firstStudent = data[0];
      console.log("Available fields on student:", Object.keys(firstStudent));
    }
    
    return data
  } catch (error) {
    console.error("Error fetching students:", error)
    return []
  }
}

// Generate relation data from actual DB data
const generateRelationData = (students: Student[]): { nodes: RelationNode[]; links: RelationLink[] } => {
  console.log("Processing relationships for", students.length, "students");
  
  // Create a map of student names to their full objects for quick lookup
  const studentMap = new Map<string, Student>();
  students.forEach(student => {
    studentMap.set(student.name, student);
  });
  
  // Debug: check how many students have relation data
  const studentsWithRelations = students.filter(s => s.relation).length;
  console.log(`Students with relation data: ${studentsWithRelations}/${students.length}`);
  
  try {
    // Transform students into nodes with relation data
    const enrichedStudents: RelationNode[] = students.map((student) => {
      // Extract team and correction relationships from relation data
      const teams: string[] = [];
      const corrections: string[] = [];
      
      if (student.relation) {
        // Add team relationships
        if (student.relation.team && typeof student.relation.team === 'object') {
          Object.keys(student.relation.team).forEach(teamMember => {
            if (studentMap.has(teamMember)) {
              teams.push(teamMember);
            }
          });
        }
        
        // Add correction relationships
        if (student.relation.correcteur && typeof student.relation.correcteur === 'object') {
          Object.keys(student.relation.correcteur).forEach(corrector => {
            if (studentMap.has(corrector)) {
              corrections.push(corrector);
            }
          });
        }
      }
      
      return {
        ...student,
        teams,
        corrections,
        relationCount: (teams.length + corrections.length) || 0,
      };
    });

    // Generate links based on team and correction relationships
    const links: RelationLink[] = [];
    const linkMap = new Map<string, RelationLink>();

    enrichedStudents.forEach(student => {
      // Team relationships
      student.teams.forEach(teamMember => {
        const targetStudent = enrichedStudents.find(s => s.name === teamMember);
        if (targetStudent) {
          const linkId = [student.id, targetStudent.id].sort().join("-");
          if (!linkMap.has(linkId)) {
            linkMap.set(linkId, {
              source: student,
              target: targetStudent,
              type: "team",
              strength: 1,
            });
          } else {
            const existingLink = linkMap.get(linkId)!;
            if (existingLink.type === "correction") {
              existingLink.type = "both";
              existingLink.strength = 2;
            }
          }
        }
      });
      
      // Correction relationships
      student.corrections.forEach(corrector => {
        const targetStudent = enrichedStudents.find(s => s.name === corrector);
        if (targetStudent) {
          const linkId = [student.id, targetStudent.id].sort().join("-");
          if (!linkMap.has(linkId)) {
            linkMap.set(linkId, {
              source: student,
              target: targetStudent,
              type: "correction",
              strength: 1,
            });
          } else {
            const existingLink = linkMap.get(linkId)!;
            if (existingLink.type === "team") {
              existingLink.type = "both";
              existingLink.strength = 2;
            }
          }
        }
      });
    });

    links.push(...Array.from(linkMap.values()));

    // Recalculate relation counts based on actual connections
    enrichedStudents.forEach(student => {
      student.relationCount = links.filter(
        link => 
          (link.source as RelationNode).id === student.id || 
          (link.target as RelationNode).id === student.id
      ).length;
    });

    console.log(`Generated ${links.length} relationship links`);
    return { nodes: enrichedStudents, links };
  } catch (error) {
    console.error("Error generating relationship data:", error);
    // Return empty data as fallback
    return { nodes: students.map(s => ({ ...s, teams: [], corrections: [], relationCount: 0 })), links: [] };
  }
}

export default function RelationTree() {
  const [students, setStudents] = useState<Student[]>([])
  const [relationData, setRelationData] = useState<{ nodes: RelationNode[]; links: RelationLink[] }>({
    nodes: [],
    links: [],
  })
  const [filteredData, setFilteredData] = useState<{ nodes: RelationNode[]; links: RelationLink[] }>({
    nodes: [],
    links: [],
  })
  const [filter, setFilter] = useState<"all" | "teams" | "corrections">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<RelationNode | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<RelationNode, RelationLink> | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const cachedStudents = sessionStorage.getItem("students")
      let studentsData: Student[]

      if (cachedStudents) {
        studentsData = JSON.parse(cachedStudents)
      } else {
        studentsData = await fetchStudents()
        sessionStorage.setItem("students", JSON.stringify(studentsData))
      }

      setStudents(studentsData)
      const relations = generateRelationData(studentsData)
      setRelationData(relations)
      setFilteredData(relations)
      setIsLoading(false)
    }

    loadData()
  }, [])

  const applyFilter = useMemo(() => {
    // First filter by relation type
    let filteredLinks = relationData.links;
    if (filter !== "all") {
      filteredLinks = relationData.links.filter((link) => {
        if (filter === "teams") return link.type === "team" || link.type === "both"
        if (filter === "corrections") return link.type === "correction" || link.type === "both"
        return true
      })
    }

    // Then filter by search query if provided
    let filteredNodes = relationData.nodes;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      // First find directly matching nodes
      const matchingNodes = relationData.nodes.filter(
        node => node.name.toLowerCase().includes(query)
      );
      
      // Create a set of node IDs to include
      const nodeIds = new Set<number>();
      
      // Add all matching nodes
      matchingNodes.forEach(node => nodeIds.add(node.id));
      
      // If we have matching nodes, also include their direct connections
      if (matchingNodes.length > 0) {
        filteredLinks.forEach(link => {
          const sourceId = (link.source as RelationNode).id;
          const targetId = (link.target as RelationNode).id;
          
          // If either source or target matches, include both
          if (nodeIds.has(sourceId) || nodeIds.has(targetId)) {
            nodeIds.add(sourceId);
            nodeIds.add(targetId);
          }
        });
      }
      
      // Filter nodes to only include those in our set
      filteredNodes = relationData.nodes.filter(node => nodeIds.has(node.id));
      
      // Also filter links to only include connections between these nodes
      filteredLinks = filteredLinks.filter(link => {
        const sourceId = (link.source as RelationNode).id;
        const targetId = (link.target as RelationNode).id;
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
      });
    }

    // Get connected node IDs from links
    const connectedNodeIds = new Set<number>()
    filteredLinks.forEach((link) => {
      connectedNodeIds.add((link.source as RelationNode).id)
      connectedNodeIds.add((link.target as RelationNode).id)
    })

    // Filter nodes to only include those with connections
    filteredNodes = filteredNodes.filter((node) => connectedNodeIds.has(node.id))

    // Recalculate relation counts for filtered data
    filteredNodes.forEach((node) => {
      node.relationCount = filteredLinks.filter(
        (link) => 
          (link.source as RelationNode).id === node.id || 
          (link.target as RelationNode).id === node.id
      ).length
    })

    return { nodes: filteredNodes, links: filteredLinks }
  }, [relationData, filter, searchQuery])

  useEffect(() => {
    setFilteredData(applyFilter)
  }, [applyFilter])

  useEffect(() => {
    if (!svgRef.current || filteredData.nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = 800
    const height = 600
    const centerX = width / 2
    const centerY = height / 2

    // Create simulation
    const simulation = d3
      .forceSimulation<RelationNode>(filteredData.nodes)
      .force(
        "link",
        d3
          .forceLink<RelationNode, RelationLink>(filteredData.links)
          .id((d) => d.id.toString())
          .distance((d) => 1000 + d.strength * 20)
          .strength((d) => d.strength * 0.1),
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(centerX, centerY))
      .force(
        "collision",
        d3.forceCollide().radius((d) => Math.max(15, Math.sqrt(d.relationCount) * 8) + 5),
      )

    simulationRef.current = simulation

    // Create container group
    const container = svg.append("g")

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform)
      })

    svg.call(zoom)

    // Create links
    const links = container
      .append("g")
      .selectAll("line")
      .data(filteredData.links)
      .enter()
      .append("line")
      .attr("stroke", (d) => {
        switch (d.type) {
          case "team":
            return "#3b82f6"
          case "correction":
            return "#ef4444"
          case "both":
            return "#8b5cf6"
          default:
            return "#6b7280"
        }
      })
      .attr("stroke-width", (d) => d.strength * 2)
      .attr("stroke-opacity", 0.6)

    // Create node groups
    const nodeGroups = container
      .append("g")
      .selectAll("g")
      .data(filteredData.nodes)
      .enter()
      .append("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, RelationNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on("drag", (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          }),
      )

    // Add circles for nodes
    nodeGroups
      .append("circle")
      .attr("r", (d) => Math.max(15, Math.sqrt(d.relationCount) * 8))
      .attr("fill", (d) => {
        const hue = (d.level * 137.5) % 360
        return `hsl(${hue}, 70%, 60%)`
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)

    // Add profile images
    nodeGroups
      .append("clipPath")
      .attr("id", (d) => `clip-${d.id}`)
      .append("circle")
      .attr("r", (d) => Math.max(12, Math.sqrt(d.relationCount) * 8 - 3))

    nodeGroups
      .append("image")
      .attr("href", (d) => d.photoUrl)
      .attr("x", (d) => -Math.max(12, Math.sqrt(d.relationCount) * 8 - 3))
      .attr("y", (d) => -Math.max(12, Math.sqrt(d.relationCount) * 8 - 3))
      .attr("width", (d) => Math.max(12, Math.sqrt(d.relationCount) * 8 - 3) * 2)
      .attr("height", (d) => Math.max(12, Math.sqrt(d.relationCount) * 8 - 3) * 2)
      .attr("clip-path", (d) => `url(#clip-${d.id})`)

    // Add labels
    nodeGroups
      .append("text")
      .text((d) => d.name)
      .attr("dy", (d) => Math.max(15, Math.sqrt(d.relationCount) * 8) + 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "#374151")

    // Add relation count badges
    nodeGroups
      .append("circle")
      .attr("cx", (d) => Math.max(15, Math.sqrt(d.relationCount) * 8) - 5)
      .attr("cy", (d) => -(Math.max(15, Math.sqrt(d.relationCount) * 8) - 5))
      .attr("r", 8)
      .attr("fill", "#ef4444")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)

    nodeGroups
      .append("text")
      .text((d) => d.relationCount)
      .attr("x", (d) => Math.max(15, Math.sqrt(d.relationCount) * 8) - 5)
      .attr("y", (d) => -(Math.max(15, Math.sqrt(d.relationCount) * 8) - 5))
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "#fff")

    // Add click handlers
    nodeGroups.on("click", (event, d) => {
      setSelectedStudent(d)
    })

    // Update positions on simulation tick
    simulation.on("tick", () => {
      links
        .attr("x1", (d) => (d.source as RelationNode).x!)
        .attr("y1", (d) => (d.source as RelationNode).y!)
        .attr("x2", (d) => (d.target as RelationNode).x!)
        .attr("y2", (d) => (d.target as RelationNode).y!)

      nodeGroups.attr("transform", (d) => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [filteredData])

  const resetFilter = () => {
    setFilter("all")
  }

  const getFilterStats = () => {
    const totalNodes = relationData.nodes.length
    const filteredNodes = filteredData.nodes.length
    const totalLinks = relationData.links.length
    const filteredLinks = filteredData.links.length

    return { totalNodes, filteredNodes, totalLinks, filteredLinks }
  }

  const stats = getFilterStats()

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p>Loading relation tree...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Graph */}
        <Card className="flex-1">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Relation Tree
                </CardTitle>
                <div className="relative group">
                  <Badge className="bg-red-500 hover:bg-red-600 text-white ml-2 cursor-help">BETA</Badge>
                  {/* Tooltip that appears on hover */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg 
                                 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                    Feel free to DM .z.e.p.h. / hbelle on Discord if you want to help
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-gray-900 transform rotate-45"></div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.filteredNodes} students, {stats.filteredLinks} relations
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {/* Add search input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by login..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-2 border rounded-md w-full sm:w-[180px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {searchQuery && (
                    <button 
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setSearchQuery("")}
                    >
                      ×
                    </button>
                  )}
                </div>

                <Select value={filter} onValueChange={(value: "all" | "teams" | "corrections") => setFilter(value)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter relations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Relations</SelectItem>
                    <SelectItem value="teams">Teams Only</SelectItem>
                    <SelectItem value="corrections">Corrections Only</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={() => {
                  resetFilter();
                  setSearchQuery("");
                }}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <svg
                ref={svgRef}
                width="100%"
                height="600"
                viewBox="0 0 800 600"
                className="border rounded-lg bg-gray-50 dark:bg-gray-900"
              ></svg>

              {/* Legend */}
              <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md border">
                <h4 className="font-semibold text-sm mb-2">Legend</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-blue-500"></div>
                    <span>Team Relations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-red-500"></div>
                    <span>Correction Relations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-purple-500"></div>
                    <span>Both Relations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-300 border"></div>
                    <span>Node size = relation count</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Profile Panel */}
        {selectedStudent && (
          <Card className="w-full lg:w-80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Student Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedStudent.photoUrl || "/placeholder.svg"}
                  alt={selectedStudent.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple-500"
                />
                <div>
                  <h3 className="font-semibold text-lg">{selectedStudent.name}</h3>
                  <p className="text-sm text-muted-foreground">Level {selectedStudent.level}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">Statistics</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <div className="font-semibold text-purple-600">{selectedStudent.relationCount}</div>
                      <div className="text-xs text-muted-foreground">Relations</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <div className="font-semibold text-blue-600">{selectedStudent.correctionPoints}</div>
                      <div className="text-xs text-muted-foreground">Correction Points</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Teams</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedStudent.teams.map((team, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {team}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Campus Info</h4>
                  <div className="text-sm space-y-1">
                    <div>
                      Campus: <span className="font-medium">{selectedStudent.campus}</span>
                    </div>
                    <div>
                      Year: <span className="font-medium">{selectedStudent.year}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  className="w-full"
                  onClick={() => window.open(`https://profile.intra.42.fr/users/${selectedStudent.name}`, "_blank")}
                >
                  View Full Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filter Statistics */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.filteredNodes}</div>
              <div className="text-sm text-muted-foreground">Active Students</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.filteredLinks}</div>
              <div className="text-sm text-muted-foreground">Relations</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {filteredData.links.filter((l) => l.type === "team" || l.type === "both").length}
              </div>
              <div className="text-sm text-muted-foreground">Team Relations</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {filteredData.links.filter((l) => l.type === "correction" || l.type === "both").length}
              </div>
              <div className="text-sm text-muted-foreground">Correction Relations</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
