import { noise2d } from "library/core/random"
import { pixi } from "library/core/sketch"
import { drawBackground } from "library/drawing/helpers"
import { fromPolar, map } from "library/utils"
import { ColorSource, Container, Graphics } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const noise = noise2d(random)
  const palette: ColorSource[] = ["#2E294E", "#541388", "#F1E9DA", "#FFD400", "#D90368"]
  random.shuffle(palette)
  const bgColor = palette.shift()!
  const rOuter = random.real(100, 150)
  const innerLayerScale = random.real(0.5, Math.SQRT2 / 2)
  const innerRadiusFactor = random.real(0.3 * innerLayerScale, 0.7 * innerLayerScale)

  const container = new Container()
  container.rotation = random.real(0, Math.PI / 4)
  container.position.set(random.real(0, rOuter), random.real(0, rOuter))
  container.addChild(drawBackground(bgColor, bbox))

  let xOffset = 0,
    colorIndex = 0
  for (let y = -bbox.height * 2; y <= bbox.height * 2; y += rOuter) {
    for (let x = -bbox.width * 2; x <= bbox.width * 2; x += rOuter * 2) {
      const color = palette[colorIndex]
      container.addChild(drawStar(x + xOffset, y, rOuter, color))
      colorIndex = (colorIndex + 1) % palette.length
    }
    xOffset = xOffset == 0 ? rOuter : 0
  }

  return { container }

  function drawStar(x: number, y: number, rOuter: number, color: ColorSource) {
    const n = noise(x, y)
    const rotation = Math.PI / 4 + map(n, 0, 1, -Math.PI / 16, Math.PI / 16)
    const starContainer = new Container()
    starContainer.position.set(x, y)
    const outerLayer = drawStarLayer(rOuter, rOuter * innerRadiusFactor, color)
    const innerLayer = drawStarLayer(rOuter, rOuter * (innerRadiusFactor + 0.1), color)
    innerLayer.rotation = rotation
    innerLayer.scale.set(innerLayerScale)
    starContainer.addChild(innerLayer, outerLayer)
    return starContainer
  }

  function drawStarLayer(rOuter: number, rInner: number, color: ColorSource) {
    const g = new Graphics()
    for (let i = 0; i < 4; i++) {
      const theta = (i * Math.PI) / 2
      const centerVertex = { x: 0, y: 0 }
      const outerVertex = fromPolar(rOuter, theta)
      const innerVertex = (isColor: boolean) => {
        const rotation = isColor ? Math.PI / 4 : -Math.PI / 4
        return fromPolar(rInner, theta + rotation)
      }
      g.poly([centerVertex, outerVertex, innerVertex(true)])
        .fill(color)
        .poly([centerVertex, outerVertex, innerVertex(false)])
        .fill("white")
    }
    return g
  }
})
