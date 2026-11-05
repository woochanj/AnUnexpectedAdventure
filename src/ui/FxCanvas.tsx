import { useEffect, useRef, type RefObject } from 'react';
import { clearFrame, composite, createFrame, createFx, type Frame, type FxInstance } from 'pixelfx';
import type { Cue, Fx } from '../game/types';
import * as damageNumber from 'pixelfx/fx/ui/damage-number';
import * as critNumber from 'pixelfx/fx/ui/crit-number';

/** 내가 준 피해: 금색, 독: 초록, 받은 피해: 기본(빨강) */
const GOLD = ['#1a0e02', '#4a2a06', '#8a5a0c', '#d8961a', '#ffc23a', '#ffe08a', '#fff4cc', '#ffffff'];
const CRIT_GOLD = ['#2a1402', '#5e2a06', '#a3500c', '#e0861a', '#ffb93b', '#ffe068', '#fff6b8', '#ffffff'];
const POISON = ['#04140a', '#0a3a14', '#167a24', '#34b83a', '#7ae05a', '#b8ff8a', '#e8ffd0', '#ffffff'];
import { cueVfx, type Ambient, type VfxSpec } from './vfx';

interface Live {
    fx: FxInstance;
    speed: number;
    stopAt: number;
}

/** 화면 픽셀 하나가 몇 CSS 픽셀인지. 스프라이트(32px × 3)와 같은 배율이라 이펙트와 캐릭터의 픽셀 크기가 맞는다 */
export const pixelScale = (w: number) => (w < 640 ? 2 : 3);

const NO_CUES: Cue[] = [];

/** 히트스톱 구간 목록 [시작, 끝] (performance.now 기준 ms). 이 구간에는 이펙트 시간이 흐르지 않는다 */
export type HitStopClock = { windows: [number, number][] };

/**
 * pixelfx 이펙트를 그리는 캔버스.
 * - ambient: 층 분위기용 반복 이펙트 (횃불, 안개 등)
 * - cues: 전투 신호. 새 cue가 오면 data-anchor 요소(캐릭터 발밑) 위치에 이펙트를 띄운다.
 */
export function FxCanvas({
    cues = NO_CUES, container, ambient, className, clock, numbers,
}: {
    cues?: Cue[];
    /** 피해 숫자를 pixelfx로 띄울 fx 목록 */
    numbers?: Fx[];
    clock?: RefObject<HitStopClock>;
    container: RefObject<HTMLElement | null>;
    ambient?: Ambient[];
    className?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const live = useRef<Live[]>([]);
    const ambientLive = useRef<FxInstance[]>([]);
    const raf = useRef(0);
    const seen = useRef(cues.length ? cues[cues.length - 1].id : 0);
    const timers = useRef<number[]>([]);
    const state = useRef<{ frame: Frame; img: ImageData; scale: number } | null>(null);

    const tick = (prev: number) => (now: number) => {
        const st = state.current;
        const ctx = canvasRef.current?.getContext('2d');
        if (!st || !ctx) {
            raf.current = 0;
            return;
        }
        const cl = clock?.current;
        if (cl) cl.windows = cl.windows.filter(([, b]) => b > now - 1000);
        const frozen = !!cl?.windows.some(([a, b]) => now >= a && now < b);
        const dt = frozen ? 0 : Math.min(0.05, (now - prev) / 1000);
        clearFrame(st.frame);
        for (const a of ambientLive.current) {
            a.update(dt);
            a.draw(st.frame);
        }
        for (const l of live.current) {
            l.fx.update(dt * l.speed);
            if (l.fx.t >= l.stopAt) l.fx.stop();
            l.fx.draw(st.frame);
        }
        live.current = live.current.filter((l) => !l.fx.done());
        composite(st.frame, st.img.data, null);
        ctx.putImageData(st.img, 0, 0);
        raf.current = live.current.length || ambientLive.current.length ? requestAnimationFrame(tick(now)) : 0;
    };
    const kick = () => {
        if (!raf.current) raf.current = requestAnimationFrame(tick(performance.now()));
    };

    // 캔버스 크기를 컨테이너에 맞추고 앰비언트를 배치한다
    useEffect(() => {
        const el = container.current;
        const cv = canvasRef.current;
        if (!el || !cv) return;
        const fit = () => {
            const s = pixelScale(el.clientWidth);
            const w = Math.max(1, Math.ceil(el.clientWidth / s));
            const h = Math.max(1, Math.ceil(el.clientHeight / s));
            if (state.current && state.current.frame.w === w && state.current.frame.h === h) return;
            cv.width = w;
            cv.height = h;
            cv.style.width = `${w * s}px`;
            cv.style.height = `${h * s}px`;
            state.current = { frame: createFrame(w, h), img: new ImageData(w, h), scale: s };
            ambientLive.current = [];
            for (const a of ambient ?? []) {
                const xs = a.tile ? Array.from({ length: Math.ceil(w / a.tile) + 1 }, (_, i) => w / 2 + (i - Math.floor((Math.ceil(w / a.tile!) + 1) / 2)) * a.tile!) : [a.fx * w];
                xs.forEach((x, i) => {
                    const fx = createFx(a.mod, { ...a.opts, seed: ((a.opts?.seed as number) ?? 1) + i * 13, x: Math.round(x), y: Math.round(a.fy * h) });
                    // 시작 시점을 흩어 놓아 모든 횃불이 똑같이 타지 않게
                    fx.update(Math.random() * 3);
                    ambientLive.current.push(fx);
                });
            }
            kick();
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => {
            ro.disconnect();
            cancelAnimationFrame(raf.current);
            raf.current = 0;
            state.current = null;
            ambientLive.current = [];
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [container, ambient]);

    useEffect(
        () => () => {
            cancelAnimationFrame(raf.current);
            raf.current = 0;
            timers.current.forEach(clearTimeout);
        },
        [],
    );

    // ── 피해 숫자 ──
    const seenNum = useRef(numbers?.length ? numbers[numbers.length - 1].id : 0);
    useEffect(() => {
        if (!numbers) return;
        const fresh = numbers.filter((f) => f.id > seenNum.current);
        if (!fresh.length) return;
        seenNum.current = fresh[fresh.length - 1].id;
        fresh.forEach((f, i) => {
            if (f.kind !== 'dmg' || !f.amount) return;
            const run = () => {
                const st = state.current;
                const box = container.current?.getBoundingClientRect();
                const el = container.current?.querySelector<HTMLElement>(`[data-anchor="${f.target}"]`);
                if (!st || !box || !el) return;
                const r = el.getBoundingClientRect();
                // 같은 대상에 연달아 맞으면 옆으로 조금씩 흩어 놓는다
                const jitter = ((f.id * 37) % 5) * 6 - 12;
                const x = Math.round((r.left + r.width / 2 - box.left) / st.scale + jitter);
                const y = Math.round((r.top + r.height * 0.45 - box.top) / st.scale);
                const toPlayer = f.target === 'player';
                const opts = f.crit
                    ? { text: `${f.amount}!`, label: 'CRIT', palette: toPlayer ? undefined : CRIT_GOLD }
                    : { text: `-${f.amount}`, palette: f.dot ? POISON : toPlayer ? undefined : GOLD };
                const fx = createFx(f.crit ? critNumber : damageNumber, { seed: f.id, ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)), x, y });
                live.current.push({ fx, speed: f.crit ? 1.15 : 1.25, stopAt: Infinity });
                kick();
            };
            const ms = f.delay * 1000 + i * 30;
            if (ms <= 0) run();
            else timers.current.push(window.setTimeout(run, ms));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numbers]);

    const spawn = (spec: VfxSpec, anchor: string) => {
        const st = state.current;
        const box = container.current?.getBoundingClientRect();
        const el = container.current?.querySelector<HTMLElement>(`[data-anchor="${anchor}"]`);
        if (!st || !box || !el) return;
        const r = el.getBoundingClientRect();
        const x = Math.round((r.left + r.width / 2 - box.left) / st.scale + (spec.dx ?? 0));
        const y = Math.round((r.bottom - box.top) / st.scale - 2 + (spec.dy ?? 0));
        const fx = createFx(spec.mod, { seed: Math.floor(Math.random() * 1e6), ...spec.opts, x, y });
        live.current.push({ fx, speed: spec.speed ?? 1, stopAt: spec.stopAfter ?? Infinity });
        kick();
    };

    useEffect(() => {
        const fresh = cues.filter((c) => c.id > seen.current);
        if (!fresh.length) return;
        seen.current = fresh[fresh.length - 1].id;
        for (const cue of fresh) {
            for (const spec of cueVfx(cue)) {
                const run = () => {
                    let anchors: string[];
                    if (spec.at === 'self') anchors = ['player'];
                    else if (spec.at === 'all')
                        anchors = Array.from(container.current?.querySelectorAll<HTMLElement>('[data-alive="1"] [data-anchor]') ?? []).map(
                            (e) => e.dataset.anchor!,
                        );
                    else anchors = cue.target ? [cue.target] : [];
                    anchors.forEach((a) => spawn(spec, a));
                };
                const ms = ((cue.delay ?? 0) + (spec.delay ?? 0)) * 1000;
                if (ms <= 0) run();
                else timers.current.push(window.setTimeout(run, ms));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cues]);

    return <canvas ref={canvasRef} className={`fx-canvas ${className ?? ''}`} aria-hidden />;
}
