// import "pixi.js/filters"
// import "pixi.js/graphics"
// import "pixi.js/mesh"

// import { Box, box } from "@flatten-js/core"
// import { Random } from "library/core/random"
// import { drawBackground } from "library/drawing/helpers"
// import { Container, Graphics, ICanvas, Matrix, WebGLRenderer as PixiRenderer } from "pixi.js"
// import { createEntropy, MersenneTwister19937 as MersenneTwister } from "random-js"

// type SketchType = "pixi" // | "three" | "webgl"

// abstract class Sketch {
//   /** RNG instance */
//   protected random: Random
//   /** Using [Mersenne twister](http://en.wikipedia.org/wiki/Mersenne_twister) algorithm for repeatability */
//   private mersenneTwister: MersenneTwister
//   constructor(readonly type: SketchType) {
//     this.mersenneTwister = MersenneTwister.seedWithArray(createEntropy())
//     this.random = new Random(this.mersenneTwister)
//   }
//   abstract frame(renderer: Renderer): void
//   abstract update(totalTime: number, deltaTime: number): void
// }

// class Renderer<C extends ICanvas = HTMLCanvasElement> {
//   private rendererByType: Record<SketchType, PixiRenderer<C>>
//   private constructor(private pixiRenderer: PixiRenderer<C>) {
//     this.rendererByType = { pixi: pixiRenderer }
//   }

//   static async init<C extends ICanvas = HTMLCanvasElement>(canvas?: C) {
//     const pixiRenderer = new PixiRenderer<C>()
//     await pixiRenderer.init({
//       canvas,
//       antialias: true,
//     })
//     return new Renderer(pixiRenderer)
//   }

//   getRenderer<T extends SketchType>(type: T): PixiRenderer<C> {
//     return this.rendererByType[type]
//   }
// }

// interface SizeParams {
//   width: number
//   height: number
// }
// class PixiSketch extends Sketch {
//   constructor(
//     private creator: PixiCreator,
//     private params: SizeParams,
//   ) {
//     super("pixi")
//   }

//   override frame(renderer: Renderer<ICanvas>) {
//     const random = this.random
//     const { width, height } = this.params
//     // Calculate bounding box
//     const bbox = box(-width / 2, -height / 2, width / 2, height / 2)
//     const pixiRenderer = renderer.getRenderer(this.type)
//     const { container } = this.creator({ random, bbox, renderer: pixiRenderer })
//     const stage = new Container()
//     // Set transform matrix to translate (0, 0) to the viewport center and point Y-axis upwards
//     stage.setFromMatrix(new Matrix().scale(1, -1).translate(width / 2, height / 2))
//     stage.addChild(container)
//     pixiRenderer.resize(width, height)
//     pixiRenderer.render(stage)
//   }

//   override update(_totalTime: number, _deltaTime: number) {
//     // override
//   }
// }

// type PixiCreator = ({ random, bbox, renderer }: { random: Random; bbox: Box; renderer: PixiRenderer<ICanvas> }) => {
//   container: Container
// }

// function pixi(pixiCreator: PixiCreator, params: SizeParams) {
//   return new PixiSketch(pixiCreator, params)
// }

// const sizeParams = { width: 1250, height: 1250 }
// const renderer = await Renderer.init()
// const sketch = pixi(({ random, bbox }) => {
//   const container = new Container()
//   container.addChild(drawBackground("white", bbox))
//   container
//     .addChild(new Graphics())
//     .rect(-bbox.width / 4, -bbox.height / 4, bbox.width / 2, bbox.height / 2)
//     .fill({ color: random.color() })
//   return { container }
// }, sizeParams)
// const canvas = renderer.getRenderer("pixi").canvas
// document.body.appendChild(canvas)
// sketch.frame(renderer)
// canvas.addEventListener("click", () => sketch.frame(renderer))

import { init } from "library/core/renderer"
import { SketchRunner } from "library/core/runner"
import { webgl } from "library/core/sketch"
import { initUI } from "library/core/ui"
import { globalPreamble } from "library/drawing/shaders"
// import constructor from "sketches/gallery/2023/loop"
import constructor from "sketches/art/first"
import {
  Arrays,
  createBufferInfoFromArrays,
  createProgramInfo,
  drawBufferInfo,
  setBuffersAndAttributes,
  setUniforms,
} from "twgl.js"

const defaultSizeParams = { resolution: 1, width: 1250, height: 1250 }
const renderer = await init<HTMLCanvasElement>()
const sketch = constructor(renderer, defaultSizeParams)
document.body.appendChild(sketch.canvas)

const ui = initUI(sketch, defaultSizeParams)
const runner = new SketchRunner(sketch, { ui })
runner.start()

export default webgl(({ gl, random }) => {
  gl.clearColor(0, 0, 0, 1)

  // Init buffers
  const arrays: Arrays = {
    position: { numComponents: 2, data: [-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5] },
  }
  const bufferInfo = createBufferInfoFromArrays(gl, arrays)
  const programInfo = createProgramInfo(gl, [vert, frag])
  let color = random.color()

  return {
    render() {
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(programInfo.program)
      setBuffersAndAttributes(gl, programInfo, bufferInfo)
      setUniforms(programInfo, { color })
      drawBufferInfo(gl, bufferInfo)
    },
    next() {
      color = random.color()
    },
  }
})

const vert = /*glsl*/ `${globalPreamble}
  in vec2 a_position;
  out vec2 v_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_position = a_position;
  }
`

const frag = /*glsl*/ `${globalPreamble}
  in vec2 v_position;
  uniform vec3 color;
  out vec4 fragColor;

  void main() {
    fragColor = vec4(color, 1.0);
  }
`
