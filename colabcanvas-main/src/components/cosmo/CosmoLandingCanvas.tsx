import { useMemo } from "react";
import { ReactFlow, useNodesState, useEdgesState, Node, Edge, ConnectionMode } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import LandingNode from "./LandingNode";
import LandingEdge from "./LandingEdge";

// Sample placeholder images (using placeholder service)
const sampleImages = {
  shoes: [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop",
    "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=100&h=100&fit=crop",
    "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=100&h=100&fit=crop",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=100&h=100&fit=crop",
  ],
  personJumping: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=280&h=500&fit=crop",
  sneaker: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop",
};

const initialNodes: Node[] = [
  {
    id: "input",
    type: "landing",
    position: { x: 20, y: 60 },
    data: {
      variant: "input",
      label: "Input",
      images: sampleImages.shoes,
      width: 280,
    },
    draggable: true,
    zIndex: 10,
  },
  {
    id: "note",
    type: "landing",
    position: { x: 10, y: 420 },
    data: {
      variant: "note",
      label: "Note",
      text: "A person sits on a green container's edge, viewed from below, gazing at the blue sky. They have windblown brown and blond hair, a red jacket, gray pants, and sneakers.",
    },
    draggable: true,
    zIndex: 10,
  },
  {
    id: "instructions",
    type: "landing",
    position: { x: 520, y: 520 },
    data: {
      variant: "instructions",
      label: "Instructions",
      text: "Generate a dynamic action shot of a person jumping mid-air against a bright blue sky. The person should be wearing casual streetwear including a red jacket and gray pants. Capture the sense of freedom and movement.",
    },
    draggable: true,
    zIndex: 10,
  },
  {
    id: "result1",
    type: "landing",
    position: { x: 1050, y: 20 },
    data: {
      variant: "result",
      label: "Image Result",
      image: sampleImages.personJumping,
      aspectRatio: "9/16",
      width: 280,
    },
    draggable: true,
    zIndex: 10,
  },
  {
    id: "result2",
    type: "landing",
    position: { x: 1100, y: 420 },
    data: {
      variant: "result",
      label: "Image Result",
      image: sampleImages.sneaker,
      aspectRatio: "1/1",
      width: 260,
    },
    draggable: true,
    zIndex: 10,
  },
];

const initialEdges: Edge[] = [
  {
    id: "e-input-result1",
    source: "input",
    target: "result1",
    type: "landing",
    data: { color: "blue", sourceType: "input" },
  },
  {
    id: "e-note-instructions",
    source: "note",
    target: "instructions",
    type: "landing",
    data: { color: "purple", sourceType: "note" },
  },
  {
    id: "e-input-result2",
    source: "input",
    target: "result2",
    type: "landing",
    data: { color: "green", sourceType: "input" },
  },
  {
    id: "e-instructions-result1",
    source: "instructions",
    target: "result1",
    type: "landing",
    data: { color: "orange", sourceType: "instructions" },
  },
];

export default function CosmoLandingCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({ landing: LandingNode }), []);
  const edgeTypes = useMemo(() => ({ landing: LandingEdge }), []);

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 pointer-events-none bg-transparent" />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.5}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        style={{ background: "transparent" }}
      />
    </div>
  );
}
