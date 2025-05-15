import { noise2d } from "library/core/random"
import { pixi } from "library/core/sketch"
import { drawBackground } from "library/drawing/helpers"
import { map } from "library/utils"
import { Container, Graphics, PointData } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const container = new Container()
  container.addChild(drawBackground("white", bbox))
  const noise = noise2d(random)

  const noiseScale = 0.1
  const flowFieldGridResolution = 100
  const flowFieldCellWidth = bbox.width / flowFieldGridResolution
  const flowFieldCellHeight = bbox.height / flowFieldGridResolution
  const flowField = initializeFlowField()
  const flowFieldContainer = visualizeFlowField(flowField)
  flowFieldContainer.position.set(-bbox.width / 2, -bbox.height / 2)
  //container.addChild(flowFieldContainer)

  // TODO: Aesthetic fixes
  // https://www.youtube.com/watch?v=BjoM9oKOAKY
  const particles = new Array(1000)
    .fill(0)
    .map(() => ({ x: random.minmax(bbox.width / 2), y: random.minmax(bbox.height / 2) }))
  const particleDrawer = container.addChild(new Graphics())

  return { container, update }

  function update(_: number, deltaTime: number) {
    for (const particle of particles) {
      particleDrawer.moveTo(particle.x, particle.y)
      const vector = sampleFlowField(particle)
      if (vector === undefined) continue
      //const vector = { x: 1, y: 0 }
      particle.x += vector.x * 100 * deltaTime
      particle.y += vector.y * 100 * deltaTime
      particleDrawer.lineTo(particle.x, particle.y).stroke({ width: 2, color: "black", join: "round" })
    }
  }

  // TODO: Update with time
  function initializeFlowField() {
    const flowField = new Array<PointData>(flowFieldGridResolution * flowFieldGridResolution)
    for (let i = 0; i < flowFieldGridResolution; i++) {
      for (let j = 0; j < flowFieldGridResolution; j++) {
        const index = i + j * flowFieldGridResolution
        const angle = map(noise(i * noiseScale, j * noiseScale), -1, 1, 0, Math.PI * 2)
        flowField[index] = { x: Math.cos(angle), y: Math.sin(angle) }
      }
    }
    return flowField
  }

  function sampleFlowField(at: PointData): PointData {
    const i = Math.floor(map(at.x, -bbox.width / 2, bbox.width / 2, 0, flowFieldGridResolution))
    const j = Math.floor(map(at.y, -bbox.height / 2, bbox.height / 2, 0, flowFieldGridResolution))
    const index = i + j * flowFieldGridResolution
    return flowField[index]
  }

  function visualizeFlowField(flowField: PointData[]) {
    const flowFieldContainer = new Container()
    for (let i = 0; i < flowFieldGridResolution; i++) {
      for (let j = 0; j < flowFieldGridResolution; j++) {
        const index = i + j * flowFieldGridResolution
        const cellCenterX = (i + 0.5) * flowFieldCellWidth
        const cellCenterY = (j + 0.5) * flowFieldCellHeight
        const { x, y } = flowField[index]
        const vectorWidth = flowFieldCellWidth * 0.5
        const vectorHeight = flowFieldCellHeight * 0.5
        flowFieldContainer
          .addChild(new Graphics())
          .moveTo(cellCenterX - x * vectorWidth * 0.5, cellCenterY - y * vectorHeight * 0.5)
          .lineTo(cellCenterX + x * vectorWidth * 0.5, cellCenterY + y * vectorHeight * 0.5)
          .stroke({ width: 1, color: "black" })
          .circle(cellCenterX + x * vectorWidth * 0.5, cellCenterY + y * vectorHeight * 0.5, 2)
          .fill({ color: "black" })
      }
    }
    return flowFieldContainer
  }
})
