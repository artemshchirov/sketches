import { box } from "@flatten-js/core"
import { noise4d } from "library/core/random"
import { three } from "library/core/sketch"
import { rectanglePacking } from "library/geometry/packing"
import { fromPolar, map, radToDeg } from "library/utils"
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Fog,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Quaternion,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three"

const SCALE = 5

export default three(({ random, bbox }) => {
  const noise = noise4d(random)
  const loopDurationSeconds = SCALE * 10
  const sunRadius = SCALE * 3
  const numRadiatingCircles = SCALE * 10
  const circleInstances = SCALE * 300
  const sunParticles = SCALE * 2000
  const holeScale = 0.5 // random.real(0.2, 0.3) // Relation between central hole and screen dimensions

  const mainHue = random.realZeroTo(360)
  const secondHue = (mainHue + 120) % 360

  const camera = configureCamera(holeScale)
  const scene = new Scene()
  scene.fog = new Fog(0x000000, 0, camera.far - sunRadius / 4)

  // Sun container and core
  const sunGroup = new Group()
  scene.add(sunGroup)

  // Create sun core spheres
  const sunCoreMesh = createSunCoreMesh()
  sunGroup.add(sunCoreMesh)

  // Create sun corona
  const coronaMesh = createCoronaMesh()
  //   sunGroup.add(coronaMesh)

  // Create radiating circles
  const circleMesh = createCircleMesh()
  const circles: InstancedMesh[] = []
  for (let i = 0; i < numRadiatingCircles; i++) {
    const mesh = circleMesh.clone()
    mesh.rotateY((2 * Math.PI * i) / numRadiatingCircles)
    circles.push(mesh)
    sunGroup.add(mesh)
  }

  // Create particle system
  const particles = createSunParticles()
  sunGroup.add(particles)

  const starField = createStarField(1000, sunRadius * 20)
  scene.add(starField)

  updateColors(0)

  const update = (totalTime: number, deltaTime: number) => {
    const cameraRotation = (totalTime * 2 * Math.PI) / (loopDurationSeconds * 2)
    const cameraPosition = fromPolar(sunRadius * 0.5, cameraRotation)
    camera.position.setX(cameraPosition.x)
    camera.position.setY(cameraPosition.y)

    // Sun core rotation
    sunCoreMesh.rotation.y += deltaTime * 0.1

    // Update corona pulsing
    const pulseFactor = Math.sin(totalTime * 2) * 0.1 + 1
    coronaMesh.scale.set(pulseFactor, pulseFactor, pulseFactor)

    // Update radiating circles
    starField.rotation.y += deltaTime * 0.005
    starField.rotation.x += deltaTime * 0.002

    camera.lookAt(0, 0, 0)
    camera.rotateZ(-cameraRotation / 2)

    updateColors(totalTime)
    updateParticles(particles, totalTime)
  }

  return { scene, camera, update }

  function updateColors(totalTime: number) {
    const noiseScaleFactor = 3

    // Update circle colors
    for (let i = 0; i < circleMesh.count; i++) {
      const matrix = new Matrix4()
      circleMesh.getMatrixAt(i, matrix)
      const position = new Vector3().setFromMatrixPosition(matrix)

      const x = Math.abs(position.x) * noiseScaleFactor
      const y = Math.abs(position.y) * noiseScaleFactor
      const z = totalTime

      const n = noise(x, y, z, 0)
      const hue = (((n > 0 ? mainHue : secondHue) + n * 40) % 360) / 360
      const sat = 1.0 // Max saturation for neon effect
      const bri = map(noise(x, y, z, 20000), -1, 1, 0.6, 1.0)

      // Circle animation phase based on noise
      const phase = (noise(x, z, y, 5000) + 1) / 2
      const scale = map(phase, 0, 1, 0.1, 1.3)
      const opacity = map(phase, 0, 1, 0.9, 0.2)

      for (const mesh of circles) {
        mesh.setColorAt(
          i,
          new Color().setHSL(Math.round(hue * 10) / 10, Math.round(sat * 10) / 10, Math.round(bri * 10) / 10),
        )

        // Create and apply updated matrix with scale
        const scaleVector = new Vector3(scale, scale, scale)
        const rotationQuaternion = new Quaternion()
        const updatedMatrix = new Matrix4().compose(position, rotationQuaternion, scaleVector)
        mesh.setMatrixAt(i, updatedMatrix)
      }
    }

    // Update instance colors and matrices
    for (const mesh of circles) {
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.instanceMatrix.needsUpdate = true
    }
  }

  function createStarField(count: number, spread: number): Points {
    // positions array: x,y,z for each star
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      // random point in a cube of side length 2*spread
      positions[i * 3 + 0] = (Math.random() - 0.5) * 2 * spread
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2 * spread
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2 * spread
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(positions, 3))

    const material = new PointsMaterial({
      size: 0.1,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      color: new Color().setHSL(mainHue / 360, 1.0, 0.8),
      //   color: 0xffffff,
    })

    const stars = new Points(geometry, material)
    // push the entire cloud far back so it never intersects the sun
    stars.position.set(0, 0, -spread / 2)
    return stars
  }

  function createSunCoreMesh(): Group {
    const coreGroup = new Group()
    const coreLayers = 3

    for (let i = 0; i < coreLayers; i++) {
      const layerRadius = sunRadius * (1 - i * 0.1)
      const geometry = new SphereGeometry(layerRadius, 32, 32)

      const layerHue = (mainHue + i * 10) % 360
      const material = new MeshBasicMaterial({
        color: new Color().setHSL(layerHue / 360, 1.0, 0.9 - i * 0.1),
        transparent: true,
        opacity: i === 0 ? 1 : 0.8,
      })

      const sphere = new Mesh(geometry, material)
      coreGroup.add(sphere)
    }

    return coreGroup
  }

  function createCoronaMesh(): Mesh {
    const geometry = new SphereGeometry(sunRadius * 1.2, 32, 32)
    const material = new MeshBasicMaterial({
      color: new Color().setHSL(mainHue / 360, 1.0, 0.8),
      transparent: true,
      opacity: 0.5,
      side: BackSide,
    })
    return new Mesh(geometry, material)
  }

  function createCircleMesh(): InstancedMesh {
    const torusGeometry = new TorusGeometry(0, 0.15, 16, 32)
    const mesh = new InstancedMesh(torusGeometry, undefined, circleInstances)

    const spread = sunRadius * 8
    // Generate circle positions using rectangle packing for more variety
    const packing = rectanglePacking(box(0, 0, spread, spread), spread / circleInstances, random)

    for (const [i, rect] of packing.entries()) {
      if (i >= circleInstances) break

      // Calculate radius from center for torus size
      const centerX = rect.center.x - sunRadius * 2
      const centerY = rect.center.y - sunRadius * 2
      const distanceFromCenter = Math.sqrt(centerX * centerX + centerY * centerY)

      // Scale based on distance from center
      const radiusMultiplier = map(distanceFromCenter, 0, sunRadius * 2, 0.5, 2.5)
      const angle = Math.atan2(centerY, centerX)

      // Position vector at appropriate radius from center
      const radius = sunRadius * radiusMultiplier
      const posX = Math.cos(angle) * radius
      const posY = Math.sin(angle) * radius

      // Adjust torus radius based on distance
      const torusRadius = map(distanceFromCenter, 0, sunRadius * 2, sunRadius * 0.5, sunRadius * 2)

      // Scale the torus instance instead of modifying the geometry
      const scaleFactor = torusRadius / torusGeometry.parameters.radius
      const scaleVector = new Vector3(scaleFactor, scaleFactor, scaleFactor)
      const positionVector = new Vector3(posX, posY, 0)

      mesh.setMatrixAt(i, new Matrix4().compose(positionVector, new Quaternion(), scaleVector))
    }

    return mesh
  }

  function createSunParticles(): Points {
    const positions = new Float32Array(sunParticles * 3)
    const sizes = new Float32Array(sunParticles)
    const colors = new Float32Array(sunParticles * 3)

    for (let i = 0; i < sunParticles; i++) {
      // Create particles in spherical distribution
      const theta = random.realZeroTo(Math.PI * 2)
      const phi = Math.acos(2 * random.realZeroTo(1) - 1)
      const r = sunRadius + random.real(0, sunRadius * 2)

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      sizes[i] = random.real(0.1, 0.3)
      // Set particle color (varying between main and secondary hue)
      const particleHue = (mainHue + random.real(-20, 20)) % 360
      const color = new Color().setHSL(particleHue / 360, 1.0, random.real(0.7, 1.0))
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(positions, 3))
    geometry.setAttribute("size", new BufferAttribute(sizes, 1))
    geometry.setAttribute("color", new BufferAttribute(colors, 3))

    const material = new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        
        void main() {
          vColor = color;
          vec3 pos = position;
          
          // Add slight motion to particles
          float noise = sin(time * 2.0 + position.x) * cos(time * 1.5 + position.y) * sin(time + position.z);
          pos += position * noise * 0.08;
          gl_PointSize = size * (400.0 / -mvPosition.z);
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        //   gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          // Create circular particle
          float r = distance(gl_PointCoord, vec2(0.5, 0.5));
          if (r > 0.5) discard;
          
          // Fade out towards edges
          float alpha = 1.0 - smoothstep(0.3, 0.5, r);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    })

    return new Points(geometry, material)
  }

  function updateParticles(particles: Points, time: number) {
    const material = particles.material as ShaderMaterial
    material.uniforms["time"].value = time

    // Slowly rotate the particle system
    particles.rotation.y = time * 0.1
  }

  function configureCamera(holeScale: number) {
    const k = (1 - holeScale) / (2 * holeScale)
    const fov = radToDeg(Math.atan(k)) * 2
    const z = sunRadius * 8
    const far = z + sunRadius * 10
    const camera = new PerspectiveCamera(fov, bbox.width / bbox.height, 0.1, far)
    camera.position.setZ(z)
    return camera
  }
})
