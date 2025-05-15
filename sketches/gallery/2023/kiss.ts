import { noise2d } from "library/core/random"
import { pixi } from "library/core/sketch"
import { drawBackground } from "library/drawing/helpers"
import { fromPolar, map } from "library/utils"
import { BlurFilter, Container, Graphics, PointData } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const noise = noise2d(random)
  // Define lip functions
  const lip = (a: number, b: number, sign: boolean) => (x: number) =>
    Math.sqrt(a / Math.exp(Math.pow(x * x - b, 2))) * (sign ? 1 : -1)
  const upper = lip(random.real(0.5, 1), random.real(0.5, 1), true)
  const lower = lip(random.real(0.5, 1), random.real(0, 0.5), false)
  const xBound = 2 // lip function defined in range [-xBound, xBound]
  const scaleFactor = (bbox.width * 0.5) / xBound
  const mainHue = random.realZeroTo(360)

  const container = new Container()
  container.angle = random.real(-15, 15)
  container.addChild(background(), polygons())
  return { container }

  function background() {
    const backHue = ((mainHue + 180) % 360) + random.real(-20, 20)
    const backColor = { h: backHue, s: random.real(10, 30), v: random.real(70, 90) }
    const backContainer = new Container()
    backContainer.addChild(drawBackground(backColor, bbox))

    const bboxDiagonal = Math.hypot(bbox.width, bbox.height)
    const numPolygons = 20
    for (let i = 0; i < numPolygons; i++) {
      const { x, y, radius, color, numVertices } =
        i < numPolygons / 2
          ? {
              x: random.real(-bbox.width / 4, bbox.width / 4),
              y: random.real(-bbox.height / 4, bbox.height / 4),
              radius: random.real(bboxDiagonal * 0.25, bboxDiagonal * 0.5),
              color: { h: backHue, s: random.real(10, 30), v: random.real(70, 90), a: random.real(0.3, 0.7) },
              numVertices: random.integer(5, 15),
            }
          : {
              x: random.real(bbox.width / 4, bbox.width / 2) * random.sign(),
              y: random.real(bbox.height / 4, bbox.height / 2) * random.sign(),
              radius: random.real(bboxDiagonal * 0.1, bboxDiagonal * 0.2),
              color: { h: backHue, s: random.real(30, 50), v: random.real(50, 70), a: random.real(0.1, 0.3) },
              numVertices: random.integer(15, 25),
            }
      backContainer.addChild(new Graphics()).poly(randomPolygon(numVertices, radius)).fill(color).position.set(x, y)
    }
    return backContainer
  }

  function polygons() {
    const polygons = new Container()
    const numPolygons = 2000
    for (let i = 0; i < numPolygons; i++) {
      // Generate point between lip curves
      const [x, y] = [random.real(-xBound, xBound), random.real(-xBound / 2, xBound / 2)]
      if (y > upper(x) || y < lower(x)) {
        // If point outside curves - retry
        i--
        continue
      }
      const yNorm = y / (y > 0 ? upper(x) : lower(x))
      const n = noise(x, y)
      const center = { x: x * scaleFactor, y: y * scaleFactor }
      const radius = map(Math.pow(yNorm, 1 / 3), 0, 1, 30, 40)
      const color = {
        h: mainHue + random.minmax(10),
        s: map(n, -1, 1, 85, 100),
        v: map(Math.abs(yNorm - 0.5) * 2, 0, 1, 100, 50),
        a: random.real(0.5, 1),
      }
      const numVertices = random.integer(3, 9)
      polygons
        .addChild(new Graphics())
        .poly(randomPolygon(numVertices, radius))
        .fill(color)
        .position.set(center.x, center.y)
    }
    polygons.filters = [new BlurFilter({ strength: 1, quality: 2 })]
    return polygons
  }

  function randomPolygon(numVertices: number, radius: number): PointData[] {
    // Define vertices as random points on a circle with a specified radius
    const thetas = Array.from({ length: numVertices }, (_) => random.real(0, 2 * Math.PI)).sort()
    return thetas.map((theta) => fromPolar(radius, theta))
  }
})
