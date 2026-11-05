// 다크 판타지 몬스터 픽셀 렌더러 (64×64, 오른쪽을 보고 그린 뒤 화면에서는 뒤집어 왼쪽을 본다).
// t: 시간(초), a: 공격 자세 (-1 = 뒤로 움찔한 예비동작, 0 = 대기, 1 = 앞으로 덮침)
import { drawKnight, IDLE_POSE, KNIGHT_HERO, type KnightPalette, type Pose } from './knight';
import { blit, Buf, glowDot, R, u32, INK } from './pixelkit';

export type MonsterKind = 'ooze' | 'ghoul' | 'gargoyle' | 'rat' | 'skeleton' | 'flameskull' | 'cultist' | 'wraith' | 'eye' | 'knight' | 'sprite';

export interface MonsterLook {
    kind: MonsterKind;
    /** 색 변주: void(보랏빛 공허), crimson(핏빛), drowned(익사), bone(해골 기사), shadow(그림자 왕) */
    variant?: string;
    scale?: number;
    crown?: boolean;
    sprite?: string;
    filter?: string;
    ranged?: string;
}

const GLOW = {
    red: u32('#ff3a2a'),
    ember: u32('#ffb040'),
    cyan: u32('#8afff0'),
    green: u32('#b8ff6a'),
    violet: u32('#e08aff'),
    white: u32('#ffffff'),
    pale: u32('#e8fff4'),
};

const VOID = R('#0a0612', '#1c0e30', '#341a54', '#54307e', '#8058b0');

// ───────────── 각 몬스터 ─────────────

function ooze(b: Buf, t: number, a: number, v?: string) {
    const P = v === 'void' ? VOID : R('#06050a', '#121020', '#221e36', '#3a3458', '#6a6294');
    const sq = Math.sin(t * 3);
    const ext = a > 0 ? a * 7 : a * 2;
    b.begin();
    for (let i = 0; i < 4; i++) b.capsule(18 + i * 8 + ext * 0.3, 55, 18 + i * 8 + ext * 0.3, 60 + (i % 2), 1.6, P);
    b.ellipse(30 + ext * 0.5, 50 - sq * 0.6, 15 + ext * 0.7, 10 + sq, P);
    b.ellipse(26 + ext * 0.4, 42 - sq, 8.5, 7 + sq * 0.5, P, 0.05);
    // 떠오르는 기포
    b.begin(false);
    for (let i = 0; i < 3; i++) {
        const k = (t * 0.6 + i / 3) % 1;
        b.ellipse(20 + i * 9 + ext * 0.4, 54 - k * 16, 1.6, 1.6, P, 0.45);
    }
    // 입
    b.line(31 + ext, 49 - sq * 0.5, 39 + ext, 50 - sq * 0.5, INK);
    return [[32 + ext, 44 - sq], [37 + ext, 45 - sq], v === 'void' ? GLOW.violet : GLOW.ember] as const;
}

function ghoul(b: Buf, t: number, a: number, v?: string) {
    const skin = v === 'void' ? VOID : R('#0c120e', '#1e2a22', '#34463a', '#566e5c', '#8aa48a');
    const rag = R('#0a0a0c', '#18181e', '#2a2a34', '#40404c', '#5a5a68');
    const bob = Math.floor(t * 1.5) % 2;
    const lean = 2 + a * 4;
    b.begin();
    b.capsule(24, 46, 21, 58, 2.4, skin, -0.2);
    b.ellipse(20, 59, 3, 1.6, skin, -0.2);
    b.begin();
    b.capsule(24 + lean * 0.3, 34 + bob, 22 + lean, 46 + bob, 1.8, skin, -0.25); // 뒷팔
    b.begin();
    b.capsule(29, 46, 31, 58, 2.6, skin);
    b.ellipse(32, 59, 3.2, 1.7, skin);
    b.begin();
    b.ellipse(27 + lean * 0.5, 39 + bob, 7, 8, skin);
    b.poly([[19, 41 + bob], [35, 41 + bob], [36, 47], [33, 50], [29, 47], [25, 51], [19, 48]], rag);
    b.begin();
    b.ellipse(33 + lean, 27 + bob, 5, 5.5, skin, 0.05);
    // 늘어진 머리카락
    b.begin(false);
    for (let i = 0; i < 4; i++) b.line(29 + lean + i * 1.5, 22 + bob, 27 + lean + i, 30 + bob + (i % 2) * 2, rag[1]);
    b.line(35 + lean, 30 + bob, 38 + lean, 30 + bob, INK);
    // 앞으로 뻗은 팔과 손톱
    b.begin();
    const hx = 41 + lean * 1.4 + a * 5;
    const hy = 40 + bob - a * 4;
    b.capsule(31 + lean * 0.5, 33 + bob, hx, hy, 2, skin, 0.05);
    b.begin(false);
    for (let i = -1; i <= 1; i++) b.line(hx + 1, hy + i, hx + 4, hy + i * 2 + 1, skin[4]);
    return [[35 + lean, 26 + bob], [37 + lean, 26 + bob], v === 'void' ? GLOW.violet : GLOW.pale] as const;
}

function gargoyle(b: Buf, t: number, a: number, v?: string) {
    const P = v === 'void' ? VOID : R('#0e0d12', '#22212a', '#3a3844', '#5e5c6a', '#8e8c9c');
    const h = Math.sin(t * 4) * 2 - 4;
    const flap = Math.sin(t * 9);
    const fx = a * 5;
    b.begin();
    b.poly([[26 + fx, 30 + h], [8 + fx, 16 + h - flap * 6], [11 + fx, 26 + h], [10 + fx, 34 + h - flap * 2], [18 + fx, 40 + h]], P, -0.3);
    // 꼬리
    b.begin();
    b.capsule(25 + fx, 44 + h, 18 + fx, 50 + h, 1.4, P);
    b.capsule(18 + fx, 50 + h, 13 + fx, 47 + h, 1.1, P);
    b.begin();
    b.ellipse(30 + fx, 38 + h, 7, 8, P);
    b.capsule(27 + fx, 44 + h, 26 + fx, 50 + h, 2, P, -0.1);
    b.capsule(33 + fx, 44 + h, 35 + fx, 50 + h, 2, P);
    b.begin();
    b.ellipse(37 + fx * 1.2, 28 + h, 5, 4.5, P, 0.05);
    b.ellipse(41 + fx * 1.2, 30 + h, 2.6, 2, P);
    // 뿔
    b.poly([[34 + fx, 25 + h], [30 + fx, 17 + h], [36 + fx, 23 + h]], P, 0.2);
    b.poly([[38 + fx, 24 + h], [38 + fx, 16 + h], [40 + fx, 24 + h]], P, 0.2);
    // 앞날개
    b.begin();
    b.poly([[30 + fx, 31 + h], [12 + fx, 12 + h - flap * 8], [16 + fx, 24 + h], [14 + fx, 33 + h - flap * 3], [22 + fx, 41 + h]], P, -0.05);
    b.begin(false);
    b.line(29 + fx, 31 + h, 13 + fx, 13 + h - flap * 8, P[0]);
    return [[38 + fx, 27 + h], [40 + fx, 27 + h], v === 'void' ? GLOW.violet : GLOW.red] as const;
}

function rat(b: Buf, t: number, a: number) {
    const fur = R('#0e0a0a', '#211816', '#3a2c26', '#5a463a', '#806652');
    const flesh = R('#1a0c10', '#3a1c22', '#6a3a40', '#9a6064', '#c89090');
    const f = a * 6;
    const sw = Math.sin(t * 3);
    b.begin();
    b.capsule(16, 53, 9, 49 + sw, 1.2, flesh);
    b.capsule(9, 49 + sw, 6, 41 + sw * 2, 1, flesh);
    b.begin();
    b.capsule(22, 54, 20, 59, 1.6, fur, -0.2);
    b.capsule(35 + f * 0.5, 54, 37 + f * 0.5, 59, 1.6, fur, -0.2);
    b.begin();
    b.ellipse(27 + f * 0.4, 50, 12, 7.5, fur);
    // 등 털
    b.begin(false);
    for (let i = 0; i < 5; i++) b.line(20 + i * 4 + f * 0.4, 43, 18 + i * 4 + f * 0.4, 41, fur[1]);
    b.begin();
    b.ellipse(41 + f, 49, 6.5, 5, fur, 0.05);
    b.ellipse(47 + f, 51, 3.4, 2.6, fur, 0.1);
    b.ellipse(39 + f, 43, 2.4, 3.2, flesh);
    b.begin(false);
    b.set(50 + f, 51, flesh[3]);
    b.set(47 + f, 54, GLOW.white);
    b.set(48 + f, 54, GLOW.white);
    b.capsule(29 + f * 0.5, 54, 31 + f, 59, 1.7, fur);
    return [[43 + f, 47], [43 + f, 47], GLOW.red] as const;
}

function skeleton(b: Buf, t: number, a: number, v?: string) {
    const bone = v === 'void' ? R('#0e0a16', '#2a2238', '#52466a', '#8a7aa8', '#d2c8ee') : R('#16120e', '#3a3226', '#6a604c', '#a89c80', '#e8e0c8');
    const rust = R('#140c08', '#2e1a10', '#5a3018', '#8a4a24', '#b07040');
    const bob = Math.floor(t * 1.6) % 2;
    const lean = a * 4;
    b.begin();
    b.capsule(27, 45, 25, 52, 1.3, bone, -0.2);
    b.capsule(25, 52, 24, 59, 1.2, bone, -0.2);
    b.ellipse(23, 60, 2.6, 1.3, bone, -0.2);
    // 방패 (뒷팔)
    b.begin();
    b.ellipse(23 + lean * 0.4, 38 + bob, 5.5, 6.5, rust, -0.05);
    b.begin(false);
    b.ellipse(22 + lean * 0.4, 37 + bob, 1.5, 1.5, rust, 0.4);
    b.begin();
    b.capsule(31, 45, 33, 52, 1.3, bone);
    b.capsule(33, 52, 34, 59, 1.2, bone);
    b.ellipse(35, 60, 2.8, 1.4, bone);
    b.ellipse(29, 44 + bob, 4, 2.2, bone);
    b.capsule(29, 44 + bob, 30 + lean * 0.5, 31 + bob, 1, bone);
    b.begin();
    b.ellipse(30 + lean * 0.5, 35 + bob, 6, 5.5, bone);
    b.begin(false);
    for (const ry of [33, 35, 37]) b.line(25 + lean * 0.5, ry + bob, 35 + lean * 0.5, ry + bob, bone[0]);
    b.line(30 + lean * 0.5, 31 + bob, 30 + lean * 0.5, 39 + bob, bone[3]);
    b.begin();
    b.ellipse(32 + lean, 25 + bob, 5.5, 5.5, bone, 0.05);
    b.ellipse(33 + lean, 30 + bob, 3.6, 2, bone);
    b.begin(false);
    for (const ex of [31, 35]) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) b.set(ex + lean + k, 24 + bob + j, INK);
    b.line(31 + lean, 30 + bob, 36 + lean, 30 + bob, bone[0]);
    // 팔과 녹슨 검
    const hx = 41 + lean + a * 3;
    const hy = 37 + bob - a * 4;
    b.begin();
    b.capsule(33 + lean * 0.5, 31 + bob, 37 + lean, 36 + bob, 1.2, bone);
    b.capsule(37 + lean, 36 + bob, hx, hy, 1.1, bone);
    const ang = -0.95 + a * 1.4;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    b.begin(false);
    for (let i = 2; i < 17; i++) {
        b.set(hx + dx * i, hy + dy * i, rust[i % 4 === 0 ? 3 : 2]);
        b.set(hx + dx * i - dy, hy + dy * i + dx, rust[1]);
    }
    b.line(hx - dy * 3, hy + dx * 3, hx + dy * 3, hy - dx * 3, rust[3]);
    return [[31 + lean, 24 + bob], [35 + lean, 24 + bob], v === 'void' ? GLOW.violet : GLOW.cyan] as const;
}

function flameskull(b: Buf, t: number, a: number, v?: string) {
    const bone = R('#16120e', '#3a3226', '#6a604c', '#a89c80', '#e8e0c8');
    const fire = v === 'void' ? R('#14041e', '#3e0a5a', '#8a2ab0', '#c46ae8', '#f8e0ff') : R('#2a0804', '#7a1e08', '#d8541a', '#ffa030', '#fff0a0');
    const h = Math.sin(t * 3) * 2;
    const f = a * 7;
    b.begin(false);
    for (let i = 0; i < 11; i++) {
        const k = i / 10;
        const x = 31 + f * 0.6 - k * 5 + Math.sin(i * 2.3 + t * 9) * 2;
        const y = 30 + h - k * 17 + Math.cos(i * 1.7 + t * 7);
        b.ellipse(x, y, 5.5 - k * 3.5, 5 - k * 3, fire, 0.45 - k * 0.5);
    }
    b.begin();
    b.ellipse(32 + f, 34 + h, 7, 6.5, bone);
    b.ellipse(33 + f, 40 + h, 4.5, 2.5, bone, -0.05);
    b.begin(false);
    for (const ex of [30, 35]) for (let j = 0; j < 3; j++) for (let k = 0; k < 2; k++) b.set(ex + f + k, 33 + h + j, INK);
    b.set(33 + f, 37 + h, INK);
    b.set(33 + f, 38 + h, INK);
    b.line(30 + f, 41 + h, 37 + f, 41 + h, bone[0]);
    const g = v === 'void' ? GLOW.violet : GLOW.ember;
    return [[30 + f, 34 + h], [35 + f, 34 + h], g] as const;
}

function cultist(b: Buf, t: number, a: number, v?: string) {
    const robe = v === 'void' ? VOID : v === 'crimson' ? R('#120608', '#2a0c12', '#4a1620', '#6e2430', '#8e3a40') : R('#0c0a10', '#1c1824', '#2e2838', '#463e54', '#625874');
    const wood = R('#120c0a', '#231914', '#3a2a20', '#56402e', '#76604a');
    const gold = R('#221808', '#3e2c12', '#6a4e24', '#9a7a42', '#cbb27a');
    const bob = Math.floor(t * 1.3) % 2;
    const lean = a * 3;
    b.begin();
    b.capsule(26, 32 + bob, 22, 42 + bob, 2.4, robe, -0.25);
    b.begin();
    const hem: [number, number][] = [];
    for (let i = 0; i <= 6; i++) hem.push([40 - i * 3.5, 60 - (i % 2) * 2]);
    b.poly([[25 + lean * 0.3, 29 + bob], [34 + lean * 0.3, 29 + bob], ...hem, [19, 58]], robe);
    b.begin(false);
    b.line(23, 42 + bob, 36, 42 + bob, gold[2]);
    b.begin();
    b.ellipse(30 + lean, 24 + bob, 6.5, 7, robe, 0.05);
    b.begin(false);
    b.ellipse(32.5 + lean, 26 + bob, 3.3, 4, R('#040306', '#08060c', '#0e0b14', '#141020', '#1a1428'));
    // 지팡이와 손
    const hx = 39 + a * 3;
    const hy = 38 + bob - a * 5;
    b.begin(false);
    b.capsule(hx + 1, hy - 15, hx - 1, 60, 0.9, wood);
    b.begin();
    b.capsule(33 + lean * 0.4, 31 + bob, hx, hy, 2.6, robe, 0.05);
    b.ellipse(hx + 1, hy - 17, 2.8, 2.8, v === 'void' ? VOID : R('#2a0608', '#6a1010', '#c02a1a', '#ff7040', '#ffd0a0'), 0.4);
    return [[32 + lean, 25 + bob], [34 + lean, 25 + bob], v === 'void' ? GLOW.violet : GLOW.red, [hx + 1, hy - 17]] as const;
}

function wraith(b: Buf, t: number, a: number, v?: string) {
    const P = v === 'void' ? VOID : v === 'crimson' ? R('#0e0406', '#240a10', '#42141e', '#6a2430', '#984048') : R('#08080e', '#14141e', '#24243a', '#3a3c5a', '#5a6088');
    const bone = R('#16120e', '#3a3226', '#6a604c', '#a89c80', '#e8e0c8');
    const h = Math.sin(t * 2.5) * 2.5 - 4;
    const f = a * 5;
    const pts: [number, number][] = [[29 + f, 17 + h], [38 + f, 26 + h], [41 + f * 0.6, 48 + h]];
    for (let i = 0; i <= 6; i++) pts.push([40 - i * 4.2 + f * 0.3, 50 + h + (i % 2 ? 8 : 1) + Math.sin(t * 5 + i) * 2]);
    pts.push([18, 34 + h], [23, 21 + h]);
    b.begin();
    b.poly(pts, P);
    b.begin();
    b.ellipse(31 + f, 22 + h, 6.5, 7, P, 0.1);
    b.begin(false);
    b.ellipse(33.5 + f, 24 + h, 3.5, 4.2, R('#020204', '#06060a', '#0a0a10', '#0e0e16', '#14141e'));
    // 뼈 손톱
    b.begin();
    const hx = 45 + f * 1.3;
    const hy = 34 + h - a * 3;
    b.capsule(36 + f, 30 + h, hx, hy, 1.4, bone);
    b.begin(false);
    for (let i = -1; i <= 1; i++) b.line(hx, hy, hx + 3, hy + i * 2 + 1, bone[3]);
    const g = v === 'crimson' ? GLOW.red : v === 'void' ? GLOW.violet : GLOW.cyan;
    return [[32 + f, 23 + h], [35 + f, 23 + h], g] as const;
}

function eye(b: Buf, t: number, a: number, v?: string) {
    const flesh = R('#140a0c', '#2e1418', '#4e2228', '#743840', '#9a5a5c');
    const sclera = R('#4a3a38', '#8a7a70', '#c8bcae', '#e8e0d4', '#fff8f0');
    const iris = v === 'void' ? R('#14041e', '#3e0a5a', '#8a2ab0', '#c46ae8', '#f8e0ff') : R('#2a0404', '#6a0c0c', '#b0201a', '#e05a2a', '#ffb060');
    const h = Math.sin(t * 2) * 2 - 2;
    b.begin();
    for (let k = 0; k < 5; k++) {
        let px = 21 + k * 4.5, py = 38 + h;
        for (let j = 1; j <= 6; j++) {
            const nx = 21 + k * 4.5 + Math.sin(t * 3 + k + j * 0.7) * 2.2 * (j / 6) - a * j * 0.4;
            const ny = 38 + h + j * 3.3;
            b.capsule(px, py, nx, ny, 2.3 - j * 0.25, flesh);
            px = nx;
            py = ny;
        }
    }
    b.begin();
    b.ellipse(30, 29 + h, 13.5, 12, flesh);
    b.begin();
    b.ellipse(31, 29 + h, 11, 9.5, sclera, 0.1);
    b.begin(false);
    for (let i = 0; i < 6; i++) {
        const an = i * 1.05 + 0.4;
        b.line(31 + Math.cos(an) * 10, 29 + h + Math.sin(an) * 8.5, 31 + Math.cos(an) * 6.5, 29 + h + Math.sin(an) * 5.5, flesh[3]);
    }
    const lx = Math.sin(t * 0.9) * 2.5 + a * 3 + 1.5;
    const ly = Math.cos(t * 0.7) * 1.5;
    b.ellipse(31 + lx, 29 + h + ly, 5.2, 5.2, iris, 0.05);
    b.ellipse(31 + lx, 29 + h + ly, 1.3, 3.6, R('#000000', '#050205', '#0a040a', '#100810', '#160c16'));
    // 눈꺼풀 (가끔 감는다)
    const blink = t % 5 < 0.15;
    if (blink) {
        b.begin();
        b.ellipse(31, 29 + h, 11.5, 9.8, flesh, 0.1);
    }
    return [[29 + lx, 26 + h + ly], [29 + lx, 26 + h + ly], GLOW.white] as const;
}

// ───────────── 타락한 기사 (주인공 렌더러 재사용) ─────────────

const KNIGHT_VARIANTS: Record<string, KnightPalette> = {
    drowned: {
        ...KNIGHT_HERO,
        steel: R('#0e1614', '#1e2e2a', '#34504a', '#567a6e', '#8ab0a0'),
        steelDark: R('#0a100e', '#16201e', '#22322e', '#34484a', '#4e6a66'),
        cape: R('#0a120c', '#142418', '#204030', '#2e5a40', '#40785a'),
        gold: R('#1a0e06', '#3a1e0c', '#6a3818', '#9a5a28', '#c08040'),
    },
    bone: {
        ...KNIGHT_HERO,
        steel: R('#0a090c', '#18161c', '#28252e', '#423e4a', '#6a6676'),
        steelDark: R('#060508', '#101014', '#1a181e', '#28262e', '#3c3a44'),
        gold: R('#16120e', '#3a3226', '#6a604c', '#a89c80', '#e8e0c8'),
        cape: R('#0a0a0e', '#16161e', '#22222c', '#30303e', '#444458'),
    },
    shadow: {
        ...KNIGHT_HERO,
        steel: R('#0c0814', '#1e1430', '#34224e', '#543a78', '#8a68b8'),
        steelDark: R('#08050e', '#140c22', '#221636', '#34224e', '#4e3672'),
        cape: R('#0e0418', '#220a34', '#3a125a', '#5a1e84', '#8034b0'),
        gold: R('#1e1006', '#4a2a0c', '#8a5a18', '#d0a040', '#fff0a0'),
        blade: R('#1a0e2a', '#3a2260', '#6a48a0', '#a888e0', '#f0e4ff'),
    },
};

function knightPose(t: number, a: number): Pose {
    const breathe = Math.floor(t * 1.4) % 2;
    const base: Pose = { ...IDLE_POSE, by: breathe, cape: Math.round(Math.sin(t * 2) * 1.5), visor: 'glow' };
    const WIND = { by: 2, lean: -3, ang: 2.65, hx: -15, hy: 3, legs: -2, cape: 3 };
    const STRIKE = { by: 0, lean: 5, ang: -0.35, hx: 5, hy: -2, legs: 3, cape: -4 };
    const tgt = a < 0 ? WIND : STRIKE;
    const u = Math.abs(a);
    const o = { ...base } as Pose;
    for (const k of Object.keys(tgt) as (keyof typeof tgt)[]) (o[k] as number) = (base[k] as number) + (tgt[k] - (base[k] as number)) * u;
    if (u > 0.5) o.visor = 'flash';
    return o;
}

// ───────────── 진입점 ─────────────

const DRAW = { ooze, ghoul, gargoyle, rat, skeleton, flameskull, cultist, wraith, eye };

export function drawMonster(look: MonsterLook, t: number, a: number, out: Uint32Array, flip = true) {
    if (look.kind === 'sprite') return;
    if (look.kind === 'knight') {
        drawKnight(knightPose(t, a), out, flip, KNIGHT_VARIANTS[look.variant ?? 'bone'] ?? KNIGHT_VARIANTS.bone, look.crown);
        return;
    }
    const b = new Buf();
    const res = DRAW[look.kind as keyof typeof DRAW](b, t, a, look.variant);
    b.contours();
    b.outline();
    blit(b, out, flip);
    // 눈빛 (외곽선 위에 찍어 또렷하게)
    const [e1, e2, c, orb] = res as unknown as [[number, number], [number, number], number, [number, number]?];
    glowDot(out, e1[0], e1[1], c, flip);
    glowDot(out, e2[0], e2[1], c, flip);
    if (orb) glowDot(out, orb[0], orb[1], GLOW.white, flip);
}

/** 공격 동작: 뒤로 움찔 → 덮침 → 복귀. t는 동작 시작부터 초 */
export function attackCurve(t: number): number {
    if (t < 0) return 0;
    if (t < 0.15) return -t / 0.15;
    if (t < 0.21) return -1 + ((t - 0.15) / 0.06) * 2;
    if (t < 0.4) return 1;
    if (t < 0.65) return 1 - (t - 0.4) / 0.25;
    return 0;
}
/** 공격 동작에서 덮치는 순간까지 걸리는 시간 */
export const ATTACK_LEAD = 0.21;
