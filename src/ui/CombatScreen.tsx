import { useCallback, useEffect, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { cardStats, needsTarget, STATUS_INFO } from '../game/cards';
import { ATTACK_WINDUP, canPlay, ENEMY_STEP, IMPACT_DELAY, intentDamage } from '../game/combat';
import { CARDS } from '../game/cards';
import { ENEMIES } from '../game/enemies';
import type { Action } from '../game/run';
import type { CardInst, CombatState, EnemyState, Fx, Intent } from '../game/types';
import { CardGrid, CardView, HpBar, Modal, StatusList } from './common';
import { HeroView, MonsterView, PROJECTILE_MS, SceneryView, type HeroAction, type MonsterAttack } from './Actors';
import { PROJECTILES } from './spriteManifest';
import { CARD_ACT } from './heroActs';
import { FxCanvas, type HitStopClock } from './FxCanvas';
import { FLOOR_AMBIENT } from './vfx';

function FxLayer({ fx, target }: { fx: Fx[]; target: string }) {
    const mine = fx.filter((f) => f.target === target);
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

function IntentBadge({ e, c }: { e: EnemyState; c: CombatState }) {
    const it: Intent = e.intent;
    const parts: { cls: string; text: string; tip: string }[] = [];
    const d = intentDamage(e, c.player);
    if (d !== null) parts.push({ cls: 'attack', text: `${d}${it.hits && it.hits > 1 ? `×${it.hits}` : ''}`, tip: `공격: ${d} 피해${it.hits && it.hits > 1 ? ` ${it.hits}회` : ''}` });
    if (it.block) parts.push({ cls: 'defend', text: `${it.block}`, tip: `방어: 방어도 ${it.block}` });
    if (it.buff) parts.push({ cls: 'buff', text: '강화', tip: `강화: ${STATUS_INFO[it.buff.status].name} +${it.buff.amount}` });
    if (it.debuff) parts.push({ cls: 'debuff', text: STATUS_INFO[it.debuff.status].name, tip: `방해: 당신에게 ${STATUS_INFO[it.debuff.status].name} ${it.debuff.amount}` });
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
            const total = run + hold + back;
            const fighter = el.closest<HTMLElement>('.fighter');
            const anim = el.animate(
                [
                    { transform: 'translateX(0)', easing: 'cubic-bezier(0.55, 0, 0.9, 0.6)' },
                    { transform: `translateX(${dx}px)`, offset: run / total },
                    { transform: `translateX(${dx}px)`, offset: (run + hold) / total, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)' },
                    { transform: 'translateX(0)' },
                ],
                { duration: total, delay: Math.max(0, startIn) },
            );
            // 달려가는 동안은 다른 캐릭터보다 앞에 그린다
            window.setTimeout(() => fighter && (fighter.style.zIndex = '4'), Math.max(0, startIn));
            anim.finished.then(() => fighter && (fighter.style.zIndex = '')).catch(() => {});
        };

        for (const q of c.cues.filter((q) => q.id > seenCue.current)) {
            if (q.kind === 'card') {
                const card = CARDS[q.card ?? ''];
                const attack = card?.type === 'attack';
                const act = CARD_ACT[q.card ?? ''] ?? (attack ? 'slash' : 'cast');
                setHeroAction({ id: q.id, act, windup: attack ? ATTACK_WINDUP : 0.05, ranged: !!card?.ranged });
                const hero = field.querySelector<HTMLElement>('[data-body="player"]');
                if (attack && hero && !card?.ranged) {
                    // 대상(광역 공격이면 적들 가운데) 바로 앞까지
                    const all = card.effects.some((e) => e.kind === 'damageAll');
                    const targets = all
                        ? Array.from(field.querySelectorAll('[data-alive="1"] [data-body]'))
                        : [field.querySelector(`[data-body="${q.target}"]`)].filter((x): x is Element => !!x);
                    if (targets.length) {
                        const tx = targets.map((t) => center(t).x).reduce((a, b) => a + b, 0) / targets.length;
                        const me = center(hero);
                        const gap = Math.max(56, me.w * 0.3);
                        const multi = act === 'double' || act === 'dagger' || act === 'spin';
                        dash(hero, tx - me.x - gap, 0, ATTACK_WINDUP * 1000 - 20, multi ? 420 : 240, 260);
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
                } else if (el && hero) {
                    const me = center(el);
                    const gap = Math.max(56, me.w * 0.3);
                    const run = 240;
                    dash(el, center(hero).x - me.x + gap, hitAt - run, run, (q.hits ?? 1) * 140 + 120, 260);
                }
            }
        }
        if (c.cues.length) seenCue.current = c.cues[c.cues.length - 1].id;

        // 맞는 순간: 히트스톱 + 화면 흔들림
        for (const f of c.fx.filter((f) => f.id > seenFx.current && f.kind === 'dmg')) {
            const dmg = dmgOf(f);
            const start = now + f.delay * 1000;
            const hold = dmg >= 15 ? 110 : dmg >= 7 ? 75 : 50;
            clock.current.windows.push([start, start + hold]);
            const amp = (dmg >= 15 ? 3 : dmg >= 7 ? 2 : 1) * 3;
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

export function CombatScreen({ combat: c, floor, hero, dispatch }: { combat: CombatState; floor: number; hero: string; dispatch: Dispatch<Action> }) {
    const [selected, setSelected] = useState<number | null>(null);
    const [enemyTurn, setEnemyTurn] = useState(false);
    const [pile, setPile] = useState<null | 'draw' | 'discard' | 'exhaust'>(null);
    const fieldRef = useRef<HTMLDivElement>(null);
    const clock = useRef<HitStopClock>({ windows: [] });
    const living = c.enemies.filter((e) => e.hp > 0);
    const locked = enemyTurn || !!c.result;

    useEffect(() => setSelected(null), [c.hand.length, c.turn]);
    const [heroAction, setHeroAction] = useState<HeroAction | null>(null);
    // 적마다 가장 최근 공격 신호 → 몬스터 덮치기 동작
    const attacks: Record<string, MonsterAttack> = {};
    for (const q of c.cues) if (q.kind === 'enemyAttack' && q.source) attacks[q.source] = { id: q.id, hitIn: q.delay + IMPACT_DELAY };
    // 적마다 가장 최근에 맞은 순간 → 피격 동작
    const hurts: Record<string, { id: number; delay: number }> = {};
    for (const f of c.fx) if (f.kind === 'dmg' && f.target !== 'player') hurts[f.target] = { id: f.id, delay: f.delay };
    useJuice(c, fieldRef, clock, setHeroAction);

    const play = useCallback(
        (idx: number, target: string | null) => {
            dispatch({ type: 'play', idx, target });
            setSelected(null);
        },
        [dispatch],
    );

    const clickCard = (idx: number) => {
        if (locked) return;
        const card = c.hand[idx];
        if (!canPlay(c, card)) return;
        if (selected === idx) return setSelected(null);
        if (needsTarget(card) && living.length > 1) setSelected(idx);
        else play(idx, living[0]?.uid ?? null);
    };

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
                    <SceneryView floor={floor} ground seed={floor + 3} />
                </div>
                <FxCanvas container={fieldRef} ambient={FLOOR_AMBIENT[floor]} className="fx-back" clock={clock} />
                <div className="fighter player-side">
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
                                className={`fighter enemy ${e.hp <= 0 ? 'dead' : ''} ${selected !== null && e.hp > 0 ? 'targetable' : ''}`}
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
                                <div className="enemy-name">{def.name}</div>
                                <HpBar hp={e.hp} max={e.maxHp} block={e.block} />
                                <StatusList status={e.status} />
                            </div>
                        );
                    })}
                </div>

                <div className="bd-front" aria-hidden />
                <FxCanvas cues={c.cues} container={fieldRef} className="fx-front" clock={clock} />
                {enemyTurn && !c.result && <div className="turn-banner">적의 차례</div>}
                {selectedCard && <div className="target-hint">[{cardStats(selectedCard).name}] 대상을 고르세요 · Esc 취소</div>}
            </div>

            <div className="hand-area">
                <div className="hand-left">
                    <div className="energy" title="에너지">
                        {c.energy}/{c.maxEnergy}
                    </div>
                    <button className="pile" onClick={() => setPile('draw')} title="뽑을 카드">
                        뽑기 {c.draw.length}
                    </button>
                </div>
                <div className="hand">
                    {c.hand.map((card, i) => (
                        <div key={card.uid} className="hand-slot" style={{ ['--i' as string]: i, ['--n' as string]: c.hand.length }}>
                            <CardView card={card} disabled={locked || !canPlay(c, card)} selected={selected === i} onClick={() => clickCard(i)} />
                        </div>
                    ))}
                </div>
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
