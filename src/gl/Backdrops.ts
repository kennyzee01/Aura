import { Renderer, Program, Mesh, Triangle, Texture } from 'ogl'

/**
 * Colourway backdrops, rendered as one WebGL plane.
 * `value` runs 0…N-1: its integer part picks the pair of plates, its fraction
 * drives a liquid, ink-like wipe between them — the new colour rises up
 * through the old one along a noisy front, refracting the light as it passes.
 */
const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tA;
  uniform sampler2D tB;
  uniform float uProg;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uMouse;

  // cover-fit a square texture into the viewport, focused slightly high
  vec2 cover(vec2 uv) {
    float ar = uRes.x / uRes.y;
    vec2 s = ar > 1.0 ? vec2(1.0, 1.0 / ar) : vec2(ar, 1.0);
    return (uv - 0.5) * s + vec2(0.5, 0.47);
  }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    // the light in the photograph breathes, and leans toward the pointer
    vec2 drift = vec2(sin(uTime * 0.21), cos(uTime * 0.17)) * 0.004 + uMouse * 0.012;

    // the front rises from bottom-left, through a turbulent fluid field
    float field = (1.0 - uv.y) * 0.78 + uv.x * 0.22;
    field += (fbm(uv * vec2(2.6, 3.4) + vec2(0.0, uTime * 0.06)) - 0.5) * 0.42;
    float p = mix(-0.25, 1.25, uProg);
    float w = 0.12;
    float m = smoothstep(1.0 - p - w, 1.0 - p + w, field); // 1 = new plate
    float edge = m * (1.0 - m) * 4.0;               // 0…1 at the front

    // refraction along the front, pushing the old image up and the new one down
    vec2 dir = normalize(vec2(-0.22, 0.78) + 0.001);
    vec2 uvA = cover(uv + drift + dir * edge * 0.06 * (1.0 - uProg));
    vec2 uvB = cover(uv + drift - dir * edge * 0.06 * uProg);
    vec3 a = texture2D(tA, uvA).rgb;
    vec3 b = texture2D(tB, uvB).rgb;
    vec3 col = mix(a, b, m);

    // a thin bright meniscus where the two liquids meet
    col += edge * edge * 0.18 * mix(a, b, 0.5) + edge * 0.025;

    // film grain keeps the gradients alive and hides banding
    col += (hash(uv * uRes + uTime) - 0.5) * 0.035;
    gl_FragColor = vec4(col, 1.0);
  }
`

export class Backdrops {
  renderer: Renderer
  program: Program
  mesh: Mesh
  textures: Texture[] = []
  value = 0
  mouse = { x: 0, y: 0 }
  private start = performance.now()
  private dead = false

  constructor(
    public canvas: HTMLCanvasElement,
    srcs: string[],
  ) {
    this.renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio, 1.5), alpha: false, antialias: false })
    const gl = this.renderer.gl
    gl.clearColor(0.1, 0.02, 0.04, 1)
    this.textures = srcs.map((src) => {
      const t = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR })
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        t.image = img
        this.render()
      }
      img.src = src
      return t
    })
    this.program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        tA: { value: this.textures[0] },
        tB: { value: this.textures[1] ?? this.textures[0] },
        uProg: { value: 0 },
        uTime: { value: 0 },
        uRes: { value: [1, 1] },
        uMouse: { value: [0, 0] },
      },
    })
    this.mesh = new Mesh(gl, { geometry: new Triangle(gl), program: this.program })
    this.resize()
  }

  resize() {
    // layout size, not the transformed (scaled) one
    const host = this.canvas.parentElement as HTMLElement
    const w = host.offsetWidth || innerWidth
    const h = host.offsetHeight || innerHeight
    this.renderer.setSize(w, h)
    this.program.uniforms.uRes.value = [w, h]
    this.render()
  }

  set(value: number) {
    const max = this.textures.length - 1
    this.value = Math.max(0, Math.min(max, value))
    let i = Math.floor(this.value)
    let f = this.value - i
    if (i >= max) {
      i = max - 1
      f = 1
    }
    this.program.uniforms.tA.value = this.textures[i]
    this.program.uniforms.tB.value = this.textures[i + 1]
    this.program.uniforms.uProg.value = f
  }

  render() {
    if (this.dead || this.renderer.gl.isContextLost()) return
    this.program.uniforms.uTime.value = (performance.now() - this.start) / 1000
    this.program.uniforms.uMouse.value = [this.mouse.x, this.mouse.y]
    this.renderer.render({ scene: this.mesh })
  }

  destroy() {
    this.dead = true
    this.renderer.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
