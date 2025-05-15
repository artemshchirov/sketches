import { Box, box } from "@flatten-js/core"
import { pixi } from "library/core/sketch"
import { drawBackground } from "library/drawing/helpers"
import { map } from "library/utils"
import { Color, Container, PointData, Sprite, Texture } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const container = new Container()
  container.addChild(drawBackground("black", bbox))
  const color = new Color(random.color())

  const particleCount = 1e5

  let found = false
  let points: PointData[] = []
  let maxX = 0,
    minX = 0,
    maxY = 0,
    minY = 0
  while (!found) {
    // random starting point
    let x = random.minmax(0.5),
      y = random.minmax(0.5)

    // random alternative point nearby (for calculating Lyapunov exponent)
    let xe = x + random.minmax(0.5) / 1000
    let ye = y + random.minmax(0.5) / 1000

    // distance between the two points
    const d0 = Math.hypot(xe - x, ye - y)

    const attractor = createAttractor()

    // list to store point
    points = []
    points.push({ x, y })

    // point bounds
    maxX = -1e32
    minX = 1e32
    maxY = -1e32
    minY = 1e32

    let converging = false
    let lyapunov = 0

    let minDx = 10,
      minDy = 10
    for (let i = 0; i < particleCount; i++) {
      const { x: newX, y: newY } = attractor({ x, y })

      // update the bounds
      maxX = Math.max(newX, maxX)
      minX = Math.min(newX, minX)
      maxY = Math.max(newY, maxY)
      minY = Math.min(newY, minY)

      // check if we converge to infinity
      if (Math.abs(newX) > 1e5 || Math.abs(newY) > 1e5) {
        converging = true
        break
      }

      // check if we converge to single point
      const dx = Math.abs(x - newX)
      const dy = Math.abs(y - newY)
      minDx = Math.min(minDx, dx)
      minDy = Math.min(minDy, dy)
      if (dx < 1e-5 || dy < 1e-5) {
        converging = true
        break
      }

      // check for chaotic behavior (skip first 1000 iterations to let system stabilize)
      if (i > 1000) {
        const { x: newXe, y: newYe } = attractor({ x: xe, y: ye })
        const dx = newXe - newX
        const dy = newYe - newY
        const d = Math.hypot(dx, dy)

        // lyapunov exponent
        lyapunov += Math.log(Math.abs(d / d0))

        // rescale alternative point
        xe = newX + (d0 * dx) / d
        ye = newY + (d0 * dy) / d
      }

      // update points
      x = newX
      y = newY
      points.push({ x, y })
    }

    if (!converging && lyapunov / particleCount > 0.1 && minDx < 1e-3 && minDy < 1e-3) {
      found = true
    }
  }

  container.addChild(plot(points, box(minX, minY, maxX, maxY)))
  return { container }

  function createAttractor() {
    if (random.bool()) {
      // Clifford attractor
      const [a, b, c, d] = Array.from({ length: 4 }).map(() => random.minmax(2))
      return (point: PointData) => {
        const { x, y } = point
        const newX = Math.sin(a * y) + c * Math.cos(a * x)
        const newY = Math.sin(b * x) + d * Math.cos(b * y)
        return { x: newX, y: newY }
      }
    } else {
      // Quadratic map
      const coefs = Array.from({ length: 12 }).map(() => random.minmax(2))
      return (point: PointData) => {
        const { x, y } = point
        const newX = coefs[0] + coefs[1] * x + coefs[2] * x * x + coefs[3] * x * y + coefs[4] * y + coefs[5] * y * y
        const newY = coefs[6] + coefs[7] * x + coefs[8] * x * x + coefs[9] * x * y + coefs[10] * y + coefs[11] * y * y
        return { x: newX, y: newY }
      }
    }
  }

  function plot(points: PointData[], box: Box) {
    let maxDistance = 0
    const distances = []
    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      distances[i] = i == 0 ? 0 : Math.hypot(point.x - points[i - 1].x, point.y - points[i - 1].y)
      maxDistance = Math.max(distances[i], maxDistance)
    }
    const particleContainer = new Container({ isRenderGroup: true })
    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      const particle = new Sprite(Texture.WHITE)
      particle.anchor.set(0.5)
      const x = map(point.x, box.xmin, box.xmax, bbox.xmin, bbox.xmax)
      const y = map(point.y, box.ymin, box.ymax, bbox.ymin, bbox.ymax)
      particle.position.set(x, y)
      particle.alpha = map(distances[i], 0, maxDistance, 1, 0.5)
      particleContainer.addChild(particle)
    }
    particleContainer.tint = color
    return particleContainer
  }
})
