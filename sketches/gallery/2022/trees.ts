import { noise2d } from "library/core/random"
import { pixi } from "library/core/sketch"
import { gray } from "library/drawing/color"
import { drawBackground } from "library/drawing/helpers"
import { map } from "library/utils"
import { BlurFilter, ColorSource, Container, Graphics, Sprite } from "pixi.js"

export default pixi(({ random, bbox, renderer }) => {
  const noise = noise2d(random)
  const maxDepth = 5
  const stopBranchHeight = 10
  const landHeight = 200
  const landAmp = 20
  const numLayers = 3
  const fruitTexture = renderer.generateTexture(new Graphics().circle(0, 0, 1).fill("red"))
  const leafTexture = renderer.generateTexture(new Graphics().circle(0, 0, 1).fill("green"))
  const container = new Container()
  container.addChild(drawBackground("white", bbox))

  for (let i = 0; i < numLayers; i++) {
    const layerContainer = new Container()
    const y = (numLayers - i - 1) * (landHeight - landAmp)
    layerContainer.position.set(0, y)
    const color = gray(map(i, 0, numLayers - 1, 128, 0))
    layerContainer.addChild(trees(color))
    layerContainer.addChild(landscape(i, color))
    layerContainer.filters = i == numLayers - 1 ? [] : [new BlurFilter({ strength: numLayers - i - 1 })]
    container.addChild(layerContainer)
  }

  return { container }

  function landscape(noiseOffset: number, color: ColorSource) {
    const g = new Graphics().setStrokeStyle({ width: 1, color }).setFillStyle(color)
    const pointData = [{ x: -bbox.width / 2, y: -bbox.height / 2 }]
    for (let i = 0; i < bbox.width; i++) {
      const n = noise(i, noiseOffset * 1000)
      const delta = map(n, 0, 1, -landAmp, landAmp)
      pointData.push({ x: i - bbox.width / 2, y: -bbox.height / 2 + landHeight - delta })
    }
    pointData.push({ x: bbox.width / 2, y: -bbox.height / 2 })
    g.poly(pointData).stroke().fill()
    return g
  }

  function trees(color: ColorSource) {
    const container = new Container()
    const numTrees = random.integer(4, 7)
    const w = bbox.width / numTrees
    for (let i = 0; i < numTrees; i++) {
      const x = (i / numTrees) * bbox.width + random.real(0.25, 0.75) * w - bbox.width / 2
      const y = -bbox.height / 2 + random.real(landHeight * 0.75, landHeight - landAmp)
      container.addChild(tree(x, y, random.real(80, 120), color))
    }
    return container
  }

  function tree(x: number, y: number, startBranchHeight: number, color: ColorSource) {
    const container = new Container()
    container.position.set(x, y)
    container.addChild(branch(startBranchHeight, 0, startBranchHeight, color))
    return container
  }

  function branch(height: number, depth: number, startBranchHeight: number, color: ColorSource) {
    if (depth > maxDepth) return branchEnd()
    const container = new Container()
    const width = map(height, stopBranchHeight, startBranchHeight, 1, 5)
    const alpha = map(height, stopBranchHeight, startBranchHeight, 32, 255) / 255
    container.addChild(new Graphics().lineTo(0, height).stroke({ width, color, alpha }))

    const maxTheta = depth == 0 ? Math.PI / 4 : Math.PI / 2
    const nBranches = random.integer(5, 8) - depth
    for (let i = 0; i < nBranches; i++) {
      const theta = random.minmax(maxTheta)
      const newHeight = height * random.real(0.5, 0.8)
      const branchContainer =
        newHeight > stopBranchHeight ? branch(newHeight, depth + 1, startBranchHeight, color) : branchEnd()
      branchContainer.rotation = theta
      branchContainer.position.set(0, height)
      container.addChild(branchContainer)
    }
    return container
  }

  function branchEnd() {
    const sprite = new Sprite(random.bool() ? fruitTexture : leafTexture)
    sprite.anchor.set(0.5)
    sprite.scale.set(random.real(1, 2))
    return sprite
  }
})
