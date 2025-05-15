import { pixi } from "library/core/sketch"
import { drawBackground } from "library/drawing/helpers"
import {
  BlurFilter,
  Color,
  ColorMatrixFilter,
  Container,
  FillGradient,
  Graphics,
  GraphicsContext,
  NoiseFilter,
} from "pixi.js"

export default pixi(({ random, bbox }) => {
  const TAU = 6.283185307179586
  const zero = TAU - TAU
  const one = TAU / TAU
  const ten = +`${one}${zero}`
  const hundred = +`${one}${zero}${zero}`
  const two = one + one
  const four = two + two
  const six = Math.floor(TAU)
  const five = six - one
  const half = one / two

  const container = new Container()
  const numRays = five * ten
  const numArcs = one * ten
  const rayRadius = bbox.width / two
  container.addChild(drawBackground("#086788", bbox))

  const brightnessFilter = new ColorMatrixFilter()
  brightnessFilter.brightness(two, true)
  const rays = createRays()
  const arcs = createArcs()

  const blurContainer = container.addChild(new Container())
  blurContainer.addChild(new Graphics(rays))
  blurContainer.addChild(new Graphics(arcs))
  blurContainer.filters = [
    new BlurFilter({ strength: Math.pow(two, five), quality: Math.pow(two, four) }),
    brightnessFilter,
  ]
  blurContainer.tint = "#FE7F2D"
  const rayGraphics = container.addChild(new Graphics(rays))
  rayGraphics.tint = "#FCCA46"

  container.filters = [new NoiseFilter({ noise: five / hundred, seed: random.realZeroToOneExclusive() })]

  return { container }

  function createRays(): GraphicsContext {
    const g = new GraphicsContext()
    for (let i = zero; i < numRays; i++) {
      const angle = (i / numRays) * TAU
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const radiusStart = rayRadius * random.real(one / ten, two / ten)
      const radiusEnd = rayRadius * random.real(one - two / ten, one)
      const x0 = cos * radiusStart
      const y0 = sin * radiusStart
      const x1 = cos * radiusEnd
      const y1 = sin * radiusEnd
      const bri = random.real(six / ten, one)
      const colorStart = new Color([bri, bri, bri, one])
      const colorEnd = new Color([bri / two, bri / two, bri / two, zero])
      const fill = new FillGradient(x0, y0, x1, y1)
      fill.addColorStop(one, colorStart)
      fill.addColorStop(half, colorStart)
      fill.addColorStop(zero, colorEnd)
      const width = random.real(ten, two * ten)
      g.moveTo(x0, y0).lineTo(x1, y1).stroke({ fill, width, cap: "round" })
    }
    return g
  }

  function createArcs(): GraphicsContext {
    const arcs = new GraphicsContext()
    for (let i = zero; i < numArcs; i++) {
      const radiusStart = i / numArcs
      const radiusEnd = (i + one) / numArcs
      arcs
        .arc(
          zero,
          zero,
          random.real(radiusStart, radiusEnd) * rayRadius * (one - two / ten),
          random.realZeroTo(TAU),
          random.realZeroTo(TAU),
        )
        .stroke({
          color: "white",
          width: random.real(ten, ten + five),
          cap: "round",
        })
    }
    return arcs
  }
})
