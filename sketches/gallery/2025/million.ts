import { webgl } from "library/core/sketch"
import { globalPreamble } from "library/drawing/shaders"
import {
  createBufferInfoFromArrays,
  createProgramInfo,
  createTransformFeedback,
  drawBufferInfo,
  setBuffersAndAttributes,
  setUniforms,
} from "twgl.js"

export default webgl(({ gl, random }) => {
  gl.clearColor(0, 0, 0, 1)

  const numPoints = 1000000

  const particleUpdateProgramInfo = createProgramInfo(gl, [vertParticleUpdate, fragParticleUpdate], {
    transformFeedbackVaryings: ["v_position"],
  })
  const particleRenderProgramInfo = createProgramInfo(gl, [vertParticleRender, fragParticleRender])

  const pointsData = initPoints()
  const particleBufferInfoFlip = createBufferInfoFromArrays(gl, {
    a_position: { numComponents: 2, data: new Float32Array(pointsData) },
    v_position: { numComponents: 2, data: pointsData.length },
  })
  const particleBufferInfoFlop = createBufferInfoFromArrays(gl, {
    a_position: { numComponents: 2, buffer: particleBufferInfoFlip.attribs?.["v_position"].buffer },
    v_position: { numComponents: 2, buffer: particleBufferInfoFlip.attribs?.["a_position"].buffer },
  })
  const drawBufferInfoFlip = createBufferInfoFromArrays(gl, {
    a_position: { numComponents: 2, buffer: particleBufferInfoFlip.attribs?.["v_position"].buffer },
  })
  const drawBufferInfoFlop = createBufferInfoFromArrays(gl, {
    a_position: { numComponents: 2, buffer: particleBufferInfoFlop.attribs?.["v_position"].buffer },
  })

  const feedbackFlip = createTransformFeedback(gl, particleUpdateProgramInfo, particleBufferInfoFlip)
  const feedbackFlop = createTransformFeedback(gl, particleUpdateProgramInfo, particleBufferInfoFlop)

  const sets = [
    {
      feedback: feedbackFlip,
      particleBufferInfo: particleBufferInfoFlip,
      renderBufferInfo: drawBufferInfoFlip,
    },
    {
      feedback: feedbackFlop,
      particleBufferInfo: particleBufferInfoFlop,
      renderBufferInfo: drawBufferInfoFlop,
    },
  ]

  const transforms = initTransforms()
  let color = random.color()
  let frame = 0

  return {
    render() {
      const { feedback, particleBufferInfo, renderBufferInfo } = sets[frame % 2]
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.enable(gl.RASTERIZER_DISCARD)
      gl.useProgram(particleUpdateProgramInfo.program)
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedback)
      gl.beginTransformFeedback(gl.POINTS)
      setBuffersAndAttributes(gl, particleUpdateProgramInfo, particleBufferInfo)
      setUniforms(particleUpdateProgramInfo, { frame, transforms })
      drawBufferInfo(gl, particleBufferInfo, gl.POINTS)
      gl.endTransformFeedback()
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null)
      gl.disable(gl.RASTERIZER_DISCARD)

      gl.useProgram(particleRenderProgramInfo.program)
      setBuffersAndAttributes(gl, particleRenderProgramInfo, renderBufferInfo)
      setUniforms(particleRenderProgramInfo, { color })
      drawBufferInfo(gl, renderBufferInfo, gl.POINTS)

      frame++
    },
    next() {
      color = random.color()
    },
  }

  // TODO: Strange attractors and blending
  function initTransforms(): number[] {
    // prettier-ignore
    const transforms = [
      0.5, 0, 0,
      0, 0.5, 0,
      0, 0.36, 1,

      0.5, 0, 0,
      0, 0.5, 0,
      -0.5, -0.5, 1,
      
      0.5, 0, 0,
      0, 0.5, 0,
      0.5, -0.5, 1,
    ]
    return transforms
  }

  function initPoints(): number[] {
    const points: number[] = []
    for (let i = 0; i < numPoints; i++) {
      points.push(0, 0)
    }
    return points
  }
})

const vertParticleUpdate = /*glsl*/ `${globalPreamble}
  in vec2 a_position;
  uniform mat3 transforms[3];
  uniform int frame;
  out vec2 v_position;

  // TODO: Other random implementation
  // https://umbcgaim.wordpress.com/2010/07/01/gpu-random-numbers/
  float random(float x) {
    return fract(sin(x)*100000.0);
  }

  void main() {
    float seed = float(frame + gl_VertexID)/100.;
    float rand = random(seed) * 3.;
    int index = int(floor(rand));
    mat3 transform = transforms[index];
    v_position = (transform * vec3(a_position, 1.0)).xy;   
  }
`

const fragParticleUpdate = /*glsl*/ `${globalPreamble}
  void main() { discard; }
`

const vertParticleRender = /*glsl*/ `${globalPreamble}
  in vec2 a_position;
  out vec2 v_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_position = a_position;
  }
`

const fragParticleRender = /*glsl*/ `${globalPreamble}
  in vec2 v_position;
  uniform vec3 color;
  out vec4 fragColor;

  void main() {
    fragColor = vec4(color, 1.0);
  }
`
