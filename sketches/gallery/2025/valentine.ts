import { pixi } from "library/core/sketch"
import { Container, Graphics } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const container = new Container()
  const w = bbox.width / 16
  const h = bbox.height / 16

  const heartContainer = container.addChild(new Container())
  const subHeartContainer = container.addChild(new Container())
  heartContainer.rotation = Math.PI / 4
  heartContainer.scale.set(w, h)
  subHeartContainer.rotation = Math.PI / 4
  subHeartContainer.scale.set(w / 2, h / 2)

  heartContainer.addChild(drawHeart()).fill({ color: "red" })
  //heartContainer.addChild(drawHeart()).fill({ color: "white" }).position.set(1, 1)
  //heartContainer.addChild(drawHeart()).fill({ color: "white" }).position.set(0, 2)
  for (let i = 0; i < 5; i++) {
    const x = random.integer(0, 5) * random.sign()
    const y = random.integer(0, 5) * random.sign()
    subHeartContainer
      .addChild(drawHeart())
      .fill({ color: "white", alpha: 0.5 })
      .stroke({ color: "black", alpha: 0.5, width: 0.1 })
      .position.set(x, y)
  }

  return { container }

  function drawHeart() {
    return new Graphics().poly([
      { x: -1, y: 1 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: -1 },
      { x: -1, y: -1 },
    ])
  }
})
