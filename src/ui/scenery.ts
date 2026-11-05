// 층 배경을 절차적으로 그리는 픽셀 디오라마 (다크 판타지).
// 어두운 공간 + 좌우로 계단처럼 쌓인 블록 절벽 여러 겹 + 멀수록 안개색으로 바래는 대기 원근
// + 층마다 다른 실루엣 소품(종유석 / 묘비·죽은 나무·달 / 고딕 첨탑·핏빛 달)과 희미하게 빛나는 이끼·불씨.

export interface SceneryTheme {
    top: string;
    bottom: string;
    haze: string;
    rock: string;
    rockTop: string;
    rockDark: string;
    flora: string[];
    ray: string;
    props: 'cave' | 'graveyard' | 'castle';
    /** 달 (없으면 그리지 않음) */
    moon?: string;
}

export const SCENERY: SceneryTheme[] = [
    // 1층: 물에 잠긴 검푸른 동굴 — 빛나는 청록 버섯과 이끼
    {
        top: '#0c1e28', bottom: '#03070a', haze: '#163a44',
        rock: '#1a2c34', rockTop: '#4e7078', rockDark: '#081014',
        flora: ['#5af0d0', '#3ac4b0', '#a8ff7a', '#7ac8ff', '#2a6a5a'],
        ray: 'rgba(120,230,230,0.07)',
        props: 'cave',
    },
    // 2층: 달빛 아래 안개 묘지
    {
        top: '#1e2438', bottom: '#06070c', haze: '#3a4258',
        rock: '#242838', rockTop: '#666c84', rockDark: '#0a0c14',
        flora: ['#4a5a3a', '#6a6a52', '#3a4a32', '#7a7e90'],
        ray: 'rgba(200,215,255,0.07)',
        props: 'graveyard',
        moon: '#dfe6f4',
    },
    // 3층: 핏빛 달 아래 그림자 성채
    {
        top: '#2c0a16', bottom: '#060208', haze: '#4a1428',
        rock: '#28121e', rockTop: '#6a3848', rockDark: '#0c0408',
        flora: ['#ff5a3a', '#c03050', '#ffb050', '#6a2a3a'],
        ray: 'rgba(255,70,60,0.07)',
        props: 'castle',
        moon: '#e04a3a',
    },
];

function rng(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const hex = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const css = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

/** 달, 종유석, 묘비·죽은 나무, 고딕 첨탑 같은 원경 실루엣 */
function backdropProps(ctx: CanvasRenderingContext2D, w: number, h: number, th: SceneryTheme, R: () => number) {
    const haze = hex(th.haze), dark = hex(th.rockDark), rock = hex(th.rock);
    const far = css(mix(dark, haze, 0.55));
    const mid = css(mix(dark, haze, 0.3));

    // 달 + 번지는 빛
    if (th.moon) {
        const mc = hex(th.moon);
        const mx = Math.round(w * 0.7), my = Math.round(h * 0.2), mr = Math.max(6, Math.round(h * 0.085));
        for (let k = 4; k >= 1; k--) {
            ctx.fillStyle = `rgba(${mc[0]},${mc[1]},${mc[2]},${0.05 * (5 - k)})`;
            ctx.beginPath();
            ctx.arc(mx, my, mr + k * mr * 0.45, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = css(mc);
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = css(mix(mc, dark, 0.25));
        for (let i = 0; i < 5; i++) ctx.fillRect(mx - mr / 2 + Math.round(R() * mr), my - mr / 2 + Math.round(R() * mr), 2, 2);
    }

    if (th.props === 'cave') {
        // 천장에서 늘어진 종유석 (먼 것 → 가까운 것)
        for (const [col, len] of [[far, 0.35], [mid, 0.22]] as const) {
            ctx.fillStyle = col;
            for (let x = Math.floor(R() * 8); x < w; x += 6 + Math.floor(R() * 12)) {
                const bw = 3 + Math.floor(R() * 6);
                const bl = 6 + Math.floor(R() * h * len);
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x + bw, 0);
                ctx.lineTo(x + bw / 2, bl);
                ctx.closePath();
                ctx.fill();
            }
        }
        // 물에 비친 희미한 빛 띠
        ctx.fillStyle = 'rgba(90,240,208,0.06)';
        for (let i = 0; i < 4; i++) ctx.fillRect(0, Math.round(h * (0.55 + i * 0.05)), w, 1);
    }

    if (th.props === 'graveyard') {
        // 먼 언덕
        ctx.fillStyle = far;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.62);
        for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * 0.6 - Math.sin(x / 37) * h * 0.05 - Math.sin(x / 13) * 2);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fill();
        // 죽은 나무
        ctx.fillStyle = mid;
        for (let i = 0; i < 3; i++) {
            const tx = Math.round(w * (0.28 + i * 0.22 + (R() - 0.5) * 0.08));
            const base = Math.round(h * 0.62);
            const th2 = Math.round(h * (0.18 + R() * 0.1));
            ctx.fillRect(tx, base - th2, 2, th2);
            for (let b = 0; b < 4; b++) {
                const by = base - th2 + Math.round(R() * th2 * 0.6);
                const dir = b % 2 ? 1 : -1;
                const bl = 4 + Math.floor(R() * 8);
                for (let k = 0; k < bl; k++) ctx.fillRect(tx + dir * k, by - Math.floor(k / 2), 1, 1);
            }
        }
        // 묘비와 십자가
        for (let x = Math.floor(R() * 10); x < w; x += 10 + Math.floor(R() * 16)) {
            const gy = Math.round(h * 0.63 + R() * 4);
            ctx.fillStyle = mid;
            if (R() < 0.4) {
                ctx.fillRect(x + 2, gy - 9, 2, 9);
                ctx.fillRect(x, gy - 7, 6, 2);
            } else {
                const gw = 5 + Math.floor(R() * 3), gh = 6 + Math.floor(R() * 4);
                ctx.fillRect(x, gy - gh + 2, gw, gh - 2);
                ctx.fillRect(x + 1, gy - gh, gw - 2, 2);
            }
        }
    }

    if (th.props === 'castle') {
        // 고딕 첨탑 실루엣 + 불 켜진 창
        const baseY = Math.round(h * 0.72);
        for (const [col, scale] of [[far, 1], [mid, 0.75]] as const) {
            for (let x = Math.floor(R() * 20) + Math.round(w * 0.12); x < w * 0.9; x += 14 + Math.floor(R() * 26)) {
                const tw = Math.round((6 + R() * 12) * scale);
                const thh = Math.round(h * (0.2 + R() * 0.38) * scale);
                ctx.fillStyle = col;
                ctx.fillRect(x, baseY - thh, tw, thh);
                ctx.beginPath();
                ctx.moveTo(x - 1, baseY - thh);
                ctx.lineTo(x + tw + 1, baseY - thh);
                ctx.lineTo(x + tw / 2, baseY - thh - tw * 1.4);
                ctx.closePath();
                ctx.fill();
                // 성가퀴
                for (let k = 0; k < tw; k += 3) ctx.fillRect(x + k, baseY - thh - 2, 2, 2);
                // 창문
                for (let wy = baseY - thh + 4; wy < baseY - 6; wy += 7 + Math.floor(R() * 6)) {
                    if (R() < 0.55) continue;
                    ctx.fillStyle = R() < 0.7 ? 'rgba(255,150,60,0.9)' : 'rgba(255,90,60,0.7)';
                    ctx.fillRect(x + Math.floor(tw / 2) - 1, wy, 2, 3);
                }
            }
        }
        // 성벽 띠
        ctx.fillStyle = css(mix(dark, rock, 0.4));
        ctx.fillRect(0, baseY, w, h - baseY);
    }
}

/**
 * w×h 픽셀 캔버스에 배경을 그린다. ground가 있으면 아래쪽에 전투용 바닥 턱을 깐다.
 */
export function paintScenery(ctx: CanvasRenderingContext2D, w: number, h: number, floor: number, seed: number, ground = false) {
    const th = SCENERY[floor] ?? SCENERY[0];
    const R = rng(seed * 9973 + floor * 131 + w);
    const top = hex(th.top), bottom = hex(th.bottom), haze = hex(th.haze);
    const rock = hex(th.rock), rockTop = hex(th.rockTop), rockDark = hex(th.rockDark);

    // 1) 공간 그라디언트 (픽셀 단위 줄무늬로 계단식)
    for (let y = 0; y < h; y++) {
        const t = Math.floor((y / h) * 14) / 14;
        ctx.fillStyle = css(mix(top, bottom, t));
        ctx.fillRect(0, y, w, 1);
    }

    // 2) 빛줄기
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
        const x = Math.floor(R() * w);
        const bw = 6 + Math.floor(R() * 16);
        ctx.fillStyle = th.ray;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + bw, 0);
        ctx.lineTo(x + bw + h * 0.45, h);
        ctx.lineTo(x + h * 0.45, h);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    // 2.5) 층별 원경 소품 (절벽보다 뒤)
    backdropProps(ctx, w, h, th, R);

    // 3) 블록 절벽: 먼 층부터 가까운 층 순서로
    const LAYERS = 4;
    for (let L = 0; L < LAYERS; L++) {
        const near = L / (LAYERS - 1); // 0 먼 곳, 1 가까운 곳
        const fade = 0.78 * (1 - near); // 안개에 섞이는 정도
        const cRock = mix(rock, haze, fade);
        const cTop = mix(rockTop, haze, fade * 0.8);
        const cDark = mix(rockDark, haze, fade);
        const cSeam = mix(rockDark, cRock, 0.45);
        const block = 6 + Math.round(near * 10); // 가까울수록 블록이 크다
        // 먼 층일수록 화면 가운데 쪽까지 들어온다
        const reach = (0.42 - near * 0.24) * w;

        for (const side of [-1, 1]) {
            let y = Math.floor(R() * block * 2) - block;
            let extent = reach * (0.5 + R() * 0.5);
            while (y < h) {
                const bh = block + Math.floor(R() * block * 1.4);
                extent = Math.max(block * 2, Math.min(reach * 1.1, extent + (R() - 0.45) * block * 3));
                const ext = Math.round(extent);
                const x0 = side < 0 ? 0 : w - ext;
                // 앞면
                ctx.fillStyle = css(cRock);
                ctx.fillRect(x0, y, ext, bh);
                // 아래 그늘
                ctx.fillStyle = css(cDark);
                ctx.fillRect(x0, y + bh - 2, ext, 2);
                // 돌 이음매
                ctx.fillStyle = css(cSeam);
                for (let sx = block + Math.floor(R() * block); sx < ext - 2; sx += block + Math.floor(R() * block)) {
                    const px = side < 0 ? sx : w - sx;
                    ctx.fillRect(px, y + 3, 1, bh - 5);
                }
                // 턱 끝 옆면 (어두운 세로 면)
                const edgeX = side < 0 ? x0 + ext - 2 : x0;
                ctx.fillStyle = css(cDark);
                ctx.fillRect(edgeX, y + 2, 2, bh - 2);
                // 윗면 하이라이트
                ctx.fillStyle = css(cTop);
                ctx.fillRect(x0, y, ext, 2);
                ctx.fillStyle = css(mix(cTop, cRock, 0.5));
                ctx.fillRect(x0, y + 2, ext, 1);
                // 윗면의 산호/이끼
                const tufts = Math.floor(ext / (block * 1.6));
                for (let k = 0; k < tufts; k++) {
                    if (R() < 0.35) continue;
                    const fx = side < 0 ? Math.floor(R() * (ext - 3)) : w - 3 - Math.floor(R() * (ext - 3));
                    const col = mix(hex(th.flora[Math.floor(R() * th.flora.length)]), haze, fade * 0.85);
                    ctx.fillStyle = css(col);
                    const kind = R();
                    if (kind < 0.45) {
                        // 해초/풀: 가는 줄기 몇 개
                        const n = 2 + Math.floor(R() * 3);
                        for (let s = 0; s < n; s++) {
                            const sh = 2 + Math.floor(R() * (3 + near * 6));
                            ctx.fillRect(fx + s * 2, y - sh, 1, sh);
                        }
                    } else if (kind < 0.8) {
                        // 산호 덩어리
                        const cw = 2 + Math.floor(R() * (2 + near * 3));
                        ctx.fillRect(fx, y - cw, cw + 1, cw);
                        ctx.fillStyle = css(mix(col, [255, 255, 255], 0.35));
                        ctx.fillRect(fx, y - cw, 1, 1);
                    } else {
                        // 가지 산호
                        const bhh = 3 + Math.floor(R() * (3 + near * 4));
                        ctx.fillRect(fx + 1, y - bhh, 1, bhh);
                        ctx.fillRect(fx, y - bhh + 1, 1, 1);
                        ctx.fillRect(fx + 2, y - bhh + 2, 1, 1);
                    }
                }
                y += bh + Math.floor(R() * block * 1.2);
            }
        }

        // 아주 먼 층에는 가운데 기둥 실루엣
        if (L === 0) {
            for (let i = 0; i < 3; i++) {
                const px = Math.floor(w * (0.3 + R() * 0.4));
                const pw = 8 + Math.floor(R() * 14);
                const py = Math.floor(h * (0.35 + R() * 0.3));
                ctx.fillStyle = css(mix(cRock, haze, 0.35));
                ctx.fillRect(px, py, pw, h - py);
                ctx.fillStyle = css(mix(cTop, haze, 0.3));
                ctx.fillRect(px, py, pw, 2);
            }
        }

        // 층 사이 안개 막
        ctx.fillStyle = `rgba(${haze[0]},${haze[1]},${haze[2]},${0.12 * (1 - near)})`;
        ctx.fillRect(0, 0, w, h);
    }

    // 4) 전투용 바닥 턱
    if (ground) {
        const gy = Math.floor(h * 0.8);
        ctx.fillStyle = css(rock);
        ctx.fillRect(0, gy, w, h - gy);
        ctx.fillStyle = css(rockTop);
        ctx.fillRect(0, gy, w, 3);
        ctx.fillStyle = css(mix(rockTop, rock, 0.5));
        ctx.fillRect(0, gy + 3, w, 2);
        ctx.fillStyle = css(mix(rockDark, rock, 0.4));
        for (let x = Math.floor(R() * 20); x < w; x += 14 + Math.floor(R() * 18)) ctx.fillRect(x, gy + 6, 1, h - gy - 6);
        for (let yy = gy + 14; yy < h; yy += 12) ctx.fillRect(0, yy, w, 1);
        // 바닥 위 산호
        for (let x = 0; x < w; x += 6 + Math.floor(R() * 14)) {
            const col = hex(th.flora[Math.floor(R() * th.flora.length)]);
            ctx.fillStyle = css(col);
            const sh = 2 + Math.floor(R() * 7);
            if (R() < 0.5) ctx.fillRect(x, gy - sh, 1, sh), ctx.fillRect(x + 2, gy - sh + 2, 1, sh - 2);
            else ctx.fillRect(x, gy - 3, 4, 3);
        }
    }

    // 5) 가장자리 어둡게 (비네트)
    const g = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(4,10,30,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
}
