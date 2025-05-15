import { box } from "@flatten-js/core"
import { noise4d } from "library/core/random"
import { three } from "library/core/sketch"
import { rectanglePacking } from "library/geometry/packing"
import { fromPolar, map, radToDeg } from "library/utils"
import { Color, Fog, InstancedMesh, Matrix4, PerspectiveCamera, PlaneGeometry, Quaternion, Scene, Vector3 } from "three"

export default three(({ random, bbox }) => {
  const noise = noise4d(random)
  const loopDurationSeconds = 5
  const planeDim = 2
  const sides = random.integer(4, 8)
  const rectanglesPerSide = 300
  const holeScale = random.real(0.2, 0.3) //Relation between central hole and screen dimensions
  const apothem = planeDim / (2 * Math.tan(Math.PI / sides))

  const mainHue = random.realZeroTo(360)
  const secondHue = (mainHue + 180) % 360

  const camera = configureCamera(holeScale)
  const scene = new Scene()
  scene.fog = new Fog(0x000000, 0, camera.far - planeDim / 2)

  const planeGeometry = new PlaneGeometry(1, 1)
  const planeMesh = createPlaneMesh()
  const planes: InstancedMesh[] = []
  for (let i = 0; i < sides; i++) {
    for (let j = 0; j < 5; j++) {
      const mesh = planeMesh.clone()
      mesh
        .rotateX(-Math.PI / 2)
        .rotateY((2 * Math.PI * i) / sides)
        .translateZ(-apothem)
      mesh.position.z -= (j - 2) * planeDim
      planes.push(mesh)
      scene.add(mesh)
    }
  }
  updateColors(0)

  const update = (totalTime: number, deltaTime: number) => {
    const positionOffSet = (deltaTime * planeDim) / loopDurationSeconds
    const cameraRotation = (totalTime * 2 * Math.PI) / (loopDurationSeconds * 2)
    const cameraPosition = fromPolar(apothem * 0.5, cameraRotation)
    camera.position.setX(cameraPosition.x)
    camera.position.setY(cameraPosition.y)
    camera.position.z -= positionOffSet
    if (camera.position.z <= 0) {
      camera.position.z += planeDim
    }
    camera.lookAt(0, 0, camera.position.z - planeDim)
    camera.rotateZ(-cameraRotation / 2)
    updateColors(totalTime)
  }

  return { scene, camera, update }

  function updateColors(totalTime: number) {
    const noiseScaleFactor = 3
    for (let i = 0; i < planeMesh.count; i++) {
      const matrix = new Matrix4()
      planeMesh.getMatrixAt(i, matrix)
      const position = new Vector3().setFromMatrixPosition(matrix)

      const x = Math.abs(position.x) * noiseScaleFactor
      const y = Math.abs(position.y) * noiseScaleFactor
      const z = totalTime

      const n = noise(x, y, z, 0)
      const hue = (((n > 0 ? mainHue : secondHue) + n * 40) % 360) / 360
      const sat = map(noise(x, y, z, 10000), -1, 1, 0.5, 1)
      const bri = map(noise(x, y, z, 20000), -1, 1, 0.2, 0.6)

      for (const mesh of planes) {
        mesh.setColorAt(
          i,
          new Color().setHSL(Math.round(hue * 10) / 10, Math.round(sat * 10) / 10, Math.round(bri * 10) / 10),
        )
      }
    }
    for (const mesh of planes) {
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }

  function createPlaneMesh(): InstancedMesh {
    const packing = rectanglePacking(box(0, 0, planeDim, planeDim), planeDim / rectanglesPerSide, random)
    const mesh = new InstancedMesh(planeGeometry, undefined, packing.length)
    for (const [i, rect] of packing.entries()) {
      const scaleVector = new Vector3(rect.width, rect.height, 1)
      const positionVector = new Vector3(rect.center.x - planeDim / 2, rect.center.y - planeDim / 2, 0)
      mesh.setMatrixAt(i, new Matrix4().compose(positionVector, new Quaternion(), scaleVector))
    }
    return mesh
  }

  function configureCamera(holeScale: number) {
    const k = (1 - holeScale) / (2 * holeScale)
    const fov = radToDeg(Math.atan(k)) * 2
    const z = apothem * (1 / k + 1)
    const far = z + planeDim
    const camera = new PerspectiveCamera(fov, bbox.width / bbox.height, 0.1, far)
    camera.position.setZ(z)
    return camera
  }
})
