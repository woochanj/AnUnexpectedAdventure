// 주인공: 투구 면갑을 올린 꼬마 기사 (사람, 치비 비율) — 하이비트 도트 방식.
// 기사 동작(knight.ts의 Pose/MOVES)을 그대로 받는다.
import type { Pose } from './knight';
import { blit, Buf, glowDot, R, u32 } from './pixelkit';

const M = {
    steel: R('#2a3352', '#4a5a82', '#7a8cb8', '#b4c4e6', '#eef6ff'),
    steelDark: R('#1e2440', '#343f62', '#56648c', '#8494bc', '#b8c6e6'),
    skin: R('#8a4a36', '#c8785a', '#f0a882', '#ffcfae', '#ffeede'),
    hair: R('#3a1e12', '#6a3a1e', '#9a5a2e', '#c8843e', '#e8b060'),
    cape: R('#5a1020', '#8a1a2a', '#c02a36', '#e8504a', '#ff8a70'),
    gold: R('#5a3a08', '#9a6a10', '#d8a020', '#ffd040', '#fff0a0'),
    leather: R('#3a2014', '#5e3820', '#86542e', '#ae7a48', '#d0a070'),
    blade: R('#3a4a6a', '#6a7c9e', '#a8b8d4', '#dce6f6', '#ffffff'),
};
const EYE = u32('#1a1424');
const SHINE = u32('#ffffff');
const BROW = u32('#4a2a18');
const MOUTH = u32('#9a3a3a');
const BLUSH = u32('#ff9a9a');

export function drawHeroKnight(p: Pose, out: Uint32Array, flip = false) {
    const b = new Buf();
    const cx = 26;
    const by = Math.round(p.by);
    const lean = Math.round(p.lean);
    const chest = { x: cx + Math.round(lean * 0.5), y: 47 + by };
    const head = { x: cx + 1 + lean, y: 30 + by };
    const sway = p.cape - lean * 0.8;
    const hand = { x: chest.x + 11 + p.hx, y: chest.y + p.hy };

    // ── 칼 (뒤쪽을 향하면 몸 뒤에)
    const drawSword = () => {
        b.begin(false);
        const dx = Math.cos(p.ang), dy = Math.sin(p.ang);
        const L = 20;
        for (let i = 3; i <= L; i++) {
            const x = hand.x + dx * i, y = hand.y + dy * i;
            b.set(x, y, M.blade[2]);
            b.set(x - dy, y + dx, i % 4 === 0 ? M.blade[4] : M.blade[3]);
            if (i < L - 2) b.set(x + dy, y - dx, M.blade[1]);
        }
        b.capsule(hand.x - dx * 3, hand.y - dy * 3, hand.x, hand.y, 1, M.leather);
        b.ellipse(hand.x - dx * 4, hand.y - dy * 4, 1.4, 1.4, M.gold);
        b.capsule(hand.x + dx * 2 - dy * 3.5, hand.y + dy * 2 + dx * 3.5, hand.x + dx * 2 + dy * 3.5, hand.y + dy * 2 - dx * 3.5, 1, M.gold);
    };
    const behind = Math.cos(p.ang) < -0.3;
    if (behind) drawSword();

    // ── 망토
    b.begin();
    const hemY = 58 + Math.min(0, by);
    const hem: [number, number][] = [];
    for (let i = 0; i <= 5; i++) hem.push([chest.x + 2 + sway * 0.5 - (i / 5) * (12 - sway * 0.6), hemY - (i / 5) * 2 + (i % 2 ? -2 : 0)]);
    b.poly([[chest.x - 5, chest.y - 6], [chest.x + 3, chest.y - 6], ...hem], M.cape, -0.05);

    // ── 다리
    const footY = 61 + Math.min(0, by);
    b.begin();
    b.capsule(chest.x - 3, chest.y + 4, cx - 4 - p.legs, footY - 2, 2.6, M.steelDark);
    b.ellipse(cx - 4 - p.legs, footY - 1, 3.2, 1.8, M.leather);
    b.begin();
    b.capsule(chest.x + 2, chest.y + 4, cx + 3 + p.legs, footY - 2, 2.8, M.steel);
    b.ellipse(cx + 4 + p.legs, footY - 1, 3.4, 1.9, M.leather);

    // ── 몸통 (흉갑 + 벨트)
    b.begin();
    b.ellipse(chest.x, chest.y, 7.5, 7, M.steel);
    b.begin(false);
    b.line(chest.x + 1, chest.y - 4, chest.x + 1, chest.y + 2, M.steel[4]);
    b.begin();
    b.poly([[chest.x - 7, chest.y + 3], [chest.x + 7, chest.y + 3], [chest.x + 7, chest.y + 5], [chest.x - 7, chest.y + 5]], M.leather);
    b.ellipse(chest.x + 2, chest.y + 4, 1.3, 1.1, M.gold, 0.1);

    // ── 투구 (크고 둥글게)
    b.begin();
    b.ellipse(head.x, head.y, 12, 11, M.steel);
    // 깃털 장식
    b.begin(false);
    for (let i = 0; i < 7; i++) {
        const t = i / 6;
        b.ellipse(head.x - 1 - t * (8 - sway * 0.4), head.y - 11 + t * t * 5, 2.1 - t * 0.8, 1.7, M.cape, 0.25);
    }
    // 열린 면갑 사이 얼굴
    b.begin();
    b.ellipse(head.x + 4, head.y + 2.5, 7.8, 6.6, M.skin, 0.15);
    // 앞머리 (투구 아래로 삐져나옴)
    b.begin(false);
    for (let x = -3; x <= 10; x++) {
        const hgt = 1 + ((x * 7) % 3 === 0 ? 1 : 0) + (x < 2 ? 1 : 0);
        for (let j = 0; j < hgt; j++) b.set(head.x + x, head.y - 3 + j, M.hair[x % 2 ? 2 : 3]);
    }
    // 올린 면갑
    b.begin();
    b.poly([[head.x - 4, head.y - 7], [head.x + 12, head.y - 6], [head.x + 12, head.y - 3], [head.x - 4, head.y - 4]], M.steel, 0.1);
    b.begin(false);
    for (let x = head.x - 2; x <= head.x + 10; x += 3) b.set(x, head.y - 5, M.steel[1]);
    b.line(head.x - 4, head.y - 4, head.x + 12, head.y - 3, M.gold[3]);
    b.set(head.x - 8, head.y + 1, M.gold[3]);

    // 얼굴: 큰 눈 + 눈썹 + 볼 + 입
    const v = p.visor ?? 'dim';
    const squint = v === 'glow';
    const wide = v === 'flash';
    for (const ex of [head.x + 1, head.x + 7]) {
        if (squint) {
            b.line(ex, head.y + 2, ex + 2, head.y + 2, EYE);
            b.line(ex, head.y - 1, ex + 2, head.y, BROW);
        } else {
            const hgt = wide ? 5 : 4;
            for (let j = 0; j < hgt; j++) for (let k = 0; k < 2; k++) b.set(ex + k, head.y - 1 + j, EYE);
            b.set(ex, head.y - 1, SHINE);
            b.line(ex - 1, head.y - 2 - (wide ? 1 : 0), ex + 2, head.y - 2, BROW);
        }
    }
    b.set(head.x, head.y + 4, BLUSH);
    b.set(head.x + 10, head.y + 4, BLUSH);
    if (wide) {
        b.set(head.x + 5, head.y + 6, MOUTH);
        b.set(head.x + 5, head.y + 7, MOUTH);
        b.set(head.x + 6, head.y + 6, MOUTH);
        b.set(head.x + 6, head.y + 7, MOUTH);
    } else if (squint) b.line(head.x + 4, head.y + 6, head.x + 7, head.y + 6, MOUTH);
    else {
        b.set(head.x + 4, head.y + 6, MOUTH);
        b.set(head.x + 5, head.y + 7, MOUTH);
        b.set(head.x + 6, head.y + 7, MOUTH);
        b.set(head.x + 7, head.y + 6, MOUTH);
    }

    // ── 어깨 갑옷, 팔
    b.begin();
    b.ellipse(chest.x + 5, chest.y - 4, 4, 3.4, M.steel, 0.05);
    b.begin();
    b.capsule(chest.x + 5, chest.y - 2, hand.x, hand.y, 2.2, M.steel);
    if (!behind) drawSword();
    b.begin();
    b.ellipse(hand.x, hand.y, 2.5, 2.5, M.leather, 0.05);

    b.contours();
    b.outline();
    blit(b, out, flip);
    if (wide) glowDot(out, head.x + 1, head.y, u32('#fff6a0'), flip);
}
