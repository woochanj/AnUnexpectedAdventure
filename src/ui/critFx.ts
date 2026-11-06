// 치명타: 별 모양 폭발 대신, 단순하지만 세게 때린 느낌.
// 숫자는 크게 하얗게 박혔다가 짧게 떨리며 자리 잡고, 몸에는 굵은 한 줄 베임 + 바닥 충격파만.
import { Particles, Lights, P, Rng, fit, WHITE, ease, clamp } from 'pixelfx/core/index';
import { spell, drawWord } from 'pixelfx/fx/ui/_lib';
import type { FxModule } from 'pixelfx';

type Painter = {
    line(x0: number, y0: number, x1: number, y1: number, c: number, a?: number): void;
    ellipse(cx: number, cy: number, rx: number, ry: number, c: number, a?: number | ((d: number) => number)): void;
    rect(x: number, y: number, w: number, h: number, c: number, a?: number): void;
    glow(x: number, y: number, r: number, c: number, k?: number): void;
    glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void;
};
type Opts = { palette: string[]; seed: number; flip?: boolean; text?: string };
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const mk = (meta: Record<string, unknown>, create: (o: Opts) => { update(dt: number): void; draw(p: Painter): void }) => ({ meta, create }) as unknown as FxModule;

/** 치명타 숫자: 크게 박히고(하얀 한 프레임) 짧게 떨린 뒤 단단히 자리 잡는다. 장식 없음 */
export const critNumberHeavy = mk(
    {
        name: 'Crit number (heavy)', size: [150, 90], origin: [75, 70], duration: 1.05, loop: false,
        options: { palette: ['#1a0604', '#5a1208', '#b0280e', '#f05a1a', '#ffa030', '#ffe070', '#fff6d0', '#ffffff'], text: '45!', seed: 1 },
    },
    (o) => {
        const C = fit(o.palette, 8);
        const word = spell(o.text ?? '0');
        const R = new Rng(o.seed);
        const lights = new Lights();
        let t = 0;
        let lit = false;
        return {
            update(dt) {
                t += dt;
                if (!lit) {
                    lit = true;
                    lights.add(0, -12, 46, C[5], 0.8, 0.2);
                }
                lights.update(dt);
            },
            draw(p) {
                const out = seg(t, 0.78, 1.02);
                if (out >= 1) return;
                // 크기: 4.4에서 3으로 탁 줄어들며 한 번 튕긴다
                const s = 3 + 1.4 * Math.exp(-t * 26) * Math.cos(t * 38);
                // 떨림: 처음 0.14초만, 정수 도트로 (번지지 않게)
                const k = t < 0.14 ? Math.round((1 - t / 0.14) * 3) : 0;
                const jx = k ? (R.int(0, 2) - 1) * k : 0;
                const jy = k ? (R.int(0, 2) - 1) * Math.ceil(k / 2) : 0;
                const W = word.w * s;
                const H = 7 * s;
                const x0 = Math.round(-W / 2 + jx);
                const y0 = Math.round(-H - 6 + jy - 8 * ease.inQuad(out));
                const flash = t < 0.05 ? 1 : t < 0.09 ? 0.45 : 0;
                const items = word.letters.filter((L: { g: unknown }) => L.g).map((L: { g: unknown; x: number }) => ({ g: L.g, x: x0 + L.x * s, y: y0, sx: s, sy: s, flash, a: 1 - out, slant: 1 }));
                drawWord(p, items, { fill: [C[3], C[4], C[5], C[6]], edge: WHITE, under: C[2], outline: C[0], ow: 2, shadow: C[1] });
                // 박히는 순간 아래로 짧은 흰 띠 하나 (무게감)
                if (t < 0.1) p.rect(x0 - 4, y0 + H + 3, W + 8, t < 0.05 ? 3 : 2, t < 0.05 ? WHITE : C[6], 1 - t / 0.1);
                p.glow(0, y0 + H / 2, 30, C[4], 0.25 * (1 - out) + (t < 0.12 ? 0.5 * (1 - t / 0.12) : 0));
                lights.draw(p);
            },
        };
    },
);

/** 치명타 타격: 몸을 가로지르는 굵은 흰 베임 한 줄 + 바닥에 납작한 충격파 + 옆으로 튀는 불티 몇 개 */
export const critSlam = mk(
    { name: 'Crit slam', size: [220, 170], origin: [110, 130], duration: 0.5, loop: false, options: { palette: ['#1a0604', '#5a1208', '#b0280e', '#f05a1a', '#ffa030', '#ffe070', '#ffffff'], seed: 2 } },
    (o) => {
        const C = fit(o.palette, 7);
        const R = new Rng(o.seed);
        const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[5], C[4]] });
        const lights = new Lights();
        const dir = o.flip ? -1 : 1; // 맞은 쪽 뒤로
        let t = 0;
        let hit = false;
        return {
            update(dt) {
                t += dt;
                if (!hit) {
                    hit = true;
                    lights.add(0, -50, 90, WHITE, 1, 0.12);
                    for (let i = 0; i < 10; i++) {
                        const a = R.range(-0.35, 0.25);
                        const v = R.range(220, 420);
                        ps.spawn(P.SPARK, 0, -50 + R.range(-14, 14), Math.cos(a) * v * dir, Math.sin(a) * v, R.range(0.12, 0.24), i % 3 ? C[5] : WHITE, 1);
                    }
                }
                ps.update(dt);
                lights.update(dt);
            },
            draw(p) {
                // 베임: 처음 2프레임은 굵고 하얗게, 곧 가늘어지며 사라진다
                const cut = seg(t, 0, 0.18);
                if (cut < 1) {
                    const w = t < 0.04 ? 7 : Math.max(1, 5 * (1 - cut));
                    const x0 = -64 * dir;
                    const x1 = 64 * dir;
                    p.glowLine(x0, -96, x1, -14, w + 4, t < 0.05 ? WHITE : C[5], 0.7 * (1 - cut));
                    p.glowLine(x0, -96, x1, -14, w, WHITE, 1 - cut * 0.6);
                }
                // 바닥 충격파: 납작한 타원 고리
                const rk = seg(t, 0.02, 0.36);
                if (rk > 0 && rk < 1) {
                    const rx = 14 + 80 * ease.outCubic(rk);
                    p.ellipse(0, -2, rx, rx * 0.22, rk < 0.3 ? WHITE : C[5], (d: number) => (d > 0.82 ? 1 - rk : 0));
                }
                ps.draw(p);
                if (t < 0.08) p.glow(0, -50, 70, WHITE, 0.9 * (1 - t / 0.08));
                lights.draw(p);
            },
        };
    },
);
