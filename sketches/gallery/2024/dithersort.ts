import { extractColors } from "extract-colors"
import { pixi } from "library/core/sketch"
import { DitherFilter, DownsampleFilter, PixelSortFilter } from "library/drawing/filters"
import { asset } from "library/utils"
import { GUI } from "lil-gui"
import { Assets, Color, ColorMatrixFilter, Container, Filter, Sprite, Texture } from "pixi.js"
import { ConvolutionFilter } from "pixi-filters"

const texture = await Assets.load<Texture>(asset("dither", "pic.jpg"))
const container = new Container()
export const sizeParams = { resolution: 1, width: texture.width, height: texture.height }

const gui = new GUI()
const params = {
  sharpness: 0,
  brightness: 1,
  dither: {
    level: 0,
    spread: 0.1,
    isLinear: false,
    method: "yliluoma1" as "regular" | "yliluoma1" | "yliluoma2",
    colorDistance: 0.22,
  },
  downsample: {
    level: 0,
  },
  pixelsort: {
    minThreshold: 0,
    maxThreshold: 1,
    direction: "horizontal" as "horizontal" | "vertical",
    invert: false,
    enabled: false,
  },
}

gui.add(params, "sharpness", 0, 1)
gui.add(params, "brightness", 0, 2)

const ditherFolder = gui.addFolder("Dither")
ditherFolder.add(params.dither, "level", 0, 2, 1)
ditherFolder.add(params.dither, "spread", 0, 1)
ditherFolder.add(params.dither, "isLinear")
ditherFolder.add(params.dither, "method", ["regular", "yliluoma1", "yliluoma2"])
ditherFolder.add(params.dither, "colorDistance", 0, 1)

const downsampleFolder = gui.addFolder("Downsample")
downsampleFolder.add(params.downsample, "level", 0, 2, 1)

const pixelsortFolder = gui.addFolder("Pixelsort")
pixelsortFolder.add(params.pixelsort, "minThreshold", 0, 0.5)
pixelsortFolder.add(params.pixelsort, "maxThreshold", 0.5, 1)
pixelsortFolder.add(params.pixelsort, "direction", ["horizontal", "vertical"])
pixelsortFolder.add(params.pixelsort, "invert")
pixelsortFolder.add(params.pixelsort, "enabled")

gui.onChange(() => {
  const children = container.removeChildren()
  children.forEach((child) => child.destroy())
  void extractPalette(params.dither.colorDistance).then((colors) => process(colors))
})

function process(colors: Color[]) {
  const spriteContainer = container.addChild(new Container())
  spriteContainer.scale.set(1, -1)

  const sprite = new Sprite(texture)
  const ditherParams = params.dither
  const downsampleParams = params.downsample
  const pixelsortParams = params.pixelsort
  const pipeline = [
    sharpen(params.sharpness),
    brighten(params.brightness),
    pixelsortParams.enabled ? pixelsort(pixelsortParams) : (input: Sprite) => input,
    dither(ditherParams, colors),
    downsample(downsampleParams.level),
  ]
  const output = pipeline.reduce((input, fn) => fn(input), sprite)
  output.anchor.set(0.5)
  spriteContainer.addChild(output)
}

export default pixi(() => {
  void extractPalette(params.dither.colorDistance).then((colors) => process(colors))
  return { container }
})

function pixelsort({ minThreshold, maxThreshold, direction, invert }: (typeof params)["pixelsort"]) {
  return (input: Sprite) => {
    const inputFilters = input.filters ? (input.filters as Filter[]) : []
    input.filters = [
      ...inputFilters,
      new PixelSortFilter({
        threshold: [minThreshold, maxThreshold],
        direction: direction,
        invert: invert,
      }),
    ]
    return input
  }
}

function dither({ level, spread, isLinear, method }: (typeof params)["dither"], colors: Color[]) {
  return (input: Sprite) => {
    const inputFilters = input.filters ? (input.filters as Filter[]) : []
    console.log(colors.length)
    input.filters = [
      ...inputFilters,
      new DitherFilter({
        level,
        spread,
        isLinear,
        method,
        palette: colors.slice(1, Math.min(32, colors.length)),
        inputSize: [input.width, input.height],
      }),
    ]
    return input
  }
}

function brighten(scale: number) {
  return (input: Sprite) => {
    const inputFilters = input.filters ? (input.filters as Filter[]) : []
    const brightnessFilter = new ColorMatrixFilter()
    brightnessFilter.brightness(scale, true)
    input.filters = [...inputFilters, brightnessFilter]
    return input
  }
}

function sharpen(sharpnessFactor: number) {
  return (input: Sprite) => {
    const inputFilters = input.filters ? (input.filters as Filter[]) : []
    input.filters = [
      ...inputFilters,
      new ConvolutionFilter({
        matrix: [
          0,
          -1 * sharpnessFactor,
          0,
          -1 * sharpnessFactor,
          4 * sharpnessFactor + 1,
          -1 * sharpnessFactor,
          0,
          -1 * sharpnessFactor,
          0,
        ],
        width: input.width,
        height: input.height,
      }),
    ]
    return input
  }
}

function downsample(level: number) {
  return (input: Sprite) => {
    const inputFilters = input.filters ? (input.filters as Filter[]) : []
    input.filters = [...inputFilters, new DownsampleFilter({ level, inputSize: [input.width, input.height] })]
    return input
  }
}

async function extractPalette(distance: number): Promise<Color[]> {
  const canvas = document.createElement("canvas")
  canvas.width = texture.width
  canvas.height = texture.height
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(texture.source.resource as ImageBitmap, 0, 0)
  const imageData = ctx.getImageData(0, 0, texture.width, texture.height)
  return (await extractColors(imageData, { distance })).map((color) => new Color(color.hex))
}
