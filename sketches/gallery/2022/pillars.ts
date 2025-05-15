import { pixi } from "library/core/sketch"
import { drawBackground } from "library/drawing/helpers"
import { map } from "library/utils"
import { Container, Graphics, Matrix } from "pixi.js"

export default pixi(({ random, bbox }) => {
  const cellSize = 10
  const cells: boolean[][] = []
  const cellsWidth = Math.floor(bbox.width / cellSize)
  const cellsHeight = Math.floor(bbox.height / cellSize)
  for (let i = 0; i < cellsWidth; i++) {
    cells[i] = []
    for (let j = 0; j < cellsHeight; j++) {
      cells[i][j] = false
    }
  }
  simulateAnt()

  const columnWidth = 50
  const mainHue = random.realZeroTo(360)
  const mainSat = random.real(50, 100)
  const secondHue = (mainHue + 180) % 360
  const secondSat = random.real(50, 100)
  const container = new Container()
  //container.rotation = random.bool() ? 0 : Math.PI / 2
  container.addChild(drawBackground("black", bbox))

  for (let i = 0; i < cellsWidth; i++) {
    for (let j = 0; j < cellsHeight; j++) {
      // Alternate colors between columns
      // Bounds sets the direction for increasing brightness (top to bottom vs bottom to top)
      const [hue, sat, bounds] =
        Math.floor((i * cellSize) / columnWidth) % 2 == 0
          ? [mainHue, mainSat, [cellsHeight, 0]]
          : [secondHue, secondSat, [0, cellsHeight]]
      const alpha = map(j, bounds[0], bounds[1], 0, 1)
      const val = map(j, bounds[0], bounds[1], 50, 100)
      const xNoise = map(j, bounds[0], bounds[1], 0, 40)
      if (cells[i][j]) {
        const x = i * cellSize + cellSize / 2 + random.minmax(xNoise)
        const y = j * cellSize + cellSize / 2
        const graphics = new Graphics().setFillStyle({ h: hue, s: sat, v: val, a: alpha }).setTransform(
          new Matrix()
            .rotate(random.real(0, 2 * Math.PI))
            .scale(random.real(0.8, 2), random.real(0.8, 2))
            .translate(x - bbox.width / 2, -y + bbox.height / 2),
        )
        container.addChild(brokenRect(graphics))
      }
    }
  }

  return { container }

  function brokenRect(g: Graphics) {
    const dim = cellSize
    const x = -dim / 2
    const y = dim / 2
    const pointData = [
      { x: x + random.real(0, dim), y },
      { x: x + dim, y: y - random.real(0, dim) },
      { x: x + random.real(0, dim), y: y - dim },
      { x, y: y - random.real(0, dim) },
    ]
    g.poly(pointData).fill()
    return g
  }

  // Langton's ant simulation
  // The "ant" moves according to the rules below:
  // - At a white square, turn 90° clockwise, flip the color of the square, move forward one unit
  // - At a black square, turn 90° counter-clockwise, flip the color of the square, move forward one unit
  function simulateAnt() {
    const numSteps = 1000000
    let currX = random.integer(0, cellsWidth - 1)
    let currY = random.integer(0, cellsHeight - 1)
    let currDirection = random.integer(0, 3)

    for (let i = 0; i < numSteps; i++) {
      const currCell = cells[currX][currY]
      cells[currX][currY] = !currCell
      const turnClockwise = (currDirection + 3) % 4
      const turnCounterClockwise = (currDirection + 1) % 4
      currDirection = currCell ? turnClockwise : turnCounterClockwise

      // prettier-ignore
      if (currDirection == 0) { // up
        currY--
      } else if (currDirection == 1) { // right
        currX++
      } else if (currDirection == 2) { // down
        currY++
      } else { // left
        currX--
      }

      // Wrap the ant around cell's grid
      currX = (currX + cellsWidth) % cellsWidth
      currY = (currY + cellsHeight) % cellsHeight
    }
  }
})
