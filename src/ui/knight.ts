// 다크 판타지 기사 픽셀 렌더러 (64×64).
// 부위를 도형으로 칠하면서 5단 음영 + 2×2 디더링으로 질감을 내고, 마지막에 진한 외곽선을 두른다.
// 빛은 왼쪽 위에서 오고, 오른쪽 가장자리에는 차가운 반사광을 살짝 남긴다.

import { blit, Buf, R, u32, INK, type Ramp } from './pixelkit';

export const KNIGHT_W = 64;
export const KNIGHT_H = 64;


const GLOW = u32('#ff4a3a');
const GLOW_HOT = u32('#ffd0a0');

export type KnightPalette = Record<'steel' | 'steelDark' | 'gold' | 'cape' | 'leather' | 'blade', Ramp>;

export const KNIGHT_HERO: KnightPalette = {

    steel: R('#1c1a24', '#363441', '#5a5866', '#8e8e9e', '#d6dae6'),
    steelDark: R('#121119', '#22212b', '#363440', '#54525f', '#807f92'),
    gold: R('#221808', '#3e2c12', '#6a4e24', '#9a7a42', '#cbb27a'),
    cape: R('#1a080c', '#34101a', '#5a1a24', '#82262c', '#a8403a'),
    leather: R('#120c0a', '#231914', '#3a2a20', '#56402e', '#76604a'),
    blade: R('#2a2c36', '#565a68', '#8a90a0', '#c4cad8', '#f0f4ff'),
};

export type Visor = 'dim' | 'glow' | 'flash';

export interface Pose {
    by: number;
    lean: number;
    /** 칼 각도 (0 = 앞쪽 수평, 음수 = 위로) */
    ang: number;
    hx: number;
    hy: number;
    legs: number;
    /** 망토 휘날림 (음수 = 뒤로) */
    cape: number;
    visor?: Visor;
}

export const IDLE_POSE: Pose = { by: 0, lean: 0, ang: 0.62, hx: 0, hy: 0, legs: 0, cape: 0, visor: 'dim' };

export function drawKnight(p: Pose, out: Uint32Array, flip = false, M: KnightPalette = KNIGHT_HERO, crown = false) {
    const b = new Buf();
    const cx = 26;
    const by = Math.round(p.by);
    const lean = Math.round(p.lean);
    const hip = { x: cx + Math.round(lean * 0.3), y: 44 + by };
    const chest = { x: cx + Math.round(lean * 0.6), y: 35 + by };
    const head = { x: cx + 1 + lean, y: 22 + by };
    const sway = p.cape - lean * 0.8;

    // ── 칼 (뒤쪽을 향할 때는 몸 뒤에 먼저 그린다)
    const hand = { x: chest.x + 10 + p.hx, y: chest.y + 4 + p.hy };
    const drawSword = () => {
        b.begin(false);
        const dx = Math.cos(p.ang), dy = Math.sin(p.ang);
        const L = 25;
        // 날: 가운데 홈(어두움) + 양날 하이라이트
        for (let i = 3; i <= L; i++) {
            const x = hand.x + dx * i, y = hand.y + dy * i;
            const taper = i > L - 3 ? 0 : 1;
            b.set(x, y, M.blade[2]);
            b.set(x - dy * 1, y + dx * 1, i % 3 === 0 ? M.blade[4] : M.blade[3]);
            if (taper) b.set(x + dy * 1, y - dx * 1, M.blade[1]);
        }
        b.line(hand.x + dx * 4, hand.y + dy * 4, hand.x + dx * (L - 5), hand.y + dy * (L - 5), M.blade[0]);
        // 손잡이와 가드
        b.capsule(hand.x - dx * 4, hand.y - dy * 4, hand.x, hand.y, 1, M.leather);
        b.ellipse(hand.x - dx * 5, hand.y - dy * 5, 1.6, 1.6, M.gold);
        b.capsule(hand.x + dx * 2 - dy * 4, hand.y + dy * 2 + dx * 4, hand.x + dx * 2 + dy * 4, hand.y + dy * 2 - dx * 4, 1.1, M.gold);
    };
    const behind = Math.cos(p.ang) < -0.3;
    if (behind) drawSword();

    // ── 망토 (해진 밑단)
    b.begin();
    const capeTop: [number, number][] = [
        [chest.x - 5, chest.y - 6],
        [chest.x + 2, chest.y - 6],
    ];
    const hem: [number, number][] = [];
    const hemY = 59 + Math.min(0, by);
    for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        const x = chest.x + 1 + sway * 0.6 - t * (15 - sway * 0.8);
        const y = hemY - t * 3 + (i % 2 ? -3 : 0);
        hem.push([x, y]);
    }
    b.poly([...capeTop, ...hem], M.cape, -0.1);

    // ── 뒷다리, 뒷팔 (어둡게)
    b.begin();
    const footY = 61 + Math.min(0, by);
    b.capsule(hip.x - 3, hip.y, cx - 4 - p.legs, footY - 3, 2.6, M.steelDark);
    b.ellipse(cx - 4 - p.legs, footY - 1, 3.2, 1.8, M.steelDark);
    b.capsule(chest.x - 5, chest.y - 3, chest.x - 7, chest.y + 7, 2.2, M.steelDark);

    // ── 앞다리
    b.begin();
    b.capsule(hip.x + 2, hip.y, cx + 3 + p.legs, footY - 3, 2.8, M.steel);
    b.ellipse(cx + 4 + p.legs, footY - 1, 3.4, 1.9, M.steel, -0.05);
    b.ellipse(cx + 2 + p.legs * 0.5, hip.y + 8, 2.2, 1.8, M.steel, 0.1); // 무릎 보호대

    // ── 허리 갑옷 자락 + 벨트
    b.begin();
    b.poly([[hip.x - 7, hip.y - 3], [hip.x + 7, hip.y - 3], [hip.x + 8, hip.y + 4], [hip.x - 8, hip.y + 4]], M.steel, -0.05);
    for (let x = hip.x - 6; x <= hip.x + 6; x += 4) b.line(x, hip.y - 1, x, hip.y + 3, M.steel[0]);
    b.poly([[hip.x - 7, hip.y - 4], [hip.x + 7, hip.y - 4], [hip.x + 7, hip.y - 2], [hip.x - 7, hip.y - 2]], M.leather);
    b.ellipse(hip.x + 1, hip.y - 3, 1.5, 1.2, M.gold, 0.1);

    // ── 흉갑: 가운데 능선 하이라이트
    b.begin();
    b.ellipse(chest.x, chest.y, 8, 8.5, M.steel);
    b.line(chest.x - 1, chest.y - 6, chest.x + 1, chest.y + 6, M.steel[3]);
    b.line(chest.x, chest.y - 6, chest.x + 2, chest.y + 6, M.steel[1]);
    // 금 장식 테두리 (목 아래)
    b.line(chest.x - 6, chest.y - 6, chest.x + 6, chest.y - 6, M.gold[2]);

    // ── 투구: 둥근 윗부분 + 평평한 얼굴판 + 눈구멍
    b.begin();
    b.capsule(head.x - 1, head.y + 6, head.x + 1, head.y + 8, 3, M.steelDark); // 목 보호대
    b.ellipse(head.x, head.y, 6, 7, M.steel);
    b.poly([[head.x + 1, head.y - 2], [head.x + 7, head.y - 1], [head.x + 6, head.y + 6], [head.x + 1, head.y + 7]], M.steel, 0.05);
    // 볏 장식 (뒤로 휘날림)
    b.begin(false);
    for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const x = head.x + 1 - t * (9 - sway * 0.4);
        const y = head.y - 7 + t * t * 6 + Math.sin(i * 1.7) * 0.6;
        b.ellipse(x, y, 1.6 - t * 0.6, 1.4, M.cape, 0.2);
    }
    // 왕관 (보스용)
    if (crown) {
        b.begin();
        b.poly([[head.x - 5, head.y - 5], [head.x + 6, head.y - 5], [head.x + 6, head.y - 3], [head.x - 5, head.y - 3]], M.gold);
        for (const ox of [-4, 0.5, 5]) b.poly([[head.x + ox - 2, head.y - 5], [head.x + ox, head.y - 11], [head.x + ox + 2, head.y - 5]], M.gold, 0.1);
    }
    // 눈구멍
    b.begin(false);
    b.line(head.x + 1, head.y, head.x + 7, head.y, INK);
    b.line(head.x + 2, head.y + 1, head.x + 6, head.y + 1, M.steel[0]);
    const v = p.visor ?? 'dim';
    if (v !== 'dim') {
        b.set(head.x + 4, head.y, v === 'flash' ? GLOW_HOT : GLOW);
        b.set(head.x + 5, head.y, GLOW);
    } else b.set(head.x + 4, head.y, u32('#6a1a18'));
    // 숨구멍
    for (let i = 0; i < 3; i++) b.set(head.x + 4 + i, head.y + 4, M.steel[0]);

    // ── 어깨 갑옷 (뒤 → 앞)
    b.begin();
    b.ellipse(chest.x - 5, chest.y - 5, 4, 3.4, M.steelDark);
    b.begin();
    b.ellipse(chest.x + 6, chest.y - 4, 5, 4, M.steel, 0.05);
    b.line(chest.x + 2, chest.y - 2, chest.x + 10, chest.y - 2, M.gold[2]);

    // ── 앞팔
    b.begin();
    b.capsule(chest.x + 6, chest.y - 2, hand.x, hand.y, 2.3, M.steel);

    if (!behind) drawSword();
    // 건틀릿 (칼보다 위)
    b.begin();
    b.ellipse(hand.x, hand.y, 2.6, 2.6, M.steel, 0.05);

    b.contours();
    b.outline();

    blit(b, out, flip);
}

// ───────────── 동작 (키프레임) ─────────────

export type Key = [number, Partial<Pose>];

const WIND: Partial<Pose> = { by: 2, lean: -3, ang: 2.65, hx: -15, hy: 3, legs: -2, cape: 3 };
const STRIKE: Partial<Pose> = { by: 0, lean: 5, ang: -0.35, hx: 5, hy: -2, legs: 3, cape: -4 };
const FOLLOW: Partial<Pose> = { by: 1, lean: 4, ang: -1.15, hx: 2, hy: -8, legs: 3, cape: -3 };
const RAISE: Partial<Pose> = { by: -1, lean: -1, ang: -1.62, hx: 1, hy: -12, cape: 1 };

/** 동작 이름 → 키프레임. t=0이 공격이 닿는 순간 */
export const MOVES: Record<string, Key[]> = {
    slash: [[-0.3, {}], [-0.17, WIND], [-0.04, { ...WIND, hy: 4 }], [0, STRIKE], [0.12, FOLLOW], [0.5, {}]],
    double: [[-0.3, {}], [-0.17, WIND], [-0.04, WIND], [0, STRIKE], [0.1, FOLLOW], [0.2, { ...STRIKE, ang: 0.8, hy: 3 }], [0.3, { ...STRIKE, ang: 1.0, hy: 3 }], [0.65, {}]],
    dagger: [
        [-0.3, {}], [-0.12, { ...WIND, ang: -0.1, hx: -6, hy: 0 }], [0, { ...STRIKE, ang: 0, hx: 9 }], [0.08, { ...WIND, ang: -0.1, hx: -2, hy: 0 }],
        [0.15, { ...STRIKE, ang: -0.12, hx: 9 }], [0.23, { ...WIND, ang: -0.1, hx: -2, hy: 0 }], [0.3, { ...STRIKE, ang: 0.08, hx: 9 }], [0.6, {}],
    ],
    cleave: [[-0.3, {}], [-0.14, { ...RAISE, visor: 'glow' }], [-0.03, { ...RAISE, hy: -13, visor: 'glow' }], [0, { ...STRIKE, ang: 1.2, by: 4, hy: 4 }], [0.22, { ...STRIKE, ang: 1.25, by: 4, hy: 4 }], [0.6, {}]],
    smash: [[-0.3, {}], [-0.14, { ...RAISE, visor: 'glow' }], [-0.03, { ...RAISE, hy: -13, visor: 'glow' }], [0, { ...STRIKE, ang: 1.2, by: 4, hy: 4 }], [0.22, { ...STRIKE, ang: 1.25, by: 4, hy: 4 }], [0.6, {}]],
    reap: [[-0.3, {}], [-0.12, WIND], [0, { ...STRIKE, ang: 0.2 }], [0.25, FOLLOW], [0.65, {}]],
    thrust: [[-0.3, {}], [-0.12, { ...WIND, ang: -0.05, hx: -7, hy: 0 }], [0, { ...STRIKE, ang: 0, hx: 10 }], [0.2, FOLLOW], [0.55, {}]],
    spin: [[-0.3, {}], [-0.12, WIND], [0, STRIKE], [0.08, { ...STRIKE, ang: 2.3, lean: 1, hx: -4 }], [0.16, { ...STRIKE, ang: 3.9, lean: -1, hx: -8 }], [0.24, { ...STRIKE, ang: 6.6 }], [0.55, {}]],
    block: [[0, {}], [0.08, { by: 3, lean: -1, ang: -1.5, hx: 1, hy: -7, legs: 2, cape: 2 }], [0.5, { by: 3, lean: -1, ang: -1.5, hx: 1, hy: -7, legs: 2, cape: 2 }], [0.75, {}]],
    cast: [[0, {}], [0.1, { ...RAISE, visor: 'glow' }], [0.55, { ...RAISE, visor: 'flash' }], [0.8, {}]],
    heal: [[0, {}], [0.1, { ...RAISE, visor: 'glow' }], [0.6, RAISE], [0.85, {}]],
    charge: [[0, {}], [0.12, { by: 3, ang: -1.0, hy: -4, visor: 'glow' }], [0.32, { ...RAISE, by: -3, visor: 'flash' }], [0.7, {}]],
    rage: [[0, {}], [0.12, { by: 4, ang: 0.2, visor: 'glow', cape: 3 }], [0.3, { ...RAISE, by: -4, legs: 3, visor: 'flash', cape: -4 }], [0.45, { by: 0, ang: -0.8, visor: 'glow' }], [0.75, {}]],
    hurt: [[0, { by: 2, lean: -5, ang: 0.9, hx: -4, hy: 2, cape: 4, visor: 'flash' }], [0.12, { by: 2, lean: -4, ang: 0.9, hx: -4, hy: 2, cape: 4 }], [0.45, {}]],
};

const NUM: (keyof Pose)[] = ['by', 'lean', 'ang', 'hx', 'hy', 'legs', 'cape'];

export function samplePose(keys: Key[], t: number): Pose {
    const full = keys.map(([k, p]) => [k, { ...IDLE_POSE, ...p }] as [number, Pose]);
    if (t <= full[0][0]) return full[0][1];
    for (let i = 0; i < full.length - 1; i++) {
        const [t0, a] = full[i];
        const [t1, c] = full[i + 1];
        if (t <= t1) {
            const u = (t - t0) / (t1 - t0);
            const o: Pose = { ...a };
            for (const k of NUM) (o[k] as number) = (a[k] as number) + ((c[k] as number) - (a[k] as number)) * u;
            return o;
        }
    }
    return full[full.length - 1][1];
}

export const moveSpan = (keys: Key[]) => ({ from: keys[0][0], to: keys[keys.length - 1][0] });
