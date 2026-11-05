// 스프라이트 시트(받은 픽셀 에셋) 재생기.
// 동작을 단계(step) 목록으로 받아 차례대로 재생하고, 다 끝나면 대기 동작을 반복한다.
// 히트스톱 중에는 시간이 흐르지 않는다.
import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import type { HitStopClock } from './FxCanvas';
import { SPRITES } from './spriteManifest';

export type SpriteName = keyof typeof SPRITES;

type AnimInfo = { frames: number; hit?: number };
export const spriteInfo = (name: string) => SPRITES[name as SpriteName] as unknown as { w: number; h: number; bodyX: number; anims: Record<string, AnimInfo> };

/** 자동 계산이 맞지 않는 타격 프레임 보정 */
const HIT_OVERRIDE: Record<string, Record<string, number>> = {
    'flying-eye': { attack: 5 },
    // 마법사는 지팡이를 내지르는 순간 주문이 나간다
    wizard: { attack: 4, attack2: 4 },
    // 긴 콤보는 첫 타격 프레임에 맞춘다
    adventurer: { combo: 2 },
    'wind-hashashin': { attack: 3, combo: 4 },
    'ground-monk': { combo: 4, special: 9 },
    'water-priestess': { combo: 5, attack2: 6 },
};

export const hasAnim = (name: string, anim: string) => !!spriteInfo(name)?.anims[anim];

/** 이 동작에서 무기가 닿는 프레임 */
export function hitFrame(name: string, anim: string): number {
    return HIT_OVERRIDE[name]?.[anim] ?? spriteInfo(name)?.anims[anim]?.hit ?? 0;
}

/** 동작별 기본 재생 속도(fps) */
export function animFps(anim: string): number {
    if (anim === 'combo' || anim === 'special') return 22;
    if (anim === 'idle') return 9;
    if (anim === 'run') return 14;
    if (anim === 'death') return 11;
    if (anim === 'hurt') return 12;
    return 16;
}

const images = new Map<string, HTMLImageElement>();
export function spriteImage(name: string, anim: string): HTMLImageElement {
    const key = `${name}/${anim}`;
    let im = images.get(key);
    if (!im) {
        im = new Image();
        im.src = `${import.meta.env.BASE_URL}sprites/${key}.png`;
        images.set(key, im);
    }
    return im;
}

export interface SpriteStep {
    anim: string;
    /** 반복 재생할 시간(ms). 없으면 한 번만 재생 */
    ms?: number;
    fps?: number;
    /** 이 단계 동안 좌우를 뒤집음 (되돌아 달리기) */
    turn?: boolean;
    /** 마지막 프레임에서 멈춘 채 유지 (사망) */
    hold?: boolean;
}

export interface SpritePlay {
    id: number;
    steps: SpriteStep[];
    /** 시작까지 기다릴 시간(ms) */
    delay?: number;
}

const frozenNow = (clock?: RefObject<HitStopClock>) => {
    const now = performance.now();
    return !!clock?.current?.windows.some(([a, b]) => now >= a && now < b);
};

export function SpriteActor({
    name, scale = 3, flip = false, play, clock, idle = 'idle', className, style,
}: {
    name: string;
    scale?: number;
    /** 기본 방향 반전 (적은 왼쪽을 보도록 true) */
    flip?: boolean;
    play?: SpritePlay | null;
    clock?: RefObject<HitStopClock>;
    /** 대기 대신 반복할 동작 (지도에서 걸을 때 run 등) */
    idle?: string;
    className?: string;
    style?: CSSProperties;
}) {
    const info = spriteInfo(name);
    const ref = useRef<HTMLCanvasElement>(null);
    const queue = useRef<{ steps: SpriteStep[]; startAt: number } | null>(null);
    const lastId = useRef<number>(-1);
    const idleRef = useRef(idle);
    idleRef.current = idle;
    const flipRef = useRef(flip);
    flipRef.current = flip;
    const vt = useRef(0); // 히트스톱을 뺀 가상 시간(ms)

    useEffect(() => {
        if (!play || play.id === lastId.current) return;
        lastId.current = play.id;
        queue.current = { steps: play.steps, startAt: vt.current + (play.delay ?? 0) };
    }, [play]);

    useEffect(() => {
        const cv = ref.current;
        if (!cv || !info) return;
        cv.width = info.w;
        cv.height = info.h;
        const ctx = cv.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        let raf = 0;
        let prev = performance.now();
        const idleStart = Math.random() * 1000;
        const tick = (now: number) => {
            const dt = now - prev;
            prev = now;
            if (!frozenNow(clock)) vt.current += Math.min(dt, 80);
            const t = vt.current;

            let anim = idleRef.current;
            let frame = 0;
            let turn = false;
            const q = queue.current;
            let playing = false;
            if (q && t >= q.startAt) {
                let s = q.startAt;
                for (let i = 0; i < q.steps.length; i++) {
                    const st = q.steps[i];
                    const fps = st.fps ?? animFps(st.anim);
                    const n = info.anims[st.anim]?.frames ?? 1;
                    const len = st.ms ?? (n / fps) * 1000;
                    if (t < s + len || (st.hold && i === q.steps.length - 1)) {
                        const local = t - s;
                        frame = st.ms !== undefined ? Math.floor((local / 1000) * fps) % n : Math.min(n - 1, Math.floor((local / 1000) * fps));
                        anim = st.anim;
                        turn = !!st.turn;
                        playing = true;
                        break;
                    }
                    s += len;
                }
                if (!playing) queue.current = null;
            }
            if (!playing) {
                const n = info.anims[anim]?.frames ?? 1;
                frame = Math.floor(((t + idleStart) / 1000) * animFps(anim)) % n;
            }
            if (!info.anims[anim]) anim = 'idle';
            const im = spriteImage(name, anim);
            ctx.clearRect(0, 0, info.w, info.h);
            if (im.complete && im.naturalWidth) ctx.drawImage(im, frame * info.w, 0, info.w, info.h, 0, 0, info.w, info.h);
            cv.style.transform = flipRef.current !== turn ? 'scaleX(-1)' : '';
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [name, info, clock]);

    if (!info) return null;
    return (
        <canvas
            ref={ref}
            className={`pixel-canvas sprite-actor ${className ?? ''}`}
            style={{ width: info.w * scale, height: info.h * scale, ...style }}
            data-sprite={name}
        />
    );
}

/** 지도 아이콘용 정지 이미지 URL (대기 첫 프레임만 보이게 CSS로 자른다) */
export function spriteStillStyle(name: string, size: number): CSSProperties {
    const info = spriteInfo(name);
    if (!info) return {};
    const k = size / Math.max(info.w, info.h);
    return {
        width: info.w * k,
        height: info.h * k,
        backgroundImage: `url("${import.meta.env.BASE_URL}sprites/${name}/idle.png")`,
        backgroundSize: `${info.anims.idle.frames * info.w * k}px ${info.h * k}px`,
        backgroundPosition: '0 0',
        imageRendering: 'pixelated',
    };
}
