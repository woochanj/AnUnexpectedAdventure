import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type ReactNode, useMemo } from 'react';
import { cardStats, ELEMENT_NAME, needsTarget, STATUS_INFO } from '../game/cards';
import { hitOffsets, hitSpan } from '../game/combat';
import { AFFIXES, ATTACK_WINDUP, FREEZE_AT, chargeOf, windupOf, canPlay, ENEMY_LEAD, ENEMY_STEP, IMPACT_DELAY, intentDamage } from '../game/combat';
import { CARDS } from '../game/cards';
import { ENEMIES } from '../game/enemies';
import type { Action } from '../game/run';
import type { CardInst, CombatState, EnemyState, Fx, Intent } from '../game/types';
import { CardGrid, CardView, LandedHpBar, Modal, StatusList } from './common';
import { HeroView, lookIsRanged, MonsterView, PROJECTILE_MS, SceneryView, type HeroAction, type MonsterAttack } from './Actors';
import { PROJECTILES } from './spriteManifest';
import { CARD_ACT } from './heroActs';
import { FxCanvas, type HitStopClock } from './FxCanvas';
import { sfx } from './sfx';
import { DragArrow } from './DragArrow';
import { barkFor, heroBark, type HeroBarks } from '../game/story';
import type { ClassId } from '../game/types';
import { CARD_MOVE, CARD_SKIN, IN_PLACE, playHeroMotion, STILL_FOR } from './heroMoves';
import { spriteImage, spriteInfo } from './SpriteActor';
import { spawnAfterimages } from './afterimage';
import { spawnShield } from './shield';
import { showProc } from './proc';
import { pickAttack, pickDeath, playAttack, playDeath } from './monsterMoves';
import { hasAnim } from './SpriteActor';
import { ChargeFx } from './ChargeFx';
import { cardElement } from './cardElement';
import { AMBIENT } from './vfx';

function FxLayer({ fx, target }: { fx: Fx[]; target: string }) {
    // 피해 숫자는 pixelfx 캔버스가 그린다. 여기서는 방어·회복·상태이상 글자만
    // 공명·반응·투지 폭발은 따로 큰 알림으로 보여 준다
    const mine = fx.filter((f) => f.target === target && !(f.kind === 'dmg' && f.amount) && !f.proc);
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
function chargeMoment(field: HTMLElement, el: string, ultimate: string | null, charge: number) {
    const v = document.createElement('div');
    v.className = 'charge-dim' + (ultimate ? ' ultimate' : '');
    field.appendChild(v);
    const a = v.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: charge * 1000 + 350, fill: 'both' });
    a.finished.then(() => v.remove()).catch(() => v.remove());
    sfx.chargeUp(el);
    if (!ultimate) return;
    // 궁극기: 위아래 검은 띠(영화 화면처럼) + 기술 이름이 화면을 가로지른다
    for (const side of ['top', 'bottom']) {
        const bar = document.createElement('div');
        bar.className = `ult-bar ${side}`;
        field.appendChild(bar);
        const b = bar.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)', offset: 0.2 }, { transform: 'scaleY(1)', offset: 0.85 }, { transform: 'scaleY(0)' }], { duration: charge * 1000 + 700, fill: 'both', easing: 'ease-out' });
        b.finished.then(() => bar.remove()).catch(() => bar.remove());
    }
    const name = document.createElement('div');
    name.className = 'ult-name';
    name.innerHTML = `<small>궁극기</small>${ultimate}`;
    field.appendChild(name);
    const n = name.animate(
        [
            { transform: 'translateX(60%) skewX(-12deg)', opacity: 0 },
            { transform: 'translateX(0) skewX(-12deg)', opacity: 1, offset: 0.18 },
            { transform: 'translateX(-4%) skewX(-12deg)', opacity: 1, offset: 0.8 },
            { transform: 'translateX(-60%) skewX(-12deg)', opacity: 0 },
        ],
        { duration: charge * 1000 + 300, fill: 'both', easing: 'cubic-bezier(0.2,0.8,0.3,1)' },
    );
    n.finished.then(() => name.remove()).catch(() => name.remove());
    window.setTimeout(() => sfx.crit(), charge * 1000 - 120);
}

/** 졸개 말풍선: 몬스터 머리 위에 잠깐 떴다 사라진다 */
/** 이번에 낸 카드의 대상 (공명·반응 표식을 그 적 발밑에) */
function q0Target(c: CombatState): string | null {
    const last = [...c.cues].reverse().find((q) => q.kind === 'card');
    return last?.target ?? null;
}

/** 방패를 꺼내 드는 기사 기술 */
const SHIELD_HIT = new Set(['shield_bash', 'shield_slam']);
const SHIELD_GUARD = new Set(['counter_stance']);

function say(field: HTMLElement, c: CombatState, uid: string, kind: 'start' | 'attack' | 'hurt' | 'death', delayMs: number) {
    const foe = c.enemies.find((e) => e.uid === uid);
    if (!foe || c.kind === 'boss') return;
    const look = ENEMIES[foe.defId].look;
    const text = barkFor(look.kind === 'sprite' ? look.sprite ?? '' : look.kind, kind);
    if (text) bubble(field, `.enemy[data-uid="${uid}"]`, text, `bark-${kind}`, delayMs);
}

/** 주인공 말풍선: 직업마다 말투가 다르다 */
function heroSay(field: HTMLElement, cls: ClassId, kind: keyof HeroBarks, delayMs: number) {
    const text = heroBark(cls, kind);
    // 주인공 그림판은 공격 범위까지 커서 그 위에 띄우면 화면 밖으로 나간다 → 발밑에서 머리 높이만큼 위에 띄운다
    if (text)
        bubble(field, '.player-side', text, `hero bark-${kind}`, delayMs, '-25%', (b) => {
            const feet = field.querySelector('[data-anchor="player"]')?.getBoundingClientRect();
            const box = field.getBoundingClientRect();
            if (!feet) return;
            // 달려가 있는 중이면 그만큼 빼서 원래 자리 머리 위에 띄운다 (말풍선이 화면 가운데에 남지 않게)
            const body = field.querySelector<HTMLElement>('[data-body="player"]');
            const m = body ? new DOMMatrixReadOnly(getComputedStyle(body).transform === 'none' ? undefined : getComputedStyle(body).transform) : null;
            const head = Math.min(150, box.height * 0.42);
            Object.assign(b.style, { position: 'absolute', left: `${feet.left + feet.width / 2 - box.left - (m?.m41 ?? 0)}px`, top: `${Math.max(4, feet.bottom - box.top - (m?.m42 ?? 0) - head - 34)}px`, bottom: 'auto' });
            field.appendChild(b);
        });
}

function bubble(field: HTMLElement, hostSel: string, text: string, kind: string, delayMs: number, shift = '-50%', place?: (b: HTMLElement) => void) {
    window.setTimeout(() => {
        const host = field.querySelector<HTMLElement>(hostSel);
        if (!host) return;
        (place ? field.querySelector('.bark.hero') : host.querySelector('.bark'))?.remove();
        const b = document.createElement('div');
        b.className = `bark ${kind}`;
        b.textContent = text;
        if (place) place(b);
        if (!b.parentElement) host.appendChild(b);
        const a = b.animate(
            [
                { opacity: 0, transform: `translate(${shift}, 6px) scale(0.8)` },
                { opacity: 1, transform: `translate(${shift}, 0) scale(1)`, offset: 0.1 },
                { opacity: 1, transform: `translate(${shift}, 0) scale(1)`, offset: 0.85 },
                { opacity: 0, transform: `translate(${shift}, -6px) scale(1)` },
            ],
            { duration: 1900, easing: 'steps(12, end)', fill: 'forwards' },
        );
        a.finished.then(() => b.remove()).catch(() => b.remove());
    }, Math.max(0, delayMs));
}

/** 지금 내면 직업 체계 효과가 붙는 카드: 손패 위에 꼬리표로 미리 알려 준다 (연계 · 공명 · 반응 · 투지) */
function readyTag(card: CardInst, c: CombatState): { tag: string; cls: string } | null {
    const s = cardStats(card);
    if (s.effects.some((e) => (e.kind === 'after' && e.type === c.lastType) || ((e.kind === 'combo' || e.kind === 'finisher') && (c.played ?? 0) > 0)))
        return { tag: '연계', cls: 'rt-combo' };
    const el = s.def.el;
    if (el && c.lastEl) return el === c.lastEl ? { tag: '공명 +3', cls: `rt-${el}` } : { tag: '반응', cls: `rt-${el}` };
    const grit = c.player.status.grit ?? 0;
    if (grit > 0 && s.effects.some((e) => e.kind === 'unleash')) return { tag: `투지 ×${grit}`, cls: 'rt-grit' };
    return null;
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
    cls: ClassId,
    setSkin: (s: string | null) => void,
) {
    const skinTimer = useRef(0);
    const saidLow = useRef(false);
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
            if (q.kind === 'enemyAttack' && q.source && Math.random() < 0.35) say(field, c, q.source, 'attack', q.delay * 1000 - 150);
            if (q.kind === 'death' && q.target) say(field, c, q.target, 'death', q.delay * 1000 + 80);
            if (q.kind === 'death' && Math.random() < 0.3) heroSay(field, cls, 'kill', q.delay * 1000 + 450);
            if (q.kind === 'card') {
                const cd = CARDS[q.card ?? ''];
                // 이 카드는 다른 무기로: 그 스프라이트로 잠깐 바꿔 들었다가 돌아온다
                const skin = CARD_SKIN[heroLook]?.[q.card ?? ''];
                window.clearTimeout(skinTimer.current);
                setSkin(skin ?? null);
                if (skin) skinTimer.current = window.setTimeout(() => setSkin(null), ((cd ? windupOf(cd) : 0.4) + 1.3) * 1000);
                if (cd?.ultimate) heroSay(field, cls, 'ultimate', 60);
                else if (cd?.charge && Math.random() < 0.6) heroSay(field, cls, 'skill', 60);
                else if (cd?.type === 'skill' && cd.effects.some((e) => e.kind === 'block') && Math.random() < 0.25) heroSay(field, cls, 'guard', 60);
            }
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
                const inPlace = !!card?.ranged || lookIsRanged(heroLook) || (!!move && IN_PLACE.has(move.motion));
                const charge = card ? chargeOf(card) : 0;
                setHeroAction({ id: q.id, act, windup: card ? Math.max(windupOf(card), attack ? 0 : 0.05) : 0.05, ranged: inPlace, anims: move?.anims, charge });
                if (charge) chargeMoment(field, cardElement(q.card ?? ''), card?.ultimate ? card.name : null, charge);
                const hero = field.querySelector<HTMLElement>('[data-body="player"]');
                // 제자리 카드(주문·방어·강화)도 카드마다 다른 몸짓
                if (hero && inPlace && move) {
                    const still = IN_PLACE.has(move.motion) ? move.motion : (STILL_FOR[move.motion] ?? 'stay');
                    const at = attack ? ATTACK_WINDUP * 1000 : 260;
                    playHeroMotion(hero, still, 0, charge * 1000, at, 360, 380);
                }
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
                        // 연타는 마지막 타격까지 대상 앞에 머문다
                        const maxHits = Math.max(1, ...card.effects.map((e) => (e.kind === 'damage' || e.kind === 'damageAll' ? (e.hits ?? 1) : 1)));
                        const hold = multi || maxHits > 1 ? Math.max(520, hitSpan(maxHits) * 1000 + 320) : 320;
                        const motion = move?.motion ?? 'lunge';
                        const run = ATTACK_WINDUP * 1000 - 20;
                        if (motion === 'lunge') dash(hero, tx - me.x - gap, charge * 1000, run, hold, 460);
                        else playHeroMotion(hero, motion, tx - me.x - gap, charge * 1000, run, hold, 460);
                        // 바람 암살자는 지나간 자리에 잔상이 남는다
                        if (heroLook === 'wind-hashashin') spawnAfterimages(field, hero, charge * 1000 + 40, run + hold + 200);
                        // 기사는 뛰어오르거나 기를 모은 큰 기술에서 금빛 잔상
                        else if (card?.cls === 'knight' && (motion === 'leap' || charge)) spawnAfterimages(field, hero, charge * 1000 + 40, run + 160, 'gold');
                        // 방패 기술: 방패를 들고 달려가 내밀어 친다
                        if (SHIELD_HIT.has(q.card ?? '')) spawnShield(hero, charge * 1000, charge * 1000 + ATTACK_WINDUP * 1000, charge * 1000 + run + hold + 420);
                    }
                }
                // 방패를 앞세우고 버티는 기술
                if (hero && SHIELD_GUARD.has(q.card ?? '')) spawnShield(hero, charge * 1000, charge * 1000 + 300, charge * 1000 + 1100, true);
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
                    for (const o of hitOffsets(q.hits ?? 1, false)) throwProjectile(field, look.ranged, el, hero, hitAt + o * 800 - PROJECTILE_MS);
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
        for (const f of c.fx.filter((f) => f.id > seenFx.current && f.proc)) showProc(field, f, q0Target(c));
        for (const f of c.fx.filter((f) => f.id > seenFx.current && f.kind === 'dmg' && !f.dot && f.target !== 'player'))
            if (Math.random() < 0.15) say(field, c, f.target, 'hurt', f.delay * 1000 + 120);
        // 피격 반응: 맞은 쪽이 뒤로 밀리고 번쩍인다. 주인공이 맞으면 화면 가장자리도 붉게
        for (const f of c.fx.filter((f) => f.id > seenFx.current && f.kind === 'dmg' && !f.dot && (f.amount ?? 0) > 0)) {
            const toPlayer = f.target === 'player';
            const body = field.querySelector<HTMLElement>(`[data-body="${f.target}"]`);
            const sprite = body?.querySelector<HTMLElement>('.fighter-sprite') ?? body?.firstElementChild as HTMLElement | null;
            const amt = f.amount ?? 0;
            const at = f.delay * 1000;
            // 연타: 같은 대상에 0.4초 안쪽으로 이어지는 타격들
            const mates = c.fx.filter((g) => g.kind === 'dmg' && !g.dot && g.target === f.target && g.id !== f.id && Math.abs(g.delay - f.delay) < 0.4);
            const chainNext = mates.some((g) => g.delay > f.delay);
            const finale = !chainNext && mates.some((g) => g.delay < f.delay);
            const push = Math.min(28, 8 + amt * 0.9) * (toPlayer ? -1 : 1) * (f.crit ? 1.5 : 1) * (finale ? 1.3 : 1);
            if (sprite && chainNext) {
                // 중간 타격: 매 타마다 짧고 날카롭게 움찔 (번쩍 + 작은 넉백)
                const jolt = Math.min(12, 6 + amt * 0.4) * (toPlayer ? -1 : 1) * (f.crit ? 1.5 : 1);
                sprite.animate(
                    [
                        { transform: 'translateX(0) scale(1,1)', filter: toPlayer ? 'brightness(1.1) sepia(1) saturate(9) hue-rotate(-50deg)' : 'brightness(2.6) saturate(0)', easing: 'cubic-bezier(0.1,0.9,0.2,1)' },
                        { transform: `translateX(${jolt}px) rotate(${toPlayer ? -3 : 3}deg) scale(1.06,0.94)`, filter: 'brightness(1.4)', offset: 0.2, easing: 'cubic-bezier(0.4,0,0.6,1)' },
                        { transform: `translateX(${jolt * 0.4}px) scale(1,1)`, filter: 'none', offset: 0.6 },
                        { transform: 'translateX(0) scale(1,1)', filter: 'none' },
                    ],
                    { duration: 200, delay: at, composite: 'add' },
                );
                // 맞을수록 조금씩 뒤로 밀린다 (연타가 끝나면 천천히 제자리로)
                const end = Math.max(...mates.map((g) => g.delay)) * 1000;
                const span = end - at + 520;
                const step = 3 * (toPlayer ? -1 : 1);
                sprite.animate(
                    [
                        { transform: 'translateX(0)', offset: 0 },
                        { transform: `translateX(${step}px)`, offset: Math.min(0.2, 60 / span) },
                        { transform: `translateX(${step}px)`, offset: (end - at + 120) / span, easing: 'cubic-bezier(0.4,0,0.2,1)' },
                        { transform: 'translateX(0)', offset: 1 },
                    ],
                    { duration: span, delay: at, composite: 'add' },
                );
            } else if (sprite) {
                // 맞는 순간 확 밀려나며 찌그러졌다가(빠르게) 천천히 제자리로 (느리게)
                const squash = Math.min(0.2, 0.06 + amt * 0.008) * (f.crit ? 1.4 : 1);
                sprite.animate(
                    [
                        { transform: 'translateX(0) scale(1,1)', filter: toPlayer ? 'brightness(1.1) sepia(1) saturate(9) hue-rotate(-50deg)' : 'brightness(3) saturate(0)', easing: 'cubic-bezier(0.1,0.9,0.2,1)' },
                        { transform: `translateX(${push}px) rotate(${toPlayer ? -4 : 4}deg) scale(${1 + squash},${1 - squash})`, filter: toPlayer ? 'brightness(1) sepia(0.8) saturate(5) hue-rotate(-50deg)' : 'brightness(1.6)', offset: 0.18, easing: 'cubic-bezier(0.3,0,0.3,1)' },
                        { transform: `translateX(${push * 0.75}px) rotate(${toPlayer ? -1 : 1}deg) scale(${1 - squash * 0.4},${1 + squash * 0.4})`, filter: 'none', offset: 0.45, easing: 'cubic-bezier(0.4,0,0.2,1)' },
                        { transform: 'translateX(0) scale(1,1)', filter: 'none' },
                    ],
                    { duration: (toPlayer ? 460 : 380) + Math.min(160, amt * 6), delay: at, composite: 'add' },
                );
            }
            if (toPlayer && amt >= 8 && Math.random() < 0.35) heroSay(field, cls, 'hurt', at + 200);
            if (toPlayer && !saidLow.current && c.player.hp > 0 && c.player.hp <= c.player.maxHp * 0.3) {
                saidLow.current = true;
                heroSay(field, cls, 'low', at + 500);
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
            // 히트스톱도 피해 단계를 따라 길어진다
            // 주인공을 쓰러뜨린 마지막 일격은 오래 멈춘다
            const lethal = f.target === 'player' && c.result === 'lose' && f === c.fx.filter((g) => g.kind === 'dmg' && g.target === 'player').at(-1);
            // 연타: 중간 타격은 짧게 끊어 속도감을, 마지막 한 방은 길게 멈춰 무게를
            const near = (g: Fx) => g.kind === 'dmg' && !g.dot && g.target === f.target && Math.abs(g.delay - f.delay) < 0.4 && g.id !== f.id;
            const chainNext = c.fx.some((g) => near(g) && g.delay > f.delay);
            const chainPrev = c.fx.some((g) => near(g) && g.delay < f.delay);
            const finale = !chainNext && chainPrev;
            const baseHold = (dmg >= 10 ? 180 : dmg >= 8 ? 150 : dmg >= 6 ? 120 : dmg >= 3 ? 90 : 60) + (f.target === 'player' ? 40 : 0);
            const hold = lethal ? 420 : chainNext ? (f.crit ? 90 : 40) : baseHold + (finale ? 70 : 0) + (f.crit ? 90 : 0);
            clock.current.windows.push([start, start + hold]);
            // 히트스톱 동안 때린 쪽·맞은 쪽 몸 움직임도 멈춘다 (스프라이트만 멈추면 몸이 미끄러져 보임)
            // 장면 전체가 멈춘다: 때린 쪽(주인공 또는 달려든 몬스터)과 맞은 쪽 모두
            const bodies = Array.from(field.querySelectorAll<HTMLElement>('[data-body]'));
            window.setTimeout(() => {
                const anims = bodies.flatMap((b) => b?.getAnimations() ?? []).filter((a) => a.playState === 'running');
                anims.forEach((a) => a.pause());
                window.setTimeout(() => anims.forEach((a) => a.play()), hold);
            }, f.delay * 1000);
            // 화면 흔들림은 피해 4부터, 6·8·10에서 한 단계씩 커진다 (하스스톤 미니언 타격 단계)
            const amp0 = (dmg >= 10 ? 9 : dmg >= 8 ? 7 : dmg >= 6 ? 5 : dmg >= 4 ? 2 : 0) * (f.target === 'player' ? 1.3 : 1);
            const amp = lethal ? 12 : chainNext ? Math.min(amp0, 3) + (f.crit ? 3 : 0) : amp0 + (finale ? 3 : 0) + (f.crit ? 4 : 0);
            if (f.crit) {
                // 치명타: 한 프레임 하얗게 + 화면이 앞으로 확 다가왔다 돌아온다
                const flash = document.createElement('div');
                flash.className = 'crit-flash';
                field.appendChild(flash);
                const fa = flash.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: 140, delay: f.delay * 1000, fill: 'both', easing: 'ease-out' });
                fa.finished.then(() => flash.remove()).catch(() => flash.remove());
                field.animate([{ scale: '1' }, { scale: '1.04', offset: 0.25 }, { scale: '1' }], { duration: 220, delay: f.delay * 1000, easing: 'cubic-bezier(0.2,0.8,0.3,1)' });
            }
            if (lethal) {
                // 마지막 일격: 화면이 하얗게 번쩍이고 흑백으로 가라앉는다
                const flash = document.createElement('div');
                flash.className = 'lethal-flash';
                field.appendChild(flash);
                const a = flash.animate([{ opacity: 0 }, { opacity: 0.85, offset: 0.08 }, { opacity: 0 }], { duration: 700, delay: f.delay * 1000, fill: 'both' });
                a.finished.then(() => flash.remove()).catch(() => flash.remove());
                field.animate([{ filter: 'none' }, { filter: 'grayscale(0.85) brightness(0.8)' }], { duration: 900, delay: f.delay * 1000 + 300, fill: 'forwards', easing: 'ease-out' });
            }
            if (amp > 0)
                field.animate(
                    [
                        { transform: 'translate(0,0)' },
                        { transform: `translate(${amp}px,${-amp / 3}px)` },
                        { transform: `translate(${-amp}px,${amp / 3}px)` },
                        { transform: `translate(${amp / 1.5}px,0)` },
                        { transform: `translate(${-amp / 3}px,0)` },
                        { transform: 'translate(0,0)' },
                    ],
                    { duration: 160 + amp * 14, delay: f.delay * 1000, easing: 'steps(1, end)', composite: 'replace' },
                );
            // 9부터: 판 위 UI(의도·상태·손패·버튼)까지 덜컹
            if (dmg >= 9)
                for (const el of document.querySelectorAll<HTMLElement>('.hud, .hand-left, .hand-right, .intent'))
                    el.animate(
                        [{ transform: 'translateY(0)' }, { transform: 'translateY(-4px) rotate(-1deg)' }, { transform: 'translateY(2px) rotate(1deg)' }, { transform: 'translateY(0)' }],
                        { duration: 260, delay: f.delay * 1000 + 30, easing: 'ease-out', composite: 'add' },
                    );
            // 10부터: 충격파에 맞지 않은 쪽들도 튀어 오른다
            if (dmg >= 10)
                field.querySelectorAll<HTMLElement>('[data-body]').forEach((b, i) => {
                    if (b.dataset.body === f.target) return;
                    b.animate(
                        [{ transform: 'translateY(0)' }, { transform: 'translateY(-12px)', easing: 'cubic-bezier(0.4,0,1,1)' }, { transform: 'translateY(0) scale(1.06,0.94)' }, { transform: 'translateY(0)' }],
                        { duration: 360, delay: f.delay * 1000 + 60 + i * 25, easing: 'cubic-bezier(0,0.6,0.4,1)', composite: 'add' },
                    );
                });
        }
        if (c.fx.length) seenFx.current = c.fx[c.fx.length - 1].id;
    }, [c.fx, c.cues, fieldRef, clock, setHeroAction]);
}

export function CombatScreen({ combat: c, biome, seed, hero, cls, dispatch }: { combat: CombatState; biome: string; seed: number; hero: string; cls: ClassId; dispatch: Dispatch<Action> }) {
    const [selected, setSelected] = useState<number | null>(null);
    const [enemyTurn, setEnemyTurn] = useState(false);
    const [pile, setPile] = useState<null | 'draw' | 'discard' | 'exhaust'>(null);
    const fieldRef = useRef<HTMLDivElement>(null);
    const clock = useRef<HitStopClock>({ windows: [] });
    // 분위기 효과: 화면 전체에 깔리는 날씨(두 겹 원근) / 하나짜리 생물·횃불
    const weather = useMemo(() => (AMBIENT[biome] ?? []).filter((a) => a.tile), [biome]);
    const critters = useMemo(() => (AMBIENT[biome] ?? []).filter((a) => !a.tile), [biome]);
    const living = c.enemies.filter((e) => e.hp > 0);
    const locked = enemyTurn || !!c.result;
    const [showResult, setShowResult] = useState(false);
    // 전투 시작: 졸개 하나가 한마디
    useEffect(() => {
        const field = fieldRef.current;
        const foes = c.enemies.filter((e) => e.hp > 0);
        if (field && Math.random() < 0.6) heroSay(field, cls, 'start', 250);
        if (field && foes.length) say(field, c, foes[Math.floor(Math.random() * foes.length)].uid, 'start', 1300);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => setSelected(null), [c.hand.length, c.turn]);
    useEffect(() => {
        if (!c.result) {
            setShowResult(false);
            return;
        }
        // 마지막 타격과 쓰러지는 동작(연기까지)을 다 보여 준 뒤에 결과 창을 띄운다
        const last = Math.max(0, ...c.cues.map((q) => q.delay), ...c.fx.map((f) => f.delay));
        const wait = last * 1000 + (c.result === 'win' ? 1700 : 1500);
        const t = window.setTimeout(() => {
            setShowResult(true);
            if (c.result === 'win') sfx.victory();
            else sfx.defeat();
        }, wait);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [c.result]);
    const [heroAction, setHeroAction] = useState<HeroAction | null>(null);
    // 적마다 가장 최근 공격 신호 → 몬스터 덮치기 동작
    const attacks: Record<string, MonsterAttack> = {};
    for (const q of c.cues) if (q.kind === 'enemyAttack' && q.source) attacks[q.source] = { id: q.id, hitIn: q.delay + IMPACT_DELAY };
    // 적마다 가장 최근에 맞은 순간 → 피격 동작
    const hurts: Record<string, { id: number; delay: number }> = {};
    for (const f of c.fx) if (f.kind === 'dmg' && f.target !== 'player') hurts[f.target] = { id: f.id, delay: f.delay };
    // 쓰러지는 순간(초): 상태는 카드를 내자마자 바뀌지만, 연출은 일격이 닿을 때 시작한다
    const dies: Record<string, number> = {};
    for (const q of c.cues) if (q.kind === 'death' && q.target) dies[q.target] = q.delay;
    // 주인공이 쓰러지는 순간: 마지막으로 맞은 때
    const heroDieIn = c.result === 'lose' ? Math.max(0, ...c.fx.filter((f) => f.kind === 'dmg' && f.target === 'player').map((f) => f.delay)) : 0;
    // 카드별 무기 스프라이트 (바꿔 들 때 그림이 없어 깜박이지 않게 미리 불러 둔다)
    const [skin, setSkin] = useState<string | null>(null);
    useEffect(() => {
        for (const s of Object.values(CARD_SKIN[hero] ?? {})) for (const a of Object.keys(spriteInfo(s)?.anims ?? {})) spriteImage(s, a);
    }, [hero]);
    useJuice(hero, c, fieldRef, clock, setHeroAction, cls, setSkin);
    const tagOf = (card: CardInst) => readyTag(card, c);

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

    // 카드를 내면 남은 카드가 빈자리 쪽으로 한 장씩 차례로 미끄러져 놓인다.
    // (레이아웃은 바로 바뀌므로, 바뀌기 전 자리에서 새 자리로 옮겨 가는 것처럼 보이게 한다)
    const handPos = useRef(new Map<string, DOMRect>());
    useLayoutEffect(() => {
        const el = handRef.current;
        if (!el) return;
        const slots = Array.from(el.querySelectorAll<HTMLElement>('.hand-slot[data-uid]'));
        const next = new Map<string, DOMRect>();
        const moves: { card: HTMLElement; dx: number; dy: number; dist: number }[] = [];
        for (const s of slots) {
            const r = s.getBoundingClientRect();
            next.set(s.dataset.uid!, r);
            const prev = handPos.current.get(s.dataset.uid!);
            const card = s.querySelector<HTMLElement>('.card');
            if (!prev || !card || s.classList.contains('dragging')) continue;
            const dx = prev.left - r.left;
            const dy = prev.top - r.top;
            if (Math.abs(dx) + Math.abs(dy) > 2) moves.push({ card, dx, dy, dist: Math.abs(dx) });
        }
        // 가장 조금 움직이는 카드(빈자리 바로 옆)부터 차례로
        moves.sort((a, b) => a.dist - b.dist);
        moves.forEach((m, k) =>
            m.card.animate([{ transform: `translate(${m.dx}px, ${m.dy}px)` }, { transform: `translate(0, -6px)`, offset: 0.8 }, { transform: 'none' }], {
                duration: 340,
                delay: k * 60,
                easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)',
                fill: 'backwards',
            }),
        );
        handPos.current = next;
    }, [c.hand]);

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
        // 휴대폰에서 손을 뗀 신호가 사라지면(알림·앱 전환·스크롤) 카드가 집힌 채로 남는다 → 창을 벗어나면 놓는다
        window.addEventListener('blur', onCancel);
        document.addEventListener('visibilitychange', onCancel);
        return () => {
            window.removeEventListener('blur', onCancel);
            document.removeEventListener('visibilitychange', onCancel);
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
            setTimeout(() => setEnemyTurn(false), 300 + (ENEMY_LEAD + acting * ENEMY_STEP) * 1000);
        }, 500); // "적의 차례" 배너를 잠깐 보여 준 뒤 (적은 ENEMY_LEAD 동안 기를 모으고 달려든다)
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
                {/* 분위기 효과 두 겹: 먼 층(작고 흐리고 느림) + 가까운 층 → 원근감, 캐릭터는 가리지 않게 작게 */}
                <FxCanvas container={fieldRef} ambient={weather} className="fx-back weather far" clock={clock} ambientScale={0.5} ambientSpeed={0.6} />
                <FxCanvas container={fieldRef} ambient={weather} className="fx-back weather near" clock={clock} ambientScale={0.75} />
                {/* 나비·새·도깨비불·횃불 같은 하나짜리는 한 겹만 */}
                <FxCanvas container={fieldRef} ambient={critters} className="fx-back" clock={clock} ambientScale={0.75} />
                <div className={`fighter player-side ${drag?.moved && !drag.target ? `self-aim ${drag.release ? "ready" : ""}` : ""}`}>
                    <div data-body="player">
                        <Shake fx={c.fx} target="player">
                            <HeroView char={skin ?? hero} action={heroAction} clock={clock} scale={4} dead={c.result === 'lose'} deadIn={heroDieIn} />
                        </Shake>
                    </div>
                    <FxLayer fx={c.fx} target="player" />
                    <LandedHpBar fx={c.fx} target="player" hp={c.player.hp} max={c.player.maxHp} block={c.player.block} />
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
                                style={{ ['--die' as string]: `${dies[e.uid] ?? 0}s` }}
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
                                            deadIn={dies[e.uid]}
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
                                <LandedHpBar fx={c.fx} target={e.uid} hp={e.hp} max={e.maxHp} block={e.block} />
                                <StatusList status={e.status} />
                            </div>
                        );
                    })}
                </div>

                <div className="bd-front" aria-hidden />
                {/* 이펙트 두 층: 큰 폭발·충격파는 캐릭터 뒤, 칼날·불꽃 튐은 앞 (맞는 몸이 가려지지 않게) */}
                <FxCanvas cues={c.cues} impacts={c.fx} container={fieldRef} className="fx-mid" clock={clock} layer="behind" />
                <FxCanvas cues={c.cues} impacts={c.fx} container={fieldRef} className="fx-front" clock={clock} layer="front" />
                <FxCanvas numbers={c.fx} container={fieldRef} className="fx-numbers" clock={clock} pixel={4} numberKind="normal" />
                {/* 치명타 숫자는 그림이 커서 한 단계 작은 도트로, 몬스터 머리 위 비스듬히 */}
                <FxCanvas numbers={c.fx} container={fieldRef} className="fx-numbers" clock={clock} pixel={2} numberKind="crit" />
                {enemyTurn && !c.result && <div className="turn-banner">적의 차례</div>}
                {drag?.moved && !drag.target && <div className="target-hint self">[{cardStats(c.hand[drag.idx] ?? { id: drag.card, upgraded: false }).name}] 대상이 필요 없어요 · 위로 끌어 올려 놓으면 사용</div>}
                {selectedCard && <div className="target-hint">[{cardStats(selectedCard).name}] 적에게 끌어다 놓거나 적을 누르세요 · Esc 취소</div>}
            </div>

            <div className="hand-area">
                <div className="hand-left">
                    {cls === 'rogue' && (c.played ?? 0) > 0 && (
                        <div className="combo-count" key={c.played} title="이번 턴에 낸 카드 수 (연계 카드가 강해진다)">
                            연계 <b>{c.played}</b>
                        </div>
                    )}
                    {cls === 'mage' && c.lastEl && (
                        <div className={`combo-count el-now pe-${c.lastEl}`} key={c.lastEl} title="직전에 쓴 원소: 같은 원소면 공명, 다른 원소면 반응">
                            원소 <b>{ELEMENT_NAME[c.lastEl]}</b>
                        </div>
                    )}
                    <div className="energy-wrap">
                        <div className="energy" title="에너지">
                            {c.energy}/{c.maxEnergy}
                        </div>
                        {/* 하스스톤처럼 마나 수정 줄: 남은 것은 밝게, 쓴 것은 비게 */}
                        <div className="mana-pips" aria-hidden>
                            {Array.from({ length: Math.max(c.maxEnergy, c.energy) }, (_, k) => (
                                <i key={k} className={k < c.energy ? 'on' : ''} />
                            ))}
                        </div>
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
                            data-uid={card.uid}
                            className={`hand-slot ${dragging ? 'dragging' : ''} ${lift && drag.release ? 'will-play' : ''} ${tagOf(card) ? `combo-ready ${tagOf(card)!.cls}` : ''} ${!locked && canPlay(c, card) ? 'playable' : ''}`} data-tag={tagOf(card)?.tag}
                            style={{
                                ['--i' as string]: i,
                                ['--n' as string]: c.hand.length,
                                // 끄는 방향으로 카드가 살짝 기운다 (하스스톤처럼 손에 쥔 실물 느낌)
                                ...(lift ? { transform: `translate(${drag.x - drag.x0}px, ${drag.y - drag.y0}px) rotate(${Math.max(-12, Math.min(12, (drag.x - drag.x0) * 0.05))}deg) scale(1.06)` } : {}),
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
                    <button className={`btn btn-end ${!locked && !c.hand.some((h) => canPlay(c, h)) ? 'no-plays' : ''}`} onClick={doEndTurn} disabled={locked}>
                        {/* key가 바뀌면 다시 그려지며 판이 뒤집히는 동작이 나온다 */}
                        <span className="end-face" key={locked ? 'enemy' : 'mine'}>
                            <span className="end-arrow" aria-hidden>➜</span>
                            <span className="end-label">{locked && !c.result ? '적의 차례' : '턴 종료'}</span>
                        </span>
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

            {c.result && showResult && (
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
