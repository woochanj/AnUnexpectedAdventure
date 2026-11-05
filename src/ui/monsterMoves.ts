// 적의 공격 몸동작과 쓰러지는 방식. 스프라이트 동작이 적은 몬스터도
// 몸 전체를 움직여(뛰어들기·급강하·돌진·연타) 매번 다르게 보이게 한다.
import type { EnemyDef } from '../game/types';

export type AttackMove = 'lunge' | 'pounce' | 'swoop' | 'charge' | 'flurry';
export type DeathMove = 'topple' | 'melt' | 'flicker' | 'crumble' | 'launch' | 'sink';

type Look = EnemyDef['look'];
const key = (look: Look) => (look.kind === 'sprite' ? look.sprite ?? '' : look.kind);

const FLYERS = new Set(['bat', 'bird', 'bee', 'ghost', 'wraith', 'eye', 'flying-eye', 'flameskull']);
const HOPPERS = new Set(['slime', 'spider', 'fish', 'ooze', 'rat']);
const HEAVY = new Set(['beetle', 'ghoul', 'knight', 'gargoyle', 'skeleton', 'mushroom', 'goblin', 'cultist']);
const SQUISHY = new Set(['slime', 'ooze', 'mushroom', 'fish']);
const BONY = new Set(['skeleton', 'knight', 'gargoyle', 'flameskull']);

/** 이 몬스터가 쓸 공격 동작. seed로 후보 중 하나를 골라 매번 조금씩 다르게 */
export function pickAttack(look: Look, hits: number, dmg: number, seed: number): AttackMove {
    const k = key(look);
    if (hits >= 3) return 'flurry';
    const cands: AttackMove[] = FLYERS.has(k) ? ['swoop', 'swoop', 'lunge'] : HOPPERS.has(k) ? ['pounce', 'pounce', 'lunge'] : HEAVY.has(k) ? ['charge', 'lunge'] : ['lunge', 'pounce'];
    if (dmg >= 14 && !FLYERS.has(k)) return HOPPERS.has(k) ? 'pounce' : 'charge';
    return cands[seed % cands.length];
}

export function pickDeath(look: Look, hasDeathAnim: boolean, bigHit: boolean): DeathMove {
    const k = key(look);
    // 크게 맞고 쓰러지면 날아간다
    if (bigHit) return 'launch';
    if (hasDeathAnim) return 'sink';
    if (FLYERS.has(k)) return 'flicker';
    if (SQUISHY.has(k)) return 'melt';
    if (BONY.has(k)) return 'crumble';
    return 'topple';
}

/**
 * 공격 몸동작. el은 몬스터 몸, dx는 주인공 앞까지의 거리(왼쪽이 음수),
 * hitAt(ms 뒤)에 정확히 닿도록 앞뒤 시간을 맞춘다.
 */
export function playAttack(el: HTMLElement, move: AttackMove, dx: number, hitAt: number, hits: number, heavy: boolean) {
    const hold = hits * 140 + 120;
    const back = 280;
    let approach = 240;
    let frames: Keyframe[];
    const t = (ms: number, total: number) => Math.min(1, Math.max(0, ms / total));
    switch (move) {
        case 'pounce': {
            // 웅크렸다가 포물선으로 덮친다
            approach = 380;
            const crouch = 110;
            const total = approach + hold + back;
            frames = [
                { transform: 'translate(0,0) scale(1,1)', offset: 0 },
                { transform: 'translate(6px,0) scale(1.15,0.8)', offset: t(crouch, total) },
                { transform: `translate(${dx * 0.5}px,-90px) scale(0.9,1.15) rotate(-12deg)`, offset: t(crouch + (approach - crouch) * 0.5, total) },
                { transform: `translate(${dx}px,0) scale(1.25,0.8)`, offset: t(approach, total) },
                { transform: `translate(${dx}px,0) scale(1,1)`, offset: t(approach + 80, total) },
                { transform: `translate(${dx}px,0) scale(1,1)`, offset: t(approach + hold, total) },
                { transform: `translate(${dx * 0.5}px,-40px) scale(1,1)`, offset: t(approach + hold + back * 0.5, total) },
                { transform: 'translate(0,0) scale(1,1)', offset: 1 },
            ];
            run(el, frames, hitAt - approach, total);
            return;
        }
        case 'swoop': {
            // 높이 솟았다가 비스듬히 내리꽂는다
            approach = 420;
            const rise = 170;
            const total = approach + hold + back;
            frames = [
                { transform: 'translate(0,0) rotate(0deg)', offset: 0 },
                { transform: 'translate(24px,-80px) rotate(10deg)', offset: t(rise, total), easing: 'cubic-bezier(0.6,0,1,0.6)' },
                { transform: `translate(${dx}px,10px) rotate(-25deg)`, offset: t(approach, total) },
                { transform: `translate(${dx}px,0) rotate(-8deg)`, offset: t(approach + hold, total) },
                { transform: `translate(${dx * 0.4}px,-70px) rotate(8deg)`, offset: t(approach + hold + back * 0.6, total) },
                { transform: 'translate(0,0) rotate(0deg)', offset: 1 },
            ];
            run(el, frames, hitAt - approach, total);
            return;
        }
        case 'charge': {
            // 뒤로 물러나 힘을 모았다가 몸통 박치기
            approach = heavy ? 520 : 420;
            const wind = approach - 160;
            const total = approach + hold + back;
            frames = [
                { transform: 'translate(0,0) rotate(0deg) scale(1)', offset: 0 },
                { transform: `translate(30px,0) rotate(6deg) scale(${heavy ? 1.12 : 1.05})`, offset: t(wind * 0.6, total) },
                { transform: `translate(34px,0) rotate(7deg) scale(${heavy ? 1.12 : 1.05})`, offset: t(wind * 0.8, total) },
                { transform: `translate(28px,0) rotate(6deg) scale(${heavy ? 1.12 : 1.05})`, offset: t(wind, total), easing: 'cubic-bezier(0.7,0,1,0.5)' },
                { transform: `translate(${dx}px,0) rotate(-10deg) scale(1.08)`, offset: t(approach, total) },
                { transform: `translate(${dx + 14}px,0) rotate(0deg) scale(1)`, offset: t(approach + 90, total) },
                { transform: `translate(${dx + 14}px,0) rotate(0deg) scale(1)`, offset: t(approach + hold, total), easing: 'cubic-bezier(0.2,0.6,0.4,1)' },
                { transform: 'translate(0,0) rotate(0deg) scale(1)', offset: 1 },
            ];
            run(el, frames, hitAt - approach, total);
            return;
        }
        case 'flurry': {
            // 붙어서 앞뒤로 들썩이며 연타
            const per = 140;
            const total = approach + hits * per + 120 + back;
            frames = [{ transform: 'translate(0,0)', offset: 0, easing: 'cubic-bezier(0.55,0,0.9,0.6)' }, { transform: `translate(${dx}px,0)`, offset: t(approach, total) }];
            for (let i = 0; i < hits; i++) {
                const s = approach + i * per;
                frames.push({ transform: `translate(${dx - 16}px,-6px) rotate(-6deg)`, offset: t(s + per * 0.3, total) });
                frames.push({ transform: `translate(${dx + 10}px,0) rotate(4deg)`, offset: t(s + per * 0.75, total) });
            }
            frames.push({ transform: `translate(${dx}px,0)`, offset: t(total - back, total), easing: 'cubic-bezier(0.2,0.6,0.4,1)' });
            frames.push({ transform: 'translate(0,0)', offset: 1 });
            run(el, frames, hitAt - approach, total);
            return;
        }
        default: {
            const total = approach + hold + back;
            frames = [
                { transform: 'translateX(0)', offset: 0, easing: 'cubic-bezier(0.55, 0, 0.9, 0.6)' },
                { transform: `translateX(${dx}px)`, offset: t(approach, total) },
                { transform: `translateX(${dx}px)`, offset: t(approach + hold, total), easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)' },
                { transform: 'translateX(0)', offset: 1 },
            ];
            run(el, frames, hitAt - approach, total);
        }
    }
}

function run(el: HTMLElement, frames: Keyframe[], startIn: number, total: number) {
    const fighter = el.closest<HTMLElement>('.fighter');
    const delay = Math.max(0, startIn);
    const anim = el.animate(frames, { duration: total, delay });
    // 덮치는 동안은 다른 캐릭터보다 앞에
    window.setTimeout(() => fighter && (fighter.style.zIndex = '4'), delay);
    anim.finished.then(() => fighter && (fighter.style.zIndex = '')).catch(() => {});
}

/** 쓰러지는 동작. 끝난 모습을 유지한다 (그 뒤 .fighter.dead가 서서히 지운다) */
export function playDeath(el: HTMLElement, move: DeathMove, delayMs: number) {
    const o: KeyframeAnimationOptions = { delay: delayMs, fill: 'forwards' };
    // 쓰러지는 순간 하얗게 번쩍
    el.animate([{ filter: 'brightness(3) saturate(0)' }, { filter: 'brightness(1)' }], { duration: 160, delay: delayMs });
    switch (move) {
        case 'launch':
            el.animate(
                [
                    { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
                    { transform: 'translate(120px,-140px) rotate(200deg)', opacity: 1, offset: 0.45 },
                    { transform: 'translate(260px,-60px) rotate(420deg)', opacity: 0 },
                ],
                { ...o, duration: 750, easing: 'cubic-bezier(0.2,0.7,0.6,1)' },
            );
            break;
        case 'melt':
            el.style.transformOrigin = '50% 100%';
            el.animate(
                [
                    { transform: 'scale(1,1)' },
                    { transform: 'scale(1.3,0.6)', offset: 0.35 },
                    { transform: 'scale(1.6,0.15)', opacity: 0.8 },
                ],
                { ...o, duration: 700, easing: 'steps(6, end)' },
            );
            break;
        case 'flicker':
            el.animate(
                [
                    { transform: 'translateY(0)', opacity: 1 },
                    { opacity: 0.2, offset: 0.15 },
                    { opacity: 1, offset: 0.3 },
                    { opacity: 0.2, offset: 0.45 },
                    { opacity: 0.8, offset: 0.6 },
                    { transform: 'translateY(-70px)', opacity: 0 },
                ],
                { ...o, duration: 900 },
            );
            break;
        case 'crumble':
            el.style.transformOrigin = '50% 100%';
            el.animate(
                [
                    { transform: 'translate(0,0) rotate(0deg)' },
                    { transform: 'translate(-4px,4px) rotate(-4deg)', offset: 0.2 },
                    { transform: 'translate(4px,10px) rotate(5deg) scaleY(0.85)', offset: 0.45 },
                    { transform: 'translate(-2px,22px) rotate(-3deg) scaleY(0.55)', offset: 0.7 },
                    { transform: 'translate(0,34px) rotate(0deg) scaleY(0.25)', opacity: 0.7 },
                ],
                { ...o, duration: 800, easing: 'steps(5, end)' },
            );
            break;
        case 'topple':
            el.style.transformOrigin = '50% 100%';
            el.animate(
                [
                    { transform: 'rotate(0deg)' },
                    { transform: 'rotate(-12deg)', offset: 0.25 },
                    { transform: 'rotate(80deg) translateY(10px)', offset: 0.75, easing: 'cubic-bezier(0.5,0,1,1)' },
                    { transform: 'rotate(72deg) translateY(6px)', offset: 0.88 },
                    { transform: 'rotate(80deg) translateY(10px)' },
                ],
                { ...o, duration: 700 },
            );
            break;
        case 'sink':
            el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(8px)' }], { ...o, duration: 700, delay: delayMs + 300 });
            break;
    }
}
