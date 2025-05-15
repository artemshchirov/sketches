import { box, vector } from "@flatten-js/core"
import { formatCss } from "culori"
import { pixi } from "library/core/sketch"
import { FXAAFilter } from "library/drawing/filters"
import { drawCanvas } from "library/drawing/helpers"
import { Color, Container, Graphics } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const gradientCenter = vector(random.minmax(bbox.width * 0.4), random.minmax(bbox.height * 0.4))
  const gradientRotation = Math.atan2(gradientCenter.y, gradientCenter.x) + random.minmax(Math.PI / 8)
  const palette = [random.color(), random.color(), random.color()]
  const paletteCss = palette.map((color) => formatCss(new Color(color).toHex())!)

  const container = new Container()
  container.addChild(drawBackground(), drawRays(), drawCircle())
  container.filters = [new FXAAFilter()]

  return { container }

  function drawBackground() {
    return drawCanvas((ctx) => {
      const gradient = ctx.createConicGradient(
        -gradientRotation + Math.PI,
        bbox.width / 2 + gradientCenter.x,
        bbox.height / 2 - gradientCenter.y,
      )
      gradient.addColorStop(0, paletteCss[0])
      gradient.addColorStop(random.real(0.3, 0.7), paletteCss[1])
      gradient.addColorStop(1, paletteCss[1])
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, bbox.width, bbox.height)
    }, bbox)
  }

  function drawRays() {
    const triangleHeight = Math.hypot(bbox.width, bbox.height)
    const rotationStep = 0.25
    const triangleContainer = new Container()
    triangleContainer.position.set(gradientCenter.x, gradientCenter.y)

    let rotation = 0
    while (rotation < 2 * Math.PI - rotationStep) {
      const rayRotation = rotation + gradientRotation
      const rayAngle = random.real(0.04, 0.08)
      const triangleHalfBase = triangleHeight * Math.tan(rayAngle / 2)

      const triangleGraphics = triangleContainer
        .addChild(new Graphics())
        .poly(
          [vector(0, 0), vector(-triangleHeight, triangleHalfBase), vector(-triangleHeight, -triangleHalfBase)],
          false,
        )
        .fill("white")

      triangleGraphics.rotation = rayRotation
      triangleGraphics.tint = new Array(3).fill(random.bool() ? random.realZeroTo(0.2) : 1 - random.realZeroTo(0.2))

      rotation += random.real(1, 1.2) * rotationStep
    }
    return triangleContainer
  }

  function drawCircle() {
    const radius = random.real(50, 75)
    const circleBbox = box(0, 0, radius * 2, radius * 2)
    const sprite = drawCanvas((ctx) => {
      const gradient = ctx.createLinearGradient(radius, 0, radius, radius * 2)
      gradient.addColorStop(0, paletteCss[0])
      gradient.addColorStop(1, paletteCss[1])
      ctx.fillStyle = gradient

      ctx.beginPath()
      ctx.ellipse(radius, radius, radius, radius, 0, 0, 2 * Math.PI)
      ctx.fill()
    }, circleBbox)
    sprite.position.set(gradientCenter.x, gradientCenter.y)
    return sprite
  }
})
