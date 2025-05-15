import { line, point, Segment, segment, vector } from "@flatten-js/core"
import { pixi } from "library/core/sketch"
import { formatHsl } from "library/drawing/color"
import { FXAAFilter, NoiseAlphaFilter } from "library/drawing/filters"
import { drawBackground } from "library/drawing/helpers"
import { renderLines } from "library/drawing/meshes"
import { ShaderProgram } from "library/drawing/shaders"
import { glNoise2d } from "library/glsl"
import { map } from "library/utils"
import { Container, NoiseFilter, Rectangle } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const mainHue = random.realZeroTo(360)
  const bgColor = formatHsl([mainHue, random.real(0.2, 0.3), random.real(0.8, 0.9)])
  const numLayers = random.integer(2, 4)
  const startingRotation = random.realZeroTo(Math.PI * 2)
  // Fragment shader to add variability to line segments. It varies line width, offset and alpha based on noise values
  const lineShader: ShaderProgram = {
    preamble: /*glsl*/ `
      ${glNoise2d}
      const float widthNoiseScale = 10.0;
      const float offsetNoiseScale = 100.0;
      const float alphaNoiseScale = 1000.0;
    `,
    main: /*glsl*/ `
      vec2 noisePoint = vec2(vPosition.x, instanceId);      
      float width = snoise(noisePoint * widthNoiseScale) * .25 + .5; // [0.25, 0.75]
      float offset = snoise(noisePoint * offsetNoiseScale) * .25; // [-0.25, 0.25]
      float alphaFactor = abs(snoise(noisePoint * alphaNoiseScale)) * .4 + .6; // [0.6, 1]
      float y = vPosition.y * 2.; // [-1, 1]
      float alpha = (1. - step(width, abs(y-offset))) * alphaFactor; 
      fragColor *= alpha;
    `,
  }

  const container = new Container()
  container.addChild(drawBackground(bgColor, bbox))
  for (let i = 1; i <= numLayers; i++) {
    container.addChild(drawLayer(i))
  }
  container.filters = [
    new NoiseFilter({ noise: random.real(0.1, 0.2), seed: random.realZeroToOneInclusive() }),
    new FXAAFilter(),
  ]
  return { container }

  function drawLayer(layerNum: number) {
    const container = new Container()
    const rotation = startingRotation + layerNum * ((Math.PI / numLayers) * random.real(0.8, 1.2))
    const noiseScale = random.real(2, 10)
    const lineSpacing = map(noiseScale, 1, 10, 10, 5)

    const lines = drawLines(rotation % Math.PI, lineSpacing)
    container.addChild(lines)
    container.filterArea = new Rectangle(bbox.xmin, bbox.ymin, bbox.width, bbox.height)
    container.filters = [new NoiseAlphaFilter(noiseScale, random)]
    return container
  }

  function drawLines(rotation: number, lineSpacing: number) {
    const lineWidth = (lineSpacing * 2) / 3
    const lineNormal = vector(0, 1).rotate(rotation) // Normal vector to line
    const lineEq = line(point(0, 0), lineNormal) // Equation of a line passing through point (0, 0) with a normal vector

    const sat = random.real(0.5, 1)
    const bri = random.real(0.1, 0.3)
    const lineColor = formatHsl([(mainHue + 180) % 360, sat, bri])

    const segments: Segment[] = []
    let factor = 0
    for (;;) {
      const translateVector = lineNormal.multiply(lineSpacing * factor)
      const lineEqOffset = lineEq.translate(translateVector)
      const [pt0, pt1] = lineEqOffset.intersect(bbox)
      // If we don't have two intersection points it means that we translated line outside of bounding box, finishing loop
      if (pt1 == undefined) break

      const lineSegment = segment(pt0, pt1)
      segments.push(lineSegment)

      // To generate lines above and below center point we iterate factor in sequence 0, 1, -1, 2, -2, 3, -3, ...
      if (factor > 0) factor = -factor
      else factor = -factor + 1
    }

    return renderLines(segments, lineWidth, lineColor, lineShader)
  }
})
