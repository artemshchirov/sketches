# API Documentation

This document provides an overview of the public API exported by `@codedpalette/sketches`.

## SketchModule
Defines metadata for a sketch. It includes a `name` and a `year` indicating where the sketch can be loaded from.

## loadModule
`loadModule(module: SketchModule): Promise<SketchConstructor>` dynamically imports the module for the specified sketch and returns a factory function for creating it.

## screensaver
`screensaver(canvas: HTMLCanvasElement)` loads the screensaver sketch and attaches it to the provided canvas element.

## initRenderer
`initRenderer(params?: Partial<RenderParams<C>>)` initializes a renderer with optional parameters such as size or canvas.

## SketchRunner
`SketchRunner` is a utility class that controls the render loop and user interactions for a sketch.

