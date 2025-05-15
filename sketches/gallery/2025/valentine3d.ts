import { three } from "library/core/sketch"
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector3,
} from "three"
import { OrbitControls } from "three/examples/jsm/Addons.js"

export default three(({ bbox, renderer }) => {
  const scene = new Scene()
  scene.background = new Color("black")
  const camera = new PerspectiveCamera(75, bbox.width / bbox.height, 0.1, 1000)
  camera.position.z = 2
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0, 0)

  const box = createBox()
  box.rotation.x = Math.PI / 8
  box.rotation.y = Math.PI / 4
  scene.add(box)
  return { scene, camera }

  function createBox() {
    const boxGroup = new Group()
    const geometry = new BoxGeometry()
    const material = new MeshBasicMaterial({ color: "green", transparent: true, opacity: 0.5 })
    const mesh = new Mesh(geometry, material)
    mesh.scale.set(0.98, 0.98, 0.98)
    boxGroup.add(mesh)

    setupAttributes(geometry)
    const wireframeMaterial = new ShaderMaterial({
      uniforms: { thickness: { value: 2 } },
      vertexShader,
      fragmentShader,
      side: DoubleSide,
      alphaToCoverage: true,
    })
    const wireframeMesh = new Mesh(geometry, wireframeMaterial)
    boxGroup.add(wireframeMesh)
    return boxGroup
  }

  function setupAttributes(geometry: BufferGeometry) {
    const vectors = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]
    const position = geometry.attributes["position"]
    const centers = new Float32Array(position.count * 3)
    for (let i = 0, l = position.count; i < l; i++) {
      vectors[i % 3].toArray(centers, i * 3)
    }
    geometry.setAttribute("center", new BufferAttribute(centers, 3))
  }
})

const vertexShader = /*glsl*/ `
  attribute vec3 center;
  varying vec3 vCenter;

  void main() {
    vCenter = center;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`

const fragmentShader = /*glsl*/ `
  uniform float thickness;
  varying vec3 vCenter;  

  void main() {
    vec3 afwidth = fwidth(vCenter.xyz);
    vec3 edge3 = smoothstep((thickness - 1.0) * afwidth, thickness * afwidth, vCenter.xyz);
    float edge = 1.0 - min(min(edge3.x, edge3.y), edge3.z);
    gl_FragColor.rgb = gl_FrontFacing ? vec3(1.) : vec3(0.2);
    gl_FragColor.a = edge;
  }
`
