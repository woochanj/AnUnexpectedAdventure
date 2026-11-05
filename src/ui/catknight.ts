// 주인공: 투구 면갑을 올린 고양이 기사 (치비 비율 + 다크 판타지 질감).
// 기사 렌더러와 같은 Pose를 받아 같은 동작(MOVES)으로 움직인다.
import type { Pose } from './knight';
import { blit, Buf, glowDot, R, u32 } from './pixelkit';

const M = {
    steel: R('#1c1a24', '#363441', '#5a5866', '#8e8e9e', '#d6dae6'),
    steelDark: R('#121119', '#22212b', '#363440', '#54525f', '#807f92'),
    fur: R('#2a120a', '#5a2a14', '#9a4e22', '#cc7a3a', '#eeaa66'),
    cream: R('#3a2e26', '#6e5c4c', '#a8927a', '#d6c4a8', '#f4ead8'),
    gold: R('#221808', '#3e2c12', '#6a4e24', '#9a7a42', '#cbb27a'),
    cape: R('#1a080c', '#34101a', '#5a1a24', '#82262c', '#a8403a'),
    leather: R('#120c0a', '#231914', '#3a2a20', '#56402e', '#76604a'),
    blade: R('#2a2c36', '#565a68', '#8a90a0', '#c4cad8', '#f0f4ff'),
};
const EYE = u32('#0c0810');
const SHINE = u32('#ffffff');
const NOSE = u32('#7a3a3a');

export function drawCatKnight(p: Pose, out: Uint32Array, flip = false) {
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
            b.set(x - dy, y + dx, i % 3 === 0 ? M.blade[4] : M.blade[3]);
            if (i < L - 2) b.set(x + dy, y - dx, M.blade[1]);
        }
        b.line(hand.x + dx * 4, hand.y + dy * 4, hand.x + dx * (L - 4), hand.y + dy * (L - 4), M.blade[0]);
        b.capsule(hand.x - dx * 3, hand.y - dy * 3, hand.x, hand.y, 1, M.leather);
        b.ellipse(hand.x - dx * 4, hand.y - dy * 4, 1.4, 1.4, M.gold);
        b.capsule(hand.x + dx * 2 - dy * 3.5, hand.y + dy * 2 + dx * 3.5, hand.x + dx * 2 + dy * 3.5, hand.y + dy * 2 - dx * 3.5, 1, M.gold);
    };
    const behind = Math.cos(p.ang) < -0.3;
    if (behind) drawSword();

    // ── 꼬리 (뒤로 말려 올라감, 줄무늬)
    b.begin();
    // 엉덩이에서 뒤로 뻗었다가 위로 휘어 갈고리처럼 말린다
    const base: [number, number][] = [[-5, 52], [-10, 51], [-13.5, 47.5], [-15, 42.5], [-14, 37.5], [-11, 34.5], [-8.5, 34]];
    const tail = base.map(([x, y], i) => [cx + x + sway * (i / 6) * 0.7, y + by + Math.sin(i * 0.9) * 0.3] as [number, number]);
    for (let i = 0; i < tail.length - 1; i++) b.capsule(tail[i][0], tail[i][1], tail[i + 1][0], tail[i + 1][1], 2.3 - i * 0.18, M.fur, i === tail.length - 2 ? 0.25 : i % 2 ? -0.15 : 0);

    // ── 망토
    b.begin();
    const hemY = 58 + Math.min(0, by);
    const hem: [number, number][] = [];
    for (let i = 0; i <= 5; i++) hem.push([chest.x + 2 + sway * 0.5 - (i / 5) * (12 - sway * 0.6), hemY - (i / 5) * 2 + (i % 2 ? -3 : 0)]);
    b.poly([[chest.x - 5, chest.y - 6], [chest.x + 3, chest.y - 6], ...hem], M.cape, -0.1);

    // ── 다리 (짧은 갑옷 다리)
    const footY = 61 + Math.min(0, by);
    b.begin();
    b.capsule(chest.x - 3, chest.y + 4, cx - 4 - p.legs, footY - 2, 2.6, M.steelDark);
    b.ellipse(cx - 4 - p.legs, footY - 1, 3.2, 1.8, M.steelDark);
    b.begin();
    b.capsule(chest.x + 2, chest.y + 4, cx + 3 + p.legs, footY - 2, 2.8, M.steel);
    b.ellipse(cx + 4 + p.legs, footY - 1, 3.4, 1.9, M.steel);

    // ── 몸통 (흉갑 + 벨트)
    b.begin();
    b.ellipse(chest.x, chest.y, 7.5, 7, M.steel);
    b.line(chest.x + 1, chest.y - 4, chest.x + 1, chest.y + 3, M.steel[3]);
    b.begin();
    b.poly([[chest.x - 7, chest.y + 3], [chest.x + 7, chest.y + 3], [chest.x + 7, chest.y + 5], [chest.x - 7, chest.y + 5]], M.leather);
    b.ellipse(chest.x + 2, chest.y + 4, 1.3, 1.1, M.gold, 0.1);

    // ── 투구 (크고 둥글게) + 열린 면갑 사이로 보이는 고양이 얼굴
    b.begin();
    b.ellipse(head.x, head.y, 12, 11, M.steel);
    // 깃털 장식
    b.begin(false);
    for (let i = 0; i < 7; i++) {
        const t = i / 6;
        b.ellipse(head.x - 1 - t * (8 - sway * 0.4), head.y - 11 + t * t * 5, 2 - t * 0.8, 1.6, M.cape, 0.25);
    }
    // 얼굴 구멍
    b.begin();
    b.ellipse(head.x + 4, head.y + 2.5, 7.8, 6.5, M.fur, 0.1);
    b.begin(false);
    b.ellipse(head.x + 6, head.y + 6, 4, 2.6, M.cream, 0.2);
    // 올린 면갑 (얼굴 위 가로 띠, 숨구멍 줄)
    b.begin();
    b.poly([[head.x - 4, head.y - 7], [head.x + 12, head.y - 6], [head.x + 12, head.y - 3], [head.x - 4, head.y - 3]], M.steel, 0.1);
    b.begin(false);
    for (let x = head.x - 2; x <= head.x + 10; x += 3) b.set(x, head.y - 5, M.steel[0]);
    b.line(head.x - 4, head.y - 3, head.x + 12, head.y - 3, M.gold[2]);
    // 리벳
    b.set(head.x - 8, head.y + 1, M.steel[4]);
    b.set(head.x - 7, head.y + 6, M.steel[4]);

    // 눈 (큰 고양이 눈)
    const v = p.visor ?? 'dim';
    const squint = v === 'glow';
    const wide = v === 'flash';
    for (const ex of [head.x + 1, head.x + 7]) {
        if (squint) {
            b.line(ex, head.y + 2, ex + 2, head.y + 2, EYE);
        } else {
            const hgt = wide ? 5 : 4;
            for (let j = 0; j < hgt; j++) for (let k = 0; k < 3; k++) b.set(ex + k, head.y - 1 + j, EYE);
            b.set(ex, head.y - 1, SHINE);
            b.set(ex + 1, head.y, SHINE);
        }
    }
    // 코, 입, 수염
    b.set(head.x + 6, head.y + 5, NOSE);
    b.set(head.x + 7, head.y + 5, NOSE);
    b.set(head.x + 5, head.y + 7, M.fur[1]);
    b.set(head.x + 8, head.y + 7, M.fur[1]);
    b.line(head.x + 10, head.y + 5, head.x + 13, head.y + 4, M.cream[3]);
    b.line(head.x + 10, head.y + 6, head.x + 13, head.y + 7, M.cream[3]);

    // ── 어깨 갑옷, 팔
    b.begin();
    b.ellipse(chest.x + 5, chest.y - 4, 4, 3.4, M.steel, 0.05);
    b.begin();
    b.capsule(chest.x + 5, chest.y - 2, hand.x, hand.y, 2.2, M.steel);
    if (!behind) drawSword();
    b.begin();
    b.ellipse(hand.x, hand.y, 2.5, 2.5, M.steel, 0.05);

    b.contours();
    b.outline();
    blit(b, out, flip);
    // 화난/집중한 순간 눈동자 빛
    if (wide) {
        glowDot(out, head.x + 2, head.y + 1, u32('#ffd060'), flip);
        glowDot(out, head.x + 8, head.y + 1, u32('#ffd060'), flip);
    }
}
