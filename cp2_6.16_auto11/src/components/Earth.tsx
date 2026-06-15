import { useMemo, useEffect } from 'react'
import * as THREE from 'three'

const EARTH_RADIUS = 3

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const atmosphereFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = 1.0 - dot(viewDir, vNormal);
    fresnel = pow(fresnel, 3.0);
    vec3 glowColor = vec3(0.118, 0.533, 0.898);
    gl_FragColor = vec4(glowColor, fresnel * 0.55);
  }
`

function generateEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1024
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#0d2137'
  ctx.fillRect(0, 0, 2048, 1024)

  const continentPaths: [number, number][][] = [
    [[-130,55],[-120,62],[-100,68],[-80,72],[-65,62],[-58,48],[-68,44],[-75,38],[-82,30],[-90,28],[-98,22],[-105,20],[-110,24],[-118,32],[-122,38],[-125,48],[-130,55]],
    [[-85,72],[-80,76],[-70,78],[-60,76],[-55,72],[-60,68],[-70,66],[-80,68],[-85,72]],
    [[-80,10],[-75,5],[-70,-2],[-75,-15],[-72,-25],[-68,-35],[-72,-46],[-76,-52],[-72,-55],[-66,-52],[-56,-38],[-50,-25],[-44,-18],[-50,-8],[-55,0],[-62,5],[-72,10],[-80,10]],
    [[-10,36],[0,40],[3,44],[-2,48],[-8,48],[2,52],[8,54],[12,55],[18,56],[24,58],[30,60],[36,56],[30,46],[28,40],[22,36],[12,36],[2,36],[-10,36]],
    [[-15,35],[-17,28],[-15,18],[-12,10],[-5,5],[5,4],[10,0],[15,-5],[22,-12],[30,-18],[35,-28],[32,-35],[26,-34],[20,-28],[12,-18],[8,-10],[5,0],[10,5],[18,12],[28,18],[35,28],[32,34],[25,37],[15,37],[5,37],[-5,36],[-10,36],[-15,35]],
    [[28,38],[35,42],[42,44],[50,46],[58,44],[68,40],[78,36],[88,28],[95,22],[100,18],[106,14],[110,18],[115,24],[120,32],[126,38],[130,44],[136,48],[142,52],[148,58],[156,62],[164,66],[172,68],[180,68],[180,72],[168,72],[156,70],[146,64],[136,58],[126,52],[116,48],[106,48],[96,48],[86,48],[76,52],[66,55],[56,52],[46,48],[36,42],[28,38]],
    [[68,22],[72,18],[78,14],[82,10],[86,14],[90,22],[88,24],[82,26],[76,24],[68,22]],
    [[115,-14],[122,-14],[132,-12],[142,-16],[150,-22],[154,-28],[150,-34],[144,-38],[138,-36],[132,-34],[126,-30],[118,-24],[115,-18],[115,-14]],
  ]

  ctx.fillStyle = '#1a3a4a'
  continentPaths.forEach((path) => {
    ctx.beginPath()
    path.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * 2048
      const y = ((90 - lat) / 180) * 1024
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fill()
  })

  ctx.strokeStyle = 'rgba(30, 136, 229, 0.35)'
  ctx.lineWidth = 1.5
  continentPaths.forEach((path) => {
    ctx.beginPath()
    path.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * 2048
      const y = ((90 - lat) / 180) * 1024
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.stroke()
  })

  ctx.strokeStyle = 'rgba(30, 136, 229, 0.12)'
  ctx.lineWidth = 0.8
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * 1024
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(2048, y)
    ctx.stroke()
  }
  for (let lon = -150; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * 2048
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 1024)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(30, 136, 229, 0.25)'
  ctx.lineWidth = 1.2
  const equatorY = 1024 / 2
  ctx.beginPath()
  ctx.moveTo(0, equatorY)
  ctx.lineTo(2048, equatorY)
  ctx.stroke()
  const primeMeridianX = (180 / 360) * 2048
  ctx.beginPath()
  ctx.moveTo(primeMeridianX, 0)
  ctx.lineTo(primeMeridianX, 1024)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

export default function Earth() {
  const texture = useMemo(() => generateEarthTexture(), [])
  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  )

  useEffect(() => {
    return () => {
      texture.dispose()
      atmosphereMaterial.dispose()
    }
  }, [texture, atmosphereMaterial])

  return (
    <>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 64, 32]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.8}
          metalness={0.1}
          emissive={new THREE.Color('#0a1628')}
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh material={atmosphereMaterial}>
        <sphereGeometry args={[EARTH_RADIUS * 1.05, 64, 32]} />
      </mesh>
    </>
  )
}
