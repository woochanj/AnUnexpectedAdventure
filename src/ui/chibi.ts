// 치비(머리 큰 2등신) 픽셀 캐릭터 렌더러.
// 부위를 도형으로 칠하면서 밝은 면/어두운 면 음영을 자동으로 넣고, 마지막에 진한 1px 외곽선을 두른다.
// 주인공: 여우 귀 후드를 쓴 꼬마 모험가.

export const CHIBI_W = 48;
export const CHIBI_H = 48;

type Ramp = [number, number, number]; // 어두운 면, 기본, 밝은 면

const u32 = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return ((0xff << 24) | ((n & 0xff) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
};
const ramp = (dark: string, base: string, light: string): Ramp => [u32(dark), u32(base), u32(light)];

const INK = u32('#160c24');
const C = {
    hood: ramp('#c8561e', '#ff8a33', '#ffc27a'),
    earIn: ramp('#e8b090', '#fff0de', '#ffffff'),
    skin: ramp('#e8a27e', '#ffd6b4', '#fff0e2'),
    tunic: ramp('#1f6e52', '#35a874', '#7fe0a8'),
    belt: ramp('#4a2a1a', '#7a4a2a', '#a8703e'),
    boot: ramp('#3a2218', '#6a4028', '#9a6440'),
    scarf: ramp('#c8b89a', '#fff4dc', '#ffffff'),
    glove: ramp('#5a3020', '#8a5030', '#b87a48'),
    blade: ramp('#7c8aac', '#d0dcf4', '#ffffff'),
    gold: ramp('#a86a10', '#ffc93a', '#fff0a0'),
    eye: u32('#1a1030'),
    shine: u32('#ffffff'),
    blush: u32('#ff8fa8'),
    mouth: u32('#8a3040'),
};

class Buf {
    d = new Uint32Array(CHIBI_W * CHIBI_H);
    set(x: number, y: number, c: number) {
        x = Math.round(x);
        y = Math.round(y);
        if (x >= 0 && y >= 0 && x < CHIBI_W && y < CHIBI_H) this.d[y * CHIBI_W + x] = c;
    }
    /** 타원. 왼쪽 위가 밝고 오른쪽 아래가 어둡게 */
    ellipse(cx: number, cy: number, rx: number, ry: number, r: Ramp, flat = false) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
            for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
                const nx = (x + 0.5 - cx) / rx;
                const ny = (y + 0.5 - cy) / ry;
                if (nx * nx + ny * ny > 1) continue;
                const s = nx * 0.45 + ny * 0.9;
                this.set(x, y, flat ? r[1] : s > 0.42 ? r[0] : s < -0.55 ? r[2] : r[1]);
            }
    }
    rect(x: number, y: number, w: number, h: number, r: Ramp) {
        x = Math.round(x);
        y = Math.round(y);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, j === h - 1 ? r[0] : j === 0 ? r[2] : r[1]);
    }
    tri(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, r: Ramp) {
        const minX = Math.floor(Math.min(ax, bx, cx)), maxX = Math.ceil(Math.max(ax, bx, cx));
        const minY = Math.floor(Math.min(ay, by, cy)), maxY = Math.ceil(Math.max(ay, by, cy));
        const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
        for (let y = minY; y <= maxY; y++)
            for (let x = minX; x <= maxX; x++) {
                const px = x + 0.5, py = y + 0.5;
                const w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area;
                const w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area;
                const w2 = 1 - w0 - w1;
                if (w0 < 0 || w1 < 0 || w2 < 0) continue;
                this.set(x, y, py < (ay + by + cy) / 3 - 1 ? r[2] : px > (ax + bx + cx) / 3 + 1 ? r[0] : r[1]);
            }
    }
    line(x0: number, y0: number, x1: number, y1: number, c: number, thick = 1) {
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
        for (let i = 0; i <= n; i++) {
            const x = x0 + ((x1 - x0) * i) / n;
            const y = y0 + ((y1 - y0) * i) / n;
            this.set(x, y, c);
            if (thick > 1) this.set(x + 0.5, y + 0.5, c);
        }
    }
    /** 칠해진 영역 바깥 테두리에 진한 선 */
    outline(c = INK) {
        const src = this.d.slice();
        for (let y = 0; y < CHIBI_H; y++)
            for (let x = 0; x < CHIBI_W; x++) {
                const i = y * CHIBI_W + x;
                if (src[i]) continue;
                if ((x > 0 && src[i - 1]) || (x < CHIBI_W - 1 && src[i + 1]) || (y > 0 && src[i - CHIBI_W]) || (y < CHIBI_H - 1 && src[i + CHIBI_W])) this.d[i] = c;
            }
    }
}

export type Eyes = 'open' | 'blink' | 'squint' | 'closed' | 'wide';

export interface Pose {
    /** 몸 높이 (양수 = 웅크림) */
    by: number;
    /** 상체 기울기 (양수 = 앞으로) */
    lean: number;
    /** 칼 각도 (라디안, 0 = 앞쪽 수평, 음수 = 위로) */
    ang: number;
    /** 손 위치 보정 */
    hx: number;
    hy: number;
    /** 다리 벌림 */
    legs: number;
    eyes?: Eyes;
    mouth?: 'smile' | 'o' | 'grit';
}

export const IDLE_POSE: Pose = { by: 0, lean: 0, ang: -0.95, hx: 0, hy: 0, legs: 0, eyes: 'open', mouth: 'smile' };

/** 주인공을 그려 RGBA로 돌려준다 (flip이면 왼쪽을 본다) */
export function drawHero(p: Pose, out: Uint32Array, flip = false) {
    const b = new Buf();
    const cx = 21;
    const by = Math.round(p.by);
    const lean = Math.round(p.lean);
    const bodyX = cx + Math.round(lean * 0.5);

    // 손과 칼 (칼을 머리 위로 들면 머리 뒤에 그린다)
    const drawSword = () => {
        const handX = bodyX + 6 + p.hx;
        const handY = 34 + by + p.hy;
        const dx = Math.cos(p.ang);
        const dy = Math.sin(p.ang);
        // 칼자루
        b.line(handX - dx * 3, handY - dy * 3, handX, handY, C.belt[1], 2);
        // 날
        const tipX = handX + dx * 16;
        const tipY = handY + dy * 16;
        b.line(handX + dx * 2, handY + dy * 2, tipX, tipY, C.blade[1], 2);
        b.line(handX + dx * 3 - dy * 0.6, handY + dy * 3 + dx * 0.6, tipX - dy * 0.6, tipY + dx * 0.6, C.blade[2]);
        // 손잡이 가드
        b.line(handX + dx * 1.5 - dy * 3, handY + dy * 1.5 + dx * 3, handX + dx * 1.5 + dy * 3, handY + dy * 1.5 - dx * 3, C.gold[1], 2);
        // 손
        b.ellipse(handX, handY, 2.4, 2.4, C.glove);
    };
    // 칼이 뒤쪽을 향하면 몸 뒤에 그린다
    const behind = Math.cos(p.ang) < -0.3;
    if (behind) drawSword();

    // 다리 (뒤 → 앞)
    const legY = 40 + Math.min(0, by);
    b.rect(cx - 5 - Math.round(p.legs), legY, 4, 5, C.boot);
    b.rect(cx + 1 + Math.round(p.legs), legY, 4, 5, C.boot);

    // 몸통 (망토 튜닉)
    b.ellipse(bodyX, 35 + by, 7.5, 6.5, C.tunic);
    b.rect(bodyX - 6, 36 + by, 13, 2, C.belt);
    b.set(bodyX + 2, 36 + by, C.gold[1]);



    // 머리
    const hx = cx + lean;
    const hy = 21 + by;
    // 여우 귀
    b.tri(hx - 10, hy - 3, hx - 7, hy - 15, hx - 1, hy - 8, C.hood);
    b.tri(hx + 1, hy - 8, hx + 7, hy - 15, hx + 10, hy - 3, C.hood);
    b.tri(hx - 8, hy - 5, hx - 7, hy - 12, hx - 3, hy - 8, C.earIn);
    b.tri(hx + 3, hy - 8, hx + 7, hy - 12, hx + 8, hy - 5, C.earIn);
    // 후드
    b.ellipse(hx, hy, 11, 10, C.hood);
    // 얼굴 (오른쪽을 보므로 오른쪽으로 치우침)
    b.ellipse(hx + 2, hy + 3, 8.2, 7, C.skin);
    // 앞머리처럼 후드 가장자리
    for (let x = -5; x <= 9; x++) b.set(hx + 2 + x, hy - 3 + (Math.abs(x - 2) > 5 ? 1 : 0), C.hood[1]);
    for (let x = -3; x <= 7; x += 3) b.set(hx + 2 + x, hy - 2, C.hood[0]);

    // 눈
    const e = p.eyes ?? 'open';
    const eyeY = hy + 2;
    for (const ex of [hx - 1, hx + 5]) {
        if (e === 'open' || e === 'wide') {
            b.rect(ex, eyeY, 2, e === 'wide' ? 4 : 3, [C.eye, C.eye, C.eye]);
            b.set(ex, eyeY, C.shine);
        } else if (e === 'blink' || e === 'closed') {
            b.set(ex, eyeY + 2, C.eye);
            b.set(ex + 1, eyeY + 2, C.eye);
            if (e === 'closed') b.set(ex + (ex === hx - 1 ? -1 : 2), eyeY + 1, C.eye);
        } else {
            // > < 모양
            const d = ex === hx - 1 ? 1 : -1;
            b.set(ex + (d > 0 ? 0 : 1), eyeY, C.eye);
            b.set(ex + (d > 0 ? 1 : 0), eyeY + 1, C.eye);
            b.set(ex + (d > 0 ? 0 : 1), eyeY + 2, C.eye);
        }
    }
    // 볼 터치 + 입
    b.set(hx - 2, hy + 6, C.blush);
    b.set(hx - 3, hy + 6, C.blush);
    b.set(hx + 7, hy + 6, C.blush);
    b.set(hx + 8, hy + 6, C.blush);
    const m = p.mouth ?? 'smile';
    if (m === 'o') {
        b.set(hx + 2, hy + 7, C.mouth);
        b.set(hx + 3, hy + 7, C.mouth);
        b.set(hx + 2, hy + 8, C.mouth);
        b.set(hx + 3, hy + 8, C.mouth);
    } else if (m === 'grit') {
        b.line(hx + 1, hy + 7, hx + 4, hy + 7, C.mouth);
    } else {
        b.set(hx + 1, hy + 7, C.mouth);
        b.set(hx + 2, hy + 8, C.mouth);
        b.set(hx + 3, hy + 8, C.mouth);
        b.set(hx + 4, hy + 7, C.mouth);
    }

    // 목도리 (꼬리가 뒤로 휘날림)
    b.ellipse(hx + 1, hy + 10.5, 6.5, 2, C.scarf);
    b.rect(hx - 8, hy + 10 + (by > 0 ? 1 : 0), 4, 2, C.scarf);

    if (!behind) drawSword();

    b.outline();

    // 출력 (좌우 반전 가능)
    for (let y = 0; y < CHIBI_H; y++)
        for (let x = 0; x < CHIBI_W; x++) out[y * CHIBI_W + (flip ? CHIBI_W - 1 - x : x)] = b.d[y * CHIBI_W + x];
}

// ───────────── 동작 (키프레임) ─────────────

export type Key = [number, Partial<Pose>];

const P = (o: Partial<Pose>): Partial<Pose> => o;
// 칼을 몸 뒤 아래로 뺐다가 → 앞 위로 올려 벤다
const WIND = P({ by: 1, lean: -3, ang: 2.75, hx: -9, hy: 3, legs: -1, eyes: 'squint', mouth: 'grit' });
const STRIKE = P({ by: 0, lean: 4, ang: -0.35, hx: 4, hy: -1, legs: 2, eyes: 'open', mouth: 'grit' });
const FOLLOW = P({ by: 1, lean: 3, ang: -1.1, hx: 3, hy: -3, legs: 2, eyes: 'open', mouth: 'smile' });
// 얼굴 옆에서 칼을 세워 든 자세 (내려찍기 예비동작, 주문)
const RAISE = P({ by: -1, lean: -1, ang: -1.68, hx: 3, hy: -6 });

/** 동작 이름 → 키프레임. t=0이 공격이 닿는 순간 */
export const MOVES: Record<string, Key[]> = {
    slash: [[-0.3, {}], [-0.17, WIND], [-0.04, { ...WIND, hy: 4 }], [0, STRIKE], [0.12, FOLLOW], [0.45, {}]],
    double: [[-0.3, {}], [-0.17, WIND], [-0.04, WIND], [0, STRIKE], [0.1, { ...FOLLOW, ang: -1.5 }], [0.2, { ...STRIKE, ang: 0.8, hy: 2 }], [0.3, { ...FOLLOW, ang: 1.0, hy: 2 }], [0.6, {}]],
    dagger: [
        [-0.3, {}], [-0.12, { ...WIND, ang: -0.3, hx: -4, hy: 0 }], [0, { ...STRIKE, ang: 0.05, hx: 7 }], [0.08, { ...WIND, ang: -0.3, hx: -1, hy: 0 }],
        [0.15, { ...STRIKE, ang: -0.15, hx: 7 }], [0.23, { ...WIND, ang: -0.3, hx: -1, hy: 0 }], [0.3, { ...STRIKE, ang: 0.1, hx: 7 }], [0.55, {}],
    ],
    cleave: [[-0.3, {}], [-0.14, { ...RAISE, eyes: 'squint', mouth: 'grit' }], [-0.03, { ...RAISE, hy: -7, eyes: 'squint', mouth: 'grit' }], [0, { ...STRIKE, ang: 1.25, by: 3, hy: 3 }], [0.2, { ...STRIKE, ang: 1.3, by: 3, hy: 3, mouth: 'smile' }], [0.55, {}]],
    smash: [[-0.3, {}], [-0.14, { ...RAISE, eyes: 'squint', mouth: 'grit' }], [-0.03, { ...RAISE, hy: -7, eyes: 'squint', mouth: 'grit' }], [0, { ...STRIKE, ang: 1.25, by: 3, hy: 3 }], [0.2, { ...STRIKE, ang: 1.3, by: 3, hy: 3, mouth: 'smile' }], [0.55, {}]],
    reap: [[-0.3, {}], [-0.12, WIND], [0, { ...STRIKE, ang: 0.2 }], [0.25, FOLLOW], [0.6, {}]],
    thrust: [[-0.3, {}], [-0.12, { ...WIND, ang: -0.1, hx: -5, hy: 0 }], [0, { ...STRIKE, ang: -0.05, hx: 8 }], [0.2, FOLLOW], [0.5, {}]],
    spin: [[-0.3, {}], [-0.12, { ...WIND, ang: -2.4 }], [0, { ...STRIKE, ang: 0.6 }], [0.08, { ...STRIKE, ang: 2.4, lean: 1, hx: -2 }], [0.16, { ...STRIKE, ang: 3.9, lean: -1, hx: -4 }], [0.24, { ...STRIKE, ang: 6.8 }], [0.5, {}]],
    block: [[0, {}], [0.08, { by: 2, lean: -1, ang: -1.57, hx: 2, hy: -3, legs: 1, eyes: 'squint', mouth: 'grit' }], [0.5, { by: 2, lean: -1, ang: -1.57, hx: 2, hy: -3, legs: 1, eyes: 'open', mouth: 'grit' }], [0.7, {}]],
    cast: [[0, {}], [0.1, { ...RAISE, eyes: 'closed', mouth: 'o' }], [0.55, { ...RAISE, eyes: 'closed', mouth: 'o' }], [0.75, {}]],
    heal: [[0, {}], [0.1, { ...RAISE, eyes: 'closed', mouth: 'smile' }], [0.6, { ...RAISE, eyes: 'closed' }], [0.8, {}]],
    charge: [[0, {}], [0.12, { by: 2, ang: -1.2, hx: 2, hy: -2, eyes: 'squint', mouth: 'grit' }], [0.32, { ...RAISE, by: -3, eyes: 'wide', mouth: 'o' }], [0.65, {}]],
    rage: [[0, {}], [0.12, { by: 3, ang: -0.5, eyes: 'squint', mouth: 'grit' }], [0.3, { ...RAISE, by: -4, legs: 2, eyes: 'wide', mouth: 'o' }], [0.45, { by: 0, ang: -1.2, eyes: 'open', mouth: 'grit' }], [0.7, {}]],
    hurt: [[0, { by: 1, lean: -4, ang: -0.3, hx: -3, hy: 1, eyes: 'squint', mouth: 'o' }], [0.12, { by: 1, lean: -3, ang: -0.4, hx: -3, hy: 1, eyes: 'squint', mouth: 'o' }], [0.4, {}]],
};

const NUM: (keyof Pose)[] = ['by', 'lean', 'ang', 'hx', 'hy', 'legs'];

/** 키프레임 사이를 보간한 자세. 눈/입은 직전 키를 따른다 */
export function samplePose(keys: Key[], t: number): Pose {
    const full = keys.map(([k, p]) => [k, { ...IDLE_POSE, ...p }] as [number, Pose]);
    if (t <= full[0][0]) return full[0][1];
    for (let i = 0; i < full.length - 1; i++) {
        const [t0, a] = full[i];
        const [t1, b] = full[i + 1];
        if (t <= t1) {
            const u = (t - t0) / (t1 - t0);
            const o: Pose = { ...a };
            for (const k of NUM) (o[k] as number) = (a[k] as number) + ((b[k] as number) - (a[k] as number)) * u;
            return o;
        }
    }
    return full[full.length - 1][1];
}

export const moveSpan = (keys: Key[]) => ({ from: keys[0][0], to: keys[keys.length - 1][0] });
