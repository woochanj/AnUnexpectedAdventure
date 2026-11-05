import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import {
    actSpan, clearFrame, composite, createAct, createFrame, createFx, DUMMY_PAL, READY,
    type ActInstance, type Frame, type FxInstance, type FxModule,
} from 'pixelfx';
import type { HitStopClock } from './FxCanvas';
import { HERO_ACTS, IDLE_ACT } from './heroActs';
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
            ctx.putImageData(img, 0, 0);
            if (stop !== true) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

/**
 * pixelfx 이펙트 하나를 제자리에서 재생하는 캔버스 (적, 모닥불, 상자 등).
 * 캔버스 아래 가장자리가 이펙트의 발밑(origin)에 오도록 잘라 그린다.
 */
export function FxView({
    mod, opts, scale = 3, clock, className, style, below = 4, seed = 1, speed = 1, maxW,
}: {
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
        [mod, JSON.stringify(opts), seed],
    );
    useEffect(() => {
        fx.current = null;
    }, [mod, JSON.stringify(opts), seed]);
    return <canvas ref={ref} className={`pixel-canvas ${className ?? ''}`} style={{ width: w * scale, height: h * scale, ...style }} />;
}

// ───────────── 주인공: pixelfx 포즈 리그를 모험가 색으로 칠해 그린다 ─────────────

const u32 = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return ((0xff << 24) | ((n & 0xff) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
};
/** 회색 인형(DUMMY_PAL) → 모험가 색. 겉(A~D)은 청록 망토, 속(E~J)은 가죽, 표식(m)은 주황 스카프 */
const HERO_COLORS: Record<string, string> = {
    A: '#d8fff0', B: '#7fe0c4', C: '#3aa898', D: '#22707a',
    E: '#b0784a', F: '#8a5636', G: '#5e3a2a', J: '#43281f',
    m: '#ff8a3a', k: '#120c18',
};
const RECOLOR = new Map<number, number>(
    Object.entries(HERO_COLORS)
        .filter(([k]) => DUMMY_PAL[k])
        .map(([k, v]) => [u32(DUMMY_PAL[k]), u32(v)]),
);

export function recolorHero(frame: Frame) {
    const c = frame.color;
    for (let i = 0; i < c.length; i++) {
        const v = c[i];
        if (v) {
            const m = RECOLOR.get(v >>> 0);
            if (m !== undefined) c[i] = m;
        }
    }
}

/** 효과는 그리지 않고 몸 동작(act)만 쓰기 위한 껍데기 모듈 */
function bodyOnly(mod: FxModule): FxModule {
    return { meta: mod.meta, act: mod.act, create: () => ({ draw() {}, update() {} }) };
}

export interface HeroAction {
    id: number;
    /** heroActs.ts의 키 */
    act: string;
    /** 이펙트 접촉 시점(t=0)까지 남길 예비동작 시간 */
    windup?: number;
}

/** 이 화면 픽셀 크기 안에서 주인공 발 위치 */
const HERO_W = 84;
const HERO_H = 64;
const HERO_X = 34;
const HERO_Y = 60;

export function HeroView({
    action, scale = 3, clock, flip = false, className,
}: {
    action?: HeroAction | null;
    scale?: number;
    clock?: RefObject<HitStopClock>;
    flip?: boolean;
    className?: string;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    const cur = useRef<{ act: ActInstance; id: number } | null>(null);
    const idle = useRef<ActInstance | null>(null);
    const pending = useRef<HeroAction | null>(null);
    const x = flip ? HERO_W - HERO_X : HERO_X;

    useEffect(() => {
        if (action) pending.current = action;
    }, [action]);

    usePixelLoop(
        ref, HERO_W, HERO_H,
        (dt, frame) => {
            const p = pending.current;
            if (p && p.id !== cur.current?.id) {
                pending.current = null;
                const mod = HERO_ACTS[p.act] ?? HERO_ACTS.slash;
                const act = createAct(bodyOnly(mod), { x, y: HERO_Y, flip, seed: 3 });
                // 예비동작이 길면 잘라서, 접촉이 windup 초 뒤에 오도록 맞춘다
                const from = actSpan(mod).from;
                const skip = Math.max(0, -from - (p.windup ?? 0.3));
                if (skip > 0) act.update(skip);
                cur.current = { act, id: p.id };
            }
            const still = frozen(clock);
            if (cur.current) {
                if (!still) cur.current.act.update(dt);
                if (cur.current.act.done()) cur.current = null;
            }
            if (!idle.current) idle.current = createAct(bodyOnly(IDLE_ACT), { x, y: HERO_Y, flip, seed: 3 });
            const a = cur.current?.act ?? idle.current;
            if (!cur.current && !still) idle.current.update(dt);
            a.draw(frame, { target: false });
            recolorHero(frame);
        },
        [flip],
    );
    return (
        <canvas ref={ref} className={`pixel-canvas hero-canvas ${className ?? ''}`} style={{ width: HERO_W * scale, height: HERO_H * scale }} />
    );
}

export { READY };
