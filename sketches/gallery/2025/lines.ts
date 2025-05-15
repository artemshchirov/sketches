import { Box, PlanarSet, Segment, segment } from "@flatten-js/core"
import { pixi } from "library/core/sketch"
import { rectanglePacking } from "library/geometry/packing"
import { asset } from "library/utils"
import { Assets, Color, ColorSource, Container, Graphics, RenderTexture, Sprite, Texture } from "pixi.js"

interface SpanningTree {
  ncols: number
  nrows: number
  row: (i: number) => number
  col: (i: number) => number
  edges: [number, number][]
  connect: Record<"left" | "right" | "up" | "down", boolean>[]
}

interface Hamiltonian {
  ncols: number
  nrows: number
  row: (i: number) => number
  col: (i: number) => number
  edges: [number, number][]
  path: number[]
}

const paperTexture = await Assets.load<Texture>(asset("paper_texture.jpg"))

export default pixi(({ random, bbox, renderer }) => {
  const container = new Container()
  const sprite = new Sprite(paperTexture)
  const spriteScale = bbox.height / sprite.height
  sprite.scale.set(spriteScale)
  sprite.anchor.set(0.5)

  const pathContainer = new Container()
  const gridCellSize = 50
  const pathCellSize = gridCellSize * 0.5
  const hue = random.realZeroTo(360)
  const st = gridSpanningTree(bbox.width / gridCellSize, bbox.height / gridCellSize)
  const ham = hamiltonianFromSpanningTree(st)
  const segments = graphToSegments(ham, pathCellSize)
  const planarSet = new PlanarSet()
  segments.forEach((seg) => planarSet.add(seg))
  const packing = rectanglePacking(bbox, random.real(0.5, 1) / pathCellSize, random)
  packing.forEach((rect) => {
    const lowSat = random.real(10, 30)
    const highSat = random.real(70, 90)
    const isEmpty = random.bool(0.3)
    const invertColors = random.bool(0.5)
    const isMonochrome = !isEmpty && random.bool(0.6)
    const backgroundColor = new Color({ h: hue, s: lowSat, v: random.real(50, 100) })
    const foregroundColor = isMonochrome ? "black" : new Color({ h: hue, s: highSat, v: random.real(50, 100) })
    const [back, front] = invertColors ? [foregroundColor, backgroundColor] : [backgroundColor, foregroundColor]
    pathContainer.addChild(new Graphics()).rect(rect.xmin, rect.ymin, rect.width, rect.height).fill(back)
    if (!isEmpty) pathContainer.addChild(drawSegments(planarSet, rect, front, pathCellSize, random.real(0.25, 0.75)))
  })
  const renderTexture = RenderTexture.create({ width: bbox.width, height: bbox.height })
  pathContainer.position.set(bbox.width / 2, bbox.height / 2)
  renderer.render({ container: pathContainer, target: renderTexture })
  const pathSprite = new Sprite(renderTexture)
  pathSprite.anchor.set(0.5)
  pathSprite.blendMode = "multiply"
  container.addChild(sprite)
  container.addChild(pathSprite)

  return { container }

  function drawSegments(
    planarSet: PlanarSet,
    box: Box,
    color: ColorSource,
    cellSize: number,
    strokeWidthFactor: number,
  ) {
    const c = new Container()

    const segments = planarSet.search(box) as Segment[]
    for (const segment of segments) {
      const startInBox = box.contains(segment.start)
      const endInBox = box.contains(segment.end)
      const intersectionPoints = segment.intersect(box)
      let start = segment.start
      let end = segment.end
      if (!startInBox && !endInBox) {
        ;[start, end] = intersectionPoints
      } else if (!startInBox) {
        start = intersectionPoints[0]
      } else if (!endInBox) {
        end = intersectionPoints[0]
      }
      const g = new Graphics().setStrokeStyle({
        width: cellSize * strokeWidthFactor,
        color,
        cap: "square",
      })
      c.addChild(g)
      g.moveTo(start.x, start.y).lineTo(end.x, end.y).stroke()
    }
    return c
  }

  // Random space-filling curves
  // https://observablehq.com/@esperanc/random-space-filling-curves
  function gridSpanningTree(ncols: number, nrows: number): SpanningTree {
    const grid = new Array(ncols * nrows)
    const col = (i: number) => i % ncols
    const row = (i: number) => Math.floor(i / ncols)
    const edges: [number, number][] = []
    const visit = (start: number) => {
      const stack = [{ current: start, prev: undefined as number | undefined }]

      while (stack.length > 0) {
        const { current: k, prev } = stack.pop()!
        if (grid[k]) continue

        if (prev !== undefined) edges.push([prev, k])
        grid[k] = true
        const [i, j] = [col(k), row(k)]
        const neighbors = []
        if (i > 0) neighbors.push(k - 1)
        if (j > 0) neighbors.push(k - ncols)
        if (i + 1 < ncols) neighbors.push(k + 1)
        if (j + 1 < nrows) neighbors.push(k + ncols)
        random.shuffle(neighbors)
        for (const n of neighbors) {
          stack.push({ current: n, prev: k })
        }
      }
    }
    visit(random.integer(0, ncols * nrows))
    const connect = new Array(ncols * nrows).fill(0).map(() => ({
      left: false,
      right: false,
      up: false,
      down: false,
    })) as Record<"left" | "right" | "up" | "down", boolean>[]
    for (let [i, j] of edges) {
      if (i > j) [i, j] = [j, i]
      if (row(i) == row(j)) connect[i].right = connect[j].left = true
      else connect[i].down = connect[j].up = true
    }
    return { nrows, ncols, row, col, edges, connect }
  }

  function graphToSegments(graph: Omit<SpanningTree, "connect">, cellSize: number) {
    const cellOffset = 0.5
    const { row, col, edges } = graph
    const segments: Segment[] = []
    const x = (i: number) => (col(i) + cellOffset) * cellSize
    const y = (i: number) => (row(i) + cellOffset) * cellSize
    for (const [i, j] of edges) {
      const seg = segment([x(i), y(i), x(j), y(j)]).translate(-bbox.width / 2, -bbox.height / 2)
      segments.push(seg)
    }
    return segments
  }

  function _visualizeGraph(st: Omit<SpanningTree, "connect">, cellSize: number, strokeWidthFactor: number) {
    const cellOffset = 0.5
    const { row, col, edges } = st
    const x = (i: number) => (col(i) + cellOffset) * cellSize
    const y = (i: number) => (row(i) + cellOffset) * cellSize
    const g = new Graphics()
    g.setStrokeStyle({ width: cellSize * strokeWidthFactor, color: "black", cap: "square" })
    for (const [i, j] of edges) {
      g.moveTo(x(i), y(i)).lineTo(x(j), y(j)).stroke()
    }
    g.position.set(-bbox.width / 2, -bbox.height / 2)
    return g
  }

  function hamiltonianFromSpanningTree(st: SpanningTree): Hamiltonian {
    const { ncols, nrows, row, col, connect } = st
    const nrows2 = 2 * nrows
    const ncols2 = 2 * ncols
    const edges2: [number, number][] = []
    const index2 = (i: number, dCol: number, dRow: number) => (row(i) * 2 + dRow) * ncols2 + col(i) * 2 + dCol
    const col2 = (i: number) => i % ncols2
    const row2 = (i: number) => Math.floor(i / ncols2)
    connect.forEach((cell, i) => {
      const { left, right, up, down } = cell
      if (right) {
        edges2.push([index2(i, 1, 0), index2(i, 2, 0)])
        edges2.push([index2(i, 1, 1), index2(i, 2, 1)])
      } else {
        edges2.push([index2(i, 1, 0), index2(i, 1, 1)])
      }
      if (!left) {
        edges2.push([index2(i, 0, 0), index2(i, 0, 1)])
      }
      if (down) {
        edges2.push([index2(i, 0, 1), index2(i, 0, 2)])
        edges2.push([index2(i, 1, 1), index2(i, 1, 2)])
      } else {
        edges2.push([index2(i, 0, 1), index2(i, 1, 1)])
      }
      if (!up) {
        edges2.push([index2(i, 0, 0), index2(i, 1, 0)])
      }
    })
    const link = new Array(ncols2 * nrows2).fill(0).map(() => []) as number[][]
    for (const [i, j] of edges2) {
      link[i].push(j)
      link[j].push(i)
    }
    let n = 0
    const path: number[] = []
    const visited: boolean[] = []
    for (let k = edges2.length; k > 0; k--) {
      path.push(n)
      visited[n] = true
      n = visited[link[n][0]] ? link[n][1] : link[n][0]
    }
    return {
      nrows: nrows2,
      ncols: ncols2,
      col: col2,
      row: row2,
      edges: edges2,
      path,
    }
  }
})
