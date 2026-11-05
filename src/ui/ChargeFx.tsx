// 카드를 집는 순간부터 놓을 때까지, 카드 둘레에 속성별 기운이 모인다.
// 배경·캐릭터와 같은 4px 도트로 그린다.
import { useEffect, useRef } from 'react';
import { ELEMENT_PAL, type Element } from './cardElement';

const P = 4;
const snap = (v: number) => Math.round(v / P) * P;

interface Part {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    max: number;
    size: number;
    /** 원 궤도 입자용 각도 */
    a?: number;
    kind?: 'spark' | 'bolt' | 'cross' | 'bubble' | 'leaf';
    pts?: [number, number][];
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** 카드 테두리 위 한 점 */
function edgePoint(r: DOMRect): [number, number] {
    const per = 2 * (r.width + r.height);
    let d = Math.random() * per;
    if (d < r.width) return [r.left + d, r.top];
    d -= r.width;
    if (d < r.height) return [r.right, r.top + d];
    d -= r.height;
    if (d < r.width) return [r.right - d, r.bottom];
    d -= r.width;
    return [r.left, r.bottom - d];
}

function spawn(el: Element, r: DOMRect, ps: Part[], heat: number) {
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const n = Math.random() < 0.35 + heat * 0.5 ? 2 : 1;
    for (let i = 0; i < n; i++) {
        switch (el) {
            case 'fire': {
                // 아래와 옆에서 불씨가 솟는다
                // 카드 양옆과 윗변을 타고 불길이 솟는다
                const side = Math.random();
                const x = side < 0.3 ? r.left - rnd(0, 12) : side < 0.6 ? r.right + rnd(0, 12) : rnd(r.left, r.right);
                const y = side < 0.6 ? rnd(r.top, r.bottom) : r.top + rnd(-6, 10);
                ps.push({ x, y, vx: rnd(-14, 14), vy: rnd(-170, -80), life: 0, max: rnd(0.45, 0.85), size: Math.random() < 0.45 ? 2 : 1 });
                break;
            }
            case 'ice': {
                // 바깥에서 냉기가 카드 쪽으로 빨려든다
                const a = Math.random() * Math.PI * 2;
                const R = Math.max(r.width, r.height) * 0.75;
                const x = cx + Math.cos(a) * R;
                const y = cy + Math.sin(a) * R * 0.8;
                ps.push({ x, y, vx: (cx - x) * 1.6, vy: (cy - y) * 1.6, life: 0, max: 0.55, size: 1, kind: Math.random() < 0.25 ? 'cross' : undefined });
                break;
            }
            case 'lightning': {
                if (Math.random() < 0.18 + heat * 0.2) {
                    // 테두리를 타고 튀는 짧은 번개
                    const [x0, y0] = edgePoint(r);
                    const pts: [number, number][] = [[x0, y0]];
                    let x = x0;
                    let y = y0;
                    for (let k = 0; k < 5; k++) {
                        x += rnd(-16, 16);
                        y += rnd(-18, 6);
                        pts.push([x, y]);
                    }
                    ps.push({ x: x0, y: y0, vx: 0, vy: 0, life: 0, max: 0.12, size: 1, kind: 'bolt', pts });
                } else {
                    const [x, y] = edgePoint(r);
                    ps.push({ x, y, vx: rnd(-90, 90), vy: rnd(-90, 40), life: 0, max: rnd(0.15, 0.3), size: 1, kind: 'spark' });
                }
                break;
            }
            case 'poison':
                ps.push({ x: rnd(r.left, r.right), y: rnd(r.bottom - 20, r.bottom), vx: rnd(-8, 8), vy: rnd(-70, -35), life: 0, max: rnd(0.7, 1.1), size: Math.random() < 0.4 ? 2 : 1, kind: 'bubble' });
                break;
            case 'arcane':
                // 카드 둘레를 도는 룬 입자
                ps.push({ x: cx, y: cy, vx: rnd(2.4, 3.6) * (Math.random() < 0.5 ? 1 : -1), vy: rnd(0.5, 0.75), life: 0, max: rnd(0.7, 1.1), size: 1, a: Math.random() * Math.PI * 2 });
                break;
            case 'shadow':
                ps.push({ x: rnd(r.left - 8, r.right + 8), y: rnd(r.top + 20, r.bottom), vx: rnd(-30, 30), vy: rnd(-60, -25), life: 0, max: rnd(0.6, 1), size: 2 });
                break;
            case 'steel': {
                // 칼날 번쩍임: 테두리 위 짧은 섬광
                const [x, y] = edgePoint(r);
                ps.push({ x, y, vx: 0, vy: 0, life: 0, max: 0.22, size: 1, kind: Math.random() < 0.5 ? 'cross' : 'spark' });
                break;
            }
            case 'guard':
                ps.push({ x: rnd(r.left, r.right), y: r.bottom - rnd(0, 10), vx: 0, vy: rnd(-90, -50), life: 0, max: rnd(0.5, 0.8), size: 1 });
                break;
            case 'nature':
                ps.push({ x: rnd(r.left, r.right), y: r.bottom, vx: rnd(-20, 20), vy: rnd(-60, -30), life: 0, max: rnd(0.8, 1.2), size: 1, kind: 'leaf' });
                break;
            case 'blood':
                ps.push({ x: rnd(r.left, r.right), y: rnd(r.top, r.bottom), vx: rnd(-10, 10), vy: rnd(-40, -10), life: 0, max: rnd(0.4, 0.7), size: Math.random() < 0.3 ? 2 : 1 });
                break;
            case 'wind': {
                // 옆으로 스치는 바람결
                const y = rnd(r.top, r.bottom);
                ps.push({ x: r.left - 20, y, vx: rnd(160, 240), vy: rnd(-20, 5), life: 0, max: (r.width + 40) / 200, size: 1, kind: 'spark' });
                break;
            }
        }
    }
}

/**
 * getRect: 매 프레임 기운이 모일 카드 위치 (없으면 null)
 * heat: 0~1, 조준 중이면 더 세게
 */
export function ChargeFx({ element, getRect, heat }: { element: Element; getRect: () => DOMRect | null; heat: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const heatRef = useRef(heat);
    heatRef.current = heat;
    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        const ctx = cv.getContext('2d')!;
        const pal = ELEMENT_PAL[element];
        const ps: Part[] = [];
        let raf = 0;
        let last = performance.now();
        let acc = 0;
        let t = 0;
        const born = performance.now();
        const frame = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            t += dt;
            if (cv.width !== window.innerWidth || cv.height !== window.innerHeight) {
                cv.width = window.innerWidth;
                cv.height = window.innerHeight;
            }
            ctx.clearRect(0, 0, cv.width, cv.height);
            const r = getRect();
            // 집은 직후 0.25초는 확 몰아친다
            const burst = Math.max(0, 1 - (now - born) / 250);
            const heat = Math.min(1, heatRef.current + burst);
            if (r) {
                acc += dt * (40 + heat * 60);
                while (acc > 1) {
                    acc -= 1;
                    spawn(element, r, ps, heat);
                }
                // 카드 테두리 도트 맥박 (모으는 느낌)
                const pulse = Math.round((Math.sin(t * 10) * 0.5 + 0.5) * 2);
                ctx.fillStyle = pal.ink;
                const L = snap(r.left) - P * (2 + pulse);
                const T = snap(r.top) - P * (2 + pulse);
                const W = snap(r.width) + P * (4 + pulse * 2);
                const H = snap(r.height) + P * (4 + pulse * 2);
                for (let x = L; x < L + W; x += P * 3) {
                    ctx.fillStyle = (x / P) % 2 ? pal.mid : pal.hi;
                    ctx.fillRect(x, T, P, P);
                    ctx.fillRect(x, T + H, P, P);
                }
                for (let y = T; y <= T + H; y += P * 3) {
                    ctx.fillStyle = (y / P) % 2 ? pal.mid : pal.lo;
                    ctx.fillRect(L, y, P, P);
                    ctx.fillRect(L + W, y, P, P);
                }
            }
            for (let i = ps.length - 1; i >= 0; i--) {
                const p = ps[i];
                p.life += dt;
                if (p.life >= p.max) {
                    ps.splice(i, 1);
                    continue;
                }
                const k = p.life / p.max;
                if (p.a !== undefined && r) {
                    // 궤도 입자
                    p.a += p.vx * dt;
                    p.x = r.left + r.width / 2 + Math.cos(p.a) * r.width * 0.62;
                    p.y = r.top + r.height / 2 + Math.sin(p.a) * r.height * p.vy * 0.75;
                } else {
                    p.x += p.vx * dt + (element === 'fire' ? Math.sin((p.life + p.y) * 18) * 0.6 : 0);
                    p.y += p.vy * dt;
                    if (element === 'shadow') p.vx *= 0.96;
                }
                // 카드 글씨를 가리지 않도록 카드 안쪽에는 그리지 않는다 (테두리 근처만)
                if (r && p.kind !== 'bolt' && p.x > r.left + 3 * P && p.x < r.right - 3 * P && p.y > r.top + 3 * P && p.y < r.bottom - 3 * P) continue;
                const col = k < 0.25 ? pal.hi : k < 0.6 ? pal.mid : k < 0.85 ? pal.lo : pal.ink;
                const s = p.size * P;
                const x = snap(p.x);
                const y = snap(p.y);
                if (p.kind === 'bolt' && p.pts) {
                    ctx.fillStyle = Math.random() < 0.5 ? pal.hi : pal.mid;
                    for (let j = 1; j < p.pts.length; j++) {
                        const [ax, ay] = p.pts[j - 1];
                        const [bx, by] = p.pts[j];
                        const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / P);
                        for (let q = 0; q <= steps; q++) ctx.fillRect(snap(ax + ((bx - ax) * q) / steps), snap(ay + ((by - ay) * q) / steps), P, P);
                    }
                } else if (p.kind === 'cross') {
                    ctx.fillStyle = pal.hi;
                    const arm = k < 0.5 ? 2 : 1;
                    ctx.fillRect(x - arm * P, y, (arm * 2 + 1) * P, P);
                    ctx.fillRect(x, y - arm * P, P, (arm * 2 + 1) * P);
                } else if (p.kind === 'bubble' && s > P) {
                    ctx.fillStyle = pal.ink;
                    ctx.fillRect(x - P, y - P, 2 * P + P, 2 * P + P);
                    ctx.fillStyle = col;
                    ctx.fillRect(x - P / 2 - P / 2, y - P, 2 * P, 2 * P);
                    ctx.fillStyle = pal.hi;
                    ctx.fillRect(x - P, y - P, P, P);
                } else if (p.kind === 'spark') {
                    ctx.fillStyle = col;
                    ctx.fillRect(x, y, P * 2, P);
                } else if (p.kind === 'leaf') {
                    ctx.fillStyle = col;
                    const w = Math.sin(p.life * 8) > 0 ? 1 : 0;
                    ctx.fillRect(x, y, P * 2, P);
                    ctx.fillRect(x + w * P, y - P, P, P);
                } else {
                    // 바깥선을 둘러 배경 위에서도 또렷하게
                    ctx.fillStyle = pal.ink;
                    ctx.fillRect(x - P, y, s + 2 * P, s);
                    ctx.fillRect(x, y - P, s, s + 2 * P);
                    ctx.fillStyle = col;
                    ctx.fillRect(x, y, s, s);
                }
            }
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [element, getRect]);
    return <canvas ref={ref} className="charge-fx" aria-hidden style={{ filter: `drop-shadow(0 0 5px ${ELEMENT_PAL[element].glow})` }} />;
}
