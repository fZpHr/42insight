"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";

type RelationData = {
  [category: string]: {
    [user: string]: number;
  };
};

interface UserRelationGraphProps {
  data: RelationData;
  centerUser?: string;
}

export default function UserRelationGraph({
  data,
  centerUser = "you",
}: UserRelationGraphProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [
      {
        id: centerUser,
        data: { label: centerUser },
        position: { x: 400, y: 300 },
        type: "default",
        style: {
          background: "#ffca28",
          color: "#000",
          border: "2px solid #f57c00",
          borderRadius: "8px",
          padding: 10,
          fontWeight: 600,
          width: 100,
        },
      },
    ];

    const edges: Edge[] = [];
    const categoryColors: Record<string, string> = {
      correcteur: "#1976d2",
      team: "#43a047",
      default: "#757575",
    };

    // Collect all evaluators and their total evaluations
    const evaluatorStats = new Map<
      string,
      { total: number; categories: string[] }
    >();

    Object.entries(data).forEach(([category, users]) => {
      Object.entries(users).forEach(([user, count]) => {
        if (!evaluatorStats.has(user)) {
          evaluatorStats.set(user, { total: 0, categories: [] });
        }
        const stats = evaluatorStats.get(user)!;
        stats.total += count;
        stats.categories.push(category);
      });
    });

    // Position evaluators in a circle
    const evaluators = Array.from(evaluatorStats.keys());
    const radius = 250;
    const angleStep = (2 * Math.PI) / evaluators.length;

    evaluators.forEach((user, index) => {
      const angle = index * angleStep;
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);
      const stats = evaluatorStats.get(user)!;

      nodes.push({
        id: user,
        data: {
          label: (
            <>
              <div style={{ fontWeight: 600 }}>{user}</div>
              <div style={{ fontSize: "10px", color: "#666" }}>
                {stats.total} eval{stats.total > 1 ? "s" : ""}
              </div>
            </>
          ),
        },
        position: { x, y },
        type: "default",
        style: {
          background: "#e3f2fd",
          color: "#000",
          border: "1px solid #90caf9",
          borderRadius: "6px",
          padding: 8,
          fontSize: "12px",
          width: 90,
          textAlign: "center",
        },
      });
    });

    // Create edges FROM evaluators TO center user
    Object.entries(data).forEach(([category, users]) => {
      Object.entries(users).forEach(([user, count]) => {
        edges.push({
          id: `${user}-${centerUser}-${category}`,
          source: user, // FROM evaluator
          target: centerUser, // TO center user
          label: `${count}×`,
          type: "smoothstep",
          animated: count > 5,
          style: {
            stroke: categoryColors[category] || categoryColors.default,
            strokeWidth: 1 + count * 0.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: categoryColors[category] || categoryColors.default,
            width: 20,
            height: 20,
          },
          labelStyle: {
            fill: categoryColors[category] || categoryColors.default,
            fontWeight: 600,
            fontSize: 12,
          },
          labelBgStyle: {
            fill: "#fff",
            fillOpacity: 0.9,
          },
          data: { category, count },
        });
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [data, centerUser]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  // Calculate total evaluations
  const totalEvaluations = useMemo(() => {
    return Object.values(data).reduce(
      (sum, category) =>
        sum + Object.values(category).reduce((s, count) => s + count, 0),
      0
    );
  }, [data]);

  const uniqueEvaluators = useMemo(() => {
    const set = new Set<string>();
    Object.values(data).forEach((category) => {
      Object.keys(category).forEach((user) => set.add(user));
    });
    return set.size;
  }, [data]);

  return (
    <div style={{ width: "100%", height: "900px" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) =>
            node.id === centerUser ? "#ffca28" : "#90caf9"
          }
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <Panel position="top-left">
          <div
            style={{
              background: "white",
              padding: "10px 15px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
              Evaluation Summary
            </h3>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: 8 }}>
              <div>📊 {totalEvaluations} total evaluations</div>
              <div>👥 {uniqueEvaluators} unique evaluators</div>
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>
              <div>
                <span
                  style={{
                    display: "inline-block",
                    width: "12px",
                    height: "12px",
                    background: "#1976d2",
                    marginRight: "6px",
                    borderRadius: "2px",
                  }}
                />
                Correcteur
              </div>
              <div>
                <span
                  style={{
                    display: "inline-block",
                    width: "12px",
                    height: "12px",
                    background: "#43a047",
                    marginRight: "6px",
                    borderRadius: "2px",
                  }}
                />
                Team
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}