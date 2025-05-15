import { Vector, vector } from "@flatten-js/core"
import { noise2d } from "library/core/random"
import { pixi } from "library/core/sketch"
import { gray } from "library/drawing/color"
import { drawBackground } from "library/drawing/helpers"
import { map } from "library/utils"
import { ColorSource, Container, Graphics } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const noise = noise2d(random)
  const numCurves = 2000
  const flowFieldResolution = 100
  const noiseFactor = 0.01
  const flowField: number[][] = []
  const cellVisited: boolean[][] = []
  const palette = generatePalette()
  const container = new Container()
  container.addChild(drawBackground(gray(random.realZeroTo(30)), bbox))

  // Initialize flow field
  for (let i = -flowFieldResolution * 2; i < flowFieldResolution * 2; i++) {
    flowField[i] = []
    cellVisited[i] = []
    for (let j = -flowFieldResolution * 2; j < flowFieldResolution * 2; j++) {
      const n = noise(i * noiseFactor, j * noiseFactor)
      const rotation = map(n, 0, 1, 0, 2 * Math.PI)
      flowField[i][j] = rotation
      cellVisited[i][j] = false
    }
  }

  for (let i = 0; i < numCurves; i++) {
    const x = random.minmax(bbox.width / 2)
    const y = random.minmax(bbox.height / 2)
    drawCurve(x, y, i / numCurves)
  }

  return { container }

  function drawCurve(x: number, y: number, fillPercent: number) {
    const { points = [], oppositePoints = [], visitedCells = [] } = generatePoints(x, y, fillPercent)
    if (points.length == 0) {
      return
    }
    for (const visitedCell of visitedCells) {
      cellVisited[visitedCell.i][visitedCell.j] = true
    }

    const randomColor = random.pick(palette)
    const pointData = points.concat(oppositePoints).flat()
    const g = new Graphics().poly(pointData).fill(randomColor)
    container.addChild(g)
  }

  function generatePoints(startX: number, startY: number, fillPercent: number) {
    let x = startX,
      y = startY
    const stepLength = bbox.width / 1000
    const numPoints = random.real(500, 1000)
    const points = [],
      oppositePoints = [],
      visitedCells = []

    let curveWidthBounds = []
    if (fillPercent > 0.75) {
      curveWidthBounds = [3, 3]
    } else if (fillPercent > 0.5) {
      curveWidthBounds = random.bool() ? [2, 10] : [1, 5]
    } else if (fillPercent > 0.25) {
      curveWidthBounds = random.bool() ? [5, 25] : [5, 15]
    } else {
      curveWidthBounds = random.bool() ? [10, 30] : [10, 20]
    }
    const curveWidth = random.real(curveWidthBounds[0], curveWidthBounds[1])

    for (let pointIdx = 0; pointIdx < numPoints; pointIdx++) {
      const pointVector = vector(x, y)
      const flowFieldPoint = sampleFlowField(pointVector)
      const rotation = flowField[flowFieldPoint.i][flowFieldPoint.j]
      const offsetVector = vector(0, 1).rotate(rotation) // Vector pointing to the direction of curves width
      if (cellVisited[flowFieldPoint.i][flowFieldPoint.j]) return { points, oppositePoints, visitedCells }

      for (let k = 0; k <= Math.ceil(curveWidth); k++) {
        const offsetStep = offsetVector.multiply(k).add(pointVector)
        const flowFieldOffset = sampleFlowField(offsetStep)
        if (cellVisited[flowFieldOffset.i][flowFieldOffset.j]) return { points, oppositePoints, visitedCells }
        visitedCells.push(flowFieldOffset)
      }

      const oppositePoint = offsetVector.multiply(curveWidth).add(pointVector)
      points.push(pointVector)
      oppositePoints.unshift(oppositePoint)

      x += stepLength * Math.cos(rotation)
      y += stepLength * Math.sin(rotation)
    }

    return { points, oppositePoints, visitedCells }
  }

  // Convert a point to a flow field coordinates
  function sampleFlowField(point: Vector) {
    const i = Math.floor(map(point.x, -bbox.width / 2, bbox.width / 2, 0, flowFieldResolution))
    const j = Math.floor(map(point.y, bbox.height / 2, -bbox.height / 2, 0, flowFieldResolution))
    return { i, j }
  }

  function generatePalette() {
    const mainHue = random.real(0, 360)
    const hues = [mainHue, (mainHue + 120) % 360, (mainHue + 240) % 360]
    const sats = [random.normal(25, 10), random.normal(50, 10), random.normal(75, 10)]
    const vals = [80, 90, 100]
    const palette: ColorSource[] = cartesian(hues, sats, vals).map((color) => {
      return { h: color[0], s: color[1], v: color[2] }
    })
    palette.push("white")
    return palette
  }

  // Cartesian product of all elements of passed arrays
  function cartesian<T>(...allEntries: T[][]) {
    return allEntries.reduce<T[][]>(
      (results, entries) =>
        results
          .map((result) => entries.map((entry) => result.concat([entry])))
          .reduce((subResults, result) => subResults.concat(result), []),
      [[]],
    )
  }
})
