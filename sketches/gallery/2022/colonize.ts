import { Point, point, vector } from "@flatten-js/core"
import { pixi } from "library/core/sketch"
import { gray } from "library/drawing/color"
import { drawBackground } from "library/drawing/helpers"
import { fromPolar } from "library/utils"
import { Container, Graphics } from "pixi.js"
import RBush, { BBox } from "rbush"
import knn from "rbush-knn"

// Type for describing space colonization nodes
interface Node {
  position: Point // node position
  parent?: Node // reference to parent node
  isTip: boolean // is this node a tip node (no children)
  thickness: number // vein thickness
}
// Extend an RBush class to work with Node objects
class NodeIndex extends RBush<Node> {
  override toBBox(item: Node): BBox {
    return { minX: item.position.x, minY: item.position.y, maxX: item.position.x, maxY: item.position.y }
  }
  override compareMinX(a: Node, b: Node): number {
    return a.position.x - b.position.x
  }
  override compareMinY(a: Node, b: Node): number {
    return a.position.y - b.position.y
  }
}

export default pixi(({ random, bbox }) => {
  // Only nodes within this distance around an attractor can be associated with that attractor.
  // Large attraction distances mean smoother and more subtle branch curves, but at a performance cost.
  const attractionDist = 100
  // The distance between nodes as the network grows.
  // Larger values mean better performance, but choppier and sharper branch curves.
  const segmentLength = 5
  // An attractor may be removed if one or more nodes are within this distance around it.
  const killDist = 5
  const attractorsCount = 1000

  const mainHue = random.realZeroTo(360)
  const isDarkBackground = random.bool()
  const numLayers = random.integer(2, 3)
  const hypot = Math.hypot(bbox.width, bbox.height)

  const container = new Container()
  container.addChild(
    drawBackground(isDarkBackground ? gray(random.realZeroTo(20)) : gray(255 - random.realZeroTo(20)), bbox),
  )
  for (let i = 0; i < numLayers; i++) {
    container.addChild(colonize((mainHue + (360 / numLayers) * i) % 360, i))
  }
  return { container }

  function colonize(hue: number, layerNum: number) {
    // Focal points of some resource that promote growth
    const attractors: Point[] = []
    // Points through which lines are drawn to render branches
    const nodes: Node[] = []
    // Spatial index for faster lookup
    const nodeIndex = new NodeIndex()

    // Place random attractors
    for (let i = 0; i < attractorsCount; i++) {
      const attractor = point(random.minmax(bbox.width / 2), random.minmax(bbox.height / 2))
      attractors.push(attractor)
    }
    // Place starting nodes
    const startingTheta = random.realZeroTo(2 * Math.PI)
    for (let i = 0; i <= layerNum; i++) {
      const r = layerNum == 0 ? 0 : (hypot * 0.5) / (layerNum + 1)
      const theta = startingTheta + (2 * Math.PI * i) / (layerNum + 1)
      const { x, y } = fromPolar(r, theta)
      const startingNode: Node = {
        position: point(x, y),
        isTip: true,
        thickness: 0,
      }
      nodes.push(startingNode)
      nodeIndex.insert(startingNode)
    }

    while (attractors.length > 0) {
      // Associate each attractor with the single closest node within the pre-defined attraction distance.
      const mapNodeToAttractors = new Map<Node, Point[]>()
      for (const attractor of attractors) {
        const closestNode = knn(nodeIndex, attractor.x, attractor.y, 1, undefined, attractionDist).pop()
        if (closestNode) {
          const influencingAttractors = mapNodeToAttractors.get(closestNode) ?? []
          mapNodeToAttractors.set(closestNode, [...influencingAttractors, attractor])
        }
      }

      // Grow the network by adding nodes
      for (const node of nodes) {
        const nodeAttractors = mapNodeToAttractors.get(node) ?? []
        if (nodeAttractors.length > 0) {
          const attractionVectors = nodeAttractors.map((attractor) => vector(node.position, attractor))
          const attractionVectorsSum = attractionVectors.reduce((a, b) => a.add(b)).normalize()
          // Add small amount of random "jitter" to avoid getting stuck
          // between two attractors and endlessly generating nodes in the same place
          const averageVector = attractionVectorsSum
            .add(random.vec2(-1, 1))
            .multiply(1 / attractionVectors.length)
            .normalize()
          const segmentVector = averageVector.multiply(segmentLength)

          // Create a new node
          node.isTip = false
          const newPosition = node.position.translate(segmentVector)
          const newNode: Node = {
            position: newPosition,
            parent: node,
            isTip: true,
            thickness: 0,
          }
          nodes.push(newNode)
          nodeIndex.insert(newNode)
        }

        // Perform auxin flux canalization (line segment thickening)
        if (node.isTip) {
          let currentNode = node
          while (currentNode.parent != null) {
            // When there are multiple child nodes, use the thickest of them all
            if (currentNode.parent.thickness < currentNode.thickness + 0.07) {
              currentNode.parent.thickness = currentNode.thickness + 0.03
            }
            currentNode = currentNode.parent
          }
        }
      }

      // Prune attractors when branches get too close.
      const prevAttractorsLength = attractors.length
      for (const [attractorIdx, attractor] of attractors.entries()) {
        const reachedNodes = knn(nodeIndex, attractor.x, attractor.y, Infinity, undefined, killDist)
        if (reachedNodes.length > 0) {
          attractors.splice(attractorIdx, 1)
        }
      }
      // If we're stuck and there are less than 1% of attractors left - break early
      if (attractors.length <= attractorsCount / 100 && attractors.length == prevAttractorsLength) break
    }

    return drawNodes(nodes, hue)
  }

  function drawNodes(nodes: Node[], hue: number): Graphics {
    const g = new Graphics()
    const val = isDarkBackground ? 100 : 50
    const sat = isDarkBackground ? random.real(20, 100) : random.real(50, 100)
    const color = { h: hue, s: sat, v: val }
    for (const node of nodes) {
      if (node.parent) {
        const alpha = Math.min(node.thickness / 7 + 0.4, 1)
        const width = node.thickness + 1
        g.moveTo(node.position.x, node.position.y)
          .lineTo(node.parent.position.x, node.parent.position.y)
          .stroke({ width, color, alpha })
      }
    }
    return g
  }
})
