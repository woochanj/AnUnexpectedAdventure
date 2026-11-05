// 다크 판타지 픽셀 캐릭터 공통 도구 (64×64).
// 부위를 도형으로 칠하면서 5단 음영 + 2×2 디더링으로 질감을 내고, 앞 부위 경계에 안쪽 윤곽선, 바깥에 진한 외곽선을 두른다.

export const PX = 64;

/** 어두움 → 밝음 5단 */
export type Ramp = [number, number, number, number, number];

export const u32 = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return ((0xff << 24) | ((n & 0xff) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
};
export const R = (...h: string[]) => h.map(u32) as Ramp;

export const INK = u32('#08070c');
export const CONTOUR = u32('#0e0c14');
const BAYER = [0, 2, 3, 1]; // 2×2

export class Buf {
    d = new Uint32Array(PX * PX);
    /** 픽셀마다 어느 부위인지 (부위 경계에 안쪽 윤곽선을 넣기 위해) */
    part = new Uint16Array(PX * PX);
    cur = 1;
    /** 새 부위 시작. contour=false면 이 부위에는 윤곽선을 넣지 않는다 (칼날 등 가는 것) */
    begin(contour = true) {
        // 짝수 = 윤곽선 넣는 부위, 홀수 = 넣지 않는 부위. 번호는 그리는 순서대로 커진다
        this.cur = (this.cur & ~1) + 2 + (contour ? 0 : 1);
    }
    set(x: number, y: number, c: number) {
        x = Math.round(x);
        y = Math.round(y);
        if (x >= 0 && y >= 0 && x < PX && y < PX) {
            this.d[y * PX + x] = c;
            this.part[y * PX + x] = this.cur;
        }
    }
    /** 앞 부위가 뒤 부위와 맞닿은 가장자리를 어둡게 → 부위가 또렷하게 갈린다 */
    contours() {
        const W = PX, p = this.part, out = this.d.slice();
        for (let y = 0; y < PX; y++)
            for (let x = 0; x < W; x++) {
                const i = y * W + x;
                const me = p[i];
                if (!me || me & 1) continue;
                const behind = (j: number) => p[j] && p[j] < me && !(p[j] & 1);
                if ((x > 0 && behind(i - 1)) || (x < W - 1 && behind(i + 1)) || (y > 0 && behind(i - W)) || (y < PX - 1 && behind(i + W))) out[i] = CONTOUR;
            }
        this.d = out;
    }
    /** 밝기 l(0~1)을 5단 음영으로. 단계 사이는 디더링 */
    shade(x: number, y: number, l: number, r: Ramp) {
        const v = Math.max(0, Math.min(1, l)) * 4;
        const i = Math.floor(v);
        const frac = v - i;
        const th = (BAYER[(x & 1) + (y & 1) * 2] + 0.5) / 4;
        this.set(x, y, r[Math.min(4, frac > th ? i + 1 : i)]);
    }
    /** 타원: 법선 방향으로 왼쪽 위 빛 */
    ellipse(cx: number, cy: number, rx: number, ry: number, r: Ramp, bias = 0) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
            for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
                const nx = (x + 0.5 - cx) / rx;
                const ny = (y + 0.5 - cy) / ry;
                const d = nx * nx + ny * ny;
                if (d > 1) continue;
                const nz = Math.sqrt(1 - d);
                let l = 0.15 + (-nx * 0.45 - ny * 0.55 + nz * 0.55) * 0.75 + bias;
                if (nx > 0.75 && d > 0.6) l += 0.25; // 반사광
                this.shade(x, y, l, r);
            }
    }
    /** 선분 둘레 두께 rad의 캡슐 (팔, 다리) */
    capsule(x0: number, y0: number, x1: number, y1: number, rad: number, r: Ramp, bias = 0) {
        const minX = Math.floor(Math.min(x0, x1) - rad), maxX = Math.ceil(Math.max(x0, x1) + rad);
        const minY = Math.floor(Math.min(y0, y1) - rad), maxY = Math.ceil(Math.max(y0, y1) + rad);
        const vx = x1 - x0, vy = y1 - y0, len2 = vx * vx + vy * vy || 1;
        for (let y = minY; y <= maxY; y++)
            for (let x = minX; x <= maxX; x++) {
                const px = x + 0.5 - x0, py = y + 0.5 - y0;
                const t = Math.max(0, Math.min(1, (px * vx + py * vy) / len2));
                const dx = px - vx * t, dy = py - vy * t;
                const dist = Math.hypot(dx, dy);
                if (dist > rad) continue;
                const nx = dx / rad, ny = dy / rad;
                const l = 0.45 + (-nx * 0.5 - ny * 0.4) * 0.8 + bias - t * 0.12;
                this.shade(x, y, l, r);
            }
    }
    /** 볼록 다각형 (점은 시계/반시계 아무 순서) — 세로 그라디언트 + 왼쪽 빛 */
    poly(pts: [number, number][], r: Ramp, bias = 0) {
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        const minX = Math.floor(Math.min(...xs)), maxX = Math.ceil(Math.max(...xs));
        const minY = Math.floor(Math.min(...ys)), maxY = Math.ceil(Math.max(...ys));
        for (let y = minY; y <= maxY; y++)
            for (let x = minX; x <= maxX; x++) {
                const px = x + 0.5, py = y + 0.5;
                let inside = false;
                for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
                    const [xi, yi] = pts[i], [xj, yj] = pts[j];
                    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
                }
                if (!inside) continue;
                const u = (px - minX) / (maxX - minX + 1), v = (py - minY) / (maxY - minY + 1);
                this.shade(x, y, 0.7 - u * 0.45 - v * 0.35 + bias, r);
            }
    }
    line(x0: number, y0: number, x1: number, y1: number, c: number) {
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
        for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
    }
    outline() {
        const s = this.d.slice();
        const W = PX;
        for (let y = 0; y < PX; y++)
            for (let x = 0; x < W; x++) {
                const i = y * W + x;
                if (s[i]) continue;
                if ((x > 0 && s[i - 1]) || (x < W - 1 && s[i + 1]) || (y > 0 && s[i - W]) || (y < PX - 1 && s[i + W])) this.d[i] = INK;
            }
    }
}

/** 버퍼를 출력 배열로 (flip이면 좌우 반전) */
export function blit(b: Buf, out: Uint32Array, flip = false) {
    for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) out[y * PX + (flip ? PX - 1 - x : x)] = b.d[y * PX + x];
}

/** 빛나는 점 (외곽선/윤곽선 영향을 받지 않게 마지막에 찍는다) */
export function glowDot(out: Uint32Array, x: number, y: number, c: number, flip = false) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= PX || y >= PX) return;
    out[y * PX + (flip ? PX - 1 - x : x)] = c;
}
