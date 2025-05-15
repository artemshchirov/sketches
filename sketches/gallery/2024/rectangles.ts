import { pixi } from "library/core/sketch"
import { drawBackground } from "library/drawing/helpers"
import { rectanglePacking } from "library/geometry/packing"
import { Container, Graphics, NoiseFilter } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const container = new Container()
  container.addChild(drawBackground("white", bbox))

  const mainHue = random.realZeroTo(360)
  const paletteSize = 2 // TODO: Palette generation
  const sAndVBands = paletteSize + 1
  const minV = 20
  const minS = 20
  const holeProbability = 0.2

  const gridFactor = random.real(0.015, 0.025)
  const packing = rectanglePacking(bbox, gridFactor, random)
  // TODO: Add soft body physics deform
  for (const rect of packing) {
    const g = container
      .addChild(new Graphics())
      .rect(rect.xmin, rect.ymin, rect.width, rect.height)
      // TODO: Gradient fill
      .fill({
        color: {
          h: (mainHue + (360 / paletteSize) * random.integer(0, paletteSize - 1) + random.minmax(10)) % 360,
          s: ((100 - minS) / sAndVBands) * random.integer(0, sAndVBands) + minS,
          v: random.bool(holeProbability) ? 0 : ((100 - minV) / sAndVBands) * random.integer(0, sAndVBands) + minV,
        },
      })

    if (random.bool()) g.stroke({ color: "black", width: random.real(1, 5), alpha: random.real(0.5, 1) })
  }
  // TODO: Texture
  container.filters = [new NoiseFilter({ seed: random.realZeroToOneInclusive(), noise: random.real(0.1, 0.3) })]

  return { container }
})
