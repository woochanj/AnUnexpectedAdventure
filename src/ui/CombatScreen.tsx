import { useCallback, useEffect, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { cardStats, needsTarget, STATUS_INFO } from '../game/cards';
import { AFFIXES, ATTACK_WINDUP, CHARGE_TIME, FREEZE_AT, windupOf, canPlay, ENEMY_STEP, IMPACT_DELAY, intentDamage } from '../game/combat';
import { CARDS } from '../game/cards';
import { ENEMIES } from '../game/enemies';
import type { Action } from '../game/run';
import type { CardInst, CombatState, EnemyState, Fx, Intent } from '../game/types';
import { CardGrid, CardView, HpBar, Modal, StatusList } from './common';
import { HeroView, lookIsRanged, MonsterView, PROJECTILE_MS, SceneryView, type HeroAction, type MonsterAttack } from './Actors';
import { PROJECTILES } from './spriteManifest';
import { CARD_ACT } from './heroActs';
import { FxCanvas, type HitStopClock } from './FxCanvas';
import { sfx } from './sfx';
import { DragArrow } from './DragArrow';
import { CARD_MOVE, playHeroMotion } from './heroMoves';
import { spawnAfterimages } from './afterimage';
import { pickAttack, pickDeath, playAttack, playDeath } from './monsterMoves';
import { hasAnim } from './SpriteActor';
import { ChargeFx } from './ChargeFx';
import { cardElement } from './cardElement';
import { AMBIENT } from './vfx';

function FxLayer({ fx, target }: { fx: Fx[]; target: string }) {
    // 피해 숫자는 pixelfx 캔버스가 그린다. 여기서는 방어·회복·상태이상 글자만
    const mine = fx.filter((f) => f.target === target && !(f.kind === 'dmg' && f.amount));
    return (
        <div className="fx-layer">
            {mine.map((f, i) => (
                <span
                    key={f.id}
                    className={`fx fx-${f.kind} ${f.kind === 'dmg' && dmgOf(f) >= 12 ? 'fx-big' : ''}`}
                    style={{
                        animationDelay: `${f.delay + (f.kind === 'dmg' ? 0 : (i % 4) * 0.08)}s`,
                        ['--dx' as string]: `${((f.id * 37) % 48) - 24}px`,
                        ['--sz' as string]: f.kind === 'dmg' ? `${Math.min(2.8, 1.4 + dmgOf(f) / 18)}rem` : undefined,
                    }}
                >
                    {f.text}
                </span>
            ))}
        </div>
    );
}

const dmgOf = (f: Fx) => Number(f.text.match(/(\d+)$/)?.[1] ?? 0);

/** 해당 대상이 마지막으로 맞은 fx id. 바뀌면 흔들림 애니메이션을 다시 재생 */
const lastHit = (fx: Fx[], target: string) => {
    for (let i = fx.length - 1; i >= 0; i--) if (fx[i].target === target && fx[i].kind === 'dmg') return fx[i];
    return null;
};

function Shake({ fx, target, children }: { fx: Fx[]; target: string; children: ReactNode }) {
    const h = lastHit(fx, target);
    return (
        <div
            key={h?.id ?? 0}
            className={`fighter-sprite ${h ? 'hit-shake' : ''}`}
            style={{ animationDelay: `${h?.delay ?? 0}s`, ['--kb' as string]: target === 'player' ? '-12px' : '12px' }}
            data-anchor={target}
        >
            {children}
        </div>
    );
}

interface Drag {
    idx: number;
    card: string;
    /** 대상을 골라야 하는 카드인지 */
    target: boolean;
    x0: number;
    y0: number;
    x: number;
    y: number;
    /** 화살표 시작점 (카드 위쪽 가운데) */
    sx: number;
    sy: number;
    moved: boolean;
    /** 지금 겨누고 있는 적 */
    aim: string | null;
    /** 대상 없는 카드: 놓으면 사용되는 위치인지 */
    release: boolean;
}

/** 강한 기술을 쓰기 직전: 화면이 살짝 어두워지고 기 모으는 소리 */
function chargeMoment(field: HTMLElement, el: string) {
    const v = document.createElement('div');
    v.className = 'charge-dim';
    field.appendChild(v);
    const a = v.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: CHARGE_TIME * 1000 + 350, fill: 'both' });
    a.finished.then(() => v.remove()).catch(() => v.remove());
    sfx.chargeUp(el);
}

/** 지금 내면 연계 효과가 붙는 카드 */
function comboReady(card: CardInst, c: CombatState): boolean {
    const eff = cardStats(card).effects;
    return eff.some((e) => (e.kind === 'after' && e.type === c.lastType) || ((e.kind === 'combo' || e.kind === 'finisher') && (c.played ?? 0) > 0));
}

function IntentBadge({ e, c }: { e: EnemyState; c: CombatState }) {
    const it: Intent = e.intent;
    const parts: { cls: string; text: string; tip: string }[] = [];
    const d = intentDamage(e, c.player);
    if ((e.status.frost ?? 0) >= FREEZE_AT) {
        return (
            <div className="intent" title="얼어붙어 이번 행동을 쉰다">
                <span className="intent-part intent-defend">빙결</span>
            </div>
        );
    }
    if (d !== null) parts.push({ cls: 'attack', text: `${d}${it.hits && it.hits > 1 ? `×${it.hits}` : ''}`, tip: `공격: ${d} 피해${it.hits && it.hits > 1 ? ` ${it.hits}회` : ''}` });
    if (it.block) parts.push({ cls: 'defend', text: `${it.block}`, tip: `방어: 방어도 ${it.block}` });
    if (it.buff) parts.push({ cls: 'buff', text: '강화', tip: `강화: ${STATUS_INFO[it.buff.status].name} +${it.buff.amount}` });
    if (it.debuff) parts.push({ cls: 'debuff', text: STATUS_INFO[it.debuff.status].name, tip: `방해: 당신에게 ${STATUS_INFO[it.debuff.status].name} ${it.debuff.amount}` });
    if (it.drain) parts.push({ cls: 'heal', text: '흡혈', tip: '흡혈: 입힌 피해만큼 회복' });
    if (it.curse) parts.push({ cls: 'debuff', text: `저주${it.curse}`, tip: `저주: 낼 수 없는 카드 ${it.curse}장을 버린 더미에 섞음` });
    if (it.healAll) parts.push({ cls: 'heal', text: `+${it.healAll}`, tip: `회복: 아군 전체 체력 ${it.healAll}` });
    return (
        <div className="intent" title={parts.map((p) => p.tip).join(' / ')}>
            {parts.map((p, i) => (
                <span key={i} className={`intent-part intent-${p.cls}`}>
                    <i className={`ico ico-${p.cls}`} />
                    {p.text}
                </span>
            ))}
        </div>
    );
}

/**
 * 타격감: 새로 생긴 피해/공격 신호마다
 *  - 공격자 예비동작 + 돌진 (뒤로 살짝, 앞으로 쭉, 복귀)
 *  - 맞는 순간 히트스톱 (이펙트 시간을 잠깐 멈춤)
 *  - 피해량에 비례한 화면 흔들림 (픽셀 단위로 끊어서)
 */
/** 투사체 스프라이트를 from에서 to로 날린다 (startIn ms 뒤 출발, PROJECTILE_MS 동안) */
function throwProjectile(field: HTMLElement, name: string, from: Element, to: Element, startIn: number) {
    const p = PROJECTILES[name as keyof typeof PROJECTILES];
    if (!p) return;
    const box = field.getBoundingClientRect();
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const k = 1.6;
    const x0 = a.left + a.width * 0.3 - box.left - (p.w * k) / 2;
    const y0 = a.top + a.height * 0.55 - box.top - (p.h * k) / 2;
    const x1 = b.left + b.width * 0.55 - box.left - (p.w * k) / 2;
    const y1 = b.top + b.height * 0.5 - box.top - (p.h * k) / 2;
    window.setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'projectile';
        Object.assign(el.style, {
            width: `${p.w * k}px`,
            height: `${p.h * k}px`,
            backgroundImage: `url("${import.meta.env.BASE_URL}sprites/projectiles/${name}.png")`,
            backgroundSize: `${p.w * p.frames * k}px ${p.h * k}px`,
            transform: 'scaleX(-1)',
        });
        field.appendChild(el);
        el.animate([{ backgroundPosition: '0 0' }, { backgroundPosition: `-${p.w * p.frames * k}px 0` }], { duration: (p.frames / 18) * 1000, iterations: Infinity, easing: `steps(${p.frames})` });
        const fly = el.animate(
            [
                { left: `${x0}px`, top: `${y0}px` },
                { left: `${(x0 + x1) / 2}px`, top: `${Math.min(y0, y1) - 40}px`, offset: 0.5 },
                { left: `${x1}px`, top: `${y1}px` },
            ],
            { duration: PROJECTILE_MS, easing: 'linear', fill: 'forwards' },
        );
        fly.finished.then(() => el.remove()).catch(() => el.remove());
    }, Math.max(0, startIn));
}

function useJuice(
    heroLook: string,
    c: CombatState,
    fieldRef: React.RefObject<HTMLDivElement | null>,
    clock: React.RefObject<HitStopClock>,
    setHeroAction: (a: HeroAction) => void,
) {
    const seenFx = useRef(c.fx.length ? c.fx[c.fx.length - 1].id : 0);
    const seenCue = useRef(c.cues.length ? c.cues[c.cues.length - 1].id : 0);

    useEffect(() => {
        const field = fieldRef.current;
        if (!field) return;
        const now = performance.now();

        // 몸동작 + 대상 앞까지 달려가기
        const center = (el: Element) => {
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, w: r.width };
        };
        /** el을 dx만큼 달려가게 했다가 돌아오게 한다. 시간은 ms */
        const dash = (el: HTMLElement, dx: number, startIn: number, run: number, hold: number, back: number) => {
            // 살짝 뒤로 젖혔다가(예비동작) 점점 빨라지며 달려가고, 도착하면 미끄러지듯 멈춘다.
            // 돌아올 때는 천천히 출발해 천천히 선다
            const dir = Math.sign(dx) || 1;
            const total = run + hold + back;
            const fighter = el.closest<HTMLElement>('.fighter');
            const o = (ms: number) => Math.min(1, ms / total);
            const anim = el.animate(
                [
                    { transform: 'translateX(0)', easing: 'cubic-bezier(0.3, 0, 0.5, 1)' },
                    { transform: `translateX(${-dir * 10}px)`, offset: o(run * 0.25), easing: 'cubic-bezier(0.6, 0, 0.9, 0.7)' },
                    { transform: `translateX(${dx + dir * 10}px)`, offset: o(run), easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
                    { transform: `translateX(${dx}px)`, offset: o(run + Math.min(120, hold * 0.4)) },
                    { transform: `translateX(${dx}px)`, offset: o(run + hold), easing: 'cubic-bezier(0.45, 0, 0.35, 1)' },
                    { transform: 'translateX(0)' },
                ],
                { duration: total, delay: Math.max(0, startIn) },
            );
            // 달려가는 동안은 다른 캐릭터보다 앞에 그린다
            window.setTimeout(() => fighter && (fighter.style.zIndex = '4'), Math.max(0, startIn));
            anim.finished.then(() => fighter && (fighter.style.zIndex = '')).catch(() => {});
        };

        for (const q of c.cues.filter((q) => q.id > seenCue.current)) {
            // 효과음
            if (q.kind === 'card') {
                const cd = CARDS[q.card ?? ''];
                sfx.card();
                if (cd?.type === 'attack' && !cd.ranged && !lookIsRanged(heroLook)) window.setTimeout(() => sfx.swing(), (ATTACK_WINDUP - 0.05) * 1000);
                else if (cd?.type === 'attack' || cd?.type === 'power') window.setTimeout(() => sfx.cast(), 120);
            }
            if (q.kind === 'enemyAttack') window.setTimeout(() => sfx.swing(), Math.max(0, q.delay * 1000 - 40));
            if (q.kind === 'enemyBuff') sfx.buff(q.delay);
            if (q.kind === 'enemyDebuff') sfx.debuff(q.delay);
            if (q.kind === 'poison') sfx.poison(q.delay);
            if (q.kind === 'death') {
                sfx.death(q.delay + 0.1);
                const body = q.target ? field.querySelector<HTMLElement>(`[data-body="${q.target}"]`) : null;
                const foe = c.enemies.find((e) => e.uid === q.target);
                if (body && foe) {
                    const look = ENEMIES[foe.defId].look;
                    // 마지막으로 맞은 피해가 크거나 치명타면 날려 보낸다
                    let last: Fx | undefined;
                    for (let i = c.fx.length - 1; i >= 0; i--) if (c.fx[i].target === foe.uid && c.fx[i].kind === 'dmg') { last = c.fx[i]; break; }
                    const big = !!last && (!!last.crit || (last.amount ?? 0) >= 15);
                    const anim = look.kind === 'sprite' && hasAnim(look.sprite ?? '', 'death');
                    playDeath(body, pickDeath(look, anim, big), q.delay * 1000 + 40);
                }
            }
            if (q.kind === 'card') {
                const card = CARDS[q.card ?? ''];
                const attack = card?.type === 'attack';
                const act = CARD_ACT[q.card ?? ''] ?? (attack ? 'slash' : 'cast');
                const move = CARD_MOVE[q.card ?? ''];
                const inPlace = !!card?.ranged || lookIsRanged(heroLook) || move?.motion === 'stay';
                const charge = card?.charge ? CHARGE_TIME : 0;
                setHeroAction({ id: q.id, act, windup: card ? Math.max(windupOf(card), attack ? 0 : 0.05) : 0.05, ranged: inPlace, anims: move?.anims, charge });
                if (charge) chargeMoment(field, cardElement(q.card ?? ''));
                const hero = field.querySelector<HTMLElement>('[data-body="player"]');
                if (attack && hero && !inPlace) {
                    // 대상(광역 공격이면 적들 가운데) 바로 앞까지
                    const all = card.effects.some((e) => e.kind === 'damageAll');
                    const targets = all
                        ? Array.from(field.querySelectorAll('[data-alive="1"] [data-body]'))
                        : [field.querySelector(`[data-body="${q.target}"]`)].filter((x): x is Element => !!x);
                    if (targets.length) {
                        const tx = targets.map((t) => center(t).x).reduce((a, b) => a + b, 0) / targets.length;
                        const me = center(hero);
                        const gap = Math.max(56, me.w * 0.3);
                        const multi = act === 'double' || act === 'dagger' || act === 'spin' || !!move?.anims[0]?.includes('combo');
                        const hold = multi ? 520 : 320;
                        const motion = move?.motion ?? 'lunge';
                        const run = ATTACK_WINDUP * 1000 - 20;
                        if (motion === 'lunge') dash(hero, tx - me.x - gap, charge * 1000, run, hold, 460);
                        else playHeroMotion(hero, motion, tx - me.x - gap, charge * 1000, run, hold, 460);
                        // 바람 암살자는 지나간 자리에 잔상이 남는다
                        if (heroLook === 'wind-hashashin') spawnAfterimages(field, hero, charge * 1000 + 40, run + hold + 200);
                    }
                }
            }
            if (q.kind === 'enemyAttack') {
                const hitAt = (q.delay + IMPACT_DELAY) * 1000;
                window.setTimeout(() => setHeroAction({ id: q.id, act: 'hurt', windup: 0 }), hitAt);
                const el = q.source ? field.querySelector<HTMLElement>(`[data-body="${q.source}"]`) : null;
                const hero = field.querySelector<HTMLElement>('[data-body="player"]');
                const src = c.enemies.find((e) => e.uid === q.source);
                const look = src ? ENEMIES[src.defId].look : undefined;
                if (el && hero && look?.ranged) {
                    // 원거리: 제자리에서 던지고, 투사체가 날아가 맞는 순간에 닿는다
                    for (let i = 0; i < (q.hits ?? 1); i++) throwProjectile(field, look.ranged, el, hero, hitAt + i * 140 - PROJECTILE_MS);
                } else if (el && hero && look) {
                    // 몬스터마다 다른 몸동작으로 덮친다 (뛰어들기, 급강하, 돌진, 연타 …)
                    const me = center(el);
                    const gap = Math.max(56, me.w * 0.3);
                    const move = pickAttack(look, q.hits ?? 1, q.amount ?? 0, q.id);
                    playAttack(el, move, center(hero).x - me.x + gap, hitAt, q.hits ?? 1, (q.amount ?? 0) >= 14);
                }
            }
        }
        if (c.cues.length) seenCue.current = c.cues[c.cues.length - 1].id;

        // 맞는 순간: 히트스톱 + 화면 흔들림
        for (const f of c.fx.filter((f) => f.id > seenFx.current)) {
            if (f.kind === 'block') sfx.block(f.delay);
            if (f.kind === 'heal') sfx.heal(f.delay);
            if (f.kind === 'dmg' && !f.dot) {
                if (f.crit) sfx.crit(f.delay);
                else if (f.target === 'player') sfx.hurt(f.delay);
                else sfx.hit(f.amount ?? 5, f.delay);
            }
        }
        // 피격 반응: 맞은 쪽이 뒤로 밀리고 번쩍인다. 주인공이 맞으면 화면 가장자리도 붉게
        for (const f of c.fx.filter((f) => f.id > seenFx.current && f.kind === 'dmg' && !f.dot && (f.amount ?? 0) > 0)) {
            const toPlayer = f.target === 'player';
            const body = field.querySelector<HTMLElement>(`[data-body="${f.target}"]`);
            const sprite = body?.querySelector<HTMLElement>('.fighter-sprite') ?? body?.firstElementChild as HTMLElement | null;
            const amt = f.amount ?? 0;
            const push = Math.min(28, 8 + amt * 0.9) * (toPlayer ? -1 : 1) * (f.crit ? 1.5 : 1);
            const at = f.delay * 1000;
            if (sprite) {
                sprite.animate(
                    [
                        { transform: 'translateX(0)', filter: toPlayer ? 'brightness(1.1) sepia(1) saturate(9) hue-rotate(-50deg)' : 'brightness(3) saturate(0)' },
                        { transform: `translateX(${push}px) rotate(${toPlayer ? -4 : 4}deg)`, filter: toPlayer ? 'brightness(1) sepia(0.8) saturate(5) hue-rotate(-50deg)' : 'brightness(1.6)', offset: 0.25 },
                        { transform: `translateX(${push * 0.6}px)`, filter: 'none', offset: 0.55 },
                        { transform: 'translateX(0)', filter: 'none' },
                    ],
                    { duration: toPlayer ? 420 : 320, delay: at, easing: 'steps(6, end)', composite: 'add' },
                );
            }
            if (toPlayer) {
                const v = document.createElement('div');
                v.className = 'hurt-vignette' + (amt >= 12 || f.crit ? ' heavy' : '');
                field.appendChild(v);
                const a = v.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }], { duration: 520, delay: at, fill: 'both' });
                a.finished.then(() => v.remove()).catch(() => v.remove());
            }
        }
        for (const f of c.fx.filter((f) => f.id > seenFx.current && f.kind === 'dmg')) {
            const dmg = dmgOf(f);
            const start = now + f.delay * 1000;
            const hold = (dmg >= 15 ? 170 : dmg >= 7 ? 120 : 80) + (f.target === 'player' ? 40 : 0);
            clock.current.windows.push([start, start + hold]);
            const amp = (dmg >= 15 ? 3 : dmg >= 7 ? 2 : 1) * (f.target === 'player' ? 4 : 3);
            field.animate(
                [
                    { transform: 'translate(0,0)' },
                    { transform: `translate(${amp}px,${-amp / 3}px)` },
                    { transform: `translate(${-amp}px,${amp / 3}px)` },
                    { transform: `translate(${amp / 1.5}px,0)` },
                    { transform: `translate(${-amp / 3}px,0)` },
                    { transform: 'translate(0,0)' },
                ],
                { duration: 160 + amp * 10, delay: f.delay * 1000, easing: 'steps(1, end)', composite: 'replace' },
            );
        }
        if (c.fx.length) seenFx.current = c.fx[c.fx.length - 1].id;
    }, [c.fx, c.cues, fieldRef, clock, setHeroAction]);
}

export function CombatScreen({ combat: c, biome, seed, hero, dispatch }: { combat: CombatState; biome: string; seed: number; hero: string; dispatch: Dispatch<Action> }) {
    const [selected, setSelected] = useState<number | null>(null);
    const [enemyTurn, setEnemyTurn] = useState(false);
    const [pile, setPile] = useState<null | 'draw' | 'discard' | 'exhaust'>(null);
    const fieldRef = useRef<HTMLDivElement>(null);
    const clock = useRef<HitStopClock>({ windows: [] });
    const living = c.enemies.filter((e) => e.hp > 0);
    const locked = enemyTurn || !!c.result;

    useEffect(() => setSelected(null), [c.hand.length, c.turn]);
    useEffect(() => {
        if (c.result === 'win') window.setTimeout(() => sfx.victory(), 500);
        if (c.result === 'lose') window.setTimeout(() => sfx.defeat(), 500);
    }, [c.result]);
    const [heroAction, setHeroAction] = useState<HeroAction | null>(null);
    // 적마다 가장 최근 공격 신호 → 몬스터 덮치기 동작
    const attacks: Record<string, MonsterAttack> = {};
    for (const q of c.cues) if (q.kind === 'enemyAttack' && q.source) attacks[q.source] = { id: q.id, hitIn: q.delay + IMPACT_DELAY };
    // 적마다 가장 최근에 맞은 순간 → 피격 동작
    const hurts: Record<string, { id: number; delay: number }> = {};
    for (const f of c.fx) if (f.kind === 'dmg' && f.target !== 'player') hurts[f.target] = { id: f.id, delay: f.delay };
    useJuice(hero, c, fieldRef, clock, setHeroAction);

    const play = useCallback(
        (idx: number, target: string | null) => {
            dispatch({ type: 'play', idx, target });
            setSelected(null);
        },
        [dispatch],
    );

    const clickCard = (idx: number) => {
        // 끌어서 낸 직후 따라오는 클릭은 무시
        if (suppressClick.current) {
            suppressClick.current = false;
            return;
        }
        if (locked) return;
        const card = c.hand[idx];
        if (!canPlay(c, card)) return;
        if (selected === idx) return setSelected(null);
        sfx.select();
        // 대상이 필요한 카드는 적이 하나뿐이어도 직접 고른다
        if (needsTarget(card)) setSelected(idx);
        else play(idx, living[0]?.uid ?? null);
    };

    // ── 끌어서 내기: 대상 카드는 화살표로 적을 겨누고, 나머지는 카드를 위로 끌어 올린다 ──
    const [drag, setDrag] = useState<Drag | null>(null);
    const dragRef = useRef<Drag | null>(null);
    const suppressClick = useRef(false);
    const handRef = useRef<HTMLDivElement>(null);

    const startDrag = (ev: React.PointerEvent<HTMLDivElement>, idx: number) => {
        if (ev.button !== 0 || locked) return;
        const card = c.hand[idx];
        if (!card || !canPlay(c, card)) return;
        const r = ev.currentTarget.getBoundingClientRect();
        const d: Drag = {
            idx, card: card.id, target: needsTarget(card), x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY,
            sx: r.left + r.width / 2, sy: r.top + 8, moved: false, aim: null, release: false,
        };
        dragRef.current = d;
        setDrag(d);
        sfx.charge(cardElement(card.id));
    };
    const chargeRect = useCallback(() => document.querySelector('.hand-slot[data-charging] .card')?.getBoundingClientRect() ?? null, []);

    useEffect(() => {
        if (!drag) return;
        const enemyAt = (x: number, y: number) =>
            (document.elementFromPoint(x, y)?.closest('.enemy[data-alive="1"]') as HTMLElement | null)?.dataset.uid ?? null;
        const handTop = () => handRef.current?.getBoundingClientRect().top ?? window.innerHeight;
        const onMove = (ev: PointerEvent) => {
            const d = dragRef.current;
            if (!d) return;
            const moved = d.moved || Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) > 8;
            if (moved && !d.moved) {
                sfx.select();
                if (d.target) setSelected(d.idx);
            }
            const aim = d.target && moved ? enemyAt(ev.clientX, ev.clientY) : null;
            if (aim && aim !== d.aim) sfx.step();
            const next = { ...d, x: ev.clientX, y: ev.clientY, moved, aim, release: !d.target && ev.clientY < handTop() - 20 };
            dragRef.current = next;
            setDrag(next);
        };
        const onUp = (ev: PointerEvent) => {
            const d = dragRef.current;
            dragRef.current = null;
            setDrag(null);
            if (!d || !d.moved) return; // 그냥 누른 것은 클릭으로 처리
            suppressClick.current = true;
            window.setTimeout(() => (suppressClick.current = false), 50);
            if (d.target) {
                const aim = enemyAt(ev.clientX, ev.clientY);
                if (aim) play(d.idx, aim);
                else setSelected(null);
            } else if (ev.clientY < handTop() - 20) {
                play(d.idx, living[0]?.uid ?? null);
            }
        };
        const onCancel = () => {
            dragRef.current = null;
            setDrag(null);
            setSelected(null);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drag !== null]);

    const clickEnemy = (e: EnemyState) => {
        if (selected === null || e.hp <= 0 || locked) return;
        play(selected, e.uid);
    };

    const doEndTurn = useCallback(() => {
        if (locked) return;
        setSelected(null);
        setEnemyTurn(true);
        const acting = living.length;
        setTimeout(() => {
            dispatch({ type: 'endTurn' });
            setTimeout(() => setEnemyTurn(false), 300 + acting * ENEMY_STEP * 1000);
        }, 350);
    }, [dispatch, locked, living.length]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (pile) return;
            if (e.key === 'Escape') setSelected(null);
            else if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') doEndTurn();
            else if (/^[1-9]$/.test(e.key)) {
                const idx = Number(e.key) - 1;
                if (idx < c.hand.length) clickCard(idx);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const selectedCard: CardInst | null = selected !== null ? c.hand[selected] ?? null : null;

    return (
        <div className={`combat ${selected !== null ? 'targeting' : ''}`}>
            <div className="battlefield" ref={fieldRef}>
                <div className="scenery" aria-hidden>
                    <SceneryView biome={biome} ground seed={seed} />
                </div>
                <FxCanvas container={fieldRef} ambient={AMBIENT[biome]} className="fx-back" clock={clock} />
                <div className={`fighter player-side ${drag?.moved && !drag.target ? `self-aim ${drag.release ? "ready" : ""}` : ""}`}>
                    <div data-body="player">
                        <Shake fx={c.fx} target="player">
                            <HeroView char={hero} action={heroAction} clock={clock} scale={4} dead={c.result === 'lose'} />
                        </Shake>
                    </div>
                    <FxLayer fx={c.fx} target="player" />
                    <HpBar hp={c.player.hp} max={c.player.maxHp} block={c.player.block} />
                    <StatusList status={c.player.status} />
                </div>

                <div className="enemy-row">
                    {c.enemies.map((e) => {
                        const def = ENEMIES[e.defId];
                        return (
                            <div
                                key={e.uid}
                                data-alive={e.hp > 0 ? '1' : '0'}
                                data-uid={e.uid}
                                className={`fighter enemy ${e.hp <= 0 ? 'dead' : ''} ${selected !== null && e.hp > 0 ? 'targetable' : ''} ${drag?.aim === e.uid ? 'aimed' : ''}`}
                                onClick={() => clickEnemy(e)}
                            >
                                {e.hp > 0 && <IntentBadge e={e} c={c} />}
                                <div data-body={e.uid}>
                                    <Shake fx={c.fx} target={e.uid}>
                                        <MonsterView
                                            look={def.look}
                                            scale={def.look.scale ?? 3}
                                            seed={Number(e.uid.slice(1)) + 1}
                                            clock={clock}
                                            attack={attacks[e.uid]}
                                            hurt={hurts[e.uid]}
                                            dead={e.hp <= 0}
                                        />
                                    </Shake>
                                </div>
                                <FxLayer fx={c.fx} target={e.uid} />
                                <div className="enemy-name">
                                    {e.affix && (
                                        <em className={`affix affix-${e.affix}`} title={AFFIXES[e.affix].desc}>
                                            {AFFIXES[e.affix].name}{' '}
                                        </em>
                                    )}
                                    {def.name}
                                </div>
                                <HpBar hp={e.hp} max={e.maxHp} block={e.block} />
                                <StatusList status={e.status} />
                            </div>
                        );
                    })}
                </div>

                <div className="bd-front" aria-hidden />
                <FxCanvas cues={c.cues} container={fieldRef} className="fx-front" clock={clock} />
                <FxCanvas numbers={c.fx} container={fieldRef} className="fx-numbers" clock={clock} pixel={4} />
                {enemyTurn && !c.result && <div className="turn-banner">적의 차례</div>}
                {drag?.moved && !drag.target && <div className="target-hint self">[{cardStats(c.hand[drag.idx] ?? { id: drag.card, upgraded: false }).name}] 대상이 필요 없어요 · 위로 끌어 올려 놓으면 사용</div>}
                {selectedCard && <div className="target-hint">[{cardStats(selectedCard).name}] 적에게 끌어다 놓거나 적을 누르세요 · Esc 취소</div>}
            </div>

            <div className="hand-area">
                <div className="hand-left">
                    {(c.played ?? 0) > 0 && (
                        <div className="combo-count" key={c.played} title="이번 턴에 낸 카드 수 (연계 카드가 강해진다)">
                            연계 <b>{c.played}</b>
                        </div>
                    )}
                    <div className="energy" title="에너지">
                        {c.energy}/{c.maxEnergy}
                    </div>
                    <button className="pile" onClick={() => setPile('draw')} title="뽑을 카드">
                        뽑기 {c.draw.length}
                    </button>
                </div>
                <div className="hand" ref={handRef}>
                    {c.hand.map((card, i) => {
                        const dragging = drag?.idx === i && drag.moved;
                        const lift = dragging && !drag.target;
                        return (
                        <div
                            key={card.uid}
                            className={`hand-slot ${dragging ? 'dragging' : ''} ${lift && drag.release ? 'will-play' : ''} ${comboReady(card, c) ? 'combo-ready' : ''}`}
                            style={{
                                ['--i' as string]: i,
                                ['--n' as string]: c.hand.length,
                                ...(lift ? { transform: `translate(${drag.x - drag.x0}px, ${drag.y - drag.y0}px) scale(1.06)` } : {}),
                            }}
                            data-charging={drag?.idx === i ? '' : undefined}
                            onPointerDown={(ev) => startDrag(ev, i)}
                        >
                            <CardView card={card} disabled={locked || !canPlay(c, card)} selected={selected === i} onClick={() => clickCard(i)} />
                        </div>
                        );
                    })}
                </div>
                {drag && <ChargeFx key={drag.card + drag.idx} element={cardElement(drag.card)} getRect={chargeRect} heat={drag.aim ? 1 : drag.moved ? 0.5 : 0.2} />}
                {drag?.moved && drag.target && <DragArrow d={drag} />}
                <div className="hand-right">
                    <button className="btn btn-end" onClick={doEndTurn} disabled={locked}>
                        턴 종료
                    </button>
                    <button className="pile" onClick={() => setPile('discard')} title="버린 카드">
                        버림 {c.discard.length}
                    </button>
                    {c.exhaust.length > 0 && (
                        <button className="pile" onClick={() => setPile('exhaust')} title="소멸한 카드">
                            소멸 {c.exhaust.length}
                        </button>
                    )}
                </div>
            </div>

            {pile && (
                <Modal title={pile === 'draw' ? '뽑을 카드 (순서 무작위)' : pile === 'discard' ? '버린 카드' : '소멸한 카드'} onClose={() => setPile(null)}>
                    <CardGrid cards={c[pile]} />
                </Modal>
            )}

            {c.result && (
                <div className="result-overlay">
                    <div className={`result-box ${c.result}`}>
                        <h2>{c.result === 'win' ? '승리!' : '쓰러졌다…'}</h2>
                        <button className="btn btn-primary" autoFocus onClick={() => dispatch({ type: 'combatDone' })}>
                            {c.result === 'win' ? '전리품 확인' : '계속'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
