import { noise4d } from "library/core/random"
import { three } from "library/core/sketch"
import { map } from "library/utils"
import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
} from "three"

export default three(({ random, bbox }) => {
  // Configuration
  const loopDurationSeconds = 10
  const sunRadius = 1.5
  const numRadiatingCircles = 8
  const maxCircleRadius = 30
  const coreLayers = 3

  // Noise for animation
  const noise = noise4d(random)

  // Color setup
  const mainHue = random.realZeroTo(360)
  const secondHue = (mainHue + 30) % 360

  // Scene setup
  const scene = new Scene()

  // Camera configuration
  const camera = new PerspectiveCamera(45, bbox.width / bbox.height, 0.1, 100)
  camera.position.z = 12

  // Lighting
  //   const pointLight = new PointLight(new Color().setHSL(mainHue / 360, 1, 0.7), 1, 100)
  //   scene.add(pointLight)

  const ambientLight = new AmbientLight(0x333333)
  scene.add(ambientLight)

  // Sun object container
  const sunGroup = new Group()
  scene.add(sunGroup)

  // Create sun core
  const sunCore = createSunCore(sunRadius, mainHue)
  sunGroup.add(sunCore)

  // Create sun corona
  const corona = createCorona(sunRadius * 1.5, mainHue)
  //   sunGroup.add(corona)

  // Create radiating circles
  const circleGroups = createRadiatingCircles(numRadiatingCircles, sunRadius, maxCircleRadius, mainHue, secondHue)
  circleGroups.forEach((group) => sunGroup.add(group))

  // Create particle system for sun atmosphere
  const particles = createSunParticles(sunRadius * 3, 2000)
  sunGroup.add(particles)

  // Animation update function
  const update = (totalTime: number, deltaTime: number) => {
    // Slowly rotate the sun
    sunCore.rotation.y += deltaTime * 0.1
    sunCore.rotation.x += deltaTime * 0.05

    // Animate corona
    updateCorona(corona, totalTime)

    // Animate each radiating circle
    updateRadiatingCircles(circleGroups, totalTime, loopDurationSeconds)

    // Animate particles
    updateParticles(particles, totalTime)

    // Camera slight motion
    const cameraOffset = 0.8
    camera.position.x = Math.sin(totalTime * 0.2) * cameraOffset
    camera.position.y = Math.cos(totalTime * 0.3) * cameraOffset
    camera.lookAt(0, 0, 0)
  }

  return { scene, camera, update }

  // Function to create the sun's core
  function createSunCore(radius: number, hue: number) {
    const coreGroup = new Group()

    // Create multiple layers for the core with different materials
    for (let i = 0; i < coreLayers; i++) {
      const layerRadius = radius * (1 - i * 0.1)
      const geometry = new SphereGeometry(layerRadius, 32, 32)

      const layerHue = (hue + i * 10) % 360
      const material = new MeshBasicMaterial({
        color: new Color().setHSL(layerHue / 360, 0.9, 0.7 - i * 0.1),
        transparent: true,
        opacity: i === 0 ? 1 : 0.7,
      })

      const sphere = new Mesh(geometry, material)
      coreGroup.add(sphere)
    }

    return coreGroup
  }

  // Function to create corona effect around the sun
  function createCorona(radius: number, hue: number) {
    const geometry = new SphereGeometry(radius * 1.2, 32, 32)
    const material = new MeshBasicMaterial({
      color: new Color().setHSL(hue / 360, 0.8, 0.5),
      transparent: true,
      opacity: 0.3,
      side: BackSide,
    })
    return new Mesh(geometry, material)
  }

  // Update corona effect
  function updateCorona(corona: Mesh, time: number) {
    const pulseFactor = Math.sin(time * 2) * 0.1 + 1
    corona.scale.set(pulseFactor, pulseFactor, pulseFactor)
  }

  // Function to create radiating circles
  function createRadiatingCircles(count: number, innerRadius: number, outerRadius: number, hue1: number, hue2: number) {
    const groups: Group[] = []

    for (let i = 0; i < count; i++) {
      const group = new Group()
      const angle1 = (Math.PI * 2 * i) / count
      const angle2 = (Math.PI * 2 * (i + 0.5)) / count

      // Create main circle
      const circle = createCircle(innerRadius * 1.2, outerRadius, 0.15, hue1, i)
      circle.rotation.z = angle1
      group.add(circle)

      // Create secondary circle with offset rotation
      const circle2 = createCircle(innerRadius * 1.5, outerRadius * 0.8, 0.12, hue2, i + count)
      circle2.rotation.z = angle2
      group.add(circle2)

      // Add to collection
      groups.push(group)
    }

    return groups
  }

  // Create a single circle
  function createCircle(innerRadius: number, outerRadius: number, thickness: number, hue: number, seed: number) {
    const geometry = new TorusGeometry((innerRadius + outerRadius) / 2, thickness, 16, 64)

    const material = new MeshStandardMaterial({
      color: new Color().setHSL(hue / 360, 0.8, 0.6),
      emissive: new Color().setHSL(hue / 360, 0.7, 0.3),
      transparent: true,
      opacity: 0.7,
    })

    const circle = new Mesh(geometry, material)

    // Tilt the circle slightly
    circle.rotation.x = (Math.PI / 2) * (0.1 + seed * 0.05)

    return circle
  }

  // Update radiating circles animation
  function updateRadiatingCircles(groups: Group[], totalTime: number, duration: number) {
    groups.forEach((group, index) => {
      // Adjust rotation speed based on circle index
      const rotationSpeed = 0.2 - index * 0.01
      group.rotation.x = totalTime * rotationSpeed * 0.2
      group.rotation.y = totalTime * rotationSpeed * 0.3

      // Scale the radiating circles
      group.children.forEach((circle, childIndex) => {
        const offset = index * 0.1 + childIndex * 0.2
        const circleMesh = circle as Mesh
        const material = circleMesh.material as MeshStandardMaterial

        // Calculate animation phase
        const phase = (totalTime / duration + offset) % 1

        // Expand circles outward and fade them out
        if (phase < 0.8) {
          const scale = map(phase, 0, 0.8, 0.1, 1)
          circle.scale.set(scale, scale, scale)
          material.opacity = map(phase, 0, 0.8, 0.9, 0.3)
        } else {
          // Reset the circle when phase completes
          const scale = map(phase, 0.8, 1, 1, 0.1)
          circle.scale.set(scale, scale, scale)
          material.opacity = map(phase, 0.8, 1, 0.3, 0.9)
        }

        // Adjust color based on noise
        const hueShift = noise(index, childIndex, totalTime * 0.2, 1000) * 20
        const currentHue = (material.color.getHSL({ h: 0, s: 0, l: 0 }).h * 360 + hueShift) % 360
        material.color.setHSL(currentHue / 360, 0.8, 0.6)
        material.emissive.setHSL(currentHue / 360, 0.7, 0.3)
      })
    })
  }

  // Create particle system for sun atmosphere
  function createSunParticles(radius: number, count: number) {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      // Create particles in spherical distribution
      const theta = random.realZeroTo(Math.PI * 2)
      const phi = Math.acos(2 * random.realZeroTo(1) - 1)
      const r = sunRadius + random.real(0, radius)

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      // Randomize particle size
      sizes[i] = random.real(0.05, 0.2)

      // Set particle color (varying between main and secondary hue)
      const particleHue = (mainHue + random.real(-30, 30)) % 360
      const color = new Color().setHSL(particleHue / 360, 0.9, 0.7)
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
          pos += position * noise * 0.05;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
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

  // Update particle system
  function updateParticles(particles: Points, time: number) {
    const material = particles.material as ShaderMaterial
    material.uniforms["time"].value = time

    // Slowly rotate the particle system
    particles.rotation.y = time * 0.1
  }
})
