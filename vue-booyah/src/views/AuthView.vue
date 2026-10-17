<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import API from '@/api.js'
import GitHubSSO from '@/components/landing/GitHubSSO.vue'

// ==========================================================================
// 1. SCENE CONSTANTS
// ==========================================================================
const SPHERE_N = 2000
const RING_N = 900
const N = SPHERE_N + RING_N
const STAR_N = 220
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
const SUCCESS_MS = MORPH_MS + HOLD_MS + WARP_MS

const AVATAR_GRID = 58 // avatar is sampled at 58x58, ~2640 pixels inside the circle
const AVATAR_RADIUS = 0.9

const BLUE = [107, 138, 255]
const BRIGHT = [214, 224, 255]
const PURPLE = [163, 113, 247]
const OCEAN = [72, 94, 196]
// One colour per data source Booyah pulls from: GitHub, Hacker News, registries
const SIGNALS = [[63, 185, 80], [255, 138, 61], [163, 113, 247]]

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const rgba = (r, g, b, a) => `rgba(${r | 0},${g | 0},${b | 0},${a})`

// ==========================================================================
// 2. SCENE ENGINE (canvas 2D with a hand-rolled perspective projection)
// ==========================================================================
function createScene(canvas, { reduceMotion }) {
    const ctx = canvas.getContext('2d')
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

    const stars = Array.from({ length: STAR_N }, () => ({
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
        cy = h * 0.45
        R = Math.min(w, h) * 0.2
    }

    function onPointer(e) {
        tYaw = (e.clientX / w - 0.5) * 0.5
        tPitch = (e.clientY / h - 0.5) * 0.3
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

    function drawStars(t, warp) {
        for (const st of stars) {
            const x = cx + st.x * w * 0.6 - yaw * st.d * 40
            const y = cy + st.y * h * 0.6 - pitch * st.d * 40
            const a = (0.25 + 0.45 * st.d) * (0.6 + 0.4 * Math.sin(t * 0.002 + st.tw))
            if (warp > 0) {
                const stretch = 1 + warp * 1.6 * st.d
                ctx.strokeStyle = rgba(200, 210, 255, Math.min(1, a + warp * 0.5))
                ctx.lineWidth = st.s
                ctx.beginPath()
                ctx.moveTo(x, y)
                ctx.lineTo(cx + (x - cx) * stretch, cy + (y - cy) * stretch)
                ctx.stroke()
            } else {
                ctx.fillStyle = rgba(200, 210, 255, a)
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
        const pulse = 0.85 + 0.15 * Math.sin(t * 0.002)

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

            let r = colour[o], g = colour[o + 1], b = colour[o + 2]
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

    function spawnArc(now) {
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
            c: SIGNALS[(Math.random() * SIGNALS.length) | 0],
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
                ctx.fillStyle = rgba(255, 255, 255, 0.9 * a)
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

        if (mode === 'loading' && t > 1000 && now >= nextArcAt) {
            spawnArc(now)
            nextArcAt = now + (reduceMotion ? 900 : 220 + Math.random() * 260)
        }

        ctx.clearRect(0, 0, w, h)
        ctx.globalCompositeOperation = 'lighter'
        drawStars(t, warp)
        drawGlow(t, ts)
        drawParticles(t, ts, warp)
        drawArcs(now, ts >= 0 ? 1 - clamp01(ts / 300) : 1 - instab)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointer)
    raf = requestAnimationFrame(frame)

    return {
        setMode(next, nextTint) {
            mode = next
            if (nextTint) tint = nextTint
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
            window.removeEventListener('resize', resize)
            window.removeEventListener('pointermove', onPointer)
        }
    }
}

// Samples the GitHub avatar into a disc of coloured points; falls back to a brand gradient
async function sampleAvatar(url) {
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

// ==========================================================================
// 3. USER-FACING ERROR COPY
// ==========================================================================
const ERROR_COPY = {
    denied: {
        icon: 'cancel', tint: [139, 148, 158],
        title: 'Sign-in cancelled',
        detail: "You chose not to authorise Booyah on GitHub, so nothing was shared. You can sign in again whenever you're ready."
    },
    github: {
        icon: 'alert', tint: [248, 81, 73],
        title: "GitHub couldn't finish signing you in",
        detail: 'GitHub rejected this sign-in request. Starting again usually sorts it out.'
    },
    missing: {
        icon: 'alert', tint: [139, 148, 158],
        title: 'Nothing to sign in with',
        detail: 'This page only works when GitHub sends you back here after you approve Booyah. Use the button below to start signing in.'
    },
    expired: {
        icon: 'clock', tint: [240, 136, 62],
        title: 'This sign-in link has expired',
        detail: 'GitHub sign-in links work only once and expire after 10 minutes, so refreshing this page or waiting too long breaks them. Sign in again to get a fresh one.'
    },
    offline: {
        icon: 'offline', tint: [240, 136, 62], retry: true,
        title: "Can't reach Booyah",
        detail: "Check your internet connection. If you're online, our server may still be starting up, so try again in a few seconds."
    },
    timeout: {
        icon: 'offline', tint: [240, 136, 62], retry: true,
        title: 'Booyah is taking too long to respond',
        detail: 'Our server may be starting up after a quiet spell. Give it a few seconds, then try again.'
    },
    rateLimited: {
        icon: 'clock', tint: [240, 136, 62],
        title: 'Too many sign-in attempts',
        detail: 'Wait about a minute, then sign in again.'
    },
    server: {
        icon: 'alert', tint: [248, 81, 73],
        title: 'Something went wrong on our side',
        detail: 'Your GitHub account is fine. Our server hit a problem while signing you in, so please try again in a moment.'
    },
    unknown: {
        icon: 'alert', tint: [248, 81, 73],
        title: "Sign-in didn't go through",
        detail: 'Something unexpected happened while signing you in. Please try again.'
    }
}

const authError = (kind, tech) => Object.assign(new Error(tech || kind), { kind, tech })

function classify(err) {
    if (err?.kind) return err
    if (!err?.isAxiosError) return authError('unknown', String(err?.message || err))
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return authError('timeout', err.message)
    if (!err.response) return authError('offline', err.message)
    const { status, data } = err.response
    const tech = `HTTP ${status}${data?.message ? ` · ${data.message}` : ''}`
    if (status === 400) return authError('expired', tech)
    if (status === 429) return authError('rateLimited', tech)
    if (status >= 500) return authError('server', tech)
    return authError('unknown', tech)
}

const STATUS_STEPS = [
    { at: 0, text: 'Handshaking with GitHub' },
    { at: 1500, text: 'Verifying your identity' },
    { at: 3000, text: 'Syncing your Booyah profile' },
    { at: 8000, text: 'Still working, our server may be waking up' }
]

// ==========================================================================
// 4. AUTH FLOW
// ==========================================================================
const route = useRoute()
const router = useRouter()
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const canvasEl = ref(null)
const phase = ref('loading') // 'loading' | 'success' | 'error'
const status = ref(STATUS_STEPS[0].text)
const failure = ref(null)
const showCard = ref(false)
const welcome = ref(null)
const showWelcome = ref(false)
const fadingOut = ref(false)

const copy = computed(() => failure.value && (ERROR_COPY[failure.value.kind] || ERROR_COPY.unknown))

let scene = null
let code = null
let statusTimer = 0
let disposed = false
let navigated = false
const timers = []
const later = (fn, ms) => timers.push(setTimeout(fn, ms))

function trackStatus() {
    const startedAt = performance.now()
    clearInterval(statusTimer)
    status.value = STATUS_STEPS[0].text
    statusTimer = setInterval(() => {
        const elapsed = performance.now() - startedAt
        status.value = STATUS_STEPS.findLast((step) => elapsed >= step.at).text
    }, 250)
}

function fail(err) {
    clearInterval(statusTimer)
    failure.value = err
    phase.value = 'error'
    scene?.setMode('error', (ERROR_COPY[err.kind] || ERROR_COPY.unknown).tint)
    later(() => (showCard.value = true), reduceMotion ? 0 : 450)
}

async function celebrate({ user, newUser }) {
    clearInterval(statusTimer)
    status.value = 'Identity confirmed'

    const name = user.name || user.username
    const destination = user.experience === 'Practitioner' ? '/my-projects' : '/discovery'
    welcome.value = {
        headline: newUser ? `Welcome to Booyah, ${name}` : `Welcome back, ${name}`,
        sub: user.experience == null
            ? "Let's set up your profile"
            : destination === '/my-projects' ? 'Opening My Projects' : 'Opening Discovery'
    }
    const go = () => {
        if (disposed || navigated) return
        navigated = true
        router.push(destination)
    }

    if (reduceMotion || !scene) {
        phase.value = 'success'
        showWelcome.value = true
        later(() => (fadingOut.value = true), 900)
        later(go, 1300)
        return
    }

    const points = await sampleAvatar(user.avatar)
    if (disposed) return
    phase.value = 'success'
    scene.success(points, {
        onWelcome: () => (showWelcome.value = true),
        onFade: () => (fadingOut.value = true),
        onDone: go
    })
    // Safety net: frames pause in background tabs, so don't rely on the scene alone
    later(go, SUCCESS_MS + 2000)
}

async function authenticate() {
    phase.value = 'loading'
    showCard.value = false
    failure.value = null
    scene?.setMode('loading')
    trackStatus()

    try {
        const { data } = await API.post('/auth/githubOAuth', { code }, { timeout: 20000 })
        if (!data?.token || !data?.user) throw authError('server', 'Response was missing the session token')

        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        await celebrate(data)
    } catch (err) {
        console.error('GitHub authentication failed:', err)
        fail(classify(err))
    }
}

onMounted(() => {
    const { code: authCode, error, error_description: description } = route.query

    // The code is single-use: drop it from the address bar so a refresh can't replay it
    if (authCode || error) router.replace({ query: {} })

    try {
        scene = createScene(canvasEl.value, { reduceMotion })
    } catch (err) {
        console.warn('Auth scene unavailable, continuing without it.', err)
    }

    if (error) return fail(authError(error === 'access_denied' ? 'denied' : 'github', description || error))
    if (!authCode) return fail(authError('missing'))

    code = authCode
    authenticate()
})

onBeforeUnmount(() => {
    disposed = true
    scene?.destroy()
    clearInterval(statusTimer)
    timers.forEach(clearTimeout)
})
</script>

<template>
    <div class="auth-stage position-fixed top-0 start-0 w-100 h-100 overflow-hidden">
        <canvas ref="canvasEl" class="position-absolute top-0 start-0 w-100 h-100" aria-hidden="true"></canvas>

        <!-- Status line under the globe -->
        <Transition name="fade">
            <div v-if="phase === 'loading'" class="hud position-absolute start-50 translate-middle-x text-center px-3 w-100">
                <p class="hud-status font-monospace mb-2" role="status" aria-live="polite">
                    {{ status }}<span class="caret">_</span>
                </p>
                <div class="legend d-flex justify-content-center flex-wrap gap-3 small font-monospace">
                    <span><i class="legend-dot" style="--c: #3fb950"></i>GitHub</span>
                    <span><i class="legend-dot" style="--c: #ff8a3d"></i>Hacker News</span>
                    <span><i class="legend-dot" style="--c: #a371f7"></i>Registries</span>
                </div>
            </div>
        </Transition>

        <!-- Success: greeting under the particle avatar -->
        <Transition name="rise">
            <div v-if="showWelcome && welcome" class="welcome position-absolute start-0 w-100 text-center px-3"
                role="status">
                <h1 class="welcome-title fw-semibold mb-1">{{ welcome.headline }}</h1>
                <p class="welcome-sub font-monospace small mb-0">{{ welcome.sub }}</p>
            </div>
        </Transition>

        <!-- Error card -->
        <Transition name="rise">
            <div v-if="showCard && copy"
                class="error-wrap position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3">
                <section class="error-card w-100 text-center p-4 p-sm-5" role="alert"
                    :style="{ '--accent': `rgb(${copy.tint.join(',')})` }">
                    <div class="error-icon mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <template v-if="copy.icon === 'cancel'">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </template>
                            <template v-else-if="copy.icon === 'clock'">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </template>
                            <template v-else-if="copy.icon === 'offline'">
                                <line x1="1" y1="1" x2="23" y2="23" />
                                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                                <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                                <line x1="12" y1="20" x2="12.01" y2="20" />
                            </template>
                            <template v-else>
                                <path
                                    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </template>
                        </svg>
                    </div>

                    <h1 class="h4 fw-semibold mb-2">{{ copy.title }}</h1>
                    <p class="error-detail mb-4">{{ copy.detail }}</p>

                    <div class="d-flex flex-column flex-sm-row gap-2 justify-content-center align-items-center">
                        <button v-if="copy.retry" type="button" class="btn btn-primary px-4 py-2 fw-semibold"
                            @click="authenticate">
                            Try again
                        </button>
                        <GitHubSSO v-else />
                        <RouterLink to="/" class="btn btn-link back-link">Back to home</RouterLink>
                    </div>

                    <details v-if="failure?.tech" class="tech mt-4 text-start small">
                        <summary>Technical details</summary>
                        <code class="d-block mt-2">{{ failure.tech }}</code>
                    </details>
                </section>
            </div>
        </Transition>

        <!-- Fades into the app's own background just before navigating -->
        <div class="fade-out position-absolute top-0 start-0 w-100 h-100 pe-none" :class="{ 'is-on': fadingOut }">
        </div>
    </div>
</template>

<style scoped>
/* The stage is always dark: it's a full-screen moment, independent of the app theme */
.auth-stage {
    z-index: 1090;
    background: radial-gradient(ellipse at 50% 45%, #0d1220 0%, #07080c 55%, #040507 100%);
    color: #e6edf3;
}

canvas {
    display: block;
}

.hud {
    bottom: 9vh;
}

.hud-status {
    color: #8fa7ff;
    letter-spacing: 0.02em;
}

.caret {
    margin-left: 2px;
    animation: blink 1s steps(1) infinite;
}

.legend {
    color: #8b949e;
}

.legend-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 6px;
    border-radius: 50%;
    vertical-align: middle;
    background: var(--c);
    box-shadow: 0 0 8px var(--c);
}

/* Sits just below the particle avatar (globe radius is 20vmin, avatar 18vmin) */
.welcome {
    top: calc(45% + 21vmin);
}

.welcome-title {
    font-size: clamp(1.4rem, 3.2vw, 2.2rem);
    letter-spacing: -0.02em;
}

.welcome-sub {
    color: #8fa7ff;
}

.error-card {
    max-width: 460px;
    background: rgba(14, 16, 20, 0.72);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    box-shadow:
        0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent),
        0 24px 60px rgba(0, 0, 0, 0.5),
        0 0 80px -20px var(--accent);
}

.error-icon {
    width: 56px;
    height: 56px;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
}

.error-detail {
    color: #adb3ba;
    line-height: 1.6;
}

.back-link {
    color: #8b949e;
    text-decoration: none;
}

.back-link:hover {
    color: #e6edf3;
}

.tech summary {
    color: #8b949e;
    cursor: pointer;
}

.tech code {
    color: #adb3ba;
    word-break: break-word;
    background: rgba(255, 255, 255, 0.04);
    padding: 8px 10px;
    border-radius: 6px;
}

.fade-out {
    background-color: var(--app-bg);
    opacity: 0;
    transition: opacity 0.45s ease;
}

.fade-out.is-on {
    opacity: 1;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.rise-enter-active {
    transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.rise-leave-active {
    transition: opacity 0.25s ease;
}

.rise-enter-from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
}

.rise-leave-to {
    opacity: 0;
}

@keyframes blink {
    50% {
        opacity: 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    .caret {
        animation: none;
    }

    .rise-enter-from {
        transform: none;
    }
}
</style>
