// 카드마다 주인공의 고유 동작: 어떤 스프라이트 동작을 쓰고, 몸은 어떻게 움직이는지.
//  lunge 돌진 · leap 뛰어올라 내려찍기 · slide 낮게 미끄러지며 찌르기 · blink 사라졌다 적 앞에 나타남 · stay 제자리
export type HeroMotion = 'lunge' | 'leap' | 'slide' | 'blink' | 'stay';

export interface HeroMove {
    /** 앞에서부터 이 캐릭터에게 있는 동작을 쓴다 */
    anims: string[];
    motion: HeroMotion;
}

const M = (anims: string[], motion: HeroMotion): HeroMove => ({ anims, motion });

export const CARD_MOVE: Record<string, HeroMove> = {
    // 기사 (모험가): 가로베기 / 올려베기 / 내려찍기 / 3연격
    slash: M(['attack'], 'lunge'),
    torch_swing: M(['attack2', 'attack'], 'lunge'),
    shield_bash: M(['attack3', 'attack'], 'slide'),
    shield_slam: M(['attack3', 'attack'], 'slide'),
    sweep: M(['attack2', 'attack'], 'lunge'),
    heavy_blow: M(['attack3', 'attack2'], 'leap'),
    blood_strike: M(['attack2', 'attack'], 'lunge'),
    cleave_line: M(['combo', 'attack2'], 'lunge'),
    oath_blade: M(['attack3', 'attack2'], 'leap'),
    chain_strike: M(['combo', 'attack'], 'lunge'),
    execution: M(['attack3', 'attack2'], 'leap'),
    rising_slash: M(['attack2', 'attack'], 'slide'),
    momentum: M(['attack', 'attack2'], 'lunge'),
    // 마법사 (물 사제): 제자리에서 손짓 / 긴 주문 / 연속 시전 / 대마법 / 공중 시전
    spark: M(['attack'], 'stay'),
    frost_bolt: M(['attack'], 'stay'),
    frost_touch: M(['attack'], 'stay'),
    ignite: M(['attack'], 'stay'),
    ice_lance: M(['airAttack', 'attack'], 'stay'),
    shatter: M(['airAttack', 'attack'], 'stay'),
    fireball: M(['attack2', 'attack'], 'stay'),
    combust: M(['attack2', 'attack'], 'stay'),
    fire_ring: M(['attack2', 'attack'], 'stay'),
    chain_lightning: M(['combo', 'attack'], 'stay'),
    arcane_missiles: M(['combo', 'attack'], 'stay'),
    flame_chain: M(['combo', 'attack'], 'stay'),
    thunder: M(['special', 'attack2'], 'stay'),
    blizzard: M(['special', 'attack2'], 'stay'),
    tidal_wave: M(['special', 'attack2'], 'stay'),
    // 도적 (바람 암살자): 찌르기 / 2연격 / 연속 베기 / 필살 / 공중 베기
    stab: M(['attack'], 'slide'),
    poison_stab: M(['attack'], 'slide'),
    quick_slash: M(['attack'], 'slide'),
    twin_cut: M(['attack2', 'attack'], 'lunge'),
    venom_burst: M(['attack2', 'attack'], 'lunge'),
    venom_dagger: M(['combo', 'attack2'], 'lunge'),
    shred: M(['combo', 'attack2'], 'lunge'),
    gale: M(['combo', 'attack2'], 'blink'),
    backstab: M(['special', 'attack2'], 'blink'),
    assassinate: M(['special', 'attack2'], 'blink'),
    shadow_dance: M(['combo', 'special'], 'blink'),
    blade_storm: M(['special', 'combo'], 'leap'),
    finisher: M(['airAttack', 'attack2'], 'leap'),
    dagger_throw: M(['attack'], 'stay'),
    // 궁극기
    titan_strike: M(['attack3', 'combo'], 'leap'),
    meteor: M(['special', 'attack2'], 'stay'),
    absolute_zero: M(['special', 'attack2'], 'stay'),
    thousand_cuts: M(['combo', 'special'], 'blink'),
    death_mark: M(['special', 'attack2'], 'blink'),
};

/**
 * 주인공 몸 움직임. dx는 대상 앞까지 거리(오른쪽 +).
 * startIn 뒤 run 동안 다가가고, hold 동안 머문 뒤, back 동안 돌아온다.
 */
export function playHeroMotion(el: HTMLElement, motion: HeroMotion, dx: number, startIn: number, run: number, hold: number, back: number) {
    if (motion === 'stay') return;
    const total = run + hold + back;
    const o = (ms: number) => Math.min(1, Math.max(0, ms / total));
    let frames: Keyframe[];
    switch (motion) {
        case 'leap':
            // 웅크렸다 높이 뛰어올라 대상 위에서 내려찍는다
            frames = [
                { transform: 'translate(0,0) scale(1,1)', easing: 'ease-out' },
                { transform: 'translate(-6px,4px) scale(1.1,0.85)', offset: o(run * 0.2), easing: 'cubic-bezier(0.3,0.6,0.5,1)' },
                { transform: `translate(${dx * 0.55}px,-120px) scale(0.95,1.08)`, offset: o(run * 0.7), easing: 'cubic-bezier(0.6,0,1,0.6)' },
                { transform: `translate(${dx}px,0) scale(1.15,0.85)`, offset: o(run) },
                { transform: `translate(${dx}px,0) scale(1,1)`, offset: o(run + 100) },
                { transform: `translate(${dx}px,0)`, offset: o(run + hold), easing: 'cubic-bezier(0.45,0,0.35,1)' },
                { transform: `translate(${dx * 0.5}px,-50px)`, offset: o(run + hold + back * 0.5), easing: 'cubic-bezier(0.45,0,0.35,1)' },
                { transform: 'translate(0,0)' },
            ];
            break;
        case 'slide':
            // 몸을 낮추고 바닥을 쓸 듯 미끄러져 들어가 찌른다
            frames = [
                { transform: 'translate(0,0) skewX(0deg)', easing: 'ease-out' },
                { transform: 'translate(-8px,6px) skewX(8deg)', offset: o(run * 0.3), easing: 'cubic-bezier(0.7,0,0.9,0.5)' },
                { transform: `translate(${dx + 18}px,8px) skewX(-14deg)`, offset: o(run), easing: 'cubic-bezier(0.1,0.8,0.3,1)' },
                { transform: `translate(${dx}px,0) skewX(0deg)`, offset: o(run + 140) },
                { transform: `translate(${dx}px,0)`, offset: o(run + hold), easing: 'cubic-bezier(0.45,0,0.35,1)' },
                { transform: 'translate(0,0)' },
            ];
            break;
        case 'blink':
            // 연기처럼 사라졌다가 대상 바로 앞에 나타난다
            frames = [
                { transform: 'translate(0,0)', opacity: 1 },
                { transform: 'translate(-6px,0)', opacity: 1, offset: o(run * 0.4) },
                { transform: 'translate(-6px,0) scaleX(0.2)', opacity: 0, offset: o(run * 0.55) },
                { transform: `translate(${dx}px,0) scaleX(0.2)`, opacity: 0, offset: o(run * 0.8) },
                { transform: `translate(${dx}px,0) scaleX(1)`, opacity: 1, offset: o(run) },
                { transform: `translate(${dx}px,0)`, opacity: 1, offset: o(run + hold) },
                { transform: `translate(${dx}px,0) scaleX(0.2)`, opacity: 0, offset: o(run + hold + 80) },
                { transform: 'translate(0,0) scaleX(0.2)', opacity: 0, offset: o(run + hold + back * 0.6) },
                { transform: 'translate(0,0) scaleX(1)', opacity: 1 },
            ];
            break;
        default:
            frames = [
                { transform: 'translateX(0)', easing: 'cubic-bezier(0.3, 0, 0.5, 1)' },
                { transform: 'translateX(-10px)', offset: o(run * 0.25), easing: 'cubic-bezier(0.6, 0, 0.9, 0.7)' },
                { transform: `translateX(${dx + 10}px)`, offset: o(run), easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
                { transform: `translateX(${dx}px)`, offset: o(run + Math.min(120, hold * 0.4)) },
                { transform: `translateX(${dx}px)`, offset: o(run + hold), easing: 'cubic-bezier(0.45, 0, 0.35, 1)' },
                { transform: 'translateX(0)' },
            ];
    }
    const fighter = el.closest<HTMLElement>('.fighter');
    const delay = Math.max(0, startIn);
    const anim = el.animate(frames, { duration: total, delay });
    window.setTimeout(() => fighter && (fighter.style.zIndex = '4'), delay);
    anim.finished.then(() => fighter && (fighter.style.zIndex = '')).catch(() => {});
}
