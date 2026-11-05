// 주인공: 투구 쓴 주황 고양이 기사 (32비트 만화풍).
// 굵은 검정 외곽선 + 3~4단 단순 음영. 투구 틈으로 커다란 흰 눈이 보인다.
// 기사 동작(knight.ts의 Pose/MOVES)을 그대로 받는다.
import type { Pose } from './knight';
import { blit, Buf, R, u32 } from './pixelkit';

const M = {
    helm: R('#3a3e52', '#5c6278', '#8a90a6', '#b8bed0', '#e8ecf6'),
    helmDark: R('#22252f', '#353948', '#4c5164', '#6a7086', '#8c92a8'),
    fur: R('#7a2e0a', '#b4501a', '#e07a2a', '#f8a048', '#ffc878'),
    stripe: R('#5a1e06', '#7a2e0a', '#9a3e12', '#b4501a', '#c86424'),
    cream: R('#a8846a', '#d0ae90', '#eed4b8', '#fff0de', '#ffffff'),
    gold: R('#6a4208', '#a06c14', '#d8a028', '#ffd04a', '#fff0a0'),
    leather: R('#3a2014', '#5e3820', '#86542e', '#ae7a48', '#d0a070'),
    blade: R('#4a5670', '#76829e', '#aab6cc', '#dce4f2', '#ffffff'),
};
const PUPIL = u32('#120c14');
const WHITE = u32('#ffffff');
const EYEWHITE = u32('#f2f4fa');
const VISOR = R('#0e0c14', '#16131e', '#1e1a28', '#262232', '#2e2a3c');

export function drawHeroKnight(p: Pose, out: Uint32Array, flip = false) {
    const b = new Buf();
    const cx = 26;
    const by = Math.round(p.by);
    const lean = Math.round(p.lean);
    const chest = { x: cx + Math.round(lean * 0.5), y: 46 + by };
    const head = { x: cx + 2 + lean, y: 28 + by };
    const sway = p.cape - lean * 0.8;
    const hand = { x: chest.x + 11 + p.hx, y: chest.y + p.hy };

    // ── 칼
    const drawSword = () => {
        b.begin(false);
        const dx = Math.cos(p.ang), dy = Math.sin(p.ang);
        const L = 19;
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

    // ── 꼬리: 엉덩이에서 뒤로 뻗어 위로 크게 말림, 진한 줄무늬
    b.begin();
    const base: [number, number][] = [[-5, 51], [-10, 50], [-14, 46.5], [-16, 41.5], [-15.5, 36.5], [-13, 33], [-10, 32]];
    const tail = base.map(([x, y], i) => [cx + x + sway * (i / 6) * 0.7, y + by] as [number, number]);
    for (let i = 0; i < tail.length - 1; i++)
        b.capsule(tail[i][0], tail[i][1], tail[i + 1][0], tail[i + 1][1], 2.5 - i * 0.15, i % 2 ? M.stripe : M.fur, 0.05);

    // ── 다리: 주황 털 + 줄무늬 + 흰 발
    const footY = 61 + Math.min(0, by);
    for (const [dx0, legX, ramp] of [[-3, cx - 4 - p.legs, 'back'], [2, cx + 3 + p.legs, 'front']] as const) {
        b.begin();
        b.capsule(chest.x + dx0, chest.y + 5, legX, footY - 2, ramp === 'back' ? 2.5 : 2.7, M.fur, ramp === 'back' ? -0.2 : 0);
        b.begin(false);
        b.line(chest.x + dx0 - 2, chest.y + 9, chest.x + dx0 + 1, chest.y + 8, M.stripe[1]);
        b.begin();
        b.ellipse(legX + 1, footY - 1, 3.2, 1.9, M.cream, ramp === 'back' ? -0.15 : 0);
    }

    // ── 몸통: 회색 가슴 갑옷 + 허리띠
    b.begin();
    b.ellipse(chest.x, chest.y, 7.5, 7, M.helm);
    b.begin(false);
    b.line(chest.x + 1, chest.y - 4, chest.x + 1, chest.y + 2, M.helm[4]);
    b.begin();
    b.poly([[chest.x - 7, chest.y + 3], [chest.x + 7, chest.y + 3], [chest.x + 7, chest.y + 5], [chest.x - 7, chest.y + 5]], M.leather);
    b.ellipse(chest.x + 2, chest.y + 4, 1.3, 1.1, M.gold, 0.1);

    // ── 투구: 머리 전체를 덮는 큰 둥근 투구
    b.begin();
    b.ellipse(head.x - 0.5, head.y + 9, 6, 3, M.fur); // 투구 아래로 보이는 목덜미 털
    b.begin();
    b.ellipse(head.x, head.y, 12.5, 12, M.helm);
    // 가운데 능선 + 꼭대기 장식
    b.begin(false);
    for (let y = head.y - 11; y <= head.y - 2; y++) b.set(head.x - 2, y, M.helm[4]);
    b.begin();
    b.ellipse(head.x - 2, head.y - 12.5, 2.2, 1.8, M.helm, 0.2);
    // 면갑 틈: 앞쪽에 어두운 구멍
    b.begin(false);
    b.ellipse(head.x + 5, head.y + 1, 7, 5.2, VISOR);
    // 면갑 아래 덮개 (턱)
    b.begin();
    b.poly([[head.x - 1, head.y + 5], [head.x + 12.5, head.y + 3], [head.x + 11, head.y + 9], [head.x + 1, head.y + 10]], M.helm, -0.05);
    // 숨구멍
    b.begin(false);
    for (let i = 0; i < 3; i++) b.set(head.x + 4 + i * 2.5, head.y + 7, M.helm[0]);
    // 리벳
    b.set(head.x - 9, head.y + 2, M.helm[4]);
    b.set(head.x - 8, head.y + 7, M.helm[4]);

    // 커다란 흰 눈 (앞쪽 눈 크게, 뒤쪽 눈은 가장자리만)
    const v = p.visor ?? 'dim';
    const squint = v === 'glow';
    const wide = v === 'flash';
    const eye = { x: head.x + 7, y: head.y + 0.5 };
    if (squint) {
        b.line(eye.x - 3, eye.y + 1, eye.x + 3, eye.y, EYEWHITE);
        b.line(eye.x - 3, eye.y + 2, eye.x + 3, eye.y + 1, EYEWHITE);
        b.line(eye.x - 2, eye.y + 1, eye.x + 2, eye.y + 1, PUPIL);
    } else {
        const r = wide ? 4.2 : 3.8;
        for (let y = -5; y <= 5; y++)
            for (let x = -5; x <= 5; x++) if (x * x + y * y <= r * r) b.set(eye.x + x, eye.y + y, EYEWHITE);
        // 뒤쪽 눈 가장자리
        for (let y = -2; y <= 2; y++) b.set(eye.x - 6, eye.y + y, EYEWHITE);
        // 눈동자 (앞을 봄)
        const pr = wide ? 1.4 : 2;
        for (let y = -3; y <= 3; y++)
            for (let x = -3; x <= 3; x++) if (x * x + y * y <= pr * pr + 0.5) b.set(eye.x + 1.5 + x, eye.y + y, PUPIL);
        b.set(eye.x + 0.5, eye.y - 1, WHITE);
    }

    // ── 앞팔 (주황 털) + 칼
    b.begin();
    b.capsule(chest.x + 5, chest.y - 3, hand.x, hand.y, 2.3, M.fur);
    b.begin();
    b.ellipse(chest.x + 5, chest.y - 4, 4, 3.4, M.helm, 0.05); // 어깨 갑옷
    if (!behind) drawSword();
    b.begin();
    b.ellipse(hand.x, hand.y, 2.4, 2.4, M.cream, 0.05);

    b.contours();
    b.inkOutline();
    blit(b, out, flip);
}
