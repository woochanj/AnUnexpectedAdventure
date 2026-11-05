import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { clearFrame, composite, createFrame, createFx, type Frame, type FxInstance, type FxModule } from 'pixelfx';
import type { HitStopClock } from './FxCanvas';
import { CHIBI_H, CHIBI_W, drawHero, IDLE_POSE, MOVES, moveSpan, samplePose, type Key, type Pose } from './chibi';
import { paintScenery } from './scenery';
import { cleanOpts } from './creatures';

const frozen = (clock?: RefObject<HitStopClock>) => {
    const now = performance.now();
    return !!clock?.current?.windows.some(([a, b]) => now >= a && now < b);
};

/** 캔버스 하나에 pixelfx를 그리고 프레임마다 갱신하는 공통 루프 */
function usePixelLoop(
    canvasRef: RefObject<HTMLCanvasElement | null>,
    w: number,
    h: number,
    step: (dt: number, frame: Frame) => boolean | void,
    deps: unknown[],
    post?: (rgba: Uint8ClampedArray, w: number, h: number) => void,
) {
    useEffect(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext('2d')!;
        const frame = createFrame(w, h);
        const img = new ImageData(w, h);
        let raf = 0;
        let prev = performance.now();
        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - prev) / 1000);
            prev = now;
            clearFrame(frame);
            const stop = step(dt, frame);
            composite(frame, img.data, null);
            post?.(img.data, w, h);
            ctx.putImageData(img, 0, 0);
            if (stop !== true) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

/** 불투명한 픽셀 바깥쪽에 진한 1px 외곽선 (빛 번짐은 그대로 둔다) */
function inkOutline(d: Uint8ClampedArray, w: number, h: number) {
    const solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] >= 200 ? 1 : 0;
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (solid[i] || d[i * 4 + 3] >= 140) continue;
            if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) {
                d[i * 4] = 0x16;
                d[i * 4 + 1] = 0x0c;
                d[i * 4 + 2] = 0x24;
                d[i * 4 + 3] = 255;
            }
        }
}

/**
 * pixelfx 이펙트 하나를 제자리에서 재생하는 캔버스 (적, 모닥불, 상자 등).
 * 캔버스 아래 가장자리가 이펙트의 발밑(origin)에 오도록 잘라 그린다.
 */
export function FxView({
    mod, opts, scale = 3, clock, className, style, below = 4, seed = 1, speed = 1, maxW, outline = false,
}: {
    /** 치비 주인공처럼 진한 외곽선을 두른다 */
    outline?: boolean;
    /** 가로로 이 픽셀까지만 (가운데 기준) 잘라 그린다 */
    maxW?: number;
    mod: FxModule;
    opts?: Record<string, unknown>;
    scale?: number;
    clock?: RefObject<HitStopClock>;
    className?: string;
    style?: CSSProperties;
    below?: number;
    seed?: number;
    speed?: number;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    const w = Math.min(mod.meta.size[0], maxW ?? Infinity);
    const ox = mod.meta.origin[0] - (mod.meta.size[0] - w) / 2;
    const oy = mod.meta.origin[1];
    const h = oy + below;
    const fx = useRef<FxInstance | null>(null);
    usePixelLoop(
        ref, w, h,
        (dt, frame) => {
            if (!fx.current) {
                fx.current = createFx(mod, { seed, ...cleanOpts(opts), x: ox, y: oy });
                fx.current.update(0.001);
            }
            if (!frozen(clock)) fx.current.update(dt * speed);
            fx.current.draw(frame);
            // 한 번만 재생하는 이펙트는 끝나면 마지막 장면에서 멈춘다
            return !mod.meta.loop && fx.current.t > (mod.meta.duration ?? 1) + 0.1;
        },
        [mod, JSON.stringify(opts), seed, outline],
        outline ? inkOutline : undefined,
    );
    useEffect(() => {
        fx.current = null;
    }, [mod, JSON.stringify(opts), seed]);
    return <canvas ref={ref} className={`pixel-canvas ${className ?? ''}`} style={{ width: w * scale, height: h * scale, ...style }} />;
}

// ───────────── 주인공: 치비 렌더러로 그린다 ─────────────

export interface HeroAction {
    id: number;
    /** chibi.ts MOVES의 키 */
    act: string;
    /** 공격이 닿는 순간(t=0)까지 남길 예비동작 시간 */
    windup?: number;
}

export function HeroView({
    action, scale = 3, clock, flip = false, walking = false, className,
}: {
    action?: HeroAction | null;
    scale?: number;
    clock?: RefObject<HitStopClock>;
    flip?: boolean;
    walking?: boolean;
    className?: string;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    const cur = useRef<{ keys: Key[]; t: number; end: number; id: number } | null>(null);
    const pending = useRef<HeroAction | null>(null);
    const lastId = useRef(-1);
    const walk = useRef(walking);
    walk.current = walking;

    useEffect(() => {
        if (action) pending.current = action;
    }, [action]);

    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        cv.width = CHIBI_W;
        cv.height = CHIBI_H;
        const ctx = cv.getContext('2d')!;
        const img = new ImageData(CHIBI_W, CHIBI_H);
        const px = new Uint32Array(img.data.buffer);
        let raf = 0;
        let prev = performance.now();
        let time = Math.random() * 3;
        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - prev) / 1000);
            prev = now;
            const still = frozen(clock);
            const p = pending.current;
            if (p && p.id !== lastId.current) {
                lastId.current = p.id;
                pending.current = null;
                const keys = MOVES[p.act] ?? MOVES.slash;
                const span = moveSpan(keys);
                // 예비동작이 windup보다 길면 앞부분을 건너뛴다
                const start = span.from < 0 ? Math.max(span.from, -(p.windup ?? 0.3)) : span.from;
                cur.current = { keys, t: start, end: span.to, id: p.id };
            }
            if (!still) {
                time += dt;
                if (cur.current) {
                    cur.current.t += dt;
                    if (cur.current.t > cur.current.end) cur.current = null;
                }
            }
            let pose: Pose;
            if (cur.current) pose = samplePose(cur.current.keys, cur.current.t);
            else {
                // 숨쉬기 + 가끔 눈 깜빡임 (+ 걷는 중이면 다리 교차)
                const breathe = Math.floor(time * 2.2) % 2;
                const blink = time % 3.4 < 0.12;
                const step = walk.current ? (Math.floor(time * 10) % 2 ? 2 : -2) : 0;
                pose = { ...IDLE_POSE, by: breathe, legs: step, eyes: blink ? 'blink' : 'open' };
            }
            drawHero(pose, px, flip);
            ctx.putImageData(img, 0, 0);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [flip, clock]);

    return (
        <canvas ref={ref} className={`pixel-canvas hero-canvas ${className ?? ''}`} style={{ width: CHIBI_W * scale, height: CHIBI_H * scale }} />
    );
}

/** 층 배경 디오라마 캔버스: 컨테이너를 가득 채우고, 크기가 바뀌면 다시 그린다 */
export function SceneryView({ floor, ground = false, seed = 1, scale = 3 }: { floor: number; ground?: boolean; seed?: number; scale?: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const cv = ref.current;
        const box = cv?.parentElement;
        if (!cv || !box) return;
        const draw = () => {
            const s = box.clientWidth < 640 ? 2 : scale;
            const w = Math.max(1, Math.ceil(box.clientWidth / s));
            const h = Math.max(1, Math.ceil(box.clientHeight / s));
            if (cv.width === w && cv.height === h) return;
            cv.width = w;
            cv.height = h;
            cv.style.width = `${w * s}px`;
            cv.style.height = `${h * s}px`;
            paintScenery(cv.getContext('2d')!, w, h, floor, seed, ground);
        };
        draw();
        const ro = new ResizeObserver(draw);
        ro.observe(box);
        return () => ro.disconnect();
    }, [floor, ground, seed, scale]);
    return <canvas ref={ref} className="pixel-canvas scenery-canvas" aria-hidden />;
}
