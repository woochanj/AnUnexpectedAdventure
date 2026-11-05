// 층 배경을 절차적으로 그리는 픽셀 디오라마.
// 밝은 공간 + 좌우로 계단처럼 쌓인 블록 절벽 여러 겹 + 멀수록 안개색으로 바래는 대기 원근 + 턱 위의 산호/이끼.

export interface SceneryTheme {
    top: string;
    bottom: string;
    haze: string;
    rock: string;
    rockTop: string;
    rockDark: string;
    flora: string[];
    ray: string;
}

export const SCENERY: SceneryTheme[] = [
    // 1층: 물에 잠긴 청록 동굴
    {
        top: '#86e6ff', bottom: '#1b74c0', haze: '#5fc4f2',
        rock: '#3f7aa6', rockTop: '#bfeaf5', rockDark: '#1d3f66',
        flora: ['#ff6fa8', '#ffd25a', '#7cf0a0', '#ff9a5a', '#c78cff', '#5ef0e0'],
        ray: 'rgba(255,255,255,0.16)',
    },
    // 2층: 라벤더빛 안개 묘지
    {
        top: '#c4d0ff', bottom: '#4656a8', haze: '#9eaee8',
        rock: '#5d6894', rockTop: '#e2e6ff', rockDark: '#2a3062',
        flora: ['#9af0ff', '#f0f4ff', '#8cf5c8', '#ffb8e6', '#b8a8ff'],
        ray: 'rgba(255,255,255,0.14)',
    },
    // 3층: 보랏빛 수정 성채
    {
        top: '#d49aff', bottom: '#3a1a7a', haze: '#a070e6',
        rock: '#563a8a', rockTop: '#e6c8ff', rockDark: '#24124a',
        flora: ['#ff6ad8', '#ffd25a', '#8af0ff', '#ff8a6a', '#ffffff'],
        ray: 'rgba(255,230,255,0.15)',
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
