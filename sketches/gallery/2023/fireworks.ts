import { point, ray, vector } from "@flatten-js/core"
import { noise2d } from "library/core/random"
import { pixi } from "library/core/sketch"
import { formatHsl } from "library/drawing/color"
import { drawCanvas } from "library/drawing/helpers"
import { fromPolar, map } from "library/utils"
import { BlurFilter, Container, Graphics, NoiseFilter } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const noise = noise2d(random)
  const container = new Container()
  container.addChild(drawBackground(), drawStars())

  const baseTheta = random.realZeroTo(2 * Math.PI) // Polar angle for the first vortex
  const mainHue = random.realZeroTo(360)
  const numVortices = 3
  const hypotenuse = Math.hypot(bbox.width / 2, bbox.height / 2)
  for (let i = 0; i < numVortices; i++) {
    const hue = mainHue + random.real(-30, 30)
    const r = random.real(hypotenuse / 4, hypotenuse / 2)
    const theta = (2 * Math.PI * i) / numVortices + baseTheta
    const { x, y } = fromPolar(r, theta)
    container.addChild(drawVortex(hue)).position.set(x, y)
  }
  return { container }

  // Vortex simulation using Rankine vortex model
  // https://en.wikipedia.org/wiki/Rankine_vortex
  function drawVortex(hue: number) {
    const particleCount = 300
    const thetaStep = 0.005 // Increment step for polar angle theta
    const maxRadius = random.real(300, 500) // Outer radius of a vortex
    const minRadius = random.real(20, 50) // Inner radius of a vortex
    const gamma = random.real(4, 8) // Circulation strength of a Rankine vortex
    const c = new Container()

    const sat = random.real(0.25, 1)
    const bri = random.real(0.4, 0.6)
    const briPeriod = (maxRadius - minRadius) * random.real(0.25, 0.5) // Period of sine wave modulating brightness change

    for (let i = 0; i < particleCount; i++) {
      const trailLength = random.real(75, 150)
      const g = c.addChild(new Graphics())
      // Particle's current polar coordinates
      let r = map(random.realZeroToOneInclusive(), 0, 1, minRadius, maxRadius)
      let theta = random.real(0, 2 * Math.PI)

      for (let j = 0; j < trailLength; j++) {
        const rotationalVelocity = (gamma / (2 * Math.PI)) * (r <= maxRadius ? r / Math.pow(maxRadius, 2) : 1 / r)
        const rStep = rotationalVelocity / thetaStep

        const { x: x0, y: y0 } = fromPolar(r, theta)
        const { x: x1, y: y1 } = fromPolar(r + rStep, theta - thetaStep)

        const width = (2 + noise(i * 100, j) + j / trailLength) * 2
        const alpha = j / (trailLength * 2) + 0.5

        // Convert particle's radius vector to a sine wave phase value
        const briTheta = map((r - minRadius) % briPeriod, 0, briPeriod, 0, 2 * Math.PI)
        // Use it to modulate brightness with offset in [-0.25, 0.25]
        const briOffset = Math.sin(briTheta) / 4
        const color = formatHsl([hue, sat, bri + briOffset])
        // TODO: Rewrite to Mesh and drawSegments
        g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width, color, alpha })

        theta += thetaStep
        r -= rStep
      }
    }
    return c
  }

  function drawBackground() {
    const backgroundContainer = new Container()
    backgroundContainer.addChild(
      drawCanvas((ctx) => {
        // Background is a linear gradient starting in one of the corners or in one of the 4 "directions" (north, east, south, west)
        // Since all of these points can be viewed from the center with 45 degrees rotation steps,
        // it's easier to start with polar coordinates
        const thetaStart = (Math.PI / 4) * random.integer(0, 7)
        const thetaEnd = thetaStart + Math.PI
        // Shoot rays from center with a specified rotation and find their intersections with bbox
        const rayStart = ray(point(0, 0), vector(0, 1).rotate(thetaStart))
        const rayEnd = ray(point(0, 0), vector(0, 1).rotate(thetaEnd))
        const ptStart = rayStart.intersect(bbox)[0]
        const ptEnd = rayEnd.intersect(bbox)[0]
        const [x0, y0, x1, y1] = [ptStart.x, ptStart.y, ptEnd.x, ptEnd.y]

        const gradient = ctx.createLinearGradient(
          x0 + bbox.width / 2,
          -y0 + bbox.height / 2,
          x1 + bbox.width / 2,
          -y1 + bbox.height / 2,
        )
        const startColor = random.real(0, 10)
        const endColor = random.real(30, 40)
        gradient.addColorStop(0, `rgb(${startColor} ${startColor} ${startColor})`)
        gradient.addColorStop(1, `rgb(${endColor} ${endColor} ${endColor})`)
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, bbox.width, bbox.height)
      }, bbox),
    )
    backgroundContainer.filters = [
      new NoiseFilter({ noise: random.real(0.125, 0.25), seed: random.realZeroToOneExclusive() }),
    ]
    return backgroundContainer
  }

  function drawStars() {
    const container = new Container()
    const numStars = random.real(200, 300)
    for (let i = 0; i < numStars; i++) {
      container
        .addChild(new Graphics())
        .circle(0, 0, random.real(2, 4))
        .fill({ color: "white", alpha: random.real(0.5, 1) })
        .position.set(random.minmax(bbox.width / 2), random.minmax(bbox.height / 2))
    }
    container.filters = [new BlurFilter({ strength: 1, quality: 1 })]
    return container
  }
})
