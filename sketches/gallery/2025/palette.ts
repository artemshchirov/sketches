import Delaunator from "delaunator"
import { pixi } from "library/core/sketch"
import { drawBackground } from "library/drawing/helpers"
import { Color, Container, Graphics, PointData } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const container = new Container()
  container.addChild(drawBackground("white", bbox))
  const backgroundContainer = container.addChild(new Container())

  const points = generatePoints()
  // points.forEach(({ x, y }) => {
  //   container.addChild(new Graphics()).circle(x, y, 5).fill({ color: random.color() })
  // })
  points.push(
    { x: -bbox.width / 2, y: -bbox.width / 2 },
    { x: bbox.width / 2, y: -bbox.width / 2 },
    { x: bbox.width / 2, y: bbox.width / 2 },
    { x: -bbox.width / 2, y: bbox.width / 2 },
  )
  const triangles = generateTriangles(points)
  triangles.forEach((triangleData) => {
    backgroundContainer
      .addChild(new Graphics())
      .poly(triangleData)
      //.stroke({ width: 1, color: "black" })
      .fill({ color: new Color({ h: 0, s: random.real(50, 100), v: random.real(50, 100) }) })
  })

  // TODO: Gradient with opacity
  // TODO: Composition
  // TODO: Generative palette
  // https://github.com/meodai
  container
    .addChild(new Graphics())
    .poly([
      { x: 0, y: bbox.height / 4 },
      { x: -bbox.width / 4, y: -bbox.height / 4 },
      { x: bbox.width / 4, y: -bbox.height / 4 },
    ])
    .fill({ color: "blue" })

  return { container }

  function generatePoints() {
    const points = []
    for (let i = 0; i < 100; i++) {
      points.push({ x: random.minmax(bbox.width / 2), y: random.minmax(bbox.height / 2) })
    }
    return points
  }

  function generateTriangles(points: PointData[]) {
    const delaunay = Delaunator.from(
      points,
      (p: PointData) => p.x,
      (p: PointData) => p.y,
    )
    const triangles: PointData[][] = []
    for (let i = 0; i < delaunay.triangles.length; i += 3) {
      triangles.push([
        points[delaunay.triangles[i]],
        points[delaunay.triangles[i + 1]],
        points[delaunay.triangles[i + 2]],
      ])
    }
    return triangles
  }
})
