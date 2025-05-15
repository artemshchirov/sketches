import { noise2d } from "library/core/random"
import { pixi } from "library/core/sketch"
import { drawBackground } from "library/drawing/helpers"
import { map } from "library/utils"
import { Container, Graphics } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const noise = noise2d(random)
  const hue = random.real(0, 360)
  const numWaves = random.integer(15, 25)
  const baseWaveAmp = bbox.height / numWaves // wave amplitude
  const container = new Container()
  container.addChild(drawBackground("black", bbox))

  for (let i = 0; i < numWaves; i++) {
    const yWave = bbox.height / 2 - (bbox.height * i) / numWaves
    const yNext = bbox.height / 2 - (bbox.height * (i + 1)) / numWaves
    const waveAmp = baseWaveAmp * random.real(0.8, 1.2)
    fillWave(yWave, yNext, i, waveAmp)
  }
  return { container }

  function fillWave(yWave: number, yNext: number, waveNum: number, waveAmp: number) {
    const skewAbs = random.real(Math.PI / 16, Math.PI / 4) // Skew factor absolute value
    const rectSize = random.real(10, 20)
    const [xStart, xStep, skew] = random.bool()
      ? [bbox.width / 2, -rectSize, skewAbs]
      : [-bbox.width / 2, rectSize, -skewAbs]

    let x = xStart
    let y = -bbox.height / 2
    let shouldOffset = true

    const noiseFactor = 0.001
    while (x >= -bbox.width / 2 - rectSize * 2 && x <= bbox.width / 2 + rectSize * 2) {
      const yStop = yWave - map(noise(x * noiseFactor, 1000 * waveNum), 0, 1, -waveAmp / 2, waveAmp / 2)
      const yNorm = 1 - (y - yStop) / (yNext - yStop) // Normalized y value relative to wave height
      const sat = map(noise(x * noiseFactor, y * noiseFactor), 0, 1, 50, 100)
      const val = map(Math.pow(yNorm, 3), 0, 1, 0, 100)
      const color = { h: hue, s: sat, v: val }

      if (val > 10) {
        const g = new Graphics().setFillStyle(color)
        g.position.set(x, y)
        g.skew.x = skew
        g.rect(rectSize / 2, rectSize / 2, rectSize, rectSize).fill()
        container.addChild(g)
      }

      y += rectSize / 2
      if (y >= yStop) {
        x += xStep
        y = shouldOffset ? -bbox.height / 2 + rectSize / 4 : -bbox.height / 2
        shouldOffset = !shouldOffset // Vary offset between adjacent columns
      }
    }
  }
})
