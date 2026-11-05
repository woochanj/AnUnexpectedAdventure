// 카드를 끌 때 나오는 조준 화살표. 전투 화면과 같은 픽셀 격자(P)에 맞춰
// 3단 음영 구슬을 곡선 위에 찍고, 머리는 8방향 픽셀 그림, 적 발밑에는 픽셀 고리를 그린다.
import { useEffect, useState, type ReactElement } from "react";
import { cardElement, ELEMENT_PAL, type Pal } from './cardElement';

/** 화면 한 픽셀 = 실제 4px (배경·캐릭터 도트 크기와 맞춤) */
const P = 4;

export interface ArrowInfo {
    card: string;
    sx: number;
    sy: number;
    x: number;
    y: number;
    aim: string | null;
}

const snap = (v: number) => Math.round(v / P) * P;

/** 픽셀 하나 (격자 단위) */
function px(key: string, x: number, y: number, fill: string, w = 1, h = 1) {
    return <rect key={key} x={x} y={y} width={w * P} height={h * P} fill={fill} />;
}

/** 3×3 구슬: 가운데 밝고 테두리 어두운 도트 (size 2는 작은 구슬) */
function orb(k: string, cx: number, cy: number, pal: Pal, big: boolean) {
    const x = snap(cx);
    const y = snap(cy);
    if (!big) {
        return (
            <g key={k}>
                {px('o', x - P, y - P, pal.ink, 3, 3)}
                {px('m', x, y, pal.mid)}
            </g>
        );
    }
    return (
        <g key={k}>
            {px('o1', x - 2 * P, y - P, pal.ink, 5, 3)}
            {px('o2', x - P, y - 2 * P, pal.ink, 3, 5)}
            {px('l', x - P, y - P, pal.lo, 3, 3)}
            {px('m', x - P, y - P, pal.mid, 2, 2)}
            {px('h', x - P, y - P, pal.hi)}
        </g>
    );
}

// 화살촉 그림 (오른쪽, 오른쪽 위 대각선). 0 빈칸, 1 테두리, 2 어두움, 3 중간, 4 밝음
const HEAD_E = [
    '1100000',
    '1311000',
    '1433110',
    '1443331',
    '1433110',
    '1311000',
    '1100000',
];
const HEAD_NE = [
    '0111111',
    '0144331',
    '0014431',
    '0113431',
    '1331331',
    '1311011',
    '1100000',
];

function head(cx: number, cy: number, angle: number, pal: Pal) {
    // 8방향으로 양자화: 90° 회전은 도트가 깨지지 않는다
    const oct = ((Math.round(angle / 45) % 8) + 8) % 8;
    const art = oct % 2 === 0 ? HEAD_E : HEAD_NE;
    const quarter = Math.floor(oct / 2); // 0 오른쪽, 1 아래, 2 왼쪽, 3 위 (화면 좌표)
    const n = art.length;
    const colors = ['', pal.ink, pal.lo, pal.mid, pal.hi];
    const cells: ReactElement[] = [];
    for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
            const v = Number(art[r][c]);
            if (!v) continue;
            // 그림 좌표 (c, r) 을 가운데 기준으로 돌린다
            let dx = c - (n - 1) / 2;
            let dy = r - (n - 1) / 2;
            for (let q = 0; q < quarter; q++) [dx, dy] = [-dy, dx];
            cells.push(px(`${r}-${c}`, snap(cx) + Math.round(dx - 0.5) * P, snap(cy) + Math.round(dy - 0.5) * P, colors[v]));
        }
    return <g>{cells}</g>;
}

/** 적 발밑 픽셀 고리 */
function ring(cx: number, cy: number, rx: number, pal: Pal, t: number) {
    const ry = Math.max(3 * P, rx * 0.28);
    const cells: ReactElement[] = [];
    const seen = new Set<string>();
    const steps = Math.ceil((2 * Math.PI * rx) / P);
    for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = snap(cx + Math.cos(a) * rx);
        const y = snap(cy + Math.sin(a) * ry);
        const k = `${x},${y}`;
        if (seen.has(k)) continue;
        seen.add(k);
        // 고리를 따라 밝은 마디가 돈다
        const lit = (i / steps + t) % 0.25 < 0.08;
        cells.push(px(`i${k}`, x, y + P, pal.ink));
        cells.push(px(k, x, y, lit ? pal.hi : Math.sin(a) > 0 ? pal.mid : pal.lo));
    }
    return <g>{cells}</g>;
}

export function DragArrow({ d }: { d: ArrowInfo }) {
    const [t, setT] = useState(0);
    useEffect(() => {
        let raf = 0;
        const loop = (now: number) => {
            setT(now / 1000);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    const pal = ELEMENT_PAL[cardElement(d.card)];

    // 겨눈 적이 있으면 화살 끝을 적 몸 가운데에 붙인다
    let ex = d.x;
    let ey = d.y;
    let target: DOMRect | null = null;
    if (d.aim) {
        const body = document.querySelector(`.enemy[data-uid="${d.aim}"] [data-body]`) ?? document.querySelector(`.enemy[data-uid="${d.aim}"]`);
        if (body) {
            target = body.getBoundingClientRect();
            ex = target.left + target.width / 2;
            ey = target.top + target.height * 0.45;
        }
    }

    const cx = (d.sx + ex) / 2;
    const cy = Math.min(d.sy, ey) - 110;
    const at = (s: number): [number, number] => {
        const u = 1 - s;
        return [u * u * d.sx + 2 * u * s * cx + s * s * ex, u * u * d.sy + 2 * u * s * cy + s * s * ey];
    };
    const len = Math.hypot(ex - d.sx, ey - d.sy) + 110;
    const gap = 30;
    const n = Math.max(3, Math.floor(len / gap));
    const flow = (t * 2.2) % 1; // 구슬이 대상 쪽으로 흘러간다
    const dots: ReactElement[] = [];
    for (let i = 0; i < n - 1; i++) {
        const s = (i + flow) / n;
        if (s > 0.9) continue;
        const [x, y] = at(s);
        dots.push(orb(`d${i}`, x, y, pal, s > 0.25));
    }
    const [hx, hy] = at(0.93);
    const [bx, by] = at(0.86);
    const ang = (Math.atan2(hy - by, hx - bx) * 180) / Math.PI;

    return (
        <svg className="drag-arrow" aria-hidden shapeRendering="crispEdges" style={{ filter: `drop-shadow(0 0 6px ${pal.glow})` }}>
            {target && ring(target.left + target.width / 2, target.bottom - P * 2, Math.max(28, target.width * 0.42), pal, t * 0.6)}
            {dots}
            {head(hx, hy, ang, pal)}
            {target && (
                <g className="drag-reticle">
                    {[0, 1, 2, 3].map((q) => {
                        const pulse = Math.round(Math.sin(t * 8) + 1) * P;
                        const sx = q % 2 === 0 ? -1 : 1;
                        const sy = q < 2 ? -1 : 1;
                        const x0 = snap(ex + sx * (target!.width * 0.32 + pulse));
                        const y0 = snap(ey + sy * (target!.height * 0.3 + pulse));
                        // ㄱ자 모서리: 바깥선 + 색
                        return (
                            <g key={q}>
                                {px('a', x0 - (sx > 0 ? 4 * P : 0) - P, y0 - P, pal.ink, 6, 3)}
                                {px('b', x0 - P, y0 - (sy > 0 ? 4 * P : 0) - P, pal.ink, 3, 6)}
                                {px('c', x0 - (sx > 0 ? 4 * P : 0), y0, pal.mid, 5, 1)}
                                {px('d', x0, y0 - (sy > 0 ? 4 * P : 0), pal.mid, 1, 5)}
                                {px('e', x0, y0, pal.hi)}
                            </g>
                        );
                    })}
                </g>
            )}
        </svg>
    );
}
