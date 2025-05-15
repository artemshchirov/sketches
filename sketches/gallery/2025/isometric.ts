import { three } from "library/core/sketch"
import {
  AmbientLight,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshPhongMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  Vector2,
} from "three"
import { OrbitControls } from "three/examples/jsm/Addons.js"

export default three(({ random, renderer }) => {
  renderer.shadowMap.enabled = true
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.001, 1000)

  // TODO: Displace based on noise
  const geometry = new PlaneGeometry(1, 1)
  const material = new MeshPhongMaterial({ color: new Color(0x90ee90), side: DoubleSide })
  const plane = new Mesh(geometry, material)
  plane.castShadow = true
  plane.receiveShadow = true
  plane.position.set(0.5, 0.5, 0)
  plane.scale.set(1.25, 1.25, 1)
  scene.add(plane)
  scene.add(placeTrees())
  // TODO: Add glowing stars

  camera.position.set(1.5, 1.5, 1)
  camera.up.set(0, 0, 1)
  camera.lookAt(0, 0, 1)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0, 0)
  //controls.autoRotate = true
  //const helper = new AxesHelper()
  //scene.add(helper)

  const light = new DirectionalLight(0xffffff, 10)
  light.position.set(-2, 2, 2)
  light.target.position.set(0, 0, 0)
  light.castShadow = true
  light.shadow.mapSize.width = 2048
  light.shadow.mapSize.height = 2048
  //light.lookAt(0, 0, 0)
  scene.add(light)

  const amb = new AmbientLight(0xffff00, 1)
  // TODO: Different light sources and stylized light rendering
  scene.add(amb)

  function update() {
    controls.update()
  }

  return { scene, camera, update }

  function placeTrees() {
    const treeGroup = new Group()

    const radius = 0.2 // min distance
    const k = 30 // limit of samples for poisson disk
    const points = poissonDiskSampling(radius, k)
    const maxTreeHeight = 0.5
    const maxTreeRadius = radius / 4
    const treeMaterial = new MeshPhongMaterial({ color: new Color(0x8b4513) })
    const leavesMaterial = new MeshPhongMaterial({
      color: new Color(0x228b22),
      shininess: 100,
      specular: 0x00ff00,
      opacity: 0.8,
      transparent: true,
    })
    points.forEach((point) => {
      const treeHeight = maxTreeHeight * random.real(0.25, 1) // TODO: Calculate height based on radius
      const treeRadius = maxTreeRadius * random.real(0.25, 1)
      const treeGeometry = new CylinderGeometry(treeRadius, treeRadius * 1.3, treeHeight)
      const leavesGeometry = new DodecahedronGeometry(treeHeight * 0.3) // TODO: Different types of leaves
      const tree = new Mesh(treeGeometry, treeMaterial)
      const leaves = new Mesh(leavesGeometry, leavesMaterial)
      leaves.position.set(point.x, point.y, treeHeight)
      leaves.rotation.set(random.realZeroTo(Math.PI), random.realZeroTo(Math.PI), random.realZeroTo(Math.PI))
      tree.position.set(point.x, point.y, treeHeight / 2)
      tree.rotation.x = Math.PI / 2
      tree.castShadow = true
      tree.receiveShadow = true
      leaves.castShadow = true
      leaves.receiveShadow = true
      treeGroup.add(tree)
      treeGroup.add(leaves)
    })

    return treeGroup
  }

  //https://sighack.com/post/poisson-disk-sampling-bridsons-algorithm
  function poissonDiskSampling(radius: number, k: number): Vector2[] {
    const N = 2 // Dimensions
    const radiusSquared = radius * radius
    const points: Vector2[] = []
    const active: Vector2[] = []
    const p0 = new Vector2(random.realZeroToOneExclusive(), random.realZeroToOneExclusive())
    const cellSize = radius / Math.sqrt(N)
    const cellsWidth = Math.ceil(1 / cellSize) + 1
    const cellsHeight = Math.ceil(1 / cellSize) + 1
    const grid = new Array(cellsWidth) as (Vector2 | null)[][]
    for (let i = 0; i < cellsWidth; i++) {
      grid[i] = new Array(cellsHeight) as Vector2[]
      for (let j = 0; j < cellsHeight; j++) {
        grid[i][j] = null
      }
    }
    insertPoint(grid, p0)
    points.push(p0)
    active.push(p0)

    while (active.length > 0) {
      const index = random.integer(0, active.length - 1)
      const p = active[index]

      let found = false
      for (let i = 0; i < k; i++) {
        const angle = random.realZeroTo(2 * Math.PI)
        const d = random.real(radius, 2 * radius)
        const np = new Vector2(p.x + d * Math.cos(angle), p.y + d * Math.sin(angle))
        if (!isValidPoint(grid, cellsWidth, cellsHeight, np, radiusSquared)) continue
        // Check if the point is valid
        points.push(np)
        insertPoint(grid, np)
        active.push(np)
        found = true
        break
      }

      if (!found) {
        active.splice(index, 1)
      }
    }

    function insertPoint(grid: (Vector2 | null)[][], point: Vector2) {
      const x = Math.floor(point.x / cellSize)
      const y = Math.floor(point.y / cellSize)
      grid[x][y] = point
    }

    function isValidPoint(
      grid: (Vector2 | null)[][],
      width: number,
      height: number,
      p: Vector2,
      radiusSquared: number,
    ) {
      /* Make sure the point is on the screen */
      if (p.x < 0 || p.x >= 1 || p.y < 0 || p.y >= 1) return false

      /* Check neighboring eight cells */
      const xIndex = Math.floor(p.x / cellSize)
      const yIndex = Math.floor(p.y / cellSize)
      const i0 = Math.max(xIndex - 1, 0)
      const i1 = Math.min(xIndex + 1, width - 1)
      const j0 = Math.max(yIndex - 1, 0)
      const j1 = Math.min(yIndex + 1, height - 1)

      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          const v = grid[i][j]
          if (v != null) {
            if (v.distanceToSquared(p) < radiusSquared) return false
          }
        }
      }

      /* If we get here, return true */
      return true
    }

    return points
  }
})
