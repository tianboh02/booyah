// Shared particle-globe scene used by the auth screen (full-screen) and inline loaders (e.g. Jobs).
// Canvas 2D with a hand-rolled perspective projection; no WebGL needed.

// ==========================================================================
// 1. SCENE CONSTANTS
// ==========================================================================
const CAM = 4 // camera distance, in globe radii
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

// Ring is tilted on two axes so it reads as an ellipse crossing the globe
const TX_C = Math.cos(0.42), TX_S = Math.sin(0.42)
const TZ_C = Math.cos(0.18), TZ_S = Math.sin(0.18)
const BASE_PITCH = 0.2

// Success sequence: particles assemble into the avatar, hold, then warp out
const MORPH_MS = 1100
const HOLD_MS = 800
const WARP_MS = 650
export const SUCCESS_MS = MORPH_MS + HOLD_MS + WARP_MS

const AVATAR_GRID = 58 // avatar is sampled at 58x58, ~2640 pixels inside the circle
const AVATAR_RADIUS = 0.9

const BLUE = [107, 138, 255]
const BRIGHT = [214, 224, 255]
const PURPLE = [163, 113, 247]
const OCEAN = [72, 94, 196]
// One colour per data source Booyah pulls from: GitHub, Hacker News, registries
export const SIGNALS = [[63, 185, 80], [255, 138, 61], [163, 113, 247]]

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const rgba = (r, g, b, a) => `rgba(${r | 0},${g | 0},${b | 0},${a})`

// ==========================================================================
// 2. SCENE ENGINE
// ==========================================================================
export function createScene(canvas, {
    reduceMotion = false,
    sphereCount = 2000,
    ringCount = 900,
    starCount = 220,
    signals = SIGNALS,
    ambientArcs = true,
    arcGap = [220, 260], // ambient arc spacing: min ms + random ms
    centerY = 0.45, // globe centre, as a share of canvas height
    radius = 0.2, // globe radius, as a share of the canvas's shorter side
    light = false // light backdrop: normal blending and darker particles, since additive blending vanishes on white
} = {}) {
    const ctx = canvas.getContext('2d')
    const SPHERE_N = sphereCount
    const N = sphereCount + ringCount
    let w = 0, h = 0, cx = 0, cy = 0, R = 1

    // Sphere particles store a unit position; ring particles store (angle, radius, height)
    const home = new Float32Array(N * 3)
    const start = new Float32Array(N * 3)
    const colour = new Float32Array(N * 3)
    const size = new Float32Array(N)
    const glow = new Float32Array(N)
    const delay = new Float32Array(N)
    const seed = new Float32Array(N)
    const target = new Float32Array(N * 3) // morph target: x, y, dot size
    const targetColour = new Float32Array(N * 3)

    for (let i = 0; i < N; i++) {
        const o = i * 3
        const roll = Math.random()
        if (i < SPHERE_N) {
            const y = 1 - (i / (SPHERE_N - 1)) * 2
            const r = Math.sqrt(1 - y * y)
            const x = Math.cos(GOLDEN * i) * r
            const z = Math.sin(GOLDEN * i) * r
            home.set([x, y, z], o)
            // Smooth pseudo-noise carves "continents" out of the globe
            const land = Math.sin(3 * x + 1.3) * Math.sin(3 * y + 0.7) * Math.sin(3 * z + 2.1)
                + 0.5 * Math.sin(5 * x - 2) * Math.sin(4 * z + 1) > 0
            size[i] = land ? 2 + Math.random() * 0.6 : 1.2
            glow[i] = land ? 1 : 0.6
            colour.set(land ? (roll < 0.14 ? BRIGHT : BLUE) : OCEAN, o)
        } else {
            home[o] = Math.random() * Math.PI * 2
            home[o + 1] = 1.45 + Math.pow(Math.random(), 1.8) * 0.8
            home[o + 2] = (Math.random() - 0.5) * 0.06
            size[i] = 0.8 + Math.random() * 1.1
            glow[i] = 0.85
            colour.set(roll < 0.18 ? PURPLE : roll < 0.25 ? BRIGHT : BLUE, o)
        }
        // Scattered start positions for the fly-in
        const u = Math.random() * 2 - 1
        const a = Math.random() * Math.PI * 2
        const d = 4 + Math.random() * 5
        const s = Math.sqrt(1 - u * u)
        start.set([Math.cos(a) * s * d, u * d, Math.sin(a) * s * d], o)
        delay[i] = Math.random() * 700
        seed[i] = Math.random()
    }

    const stars = Array.from({ length: starCount }, () => ({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        d: 0.2 + Math.random() * 0.8,
        tw: Math.random() * Math.PI * 2,
        s: Math.random() < 0.1 ? 1.8 : 1
    }))

    let mode = 'loading'
    let tint = [240, 136, 62]
    let instab = 0, speed = 1, spin = 0, ringSpin = 0
    let yaw = 0, pitch = 0, tYaw = 0, tPitch = 0
    let cyaw = 1, syaw = 0, cpit = 1, spit = 0, cspin = 1, sspin = 0
    let successAt = 0, hooks = {}, welcomed = false, faded = false, done = false
    const arcs = []
    const flashes = []
    const P = new Float32Array(3)
    const t0 = performance.now()
    let last = t0, nextArcAt = t0 + 1000, raf = 0

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        w = canvas.clientWidth
        h = canvas.clientHeight
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        cx = w / 2
        cy = h * centerY
        R = Math.min(w, h) * radius
    }

    // Parallax is measured against the canvas, so it works full-screen and inside a card
    function onPointer(e) {
        const rect = canvas.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        tYaw = clamp01((e.clientX - rect.left) / rect.width) * 0.5 - 0.25
        tPitch = clamp01((e.clientY - rect.top) / rect.height) * 0.3 - 0.15
    }

    // Globe-local point -> spun globe -> camera -> screen. Writes [sx, sy, cameraZ] into P.
    function projectGlobePoint(x, y, z) {
        const x0 = x * cspin + z * sspin
        const z0 = -x * sspin + z * cspin
        const x1 = x0 * cyaw + z0 * syaw
        const z1 = -x0 * syaw + z0 * cyaw
        const y2 = y * cpit - z1 * spit
        const z2 = y * spit + z1 * cpit
        const k = CAM / (CAM + z2)
        P[0] = cx + x1 * R * k
        P[1] = cy + y2 * R * k
        P[2] = z2
    }

    const depthAlpha = (z) => 0.15 + 0.85 * clamp01((1.3 - z) / 2.6)

    const starColour = (a) => (light ? rgba(70, 90, 170, a * 0.7) : rgba(200, 210, 255, a))

    function drawStars(t, warp) {
        for (const st of stars) {
            const x = cx + st.x * w * 0.6 - yaw * st.d * 40
            const y = cy + st.y * h * 0.6 - pitch * st.d * 40
            const a = (0.25 + 0.45 * st.d) * (0.6 + 0.4 * Math.sin(t * 0.002 + st.tw))
            if (warp > 0) {
                const stretch = 1 + warp * 1.6 * st.d
                ctx.strokeStyle = starColour(Math.min(1, a + warp * 0.5))
                ctx.lineWidth = st.s
                ctx.beginPath()
                ctx.moveTo(x, y)
                ctx.lineTo(cx + (x - cx) * stretch, cy + (y - cy) * stretch)
                ctx.stroke()
            } else {
                ctx.fillStyle = starColour(a)
                ctx.fillRect(x, y, st.s, st.s)
            }
        }
    }

    function drawGlow(t, ts) {
        const fade = ts >= 0 ? 1 - clamp01(ts / 500) : 1
        if (fade <= 0) return
        const r = BLUE[0] + (tint[0] - BLUE[0]) * instab
        const g = BLUE[1] + (tint[1] - BLUE[1]) * instab
        const b = BLUE[2] + (tint[2] - BLUE[2]) * instab
        const pulse = (0.85 + 0.15 * Math.sin(t * 0.002)) * (light ? 1.3 : 1)

        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6)
        core.addColorStop(0, rgba(r, g, b, 0.2 * pulse * fade))
        core.addColorStop(0.45, rgba(r, g, b, 0.06 * fade))
        core.addColorStop(1, rgba(r, g, b, 0))
        ctx.fillStyle = core
        ctx.fillRect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2)

        // Atmosphere rim hugging the globe's silhouette
        const rimFade = fade * (1 - instab * 0.7)
        const rim = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.28)
        rim.addColorStop(0, rgba(r, g, b, 0))
        rim.addColorStop(0.3, rgba(r, g, b, 0.16 * rimFade))
        rim.addColorStop(1, rgba(r, g, b, 0))
        ctx.fillStyle = rim
        ctx.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6)
    }

    function drawParticles(t, ts, warp) {
        const morphing = ts >= 0
        const shade = light ? 0.62 : 1 // the pale particles would disappear on a light backdrop
        for (let i = 0; i < N; i++) {
            const o = i * 3
            let x, y, z
            if (i < SPHERE_N) {
                const hx = home[o], hz = home[o + 2]
                x = hx * cspin + hz * sspin
                y = home[o + 1]
                z = -hx * sspin + hz * cspin
            } else {
                // Inner ring particles orbit faster, so the ring slowly shears
                const r = home[o + 1]
                const a = home[o] + ringSpin * (1.6 - r * 0.4)
                const lx = Math.cos(a) * r, ly = home[o + 2], lz = Math.sin(a) * r
                const y1 = ly * TX_C - lz * TX_S
                z = ly * TX_S + lz * TX_C
                x = lx * TZ_C - y1 * TZ_S
                y = lx * TZ_S + y1 * TZ_C
            }

            // Fly-in from scattered positions
            const p = reduceMotion ? 1 : easeOutCubic(clamp01((t - delay[i]) / 1400))
            if (p < 1) {
                x = start[o] + (x - start[o]) * p
                y = start[o + 1] + (y - start[o + 1]) * p
                z = start[o + 2] + (z - start[o + 2]) * p
            }

            // Error state: the globe loses power, drifting apart and sagging
            const sd = seed[i]
            if (instab > 0.001) {
                const grow = 1 + instab * (sd * 0.35 + 0.06 * Math.sin(t * 0.0015 * (0.5 + sd) + sd * 40))
                x *= grow
                y = y * grow + instab * sd * 0.35
                z *= grow
            }

            // Camera
            const x1 = x * cyaw + z * syaw
            const z1 = -x * syaw + z * cyaw
            let px = x1
            let py = y * cpit - z1 * spit
            let pz = y * spit + z1 * cpit

            let r = colour[o] * shade, g = colour[o + 1] * shade, b = colour[o + 2] * shade
            if (instab > 0.001) {
                r += (tint[0] - r) * instab
                g += (tint[1] - g) * instab
                b += (tint[2] - b) * instab
            }
            let alpha = (0.3 + 0.7 * clamp01((1.3 - pz) / 2.6)) * glow[i] * (1 - instab * 0.35)
            let s = size[i]

            // Success: spiral into the avatar, swooping towards the camera mid-flight
            if (morphing) {
                const m = easeInOutCubic(clamp01((ts - delay[i] * 0.5) / (MORPH_MS - 350)))
                if (m > 0) {
                    const ang = (1 - m) * 2.2
                    const ca = Math.cos(ang), sa = Math.sin(ang)
                    const tx = target[o] * ca - target[o + 1] * sa
                    const ty = target[o] * sa + target[o + 1] * ca
                    px += (tx - px) * m
                    py += (ty - py) * m
                    pz += -pz * m - Math.sin(Math.PI * m) * 0.9
                    r += (targetColour[o] - r) * m
                    g += (targetColour[o + 1] - g) * m
                    b += (targetColour[o + 2] - b) * m
                    alpha += (1 - alpha) * m
                    s += (target[o + 2] - s) * m
                }
            }
            if (warp > 0) pz -= warp * (2.5 + sd * 3)

            const depth = CAM + pz
            if (depth < 0.35) continue
            const k = CAM / depth
            const sx = cx + px * R * k
            const sy = cy + py * R * k
            const dot = Math.min(s * k, 9)

            if (warp > 0) {
                // Streak back along the direction of travel
                const k2 = CAM / (depth + 0.25 + warp * 0.8)
                ctx.strokeStyle = rgba(r, g, b, alpha)
                ctx.lineWidth = Math.min(dot, 4)
                ctx.beginPath()
                ctx.moveTo(cx + px * R * k2, cy + py * R * k2)
                ctx.lineTo(sx, sy)
                ctx.stroke()
            } else {
                ctx.fillStyle = rgba(r, g, b, alpha)
                ctx.fillRect(sx - dot / 2, sy - dot / 2, dot, dot)
            }
        }
    }

    function spawnArc(now, c) {
        const pick = () => {
            const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u)
            return [Math.cos(a) * s, u, Math.sin(a) * s]
        }
        const a = pick()
        let b = pick()
        let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
        while (dot > 0.6 || dot < -0.6) {
            b = pick()
            dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
        }
        arcs.push({
            a, b,
            omega: Math.acos(dot),
            born: now,
            dur: 1100 + Math.random() * 700,
            c: c || signals[(Math.random() * signals.length) | 0],
            landed: false
        })
    }

    // Point on the great circle from a to b, lifted off the surface mid-flight
    function arcPoint(arc, u) {
        const so = Math.sin(arc.omega)
        const ka = Math.sin((1 - u) * arc.omega) / so
        const kb = Math.sin(u * arc.omega) / so
        const lift = 1 + Math.sin(Math.PI * u) * (0.18 + arc.omega * 0.18)
        projectGlobePoint(
            (arc.a[0] * ka + arc.b[0] * kb) * lift,
            (arc.a[1] * ka + arc.b[1] * kb) * lift,
            (arc.a[2] * ka + arc.b[2] * kb) * lift
        )
        // Hide the parts of the arc that pass behind the globe
        const hidden = P[2] > 0 && Math.hypot(P[0] - cx, P[1] - cy) < R
        return depthAlpha(P[2]) * (hidden ? 0.12 : 1)
    }

    function drawArcs(now, fade) {
        if (fade <= 0.01) {
            arcs.length = 0
            flashes.length = 0
            return
        }
        const STEPS = 16
        for (let j = arcs.length - 1; j >= 0; j--) {
            const arc = arcs[j]
            const life = ((now - arc.born) / arc.dur) * 1.3
            const head = clamp01(life)
            const tail = clamp01(life - 0.4)
            if (tail >= 1) {
                arcs.splice(j, 1)
                continue
            }
            if (head >= 1 && !arc.landed) {
                arc.landed = true
                flashes.push({ p: arc.b, born: now, c: arc.c })
            }
            const [r, g, b] = arc.c
            let prevX = 0, prevY = 0
            for (let s = 0; s <= STEPS; s++) {
                const a = arcPoint(arc, tail + (head - tail) * (s / STEPS))
                if (s > 0) {
                    ctx.strokeStyle = rgba(r, g, b, (s / STEPS) * a * fade)
                    ctx.lineWidth = 1 + 1.2 * (s / STEPS)
                    ctx.beginPath()
                    ctx.moveTo(prevX, prevY)
                    ctx.lineTo(P[0], P[1])
                    ctx.stroke()
                }
                prevX = P[0]
                prevY = P[1]
            }
            if (head < 1) {
                const a = arcPoint(arc, head) * fade
                ctx.fillStyle = rgba(r, g, b, 0.15 * a)
                ctx.beginPath()
                ctx.arc(P[0], P[1], 7, 0, Math.PI * 2)
                ctx.fill()
                ctx.fillStyle = light ? rgba(20, 30, 70, 0.9 * a) : rgba(255, 255, 255, 0.9 * a)
                ctx.beginPath()
                ctx.arc(P[0], P[1], 1.8, 0, Math.PI * 2)
                ctx.fill()
            }
        }
        // Ripple where a signal lands
        for (let j = flashes.length - 1; j >= 0; j--) {
            const f = flashes[j]
            const age = (now - f.born) / 650
            if (age >= 1) {
                flashes.splice(j, 1)
                continue
            }
            projectGlobePoint(f.p[0], f.p[1], f.p[2])
            const hidden = P[2] > 0 && Math.hypot(P[0] - cx, P[1] - cy) < R
            if (hidden) continue
            ctx.strokeStyle = rgba(f.c[0], f.c[1], f.c[2], (1 - age) * 0.8 * depthAlpha(P[2]) * fade)
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.arc(P[0], P[1], 2 + age * 14, 0, Math.PI * 2)
            ctx.stroke()
        }
    }

    function frame(now) {
        raf = requestAnimationFrame(frame)
        const dt = Math.min(now - last, 50)
        last = now
        const t = now - t0
        const motion = reduceMotion ? 0.3 : 1

        instab += ((mode === 'error' ? 1 : 0) - instab) * Math.min(1, dt * 0.0025)
        speed += ((mode === 'error' ? 0.25 : 1) - speed) * Math.min(1, dt * 0.002)
        spin += dt * 0.00028 * speed * motion
        ringSpin += dt * 0.00045 * speed * motion
        yaw += (tYaw - yaw) * Math.min(1, dt * 0.004)
        pitch += (tPitch - pitch) * Math.min(1, dt * 0.004)
        cyaw = Math.cos(yaw); syaw = Math.sin(yaw)
        cpit = Math.cos(BASE_PITCH + pitch); spit = Math.sin(BASE_PITCH + pitch)
        cspin = Math.cos(spin); sspin = Math.sin(spin)

        const ts = mode === 'success' ? now - successAt : -1
        const warpRaw = ts > MORPH_MS + HOLD_MS ? clamp01((ts - MORPH_MS - HOLD_MS) / WARP_MS) : 0
        const warp = warpRaw * warpRaw * warpRaw
        if (ts >= MORPH_MS * 0.75 && !welcomed) {
            welcomed = true
            hooks.onWelcome?.()
        }
        if (warpRaw > 0.3 && !faded) {
            faded = true
            hooks.onFade?.()
        }
        if (ts >= SUCCESS_MS && !done) {
            done = true
            hooks.onDone?.()
        }

        if (ambientArcs && mode === 'loading' && t > 1000 && now >= nextArcAt) {
            spawnArc(now)
            nextArcAt = now + (reduceMotion ? 900 : arcGap[0] + Math.random() * arcGap[1])
        }

        ctx.clearRect(0, 0, w, h)
        ctx.globalCompositeOperation = light ? 'source-over' : 'lighter'
        drawStars(t, warp)
        drawGlow(t, ts)
        drawParticles(t, ts, warp)
        drawArcs(now, ts >= 0 ? 1 - clamp01(ts / 300) : 1 - instab)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener('pointermove', onPointer)
    raf = requestAnimationFrame(frame)

    return {
        setLight(next) {
            light = next
        },
        setMode(next, nextTint) {
            mode = next
            if (nextTint) tint = nextTint
        },
        // Fires one arc on demand, e.g. when a request comes back
        emitSignal(c) {
            if (mode === 'loading') spawnArc(performance.now(), c)
        },
        // points: flat [x, y, r, g, b, ...] in globe radii; spare particles form a halo
        success(points, nextHooks) {
            const count = Math.min(points.length / 5, N)
            const order = Array.from({ length: N }, (_, i) => i)
            for (let i = N - 1; i > 0; i--) {
                const j = (Math.random() * (i + 1)) | 0;
                [order[i], order[j]] = [order[j], order[i]]
            }
            const dot = ((2 * AVATAR_RADIUS) / AVATAR_GRID) * R * 0.96
            for (let j = 0; j < N; j++) {
                const o = order[j] * 3
                if (j < count) {
                    const q = j * 5
                    target.set([points[q], points[q + 1], dot], o)
                    targetColour.set([points[q + 2], points[q + 3], points[q + 4]], o)
                } else {
                    const a = ((j - count) / (N - count)) * Math.PI * 2
                    target.set([Math.cos(a) * AVATAR_RADIUS * 1.08, Math.sin(a) * AVATAR_RADIUS * 1.08, 1.6], o)
                    targetColour.set(BLUE, o)
                }
            }
            hooks = nextHooks
            successAt = performance.now()
            mode = 'success'
        },
        destroy() {
            cancelAnimationFrame(raf)
            observer.disconnect()
            window.removeEventListener('pointermove', onPointer)
        }
    }
}

// Samples the GitHub avatar into a disc of coloured points; falls back to a brand gradient
export async function sampleAvatar(url) {
    let pixels = null
    try {
        const src = new URL(url)
        src.searchParams.set('s', String(AVATAR_GRID * 2))
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = src.href
        await Promise.race([img.decode(), new Promise((_, reject) => setTimeout(reject, 1500))])
        const c = document.createElement('canvas')
        c.width = c.height = AVATAR_GRID
        const cctx = c.getContext('2d', { willReadFrequently: true })
        cctx.fillStyle = '#0e1014'
        cctx.fillRect(0, 0, AVATAR_GRID, AVATAR_GRID)
        cctx.drawImage(img, 0, 0, AVATAR_GRID, AVATAR_GRID)
        pixels = cctx.getImageData(0, 0, AVATAR_GRID, AVATAR_GRID).data
    } catch {
        // No avatar (missing, slow, or blocked by CORS): use the brand disc instead
    }

    const half = AVATAR_GRID / 2
    const points = []
    for (let gy = 0; gy < AVATAR_GRID; gy++) {
        for (let gx = 0; gx < AVATAR_GRID; gx++) {
            const nx = (gx + 0.5 - half) / half
            const ny = (gy + 0.5 - half) / half
            if (nx * nx + ny * ny > 1) continue
            let r, g, b
            if (pixels) {
                const idx = (gy * AVATAR_GRID + gx) * 4
                r = pixels[idx]; g = pixels[idx + 1]; b = pixels[idx + 2]
            } else {
                const mix = (nx - ny + 2) / 4
                r = BLUE[0] + (PURPLE[0] - BLUE[0]) * mix
                g = BLUE[1] + (PURPLE[1] - BLUE[1]) * mix
                b = BLUE[2] + (PURPLE[2] - BLUE[2]) * mix
            }
            points.push(nx * AVATAR_RADIUS, ny * AVATAR_RADIUS, r, g, b)
        }
    }
    return new Float32Array(points)
}
