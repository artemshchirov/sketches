import { pixi } from "library/core/sketch"
import { gray } from "library/drawing/color"
import { FXAAFilter } from "library/drawing/filters"
import { drawBackground } from "library/drawing/helpers"
import { map } from "library/utils"
import { BlurFilter, Container, Graphics } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const isDarkBackground = random.bool()
  const container = new Container()
  container.addChild(drawBackground(gray(isDarkBackground ? 20 : 240), bbox))
  container.filters = [new FXAAFilter(), new BlurFilter({ strength: 1, quality: 2 })]

  // Lissajous curves parameters
  // x(t) = A*sin(a*t + delta)
  // y(t) = B*sin(b*t)
  const tStep = 0.0003 // Increment step for a curve argument
  const a = random.integer(1, 10) * 2 - 1
  const b = random.integer(1, 10) * 2
  const delta = random.minmax(Math.PI / 2)
  const margin = 20
  const A = bbox.width / 2 - margin
  const B = bbox.height / 2 - margin
  const curvePeriod = (2 * Math.PI) / gcd(a, b)

  const g = new Graphics()
  let t = 0
  let alphaStep = random.real(2, 10) // Increment step for curve segment's opacity
  let alpha = 0
  while (t < curvePeriod) {
    const x = A * Math.sin(a * t + delta)
    const y = B * Math.sin(b * t)
    const radius = map(alpha, 0, 255, 1, 5)
    const color = gray(isDarkBackground ? alpha : 255 - alpha)
    g.circle(x, y, radius).fill({ color, alpha: alpha / 255 })
    t += tStep
    alpha += alphaStep
    if (alpha > 255) {
      alpha = 0
      alphaStep = random.real(2, 10)
      t += tStep * random.real(30, 60) // Spacing between curve segments
    }
  }

  container.addChild(g)
  return { container }

  // Euclid's algorithm for greatest common divisor
  function gcd(x: number, y: number): number {
    while (y) {
      const t = y
      y = x % y
      x = t
    }
    return x
  }
})
