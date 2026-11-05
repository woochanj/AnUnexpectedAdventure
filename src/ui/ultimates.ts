// 이 게임만의 궁극기 이펙트: pixelfx 그리기 도구로 직접 찍은 도트 연출.
// 좌표는 발밑(0, 0)이 원점, 위로 갈수록 y가 작아진다. 단위는 이펙트 도트.
import { Particles, Lights, P, Rng, fit, hex, WHITE, ease, clamp } from 'pixelfx/core/index';
import type { FxModule } from 'pixelfx';

type Painter = {
    px(x: number, y: number, c: number): void;
    line(x0: number, y0: number, x1: number, y1: number, c: number, a?: number): void;
    disc(cx: number, cy: number, r: number, c: number | ((d: number, ang: number) => number), a?: number | ((d: number, ang: number) => number)): void;
    circle(cx: number, cy: number, r: number, c: number | ((d: number, ang: number) => number), a?: number | ((d: number, ang: number) => number)): void;
    ellipse(cx: number, cy: number, rx: number, ry: number, c: number | ((d: number, ang: number) => number), a?: number | ((d: number, ang: number) => number)): void;
    ring(cx: number, cy: number, r: number, w: number, c: number, a?: number): void;
    arc(cx: number, cy: number, r: number, w: number | ((u: number) => number), a0: number, a1: number, c: number | ((u: number, v: number) => number), a?: number | ((u: number, v: number) => number)): void;
    poly(pts: [number, number][], c: number, a?: number): void;
    rect(x: number, y: number, w: number, h: number, c: number, a?: number): void;
    glow(x: number, y: number, r: number, c: number, k?: number): void;
    glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void;
};
type Opts = { palette: string[]; seed: number; flip?: boolean };
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const mk = (meta: Record<string, unknown>, create: (o: Opts) => { update(dt: number): void; draw(p: Painter): void }) => ({ meta, create }) as unknown as FxModule;

// ─────────────── 거신의 일격 (기사): 하늘에서 거인의 검이 떨어져 꽂힌다 ───────────────
export const titanBlade = mk(
    { name: 'Titan blade', size: [220, 200], origin: [110, 170], duration: 1.6, loop: false, options: { palette: ['#2a1406', '#6a3a10', '#b8761a', '#ffcf3e', '#fff2b0', '#ffffff'], seed: 3 } },
    (o) => {
        const C = fit(o.palette, 6);
        const R = new Rng(o.seed);
        const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[4], C[3]] });
        const lights = new Lights();
        let t = 0;
        let hit = false;
        const cracks = Array.from({ length: 9 }, (_, i) => ({ a: Math.PI + (i / 8) * Math.PI * 1.0 - 0.05 + R.range(-0.12, 0.12), L: R.range(28, 70) }));
        const FALL = 0.42;
        return {
            update(dt) {
                t += dt;
                if (!hit && t >= FALL) {
                    hit = true;
                    lights.add(0, -20, 90, C[4], 0.9, 0.5);
                    for (let i = 0; i < 26; i++) {
                        const a = -Math.PI / 2 + R.range(-1.2, 1.2);
                        const v = R.range(80, 260);
                        ps.spawn(P.GRIT, R.range(-10, 10), -2, Math.cos(a) * v, Math.sin(a) * v, R.range(0.5, 0.9), R.pick(['#6a4a2a', '#8a6a3a', '#4a3018']), R.range(1, 2.4));
                    }
                    for (let i = 0; i < 18; i++) {
                        const a = -Math.PI / 2 + R.range(-1.4, 1.4);
                        ps.spawn(P.SPARK, 0, -10, Math.cos(a) * R.range(150, 380), Math.sin(a) * R.range(150, 380), R.range(0.2, 0.45), WHITE, 1);
                    }
                    for (let i = 0; i < 10; i++) ps.spawn(P.DUST, R.range(-40, 40), -2, R.range(-60, 60), R.range(-30, -8), R.range(0.8, 1.4), 0, R.range(2, 4));
                }
                ps.update(dt);
                lights.update(dt);
            },
            draw(p) {
                // 떨어지기 전: 하늘에서 금빛 그림자가 모인다
                if (t < FALL) {
                    const u = ease.inCubic(seg(t, 0, FALL));
                    const tipY = -170 + 170 * u;
                    const len = 120;
                    // 칼날 (위가 손잡이)
                    const w = 7;
                    p.glowLine(0, tipY - len, 0, tipY, 14, C[3], 0.35 + u * 0.3);
                    p.poly([[-w, tipY - len], [w, tipY - len], [w, tipY - 12], [0, tipY], [-w, tipY - 12]], C[4]);
                    p.poly([[0, tipY - len], [w, tipY - len], [w, tipY - 12], [0, tipY]], C[3]);
                    p.line(0, tipY - len, 0, tipY - 4, WHITE, 0.9);
                    // 코등이와 손잡이
                    p.rect(-18, tipY - len - 4, 36, 5, C[3]);
                    p.rect(-3, tipY - len - 24, 6, 20, C[2]);
                    p.disc(0, tipY - len - 27, 4, C[4]);
                    // 떨어지는 바람 줄기
                    for (let i = 0; i < 5; i++) p.line(-w - 4 - i * 3, tipY - len * 0.9, -w - 4 - i * 3, tipY - len * 0.9 - 30 * u, C[4], 0.35);
                    return;
                }
                const k = t - FALL;
                // 꽂힌 칼: 금빛이 식으며 서서히 사라진다
                const fade = 1 - seg(k, 0.5, 1.1);
                if (fade > 0) {
                    if (fade > 0.5) {
                        p.poly([[-7, -120], [7, -120], [7, -12], [0, 0], [-7, -12]], C[4]);
                        p.poly([[0, -120], [7, -120], [7, -12], [0, 0]], C[3]);
                    }
                    p.rect(-18, -124, 36, 5, C[3], fade);
                    p.line(0, -118, 0, -4, WHITE, fade);
                }
                // 섬광과 땅의 충격파
                if (k < 0.08) p.disc(0, -10, 40, WHITE, 0.9);
                const r = ease.outCubic(seg(k, 0, 0.5)) * 100;
                if (k < 0.55) p.ellipse(0, 0, r, r * 0.22, (d) => (d > 0.82 ? C[4] : C[3]), (d) => (d > 0.78 ? 0.9 * (1 - k / 0.55) : 0));
                // 갈라지는 땅
                const cu = ease.outQuart(seg(k, 0, 0.25));
                for (const c of cracks) {
                    const x1 = Math.cos(c.a) * c.L * cu;
                    const y1 = Math.sin(c.a) * c.L * cu * 0.25;
                    p.line(0, 0, x1, Math.abs(y1) * 0.6, C[0], 0.9 * fade);
                    p.line(0, -1, x1 * 0.7, Math.abs(y1) * 0.4 - 1, C[4], 0.6 * fade);
                }
                ps.draw(p);
                lights.draw(p);
            },
        };
    },
);

// ─────────────── 최후의 맹세 (기사): 문장 방패가 그려지고 룬이 돌며 빛기둥이 솟는다 ───────────────
export const oathCrest = mk(
    { name: 'Oath crest', size: [170, 190], origin: [85, 170], duration: 1.8, loop: false, options: { palette: ['#1a1030', '#4a3a10', '#b8861a', '#ffd24a', '#fff2b0', '#ffffff'], seed: 5 } },
    (o) => {
        const C = fit(o.palette, 6);
        const R = new Rng(o.seed);
        const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[4]] });
        let t = 0;
        let spawned = 0;
        return {
            update(dt) {
                t += dt;
                while (spawned < Math.min(40, t * 40)) {
                    spawned++;
                    ps.spawn(P.MOTE, R.range(-34, 34), R.range(-6, 0), R.range(-6, 6), R.range(-70, -30), R.range(0.6, 1.1), R.pick(['#ffd24a', '#fff2b0', '#ffffff']), 1);
                }
                ps.update(dt);
            },
            draw(p) {
                const draw = ease.outCubic(seg(t, 0.05, 0.55));
                const fade = 1 - seg(t, 1.3, 1.8);
                // 빛기둥
                const pill = ease.outQuad(seg(t, 0, 0.35)) * fade;
                p.glowLine(0, 0, 0, -170, 26, C[3], 0.35 * pill);
                // 문장 방패 윤곽: 위는 평평, 아래는 뾰족 (그려지는 만큼만)
                const W = 34, Ht = 48, top = -78;
                const pts: [number, number][] = [[-W, top], [W, top], [W, top + Ht * 0.55], [0, top + Ht + 10], [-W, top + Ht * 0.55]];
                const perim: [number, number][] = [...pts, pts[0]];
                let total = 0;
                const lens = perim.slice(1).map((q, i) => {
                    const L = Math.hypot(q[0] - perim[i][0], q[1] - perim[i][1]);
                    total += L;
                    return L;
                });
                let left = total * draw;
                for (let i = 0; i < lens.length && left > 0; i++) {
                    const a = perim[i], b = perim[i + 1];
                    const f = Math.min(1, left / lens[i]);
                    left -= lens[i];
                    const x1 = a[0] + (b[0] - a[0]) * f, y1 = a[1] + (b[1] - a[1]) * f;
                    p.line(a[0], a[1], x1, y1, C[4], fade);
                    p.line(a[0], a[1] + 1, x1, y1 + 1, C[3], fade);
                    p.glowLine(a[0], a[1], x1, y1, 5, C[3], 0.25 * fade);
                }
                if (draw >= 1) {
                    p.poly(pts, C[1], fade > 0.5 ? 1 : 0);
                    // 가운데 십자 문장
                    p.rect(-2, top + 8, 4, Ht - 4, C[4], fade);
                    p.rect(-14, top + 18, 28, 4, C[4], fade);
                }
                // 돌아가는 맹세의 룬 (8개)
                const ru = seg(t, 0.25, 0.6);
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * Math.PI * 2 + t * 2.4;
                    const x = Math.cos(a) * 52, y = top + 24 + Math.sin(a) * 16;
                    if (ru <= i / 8) continue;
                    p.rect(x - 1, y - 2, 3, 5, i % 2 ? C[4] : WHITE, fade);
                    p.glow(x, y, 6, C[3], 0.3 * fade);
                }
                // 마지막 맹세의 맥박
                const pu = seg(t, 0.9, 1.3);
                if (pu > 0 && pu < 1) p.ring(0, top + 24, 20 + pu * 70, 3, C[4], 1 - pu);
                ps.draw(p);
            },
        };
    },
);

// ─────────────── 운석 낙하 (마법사): 꼬리 달린 운석이 비스듬히 가속해 떨어져 대폭발 ───────────────
export const meteorStrike = mk(
    { name: 'Meteor strike', size: [260, 230], origin: [150, 200], duration: 1.9, loop: false, options: { palette: ['#2a0804', '#7a1e08', '#d2420c', '#ff8a2a', '#ffcf6b', '#fff6d0'], seed: 7 } },
    (o) => {
        const C = fit(o.palette, 6);
        const R = new Rng(o.seed);
        const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[4], C[3]] });
        const lights = new Lights();
        let t = 0;
        let hit = false;
        const FALL = 0.55;
        const sx = -130, sy = -200;
        return {
            update(dt) {
                t += dt;
                if (t < FALL) {
                    // 꼬리에서 불티가 떨어져 나간다
                    const u = ease.inQuad(seg(t, 0, FALL));
                    const x = sx * (1 - u), y = sy * (1 - u);
                    for (let i = 0; i < 2; i++) ps.spawn(P.FIRE, x + R.range(-3, 3), y + R.range(-3, 3), R.range(-20, 10), R.range(-30, 0), R.range(0.18, 0.32), 0, R.range(1.2, 2.2), 0, 1);
                }
                if (!hit && t >= FALL) {
                    hit = true;
                    lights.add(0, -24, 120, C[4], 1, 0.7);
                    for (let i = 0; i < 46; i++) {
                        const a = -Math.PI / 2 + R.range(-1.5, 1.5);
                        const v = R.range(60, 300);
                        ps.spawn(R.chance(0.6) ? P.FIRE : P.EMBER, R.range(-8, 8), -6, Math.cos(a) * v, Math.sin(a) * v, R.range(0.4, 1.0), R.chance(0.5) ? '#ffcf6b' : '#ff8a2a', R.range(1.4, 3), 0, 1);
                    }
                    for (let i = 0; i < 14; i++) ps.spawn(P.SMOKE, R.range(-30, 30), -10, R.range(-40, 40), R.range(-50, -20), R.range(1, 1.6), 0, R.range(2, 3.5), 0, 2);
                    for (let i = 0; i < 18; i++) {
                        const a = -Math.PI / 2 + R.range(-1.3, 1.3);
                        ps.spawn(P.GRIT, 0, -3, Math.cos(a) * R.range(100, 260), Math.sin(a) * R.range(100, 260), R.range(0.5, 0.9), R.pick(['#3a1a0a', '#5a2a10']), R.range(1, 2));
                    }
                }
                ps.update(dt);
                lights.update(dt);
            },
            draw(p) {
                if (t < FALL) {
                    const u = ease.inQuad(seg(t, 0, FALL));
                    const x = sx * (1 - u), y = sy * (1 - u);
                    // 붉게 물드는 하늘
                    p.glow(0, -60, 140, C[2], 0.18 * u);
                    // 불꼬리: 운석 뒤로 길게, 점점 가늘게
                    for (let i = 0; i < 14; i++) {
                        const f = i / 14;
                        p.disc(x + (-sx / 200) * -i * 7, y + (-sy / 200) * -i * 7, 9 * (1 - f) + 1, f < 0.3 ? C[4] : f < 0.6 ? C[3] : C[2], 0.9 - f * 0.6);
                    }
                    // 바위 머리 + 녹는 테두리
                    p.disc(x, y, 9, C[1]);
                    p.disc(x + 2, y + 2, 6, C[0]);
                    p.ring(x, y, 10, 2, C[4], 0.9);
                    p.glow(x, y, 24, C[3], 0.6);
                    // 땅에 드리우는 그림자
                    p.ellipse(0, 0, 10 + 30 * u, 3 + 6 * u, C[0], 0.35 * u);
                    return;
                }
                const k = t - FALL;
                if (k < 0.1) p.disc(0, -20, 70, WHITE, 0.85);
                const r = ease.outCubic(seg(k, 0, 0.45));
                if (k < 0.6) {
                    p.disc(0, -20, 20 + r * 55, (d) => (d < 0.4 ? C[5] : d < 0.7 ? C[4] : C[3]) as number, (d) => (1 - k / 0.6) * (d < 0.85 ? 0.9 : 0.5));
                    p.ellipse(0, 0, 30 + r * 110, 6 + r * 20, C[3], (d) => (d > 0.8 ? 0.8 * (1 - k / 0.6) : 0));
                }
                // 남는 분화구 불씨
                p.ellipse(0, 0, 34, 6, C[2], 0.6 * (1 - seg(k, 0.4, 1.3)));
                ps.draw(p);
                lights.draw(p);
            },
        };
    },
);

// ─────────────── 절대 영도 (마법사): 서리 문양이 퍼지고 얼음 가시가 솟았다가 산산조각 ───────────────
export const zeroBloom = mk(
    { name: 'Absolute zero', size: [240, 170], origin: [120, 140], duration: 1.8, loop: false, options: { palette: ['#06142e', '#14408a', '#3a8ae0', '#9ae6ff', '#e4faff', '#ffffff'], seed: 11 } },
    (o) => {
        const C = fit(o.palette, 6);
        const R = new Rng(o.seed);
        const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[4], C[3]] });
        let t = 0;
        let shattered = false;
        const spikes = Array.from({ length: 13 }, (_, i) => ({ x: (i - 6) * 10 + R.range(-3, 3), h: R.range(28, 70) * (1 - Math.abs(i - 6) / 9), w: R.range(4, 7), d: Math.abs(i - 6) * 0.03 }));
        const SH = 1.0;
        return {
            update(dt) {
                t += dt;
                if (!shattered && t >= SH) {
                    shattered = true;
                    for (const s of spikes)
                        for (let i = 0; i < 6; i++) {
                            const a = -Math.PI / 2 + R.range(-1.5, 1.5);
                            const v = R.range(60, 220);
                            ps.spawn(P.FLAKE, s.x, -R.range(4, s.h), Math.cos(a) * v, Math.sin(a) * v, R.range(0.5, 0.9), R.pick(['#ffffff', '#e4faff', '#9ae6ff']), R.range(1, 2.2));
                        }
                    for (let i = 0; i < 20; i++) ps.spawn(P.SPARK, R.range(-60, 60), -R.range(5, 50), R.range(-200, 200), R.range(-200, 60), R.range(0.2, 0.4), WHITE, 1);
                }
                ps.update(dt);
            },
            draw(p) {
                // 바닥에 번지는 서리 문양 (육각 눈꽃)
                const fr = ease.outCubic(seg(t, 0, 0.5));
                const ff = 1 - seg(t, 1.2, 1.8);
                p.ellipse(0, 0, 10 + fr * 110, 3 + fr * 18, C[3], (d) => (d > 0.86 ? 0.8 * ff : d < 0.5 ? 0.12 * ff : 0.05 * ff));
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2;
                    const L = fr * 100;
                    const x1 = Math.cos(a) * L, y1 = Math.sin(a) * L * 0.18;
                    p.line(0, 0, x1, y1, C[4], 0.7 * ff);
                    p.line(x1 * 0.5, y1 * 0.5, x1 * 0.5 + Math.cos(a + 0.6) * 14 * fr, y1 * 0.5 + Math.sin(a + 0.6) * 3 * fr, C[4], 0.5 * ff);
                    p.line(x1 * 0.5, y1 * 0.5, x1 * 0.5 + Math.cos(a - 0.6) * 14 * fr, y1 * 0.5 + Math.sin(a - 0.6) * 3 * fr, C[4], 0.5 * ff);
                }
                // 공기가 얼어붙는 하늘빛
                p.glow(0, -40, 110, C[3], 0.22 * seg(t, 0.1, 0.6) * ff);
                if (t < SH) {
                    // 솟는 얼음 가시: 가운데부터, 툭 튀어나와 조금 내려앉는다
                    for (const s of spikes) {
                        const u = seg(t, 0.2 + s.d, 0.45 + s.d);
                        const g = u < 1 ? ease.outBack ? ease.outBack(u) : ease.outCubic(u) : 1;
                        const h = s.h * g;
                        if (h <= 1) continue;
                        p.poly([[s.x - s.w, 0], [s.x + s.w, 0], [s.x, -h]], C[2], 0.95);
                        p.poly([[s.x - s.w * 0.2, 0], [s.x + s.w, 0], [s.x, -h]], C[3], 0.95);
                        p.line(s.x, -h, s.x + s.w * 0.4, -h * 0.4, C[5], 0.9);
                        p.glow(s.x, -h * 0.6, 8, C[4], 0.25);
                    }
                    // 깨지기 직전 금이 간다
                    const cr = seg(t, 0.8, SH);
                    if (cr > 0) for (const s of spikes) p.line(s.x - 2, -s.h * 0.3, s.x + 3, -s.h * (0.3 + 0.4 * cr), WHITE, cr);
                } else if (t < SH + 0.08) p.disc(0, -30, 80, WHITE, 0.8);
                ps.draw(p);
            },
        };
    },
);

// ─────────────── 천 개의 칼날 (도적): 대상 둘레로 칼선이 점점 빠르게 그어지다가 거대한 X ───────────────
export const thousandBlades = mk(
    { name: 'Thousand blades', size: [190, 170], origin: [95, 150], duration: 1.6, loop: false, options: { palette: ['#0a2a30', '#2a8a8a', '#4ad0c0', '#9af4e0', '#e0fff8', '#ffffff'], seed: 13 } },
    (o) => {
        const C = fit(o.palette, 6);
        const R = new Rng(o.seed);
        const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[4], C[3]] });
        // 칼선 40개: 처음엔 드문드문, 점점 촘촘하게 (가속)
        const N = 40;
        const cuts = Array.from({ length: N }, (_, i) => {
            const u = i / N;
            const at = 1.05 * (1 - Math.pow(1 - u, 1.8));
            const a = R.range(0, Math.PI);
            const L = R.range(34, 60);
            return { at, a, L, cx: R.range(-8, 8), cy: -40 + R.range(-14, 14) };
        });
        let t = 0;
        let done = false;
        return {
            update(dt) {
                t += dt;
                for (const c of cuts) if (!(c as { fired?: boolean }).fired && t >= c.at) {
                    (c as { fired?: boolean }).fired = true;
                    for (let i = 0; i < 2; i++) ps.spawn(P.SPARK, c.cx, c.cy, R.range(-180, 180), R.range(-160, 80), R.range(0.12, 0.25), WHITE, 1);
                }
                if (!done && t >= 1.15) {
                    done = true;
                    for (let i = 0; i < 24; i++) {
                        const a = R.range(0, Math.PI * 2);
                        ps.spawn(P.SPARK, 0, -40, Math.cos(a) * R.range(120, 320), Math.sin(a) * R.range(120, 320), R.range(0.2, 0.45), WHITE, 1);
                    }
                }
                ps.update(dt);
            },
            draw(p) {
                for (const c of cuts) {
                    const k = t - c.at;
                    if (k < 0 || k > 0.16) continue;
                    const f = 1 - k / 0.16;
                    const dx = Math.cos(c.a) * c.L / 2, dy = Math.sin(c.a) * c.L / 2;
                    p.line(c.cx - dx, c.cy - dy, c.cx + dx, c.cy + dy, WHITE, f);
                    p.line(c.cx - dx, c.cy - dy + 1, c.cx + dx, c.cy + dy + 1, C[3], f * 0.8);
                    p.glowLine(c.cx - dx, c.cy - dy, c.cx + dx, c.cy + dy, 4, C[3], 0.35 * f);
                }
                // 마무리: 거대한 X가 그어지고 흩어진다
                const xu = seg(t, 1.1, 1.22);
                const xf = 1 - seg(t, 1.25, 1.6);
                if (xu > 0 && xf > 0) {
                    const L = 70 * ease.outCubic(xu);
                    for (const s of [1, -1]) {
                        p.line(-L * 0.7, -40 - L * 0.7 * s, L * 0.7, -40 + L * 0.7 * s, WHITE, xf);
                        p.line(-L * 0.7, -39 - L * 0.7 * s, L * 0.7, -39 + L * 0.7 * s, C[4], xf);
                        p.line(-L * 0.7, -41 - L * 0.7 * s, L * 0.7, -41 + L * 0.7 * s, C[3], xf * 0.8);
                        p.glowLine(-L * 0.7, -40 - L * 0.7 * s, L * 0.7, -40 + L * 0.7 * s, 9, C[3], 0.5 * xf);
                    }
                    if (t < 1.2) p.disc(0, -40, 22, WHITE, 0.7);
                }
                ps.draw(p);
            },
        };
    },
);

// ─────────────── 죽음의 낙인 (도적): 낙인 원이 스스로 그려지고 해골이 맥박 치다 빨려 들며 터진다 ───────────────
const SKULL = ['..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx', 'xx..x..xx', 'xx..x..xx', 'xxxxxxxxx', '.xxx.xxx.', '..x.x.x..'];
export const deathBrand = mk(
    { name: 'Death brand', size: [170, 170], origin: [85, 150], duration: 1.8, loop: false, options: { palette: ['#08040e', '#2a1048', '#5a2a98', '#a070e0', '#e0c8ff', '#ffffff'], seed: 17 } },
    (o) => {
        const C = fit(o.palette, 6);
        const R = new Rng(o.seed);
        const ps = new Particles({ rng: R, ground: () => 0, sparks: [C[4], C[3], WHITE] });
        const motes = Array.from({ length: 30 }, () => ({ a: R.range(0, Math.PI * 2), r: R.range(40, 80), s: R.range(0.8, 1.3) }));
        let t = 0;
        let burst = false;
        const CY = -44;
        const BURST = 1.25;
        return {
            update(dt) {
                t += dt;
                if (!burst && t >= BURST) {
                    burst = true;
                    for (let i = 0; i < 30; i++) {
                        const a = R.range(0, Math.PI * 2);
                        ps.spawn(P.MOTE, 0, CY, Math.cos(a) * R.range(80, 220), Math.sin(a) * R.range(80, 220), R.range(0.3, 0.7), R.pick(['#a070e0', '#e0c8ff', '#5a2a98']), R.range(1, 2));
                    }
                }
                ps.update(dt);
            },
            draw(p) {
                const ff = 1 - seg(t, BURST + 0.1, 1.8);
                // 낙인 원: 바깥 고리가 한 바퀴 그려지고, 안쪽 고리가 거꾸로
                const u1 = ease.inOutSine(seg(t, 0, 0.5));
                const u2 = ease.inOutSine(seg(t, 0.2, 0.7));
                if (u1 > 0) p.arc(0, CY, 34, 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u1, C[3], ff);
                if (u2 > 0) p.arc(0, CY, 26, 2, -Math.PI / 2 - Math.PI * 2 * u2 + Math.PI * 2, Math.PI * 1.5, C[4], ff);
                // 고리 사이의 룬 눈금
                const ru = seg(t, 0.4, 0.8);
                for (let i = 0; i < 12; i++) {
                    if (ru <= i / 12) continue;
                    const a = (i / 12) * Math.PI * 2 - t * 1.5;
                    p.line(Math.cos(a) * 27, CY + Math.sin(a) * 27, Math.cos(a) * 33, CY + Math.sin(a) * 33, C[4], ff);
                }
                // 해골 문양: 맥박 치며 점점 밝아진다
                const su = seg(t, 0.55, 0.8);
                if (su > 0) {
                    const beat = 1 + 0.18 * Math.max(0, Math.sin(t * 18)) * seg(t, 0.8, BURST);
                    const s = 2 * beat;
                    for (let y = 0; y < SKULL.length; y++)
                        for (let x = 0; x < SKULL[y].length; x++)
                            if (SKULL[y][x] === 'x') p.rect(-9 * s / 2 + x * s, CY - 8 * s / 2 + y * s, s, s, y < 3 ? C[4] : C[3], su * ff);
                    p.glow(0, CY, 30, C[3], 0.4 * su * ff);
                }
                // 빨려 드는 어둠 (터지기 전까지 안쪽으로)
                const iu = seg(t, 0.7, BURST);
                if (t < BURST)
                    for (const m of motes) {
                        const r = m.r * (1 - ease.inCubic(iu));
                        const a = m.a + iu * m.s * 3;
                        p.disc(Math.cos(a) * r, CY + Math.sin(a) * r * 0.8, 1.4, C[2], 0.8 * iu);
                    }
                // 낙인이 찍히는 순간
                if (t >= BURST && t < BURST + 0.1) p.disc(0, CY, 46, C[4], 0.85);
                const ru2 = seg(t, BURST, BURST + 0.4);
                if (ru2 > 0 && ru2 < 1) p.ring(0, CY, 20 + ru2 * 60, 3, C[3], 1 - ru2);
                ps.draw(p);
            },
        };
    },
);


// ═══════════════ 새 궁극기 6장 ═══════════════

// ─────────────── 태양의 심판 (기사): 하늘의 태양에서 빛의 창이 연달아 꽂힌다 ───────────────
export const sunJudgment = mk(
    { name: 'Sun judgment', size: [200, 220], origin: [100, 200], duration: 1.6, loop: false, options: { palette: ['#3a1a04', '#9a5a10', '#e8a020', '#ffd24a', '#fff6c0', '#ffffff'], seed: 19 } },
    (o) => {
        const C = fit(o.palette, 6);
        const R = new Rng(o.seed);
        const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[4], C[3]] });
        const spears = Array.from({ length: 5 }, (_, i) => ({ x: (i - 2) * 9 + R.range(-3, 3), at: 0.3 + i * 0.09, hit: false }));
        let t = 0;
        return {
            update(dt) {
                t += dt;
                for (const s of spears)
                    if (!s.hit && t >= s.at + 0.14) {
                        s.hit = true;
                        for (let i = 0; i < 6; i++) ps.spawn(P.SPARK, s.x, -2, R.range(-160, 160), R.range(-200, -40), R.range(0.2, 0.4), WHITE, 1);
                    }
                ps.update(dt);
            },
            draw(p) {
                const fade = 1 - seg(t, 1.1, 1.6);
                // 하늘의 태양: 모였다가 빛을 내뿜는다
                const su = ease.outCubic(seg(t, 0, 0.3));
                p.glow(0, -180, 50 * su, C[3], 0.7 * fade);
                p.disc(0, -180, 12 * su, C[4], su > 0.2 ? 1 : 0);
                for (let i = 0; i < 12; i++) {
                    const a = (i / 12) * Math.PI * 2 + t * 0.8;
                    p.line(Math.cos(a) * 15 * su, -180 + Math.sin(a) * 15 * su, Math.cos(a) * 26 * su, -180 + Math.sin(a) * 26 * su, C[4], fade);
                }
                // 빛의 창: 위에서 빠르게 내리꽂혀 땅에 박힌다
                for (const s of spears) {
                    const u = seg(t, s.at, s.at + 0.14);
                    if (u <= 0) continue;
                    const tip = -170 + 170 * ease.inQuad(u);
                    const f = u < 1 ? 1 : fade * (1 - seg(t, s.at + 0.4, s.at + 0.9));
                    if (f <= 0) continue;
                    p.glowLine(s.x, tip - 60, s.x, tip, 6, C[3], 0.45 * f);
                    p.line(s.x, tip - 60, s.x, tip, WHITE, f > 0.5 ? 1 : 0);
                    p.line(s.x - 1, tip - 56, s.x - 1, tip - 4, C[4], f > 0.5 ? 1 : 0);
                    p.poly([[s.x - 3, tip - 6], [s.x + 3, tip - 6], [s.x, tip + 2]], C[4]);
                    if (u >= 1 && t < s.at + 0.22) p.disc(s.x, 0, 10, WHITE, 0.8);
                }
                // 땅에 번지는 빛의 고리
                const ru = seg(t, 0.45, 1.0);
                if (ru > 0 && ru < 1) p.ellipse(0, 0, 20 + ru * 70, 5 + ru * 12, C[4], (d) => (d > 0.82 ? 1 - ru : 0));
                ps.draw(p);
            },
        };
    },
);

// ─────────────── 철의 요새 (기사): 돌벽이 한 줄씩 쌓여 오르고 가시가 돋는다 ───────────────
export const ironFortress = mk(
    { name: 'Iron fortress', size: [180, 170], origin: [90, 150], duration: 1.7, loop: false, options: { palette: ['#141824', '#3a4458', '#6a7890', '#a8b8d0', '#e0ecff', '#ffffff'], seed: 23 } },
    (o) => {
        const C = fit(o.palette, 6);
        const R = new Rng(o.seed);
        const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[4]] });
        let t = 0;
        let dusted = false;
        const ROWS = 6, BW = 12, BH = 8, COLS = 7;
        return {
            update(dt) {
                t += dt;
                if (!dusted && t > 0.1) {
                    dusted = true;
                    for (let i = 0; i < 12; i++) ps.spawn(P.DUST, R.range(-50, 50), -2, R.range(-40, 40), R.range(-30, -5), R.range(0.7, 1.2), 0, R.range(2, 3.5));
                }
                ps.update(dt);
            },
            draw(p) {
                const fade = 1 - seg(t, 1.25, 1.7);
                // 벽돌이 아래 줄부터 한 줄씩 솟아 맞물린다 (주인공 앞쪽 반원)
                for (let r = 0; r < ROWS; r++) {
                    const u = ease.outBack(seg(t, 0.08 + r * 0.08, 0.22 + r * 0.08));
                    if (u <= 0) continue;
                    const y = -(r + 1) * BH * u;
                    const off = r % 2 ? BW / 2 : 0;
                    for (let c = 0; c < COLS; c++) {
                        const x = -COLS * BW / 2 + c * BW + off + 20;
                        if (fade < 0.5 && (c + r) % 2) continue;
                        p.rect(x, y, BW - 1, BH - 1, (c + r) % 3 ? C[2] : C[1]);
                        p.rect(x, y, BW - 1, 1, C[3]);
                    }
                }
                // 벽 위로 쇠 가시가 돋는다
                const su = ease.outBack(seg(t, 0.6, 0.8));
                if (su > 0)
                    for (let c = 0; c < COLS; c++) {
                        const x = -COLS * BW / 2 + c * BW + BW / 2 + 20;
                        const top = -ROWS * BH;
                        p.poly([[x - 3, top], [x + 3, top], [x, top - 10 * su]], C[4]);
                        p.line(x, top, x, top - 10 * su, WHITE, 1);
                    }
                // 다 쌓이면 강철빛이 벽을 훑고 지나간다
                const sh = seg(t, 0.85, 1.15);
                if (sh > 0 && sh < 1) {
                    const sx = -COLS * BW / 2 + 20 + sh * COLS * BW;
                    p.glowLine(sx, -ROWS * BH, sx - 12, 0, 8, C[4], 0.6);
                }
                ps.draw(p);
            },
        };
    },
);

// ─────────────── 뇌신 강림 (마법사): 먹구름이 모이고 번개가 세 번 내리친다 ───────────────
function bolt(p: Painter, R: { range(a: number, b: number): number }, x0: number, y0: number, x1: number, y1: number, c: number, glowC: number) {
    let px = x0, py = y0;
    const n = 9;
    for (let i = 1; i <= n; i++) {
        const u = i / n;
        const nx = x0 + (x1 - x0) * u + (i < n ? R.range(-9, 9) : 0);
        const ny = y0 + (y1 - y0) * u;
        p.glowLine(px, py, nx, ny, 7, glowC, 0.5);
        p.line(px, py, nx, ny, c);
        p.line(px + 1, py, nx + 1, ny, c);
        if (i === 4) p.line(nx, ny, nx + R.range(-20, 20), ny + 16, c, 0.8);
        px = nx;
        py = ny;
    }
}
export const thunderGod = mk(
    { name: 'Thunder god', size: [200, 230], origin: [100, 210], duration: 1.7, loop: false, options: { palette: ['#10082a', '#2a2060', '#6a5ac0', '#e8d040', '#fff36a', '#ffffff'], seed: 29 } },
    (o) => {
        const C = fit(o.palette, 6);
        const R = new Rng(o.seed);
        const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[4], C[3]] });
        const strikes = [0.42, 0.56, 0.7];
        const done = strikes.map(() => false);
        let t = 0;
        return {
            update(dt) {
                t += dt;
                strikes.forEach((s, i) => {
                    if (!done[i] && t >= s) {
                        done[i] = true;
                        for (let k = 0; k < 10; k++) ps.spawn(P.SPARK, R.range(-6, 6), -2, R.range(-220, 220), R.range(-240, -30), R.range(0.15, 0.35), WHITE, 1);
                    }
                });
                ps.update(dt);
            },
            draw(p) {
                const fade = 1 - seg(t, 1.2, 1.7);
                // 먹구름: 둥근 덩어리들이 모여 짙어진다
                const cu = ease.outCubic(seg(t, 0, 0.4));
                for (let i = 0; i < 7; i++) {
                    const x = (i - 3) * 16 * cu;
                    const y = -190 + (i % 2) * 6;
                    p.disc(x, y, 14 + (i % 3) * 3, i % 2 ? C[1] : C[0], cu > 0.3 && fade > 0.3 ? 1 : 0);
                }
                // 구름 속 번쩍임
                if (Math.sin(t * 40) > 0.6 && t < 1.0) p.glow(0, -190, 60, C[2], 0.4);
                // 세 번의 번개
                strikes.forEach((s, i) => {
                    const k = t - s;
                    if (k < 0 || k > 0.12) return;
                    const seedR = new Rng(o.seed + i * 7 + Math.floor(t * 30));
                    bolt(p, seedR, (i - 1) * 10, -178, 0, 0, WHITE, C[4]);
                    p.disc(0, -6, 16, WHITE, 0.9);
                    p.glow(0, -40, 90, C[4], 0.5);
                });
                // 땅을 기어가는 전류
                const eu = seg(t, 0.45, 1.2);
                if (eu > 0 && eu < 1)
                    for (let i = 0; i < 6; i++) {
                        const a = (i / 6) * Math.PI;
                        const L = 20 + eu * 50;
                        p.line(0, 0, -Math.cos(a) * L, Math.sin(a) * 3, C[4], (1 - eu) * (Math.sin(t * 50 + i) > 0 ? 1 : 0));
                    }
                ps.draw(p);
            },
        };
    },
);

// ─────────────── 대지 붕괴 (마법사·대지): 땅이 갈라지며 바위 기둥이 솟구친다 ───────────────
export const earthRupture = mk(
    { name: 'Earth rupture', size: [220, 180], origin: [110, 160], duration: 1.7, loop: false, options: { palette: ['#1e120a', '#4a2e18', '#7a5230', '#b0844a', '#e0c08a', '#fff0d0'], seed: 31 } },
    (o) => {
        const C = fit(o.palette, 6);
        const R = new Rng(o.seed);
        const ps = new Particles({ rng: R, ground: () => 0, sparks: [C[5], C[4]] });
        const pillars = Array.from({ length: 5 }, (_, i) => ({ x: (i - 2) * 15 + R.range(-3, 3), h: [34, 52, 70, 50, 36][i] * R.range(0.85, 1.1), w: R.range(7, 10), at: 0.28 + Math.abs(i - 2) * 0.06, burst: false }));
        let t = 0;
        return {
            update(dt) {
                t += dt;
                for (const pl of pillars)
                    if (!pl.burst && t >= pl.at) {
                        pl.burst = true;
                        for (let i = 0; i < 8; i++) {
                            const a = -Math.PI / 2 + R.range(-1.1, 1.1);
                            ps.spawn(P.GRIT, pl.x, -pl.h * 0.6, Math.cos(a) * R.range(60, 200), Math.sin(a) * R.range(80, 240), R.range(0.5, 0.9), R.pick(['#4a2e18', '#7a5230', '#b0844a']), R.range(1.2, 2.6));
                        }
                        for (let i = 0; i < 4; i++) ps.spawn(P.DUST, pl.x, -2, R.range(-50, 50), R.range(-40, -10), R.range(0.8, 1.3), 0, R.range(2, 3.5));
                    }
                ps.update(dt);
            },
            draw(p) {
                const fade = 1 - seg(t, 1.2, 1.7);
                // 먼저 땅이 흔들리며 금이 간다
                const cu = ease.outCubic(seg(t, 0, 0.28));
                for (let i = 0; i < 7; i++) {
                    const x1 = (i - 3) * 22 * cu;
                    p.line(0, 1, x1, 1 + Math.abs(i - 3), C[0], fade);
                    p.line(x1, 1 + Math.abs(i - 3), x1 + 6 * cu, 3, C[0], fade);
                }
                p.glow(0, 0, 60 * cu, C[3], 0.25 * fade);
                // 바위 기둥: 튀어 오르며 솟고(넘치게 솟았다 내려앉음), 끝에 깨진 모서리
                for (const pl of pillars) {
                    const u = ease.outBack(seg(t, pl.at, pl.at + 0.16));
                    if (u <= 0) continue;
                    const sink = seg(t, 1.0, 1.5);
                    const h = pl.h * u * (1 - sink);
                    if (h < 1) continue;
                    const w = pl.w;
                    p.poly([[pl.x - w, 0], [pl.x + w, 0], [pl.x + w * 0.7, -h + 4], [pl.x + 2, -h], [pl.x - w * 0.6, -h + 6]], C[2]);
                    p.poly([[pl.x, 0], [pl.x + w, 0], [pl.x + w * 0.7, -h + 4], [pl.x + 2, -h]], C[1]);
                    p.line(pl.x - w * 0.6, -h + 6, pl.x + 2, -h, C[4]);
                    for (let k = 10; k < h; k += 11) p.line(pl.x - w * 0.8, -k, pl.x - w * 0.2, -k - 3, C[1]);
                }
                ps.draw(p);
            },
        };
    },
);

// ─────────────── 그림자 분신 (도적): 사방에서 그림자 분신이 덮쳐 벤다 ───────────────
const CLONE = ['..xx..', '..xx..', '.xxxx.', 'x.xx.x', '..xx..', '.x..x.', 'x....x'];
export const shadowClones = mk(
    { name: 'Shadow clones', size: [220, 170], origin: [110, 150], duration: 1.6, loop: false, options: { palette: ['#06040c', '#1e1036', '#3a2468', '#7a5ab8', '#c8b0ff', '#ffffff'], seed: 37 } },
    (o) => {
        const C = fit(o.palette, 6);
        const R = new Rng(o.seed);
        const ps = new Particles({ rng: R, ground: () => 0, sparks: [C[4], WHITE] });
        // 분신 6명: 각자 다른 방향에서 대상(0, -40)을 꿰뚫고 지나간다
        const clones = Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2 + R.range(-0.3, 0.3);
            return { a, at: 0.12 + i * 0.13, hit: false };
        });
        let t = 0;
        return {
            update(dt) {
                t += dt;
                for (const c of clones)
                    if (!c.hit && t >= c.at + 0.08) {
                        c.hit = true;
                        for (let i = 0; i < 5; i++) ps.spawn(P.SPARK, 0, -40, R.range(-180, 180), R.range(-180, 120), R.range(0.12, 0.3), WHITE, 1);
                    }
                ps.update(dt);
            },
            draw(p) {
                for (const c of clones) {
                    const u = seg(t, c.at, c.at + 0.16);
                    if (u <= 0 || u >= 1) continue;
                    const d = 90 * (1 - 2 * ease.inOutSine(u));
                    const x = Math.cos(c.a) * d, y = -40 + Math.sin(c.a) * d * 0.6;
                    // 잔상 꼬리
                    for (let k = 1; k <= 3; k++) {
                        const dk = 90 * (1 - 2 * ease.inOutSine(Math.max(0, u - k * 0.06)));
                        p.disc(Math.cos(c.a) * dk, -40 + Math.sin(c.a) * dk * 0.6, 4 - k, C[2], 1);
                    }
                    // 분신 실루엣 (작은 사람 모양 도트)
                    for (let yy = 0; yy < CLONE.length; yy++)
                        for (let xx = 0; xx < CLONE[yy].length; xx++) if (CLONE[yy][xx] === 'x') p.rect(x - 6 + xx * 2, y - 7 + yy * 2, 2, 2, C[1]);
                    p.rect(x - 2, y - 7, 4, 2, C[4]);
                    // 지나가며 긋는 칼선
                    if (Math.abs(u - 0.5) < 0.15) {
                        const sa = c.a + Math.PI / 2;
                        p.line(-Math.cos(sa) * 22, -40 - Math.sin(sa) * 22, Math.cos(sa) * 22, -40 + Math.sin(sa) * 22, WHITE);
                        p.glowLine(-Math.cos(sa) * 22, -40 - Math.sin(sa) * 22, Math.cos(sa) * 22, -40 + Math.sin(sa) * 22, 5, C[4], 0.5);
                    }
                }
                // 마지막에 분신들이 한 점으로 모여 터진다
                const fu = seg(t, 0.95, 1.15);
                if (fu > 0 && fu < 1) {
                    p.ring(0, -40, 8 + fu * 50, 3, C[4], 1 - fu);
                    if (fu < 0.3) p.disc(0, -40, 18, C[4], 0.8);
                }
                ps.draw(p);
            },
        };
    },
);

// ─────────────── 독의 폭풍 (도적): 독 회오리가 휘몰아치며 거품이 터진다 ───────────────
export const venomStorm = mk(
    { name: 'Venom storm', size: [180, 190], origin: [90, 170], duration: 1.8, loop: false, options: { palette: ['#08180a', '#1d5a1f', '#2f8f2b', '#5fcf4a', '#a8ef7a', '#e6ffd0'], seed: 41 } },
    (o) => {
        const C = fit(o.palette, 6);
        const R = new Rng(o.seed);
        const ps = new Particles({ rng: R, ground: () => 0, sparks: [C[5], C[4]] });
        const motes = Array.from({ length: 60 }, (_, i) => ({ a: R.range(0, Math.PI * 2), h: (i / 60) * 110, s: R.range(3, 5), r: R.range(0.8, 1.2) }));
        let t = 0;
        let popped = 0;
        return {
            update(dt) {
                t += dt;
                while (popped < Math.min(24, (t - 0.4) * 30)) {
                    popped++;
                    ps.spawn(P.MOTE, R.range(-30, 30), -R.range(10, 90), R.range(-30, 30), R.range(-40, -10), R.range(0.4, 0.8), R.pick(['#a8ef7a', '#5fcf4a', '#e6ffd0']), R.range(1, 2));
                }
                ps.update(dt);
            },
            draw(p) {
                const grow = ease.outCubic(seg(t, 0, 0.5));
                const fade = 1 - seg(t, 1.3, 1.8);
                // 바닥의 독 웅덩이
                p.ellipse(0, 0, 50 * grow, 9 * grow, C[1], fade > 0.3 ? 1 : 0);
                p.ellipse(0, -1, 40 * grow, 6 * grow, C[2], fade > 0.3 ? 1 : 0);
                // 회오리: 위로 갈수록 넓어지는 나선을 도는 독 방울
                for (const m of motes) {
                    if (m.h > 110 * grow) continue;
                    const w = (14 + m.h * 0.35) * m.r;
                    const a = m.a + t * m.s;
                    const x = Math.cos(a) * w;
                    const y = -m.h + Math.sin(a) * w * 0.18;
                    const front = Math.sin(a) > 0;
                    p.disc(x, y, front ? 2 : 1.4, front ? C[4] : C[2], fade > 0.2 ? 1 : 0);
                }
                // 거품이 부풀었다 터진다
                for (let i = 0; i < 5; i++) {
                    const bt = (t * 1.6 + i * 0.37) % 1;
                    const bx = (i - 2) * 14, by = -2;
                    if (bt < 0.8) p.ring(bx, by - bt * 6, 2 + bt * 4, 1, C[4], fade);
                    else p.disc(bx, by - 5, 6, C[5], fade * 0.8);
                }
                ps.draw(p);
            },
        };
    },
);

void hex;
