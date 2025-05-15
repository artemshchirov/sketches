import { Circle, circle, point } from "@flatten-js/core"
import { pixi } from "library/core/sketch"
import { gray } from "library/drawing/color"
import { drawBackground } from "library/drawing/helpers"
import { fromPolar, map } from "library/utils"
import { Container, Graphics, PointData } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const backgroundColor = random.real(0, 20)
  const minVal = (backgroundColor / 255) * 100
  const mainHue = random.real(0, 360)
  const secondHue = (mainHue + 180) % 360
  const container = new Container()
  container.addChild(drawBackground(gray(backgroundColor), bbox))

  const circles: Circle[] = []
  const minRadius = 10
  const maxRadius = 150
  const totalCircles = 1000
  const createCircleAttempts = 100

  for (let i = 0; i < totalCircles; i++) {
    createCircle()
  }
  return { container }

  function createCircle() {
    let newCircle: Circle | undefined
    let circleSafeToDraw = false
    for (let tries = 0; tries < createCircleAttempts; tries++) {
      const newCenter = point(random.minmax(bbox.width / 2), random.minmax(bbox.height / 2))
      newCircle = circle(newCenter, minRadius)
      if (isCircleCollides(newCircle)) {
        continue
      } else {
        circleSafeToDraw = true
        break
      }
    }

    if (!circleSafeToDraw || !newCircle) return
    for (let radius = minRadius; radius < maxRadius; radius++) {
      newCircle.r = radius
      if (isCircleCollides(newCircle)) {
        newCircle.r--
        break
      }
    }

    circles.push(newCircle)
    drawCircle(newCircle)
  }

  // Checks if circle intersects any other circles or bounding box
  function isCircleCollides(circle: Circle) {
    const { x, y } = circle.center
    // Check if any of the points on the circle lies outside bounding box
    if (x + circle.r >= bbox.width / 2 || x - circle.r <= -bbox.width / 2) return true
    if (y + circle.r >= bbox.height / 2 || y - circle.r <= -bbox.height / 2) return true
    // Check intersections with other circles
    for (const otherCircle of circles) {
      if (circle.r + otherCircle.r >= circle.center.distanceTo(otherCircle.center)[0]) return true
    }
    return false
  }

  // Draw a circle as a multiple layers of polygons
  function drawCircle(circle: Circle) {
    const noiseAmp = random.real(3, Math.min(minRadius, circle.r)) // Noise amplitude for displacing vertices of a layer
    const thetaStep = random.real(0.1, 0.5)
    const hue = random.bool() ? mainHue : secondHue
    const radius = circle.r - noiseAmp / 2
    for (let i = radius; i > 0; i -= noiseAmp / 2) {
      const val = map(i, radius, 0, minVal, 100)
      const sat = i == radius ? 0 : map(i, radius, 0, 100, 20)
      const graphics = container.addChild(new Graphics()).setFillStyle({ h: hue, s: sat, v: val })

      const points: PointData[] = []
      for (let theta = 0; theta < 2 * Math.PI; theta += thetaStep) {
        const r = i + random.minmax(0.2) * noiseAmp
        const vertex = fromPolar(r, theta)
        points.push(circle.center.translate(vertex.x, vertex.y))
      }
      graphics.poly(points).fill()
    }
  }
})
