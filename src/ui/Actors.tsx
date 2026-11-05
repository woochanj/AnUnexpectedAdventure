import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { clearFrame, composite, createFrame, createFx, type Frame, type FxInstance, type FxModule } from 'pixelfx';
import type { HitStopClock } from './FxCanvas';
import { drawHeroKnight } from './heroknight';
import { IDLE_POSE, KNIGHT_H, KNIGHT_W, MOVES, moveSpan, samplePose, type Key, type Pose } from './knight';
import { paintScenery } from './scenery';
import { ATTACK_LEAD, attackCurve, drawMonster, type MonsterLook } from './monsters';
import { animFps, hasAnim, hitFrame, SpriteActor, spriteInfo, type SpritePlay, type SpriteStep } from './SpriteActor';
import { PX } from './pixelkit';
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

// ───────────── 주인공: 꼬마 기사 (치비, 하이비트 도트) ─────────────

export interface HeroAction {
    id: number;
    /** 원거리 공격이면 제자리에서 쓴다 */
    ranged?: boolean;
    /** knight.ts MOVES의 키 */
    act: string;
    /** 공격이 닿는 순간(t=0)까지 남길 예비동작 시간 */
    windup?: number;
}

/** 고를 수 있는 주인공 */
export const HEROES: { id: string; name: string; desc: string }[] = [
    { id: 'hero-knight', name: '방랑 기사', desc: '묵직한 두 손 검' },
    { id: 'fantasy-knight-1', name: '붉은 기사', desc: '날렵한 연속 베기' },
    { id: 'fantasy-knight-2', name: '푸른 기사', desc: '붉은 기사의 다른 갑옷' },
    { id: 'cat-knight', name: '고양이 기사', desc: '작지만 용감하다' },
    { id: 'wizard', name: '마법사', desc: '지팡이와 주문' },
    { id: 'martial-hero', name: '날랜 검객', desc: '바람처럼 빠른 칼' },
    { id: 'adventurer', name: '모험가', desc: '검 한 자루로 떠난 여행자' },
    { id: 'adventurer-fist', name: '맨손 모험가', desc: '주먹과 발차기' },
    { id: 'adventurer-bow', name: '활 모험가', desc: '모든 공격을 활로 쏜다' },
    { id: 'water-priestess', name: '물의 사제', desc: '물결을 다루는 주문' },
    { id: 'wind-hashashin', name: '바람 암살자', desc: '바람처럼 베고 사라진다' },
    { id: 'ground-monk', name: '대지 수도승', desc: '대지를 울리는 주먹' },
    { id: 'leaf-ranger', name: '나뭇잎 궁수', desc: '빛나는 화살을 쏜다' },
];

/** 모습별 동작 설정 */
const LOOK: Record<string, { caster?: boolean; ranged?: boolean; cast?: string; block?: string; power?: string; shoot?: string }> = {
    'leaf-ranger': { ranged: true, shoot: 'special', block: 'defend', power: 'airAttack' },
    wizard: { caster: true, cast: 'attack2' },
    'water-priestess': { caster: true, cast: 'special', block: 'defend', power: 'special' },
    adventurer: { cast: 'cast', power: 'cast' },
    'adventurer-bow': { ranged: true },
    'wind-hashashin': { block: 'defend', power: 'special' },
    'ground-monk': { block: 'defend', power: 'special' },
};
/** 이 모습은 모든 공격을 제자리에서 쓴다 (활 등) */
export const lookIsRanged = (id: string) => !!LOOK[id]?.ranged || !!LOOK[id]?.caster;

const ATTACK_ACTS = new Set(['slash', 'double', 'dagger', 'cleave', 'smash', 'reap', 'thrust', 'spin']);

/** 카드 동작 → 스프라이트 재생 단계 */
function heroSteps(char: string, a: HeroAction): SpriteStep[] {
    const fk = char.startsWith('fantasy-knight');
    const cfg = LOOK[char] ?? {};
    const caster = !!cfg.caster;
    const multi0 = a.act === 'double' || a.act === 'dagger' || a.act === 'spin';
    if (ATTACK_ACTS.has(a.act) && (a.ranged || caster || cfg.ranged)) {
        // 제자리에서 휘둘러 주문/투척/활 — 무기가 닿는 프레임을 피해 순간에 맞춘다
        const anim = cfg.shoot ?? (multi0 && hasAnim(char, 'combo') && !cfg.ranged ? 'combo' : (a.act === 'cleave' || a.act === 'smash') && hasAnim(char, 'attack2') && !cfg.ranged ? 'attack2' : 'attack');
        const hitMs = ((a.windup ?? 0.3) + 0.08) * 1000;
        const lead = (hitFrame(char, anim) / animFps(anim)) * 1000;
        return [{ anim: 'idle', ms: Math.max(0, hitMs - lead) }, { anim }];
    }
    if ((a.act === 'cast' || a.act === 'heal' || a.act === 'charge') && cfg.cast && hasAnim(char, cfg.cast)) return [{ anim: cfg.cast }];
    if (a.act === 'rage' && cfg.power && hasAnim(char, cfg.power)) return [{ anim: cfg.power }];
    if (a.act === 'block' && cfg.block && hasAnim(char, cfg.block)) return [{ anim: cfg.block }];
    if (ATTACK_ACTS.has(a.act)) {
        const heavy = a.act === 'cleave' || a.act === 'smash' || a.act === 'reap';
        const multi = a.act === 'double' || a.act === 'dagger' || a.act === 'spin';
        const hasCombo = hasAnim(char, 'combo');
        const first = multi && hasCombo ? 'combo' : heavy && hasAnim(char, 'attack2') ? 'attack2' : 'attack';
        const second = !hasCombo && multi && hasAnim(char, 'attack2') ? 'attack2' : null;
        void fk;
        // 무기가 닿는 프레임이 피해 순간(예비동작 + 접촉)에 오도록 달리기 시간을 맞춘다
        const hitMs = ((a.windup ?? 0.3) + 0.08) * 1000;
        const lead = (hitFrame(char, first) / animFps(first)) * 1000;
        const steps: SpriteStep[] = [{ anim: 'run', ms: Math.max(0, hitMs - lead) }, { anim: first }];
        if (second) steps.push({ anim: second });
        steps.push({ anim: 'run', ms: 240, turn: true });
        return steps;
    }
    if (a.act === 'hurt') return [{ anim: 'hurt', ms: 260, fps: hasAnim(char, 'hurt') && spriteInfo(char).anims.hurt.frames > 1 ? 16 : 1 }];
    if (a.act === 'rage' || a.act === 'charge') return [{ anim: 'jump' }, { anim: 'fall', ms: 220 }];
    if (a.act === 'death') return [{ anim: 'death', hold: true }];
    return [];
}

export function HeroView(props: {
    char?: string;
    action?: HeroAction | null;
    scale?: number;
    clock?: RefObject<HitStopClock>;
    flip?: boolean;
    walking?: boolean;
    dead?: boolean;
    className?: string;
}) {
    const { char = 'hero-knight', action, clock, flip = false, walking = false, dead, className } = props;
    if (char === 'cat-knight') return <CatKnightView {...props} />;
    const play: SpritePlay | null = dead
        ? { id: -999, steps: [{ anim: 'death', hold: true }] }
        : action
          ? { id: action.id, steps: heroSteps(char, action) }
          : null;
    // 받은 스프라이트는 캐릭터 크기가 제각각이라 화면 배율을 따로 맞춘다
    const k = HERO_SCALE[char] ?? 1;
    return (
        <SpriteActor
            name={char}
            scale={(props.scale ?? 3) * k}
            flip={flip}
            play={play}
            clock={clock}
            idle={walking ? 'run' : 'idle'}
            className={`hero-canvas ${className ?? ''}`}
        />
    );
}

/** 고양이 기사(64px 캔버스)를 기준으로 한 상대 배율 */
const HERO_SCALE: Record<string, number> = {
    'hero-knight': 0.62, 'fantasy-knight-1': 0.8, 'fantasy-knight-2': 0.8, wizard: 0.5, 'martial-hero': 0.62,
    adventurer: 1.05, 'adventurer-fist': 1.05, 'adventurer-bow': 1.05,
    'water-priestess': 0.85, 'wind-hashashin': 0.8, 'ground-monk': 0.85, 'leaf-ranger': 0.85,
};

function CatKnightView({
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
        cv.width = KNIGHT_W;
        cv.height = KNIGHT_H;
        const ctx = cv.getContext('2d')!;
        const img = new ImageData(KNIGHT_W, KNIGHT_H);
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
                // 숨쉬기 + 망토 펄럭임 + 가끔 투구 안 눈빛 (+ 걷는 중이면 다리 교차)
                const breathe = Math.floor(time * 1.6) % 2;
                const glint = time % 4.2 < 0.25;
                const step = walk.current ? (Math.floor(time * 10) % 2 ? 3 : -3) : 0;
                const cape = Math.round(Math.sin(time * 2.1) * 1.5);
                pose = { ...IDLE_POSE, by: breathe, legs: step, cape, visor: glint ? 'glow' : 'dim' };
            }
            drawHeroKnight(pose, px, flip);
            ctx.putImageData(img, 0, 0);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [flip, clock]);

    return (
        <canvas ref={ref} className={`pixel-canvas hero-canvas ${className ?? ''}`} style={{ width: KNIGHT_W * scale, height: KNIGHT_H * scale }} />
    );
}

/** 층 배경 디오라마 캔버스: 컨테이너를 가득 채우고, 크기가 바뀌면 다시 그린다 */
export function SceneryView({ biome, ground = false, seed = 1, scale = 3 }: { biome: string; ground?: boolean; seed?: number; scale?: number }) {
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
            paintScenery(cv.getContext('2d')!, w, h, biome, seed, ground);
        };
        draw();
        const ro = new ResizeObserver(draw);
        ro.observe(box);
        return () => ro.disconnect();
    }, [biome, ground, seed, scale]);
    return <canvas ref={ref} className="pixel-canvas scenery-canvas" aria-hidden />;
}

// ───────────── 적: 다크 판타지 몬스터 ─────────────

export interface MonsterAttack {
    id: number;
    /** 이 공격이 닿기까지 남은 시간(초) */
    hitIn: number;
}

/** 투사체가 날아가는 시간(ms) */
export const PROJECTILE_MS = 320;

/** 받은 스프라이트로 그린 적: 공격(달려가기 또는 던지기) / 피격 / 사망 */
function SpriteMonster({
    look, scale, clock, attack, hurt, dead,
}: {
    look: MonsterLook;
    scale: number;
    clock?: RefObject<HitStopClock>;
    attack?: MonsterAttack | null;
    hurt?: { id: number; delay: number } | null;
    dead?: boolean;
}) {
    const name = look.sprite ?? 'slime';
    let play: SpritePlay | null = null;
    if (dead) play = { id: -999, steps: hasAnim(name, 'death') ? [{ anim: 'death', hold: true }] : [] };
    else {
        const cands: SpritePlay[] = [];
        if (attack) {
            const anim = look.ranged && hasAnim(name, 'attack3') ? 'attack3' : 'attack';
            if (hasAnim(name, anim)) {
                const hitMs = attack.hitIn * 1000 - (look.ranged ? PROJECTILE_MS : 0);
                const lead = (hitFrame(name, anim) / animFps(anim)) * 1000;
                const start = hitMs - lead;
                const steps: SpriteStep[] = [];
                // 근접이면 공격 직전까지 달려간다 (달려가기 자체는 화면 쪽에서 위치를 옮김)
                if (!look.ranged && hasAnim(name, 'run')) steps.push({ anim: 'run', ms: 240 });
                steps.push({ anim });
                if (!look.ranged && hasAnim(name, 'run')) steps.push({ anim: 'run', ms: 240, turn: true });
                const delay = Math.max(0, start - (!look.ranged && hasAnim(name, 'run') ? 240 : 0));
                cands.push({ id: attack.id, steps, delay });
            }
        }
        if (hurt && hasAnim(name, 'hurt')) cands.push({ id: 1e6 + hurt.id, steps: [{ anim: 'hurt' }], delay: hurt.delay * 1000 });
        // 가장 최근 신호를 재생
        play = cands.sort((x, y) => (y.id % 1e6) - (x.id % 1e6))[0] ?? null;
    }
    return <SpriteActor name={name} scale={scale} flip play={play} clock={clock} style={look.filter ? { filter: look.filter } : undefined} />;
}

export function MonsterView({
    look, scale = 3, clock, seed = 1, attack, hurt, dead,
}: {
    look: MonsterLook;
    scale?: number;
    clock?: RefObject<HitStopClock>;
    seed?: number;
    attack?: MonsterAttack | null;
    hurt?: { id: number; delay: number } | null;
    dead?: boolean;
}) {
    if (look.kind === 'sprite') return <SpriteMonster look={look} scale={scale} clock={clock} attack={attack} hurt={hurt} dead={dead} />;
    return <DrawnMonster look={look} scale={scale} clock={clock} seed={seed} attack={attack} />;
}

function DrawnMonster({
    look, scale = 3, clock, seed = 1, attack,
}: {
    look: MonsterLook;
    scale?: number;
    clock?: RefObject<HitStopClock>;
    seed?: number;
    attack?: MonsterAttack | null;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    const startAt = useRef(-1);
    const lastId = useRef(attack?.id ?? -1);

    useEffect(() => {
        if (!attack || attack.id === lastId.current) return;
        lastId.current = attack.id;
        // 덮치는 순간이 공격이 닿는 순간과 맞도록 미리 시작
        startAt.current = performance.now() + (attack.hitIn - ATTACK_LEAD) * 1000;
    }, [attack]);

    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        cv.width = PX;
        cv.height = PX;
        const ctx = cv.getContext('2d')!;
        const img = new ImageData(PX, PX);
        const px = new Uint32Array(img.data.buffer);
        let raf = 0;
        let prev = performance.now();
        let time = seed * 1.37;
        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - prev) / 1000);
            prev = now;
            if (!frozen(clock)) time += dt;
            const a = startAt.current > 0 ? attackCurve((now - startAt.current) / 1000) : 0;
            px.fill(0);
            drawMonster(look, time, a, px, true);
            ctx.putImageData(img, 0, 0);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [look, seed, clock]);

    return <canvas ref={ref} className="pixel-canvas monster-canvas" style={{ width: PX * scale, height: PX * scale }} />;
}

const stills = new Map<string, string>();
/** 지도 아이콘용: 몬스터 정지 이미지 (그려진 부분만 잘라서) */
export function monsterStill(key: string, look: MonsterLook): string {
    const hit = stills.get(key);
    if (hit) return hit;
    const px = new Uint32Array(PX * PX);
    drawMonster(look, 0.4, 0, px, true);
    let x0 = PX, y0 = PX, x1 = 0, y1 = 0;
    for (let y = 0; y < PX; y++)
        for (let x = 0; x < PX; x++)
            if (px[y * PX + x]) {
                x0 = Math.min(x0, x);
                y0 = Math.min(y0, y);
                x1 = Math.max(x1, x);
                y1 = Math.max(y1, y);
            }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const img = new ImageData(w, h);
    const out = new Uint32Array(img.data.buffer);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = px[(y + y0) * PX + x + x0];
    cv.getContext('2d')!.putImageData(img, 0, 0);
    const url = cv.toDataURL();
    stills.set(key, url);
    return url;
}
