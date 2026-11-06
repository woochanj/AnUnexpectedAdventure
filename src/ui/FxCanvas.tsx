import { useEffect, useRef, type RefObject } from 'react';
import { clearFrame, composite, createFrame, createFx, type Frame, type FxInstance } from 'pixelfx';
import type { Cue, Fx } from '../game/types';
import * as damageNumber from 'pixelfx/fx/ui/damage-number';
import { critNumberHeavy as critNumber, critSlam } from './critFx';

/** 내가 준 피해: 금색, 독: 초록, 받은 피해: 기본(빨강) */
const GOLD = ['#1a0e02', '#4a2a06', '#8a5a0c', '#d8961a', '#ffc23a', '#ffe08a', '#fff4cc', '#ffffff'];
const CRIT_GOLD = ['#2a1402', '#5e2a06', '#a3500c', '#e0861a', '#ffb93b', '#ffe068', '#fff6b8', '#ffffff'];
const CRIT_RED = ['#1a0306', '#4a0a12', '#8a1424', '#d42a2e', '#ff5a4a', '#ff9a86', '#ffd8cc', '#ffffff'];
const POISON = ['#04140a', '#0a3a14', '#167a24', '#34b83a', '#7ae05a', '#b8ff8a', '#e8ffd0', '#ffffff'];
import { cueVfx, impactTier, type Ambient, type VfxSpec } from './vfx';

/**
 * 캐릭터에 거는 이펙트(치유·빙결·중독·감전…)에 넘길 '몸'.
 * pixelfx는 기본으로 대역 캐릭터를 그리므로, 지금 화면의 진짜 캐릭터 그림을 이펙트 도트 크기로 떠서 넘긴다.
 * (ox, oy)는 이펙트 원점(발밑)의 캔버스 좌표.
 */
function actorOf(body: Element | null, box: DOMRect, scale: number, ox: number, oy: number) {
    const src = body?.querySelector('canvas');
    if (!src || !src.width) return null;
    const r = src.getBoundingClientRect();
    const W = Math.max(1, Math.round(r.width / scale));
    const H = Math.max(1, Math.round(r.height / scale));
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = false;
    if (getComputedStyle(src).transform.startsWith('matrix(-1')) {
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
    }
    ctx.drawImage(src, 0, 0, W, H);
    const px = new Uint32Array(ctx.getImageData(0, 0, W, H).data.buffer);
    // 그려진 부분만
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
            if (px[y * W + x] >>> 24 > 127) {
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
            }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const data = new Uint8Array(w * h);
    const pixels = new Uint32Array(w * h);
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const c = px[(y + y0) * W + x + x0];
            if (c >>> 24 > 127) {
                data[y * w + x] = 1;
                pixels[y * w + x] = (c | 0xff000000) >>> 0;
            }
        }
    const ax = Math.round((r.left - box.left) / scale) + x0 - ox;
    const ay = Math.round((r.top - box.top) / scale) + y0 - oy;
    const cx = ax + Math.floor(w / 2);
    return { mask: { w, h, data }, pixels, x: ax, y: ay, w, h, k: 2, head: [cx, ay], chest: [cx, ay + Math.round(h * 0.3)] };
}

interface Live {
    fx: FxInstance;
    speed: number;
    stopAt: number;
    /** 이펙트가 대신 그리는 동안 숨길 진짜 캐릭터 */
    body?: HTMLElement;
    alphaOf?: (t: number, o: unknown) => number;
    /** 날아가는 투사체: (x0,y0)에서 (x1,y1)까지 ms 동안 */
    fly?: { x0: number; y0: number; x1: number; y1: number; ms: number; arc: number; t: number };
}

/** 투사체 비행 곡선: 살짝 뒤로 젖혔다가(발사 준비) 처음엔 느리게, 점점 빨라져 꽂힌다 */
function flyEase(u: number): number {
    if (u < 0.14) return -0.04 * Math.sin((u / 0.14) * Math.PI);
    const v = (u - 0.14) / 0.86;
    return Math.pow(v, 2.3);
}

/** 보이는 몸의 위치·크기(이펙트 도트 좌표). 그림판이 아니라 실제로 그려진 부분 기준 */
function bodyBoxOf(body: Element | null, box: DOMRect, scale: number) {
    const a = actorOf(body, box, scale, 0, 0);
    return a ? { cx: a.x + a.w / 2, top: a.y, bottom: a.y + a.h, h: a.h } : null;
}

/** 화면 픽셀 하나가 몇 CSS 픽셀인지. 스프라이트(32px × 3)와 같은 배율이라 이펙트와 캐릭터의 픽셀 크기가 맞는다 */
/** 전투 이펙트 재생 속도 배율 (1보다 작으면 느긋하게) */
const FX_TEMPO = 0.7;

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
    cues = NO_CUES, container, ambient, className, clock, numbers, pixel, numberKind, impacts, ambientScale, ambientSpeed, layer,
}: {
    /** 전투 이펙트 층: behind는 캐릭터 뒤(큰 폭발·충격파), front는 앞(칼날·불꽃 튐). 없으면 모두 */
    layer?: 'behind' | 'front';
    /** 분위기 효과의 도트 크기 배율 (작을수록 멀어 보인다) */
    ambientScale?: number;
    /** 분위기 효과 재생 속도 배율 (먼 층은 느리게) */
    ambientSpeed?: number;
    /** 피해량에 따라 커지는 타격 연출을 그릴 fx 목록 */
    impacts?: Fx[];
    /** 이 캔버스가 그릴 피해 숫자 종류 (없으면 둘 다) */
    numberKind?: 'normal' | 'crit';
    /** 도트 크기를 직접 정할 때 (피해 숫자는 더 크게) */
    pixel?: number;
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
        // rAF 시각이 시작 시각보다 앞설 수 있어 음수가 되지 않게 (음수면 이펙트가 없는 프레임을 읽다 멈춘다)
        const dt = frozen ? 0 : Math.max(0, Math.min(0.05, (now - prev) / 1000));
        clearFrame(st.frame);
        for (const a of ambientLive.current) {
            a.update(dt * (ambientSpeed ?? 1));
            a.draw(st.frame);
        }
        for (const l of live.current) {
            if (l.fly) {
                // 히트스톱 동안은 투사체도 멈춘다 (dt가 0)
                const f = l.fly;
                f.t += dt * 1000;
                const u = Math.min(1, f.t / f.ms);
                const e = flyEase(u);
                l.fx.options.x = Math.round(f.x0 + (f.x1 - f.x0) * e);
                l.fx.options.y = Math.round(f.y0 + (f.y1 - f.y0) * e - f.arc * Math.sin(Math.PI * Math.max(0, e)));
                if (u >= 1) l.fx.stop();
            }
            l.fx.update(dt * l.speed);
            if (l.fx.t >= l.stopAt) l.fx.stop();
            l.fx.draw(st.frame);
            // 이펙트가 몸을 대신 그리는 동안(분노로 흔들림, 중독으로 물듦 …) 진짜 캐릭터는 숨긴다
            if (l.body && l.alphaOf) l.body.style.visibility = l.fx.done() || l.alphaOf(l.fx.t, l.fx.options) >= 0.5 ? '' : 'hidden';
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
            // 좁은 화면(휴대폰)에서는 직접 정한 도트 크기도 절반으로 (숫자가 몬스터를 덮지 않게)
            const s = pixel ? (el.clientWidth < 640 ? Math.max(1, pixel / 2) : pixel) : pixelScale(el.clientWidth) * (ambientScale ?? 1);
            const w = Math.max(1, Math.ceil(el.clientWidth / s));
            const h = Math.max(1, Math.ceil(el.clientHeight / s));
            if (state.current && state.current.frame.w === w && state.current.frame.h === h) return;
            cv.width = w;
            cv.height = h;
            cv.style.width = `${w * s}px`;
            cv.style.height = `${h * s}px`;
            state.current = { frame: createFrame(w, h), img: new ImageData(w, h), scale: s };
            // 날씨 판(보통 180도트)이 화면보다 낮으면 그 위 끝에서 서서히 사라지게 (경계가 보이지 않게)
            const tileH = Math.max(0, ...(ambient ?? []).filter((a) => a.tile).map((a) => a.mod.meta.size[1]));
            cv.style.setProperty('--fade', `${Math.max(0, (1 - tileH / h) * 100)}%`);
            ambientLive.current = [];
            for (const a of ambient ?? []) {
                const xs = a.tile ? Array.from({ length: Math.ceil(w / a.tile) + 1 }, (_, i) => w / 2 + (i - Math.floor((Math.ceil(w / a.tile!) + 1) / 2)) * a.tile!) : [a.fx * w];
                xs.forEach((x, i) => {
                    const fx = createFx(a.mod, { ...a.opts, seed: ((a.opts?.seed as number) ?? 1) + i * 13 + (ambientScale ?? 1) * 100, x: Math.round(x), y: Math.round(a.fy * h) });
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
            if (numberKind === 'crit' && !f.crit) return;
            if (numberKind === 'normal' && f.crit) return;
            const run = () => {
                const st = state.current;
                const box = container.current?.getBoundingClientRect();
                const el = container.current?.querySelector<HTMLElement>(`[data-anchor="${f.target}"]`);
                if (!st || !box || !el) return;
                const r = el.getBoundingClientRect();
                // 같은 대상에 연달아 맞으면 옆으로 조금씩 흩어 놓는다
                const jitter = ((f.id * 37) % 5) * 6 - 12;
                const x = Math.round((r.left + r.width / 2 - box.left) / st.scale + jitter);
                // 치명타는 몸을 가리지 않게 머리 위, 공격자 쪽으로 비켜서
                const y = Math.max(46, Math.round((f.crit ? r.top + r.height * 0.02 : r.top + r.height * 0.2) - box.top) / st.scale);
                const xShift = f.crit ? (f.target === 'player' ? 40 : -40) / st.scale : 0;
                const toPlayer = f.target === 'player';
                const opts = f.crit
                    ? { text: `${f.amount}!`, palette: toPlayer ? CRIT_RED : CRIT_GOLD }
                    : { text: `-${f.amount}`, palette: f.dot ? POISON : toPlayer ? undefined : GOLD };
                const fx = createFx(f.crit ? critNumber : damageNumber, { seed: f.id, ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)), x: Math.round(x + xShift), y: Math.round(y) });
                live.current.push({ fx, speed: f.crit ? 0.8 : 0.75, stopAt: Infinity });
                kick();
            };
            const ms = f.delay * 1000 + i * 30;
            if (ms <= 0) run();
            else timers.current.push(window.setTimeout(run, ms));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numbers]);

    // ── 피해량 단계별 타격 연출 ──
    const seenHit = useRef(impacts?.length ? impacts[impacts.length - 1].id : 0);
    useEffect(() => {
        if (!impacts) return;
        const fresh = impacts.filter((f) => f.id > seenHit.current);
        if (!fresh.length) return;
        seenHit.current = fresh[fresh.length - 1].id;
        for (const f of fresh) {
            if (f.kind !== 'dmg' || f.dot || !f.amount) continue;
            const tier = impactTier(f.amount, f.target === 'player');
            // 치명타: 별 폭발 대신 굵은 베임 한 줄과 바닥 충격파
            if (f.crit) tier.push({ mod: critSlam, at: 'target', speed: 1, opts: { flip: f.target === 'player' } });
            for (const spec of tier) {
                if (layer && !!spec.behind !== (layer === 'behind')) continue;
                const run = () => spawn(spec, f.target);
                const ms = (f.delay + (spec.delay ?? 0)) * 1000;
                if (ms <= 0) run();
                else timers.current.push(window.setTimeout(run, ms));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [impacts]);

    const spawn = (spec: VfxSpec, anchor: string) => {
        const st = state.current;
        const box = container.current?.getBoundingClientRect();
        const el = container.current?.querySelector<HTMLElement>(`[data-anchor="${anchor}"]`);
        if (!st || !box || !el) return;
        const r = el.getBoundingClientRect();
        const body = container.current?.querySelector<HTMLElement>(`[data-body="${anchor}"]`) ?? undefined;
        let x = Math.round((r.left + r.width / 2 - box.left) / st.scale + (spec.dx ?? 0));
        let y = Math.round((r.bottom - box.top) / st.scale - 2 + (spec.dy ?? 0));
        // 타격 지점: 그림판 크기와 상관없이 실제로 보이는 몸의 그 높이에 (작은 슬라임·큰 보스 모두 몸에 맞게)
        const bb = spec.body !== undefined || spec.fly ? bodyBoxOf(body ?? null, box, st.scale) : null;
        if (bb && spec.body !== undefined) {
            x = Math.round(bb.cx + (spec.dx ?? 0));
            y = Math.round(bb.bottom - bb.h * spec.body + (spec.dy ?? 0));
        }
        let fly: Live['fly'];
        if (spec.fly) {
            // 시전자 손끝(몸 가운데 앞쪽)에서 대상 몸 가운데로
            const me = bodyBoxOf(container.current?.querySelector('[data-body="player"]') ?? null, box, st.scale);
            const x1 = bb ? bb.cx - 6 : x;
            const y1 = bb ? bb.bottom - bb.h * 0.45 : y - 20;
            const x0 = me ? me.cx + 14 : x1 - 200;
            const y0 = me ? me.bottom - me.h * 0.55 : y1;
            fly = { x0, y0, x1, y1, ms: spec.fly.ms, arc: spec.fly.arc ?? 0, t: 0 };
            x = x0;
            y = y0;
        }
        // 캐릭터에 거는 이펙트는 pixelfx 대역 캐릭터(다른 스킨) 대신 진짜 캐릭터 몸에 입힌다
        const actor = spec.mod.meta.actor ? actorOf(body ?? null, box, st.scale, x, y) : null;
        const fx = createFx(spec.mod, { seed: Math.floor(Math.random() * 1e6), ...(actor ? { actor } : {}), ...spec.opts, x, y });
        const alphaOf = actor ? spec.mod.actorAlpha : undefined;
        live.current.push({ fx, speed: (spec.speed ?? 1) * FX_TEMPO, stopAt: fly ? Infinity : spec.stopAfter ?? Infinity, ...(alphaOf && body ? { body, alphaOf } : {}), ...(fly ? { fly } : {}) });
        kick();
    };

    useEffect(() => {
        const fresh = cues.filter((c) => c.id > seen.current);
        if (!fresh.length) return;
        seen.current = fresh[fresh.length - 1].id;
        for (const cue of fresh) {
            for (const spec of cueVfx(cue)) {
                if (layer && !!spec.behind !== (layer === 'behind')) continue;
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
