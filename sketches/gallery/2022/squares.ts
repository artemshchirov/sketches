import { Line, line, point, vector } from "@flatten-js/core"
import { noise3d } from "library/core/random"
import { pixi } from "library/core/sketch"
import { gray } from "library/drawing/color"
import { drawBackground } from "library/drawing/helpers"
import { map } from "library/utils"
import { Container, Graphics } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const noise = noise3d(random)
  const mainHue = random.realZeroTo(360)
  const baseRadius = 35 // base rectangle size
  const radiusDiv = 20 // Rectangle size divergence
  const numRectangles = 10000 // How many rectangles to draw

  const lines: Line[] = []
  for (let i = 0; i < 7; i++) {
    const x = random.minmax(bbox.width / 2)
    const y = random.minmax(bbox.height / 2)
    const theta = random.realZeroTo(Math.PI * 2)
    const lineNormal = vector(0, 1).rotate(theta)
    lines.push(line(point(x, y), lineNormal))
  }

  const container = new Container()
  container.addChild(drawBackground("white", bbox))

  for (let i = 0; i < numRectangles; i++) {
    const graphics = new Graphics()

    // Calculate rectangle position and size
    const [centerX, centerY] = [bbox.width, bbox.height].map((n) => random.normal(0, n) / 4)
    const center = point(centerX, centerY)
    const distancesToLines = lines.map((line) => center.distanceTo(line)[0])
    const closest = Math.min(...distancesToLines)
    const radiusFactor = Math.exp(-closest / 75)
    const radius = baseRadius * radiusFactor
    const [width, height] = [random.real(radius, radius + radiusDiv), random.real(radius, radius + radiusDiv)]

    // Calculate stroke and opacity
    const alpha = map(radiusFactor, 1, 0, 255, 150) / 255
    const strokeColor = map(radiusFactor, 0, 1, 100, 50)
    const strokeThickness = map(radiusFactor * radiusFactor, 0, 1, 0, 2)
    graphics.setStrokeStyle({ width: strokeThickness, color: gray(strokeColor) })

    // Calculate fill color
    const hueNoiseFactor = 0.05
    const n = noise(centerX * hueNoiseFactor, centerY * hueNoiseFactor, 0)
    const hue = Math.abs(n) > 0.5 ? mainHue : (mainHue + 180) % 360
    const sat = map(radiusFactor, 0, 1, 50, 0)
    const val = map(radiusFactor, 0, 1, 90, 100)
    graphics.setFillStyle({ h: hue, s: sat, v: val })

    // Calculate skew
    const skewNoiseFactor = 0.01
    const n1 = noise(centerX * skewNoiseFactor, centerY * skewNoiseFactor, 1000)
    const n2 = noise(centerX * skewNoiseFactor, centerY * skewNoiseFactor, 2000)
    const [skewX, skewY] = [n1, n2].map((n) => map(n, -1, 1, -Math.PI / 4, Math.PI / 4) * (1 - radiusFactor))
    graphics.skew = { x: skewX, y: skewY }

    graphics
      .rect(width / 2, height / 2, width, height)
      .fill()
      .stroke()
    graphics.position = { x: centerX, y: centerY }
    graphics.alpha = alpha
    container.addChild(graphics)
  }

  return { container }
})
