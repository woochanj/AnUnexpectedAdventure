// 카드마다 주인공의 고유 동작: 어떤 스프라이트 동작을 쓰고, 몸은 어떻게 움직이는지.
// 같은 주인공이 쓰는 카드끼리는 (스프라이트 동작, 몸 움직임) 짝이 겹치지 않는다.
//
// 대상에게 다가가는 움직임 (dx = 대상 앞까지 거리)
//  lunge 돌진 · leap 뛰어올라 내려찍기 · slide 낮게 미끄러지며 찌르기 · blink 사라졌다 나타남
//  charge 어깨로 들이받기 · pierce 꿰뚫고 지나갔다 돌아옴 · zigzag 좌우로 꺾으며 파고듦
//  uppercut 들어가 치켜 올라감 · spinDash 돌면서 돌진 · hopIn 두 번 깡충 뛰어 들어감
//  backflip 치고 공중제비로 물러남 · stepIn 성큼 한 걸음 · dive 높이 떠서 비스듬히 내리꽂음 · roll 구르며 파고듦
// 제자리 움직임
//  stay 그대로 · hop 살짝 뜀 · crouch 웅크림 · kneel 한쪽 무릎 · rise 떠올랐다 내려옴 · spin 제자리 회전
//  recoil 시전 반동으로 뒤로 젖힘 · stomp 발 구르기 · sway 좌우로 흔들 · lean 앞으로 기울임 · pulse 숨 고르듯 부풂
//  shake 기운이 차올라 떨림 · backstep 뒤로 한 발 · float 둥실 떠 있음 · twirl 빙글 돌며 뜀 · bow 고개 숙임
export type HeroMotion =
    | 'lunge' | 'leap' | 'slide' | 'blink' | 'charge' | 'pierce' | 'zigzag' | 'uppercut' | 'spinDash' | 'hopIn' | 'backflip' | 'stepIn' | 'dive' | 'roll'
    | 'stay' | 'hop' | 'crouch' | 'kneel' | 'rise' | 'spin' | 'recoil' | 'stomp' | 'sway' | 'lean' | 'pulse' | 'shake' | 'backstep' | 'float' | 'twirl' | 'bow';

/** 대상에게 다가가지 않는 움직임 */
export const IN_PLACE = new Set<HeroMotion>(['stay', 'hop', 'crouch', 'kneel', 'rise', 'spin', 'recoil', 'stomp', 'sway', 'lean', 'pulse', 'shake', 'backstep', 'float', 'twirl', 'bow']);

export interface HeroMove {
    /** 앞에서부터 이 캐릭터에게 있는 동작을 쓴다 */
    anims: string[];
    motion: HeroMotion;
}

const M = (anims: string[], motion: HeroMotion): HeroMove => ({ anims, motion });

export const CARD_MOVE: Record<string, HeroMove> = {
    // ── 기사 (모험가) ──
    slash: M(['attack'], 'lunge'),
    torch_swing: M(['attack2', 'attack'], 'spinDash'),
    shield_bash: M(['attack3', 'attack'], 'charge'),
    shield_slam: M(['attack3', 'attack'], 'hopIn'),
    sweep: M(['attack2', 'attack'], 'pierce'),
    heavy_blow: M(['attack3', 'attack2'], 'leap'),
    blood_strike: M(['attack2', 'attack'], 'lunge'),
    cleave_line: M(['combo', 'attack2'], 'stepIn'),
    oath_blade: M(['attack3', 'attack2'], 'dive'),
    chain_strike: M(['combo', 'attack'], 'lunge'),
    execution: M(['attack2', 'attack'], 'leap'),
    rising_slash: M(['attack2', 'attack'], 'uppercut'),
    titan_strike: M(['combo', 'attack3'], 'leap'),
    guard: M(['defend', 'cast'], 'crouch'),
    crouch: M(['defend', 'idle'], 'kneel'),
    iron_wall: M(['defend', 'cast'], 'stomp'),
    fury: M(['special', 'cast'], 'shake'),
    thorn_stance: M(['special', 'cast'], 'sway'),
    war_cry: M(['airAttack', 'jump'], 'hop'),
    counter_stance: M(['defend', 'attack'], 'lean'),
    rally: M(['special', 'cast'], 'bow'),
    last_stand: M(['special', 'cast'], 'rise'),

    // ── 마법사 (물 사제): 모두 제자리 ──
    spark: M(['attack'], 'stay'),
    frost_bolt: M(['attack'], 'recoil'),
    frost_touch: M(['attack'], 'lean'),
    ignite: M(['attack'], 'sway'),
    ice_lance: M(['airAttack', 'attack'], 'stay'),
    shatter: M(['airAttack', 'attack'], 'stomp'),
    fireball: M(['attack2', 'attack'], 'stay'),
    combust: M(['attack2', 'attack'], 'shake'),
    fire_ring: M(['attack2', 'attack'], 'spin'),
    chain_lightning: M(['combo', 'attack'], 'stay'),
    arcane_missiles: M(['combo', 'attack'], 'sway'),
    flame_chain: M(['combo', 'attack'], 'twirl'),
    thunder: M(['special', 'attack2'], 'rise'),
    blizzard: M(['special', 'attack2'], 'spin'),
    tidal_wave: M(['special', 'attack2'], 'float'),
    meteor: M(['special', 'attack2'], 'stomp'),
    absolute_zero: M(['special', 'attack2'], 'kneel'),
    ward: M(['defend', 'cast'], 'hop'),
    arcane_shield: M(['defend', 'cast'], 'pulse'),
    focus: M(['special', 'cast'], 'bow'),
    frost_armor: M(['defend', 'cast'], 'stomp'),
    archmage: M(['special', 'cast'], 'twirl'),
    glacier: M(['defend', 'cast'], 'kneel'),
    mana_flow: M(['special', 'cast'], 'sway'),

    // ── 도적 (바람 암살자) ──
    stab: M(['attack'], 'slide'),
    poison_stab: M(['attack'], 'stepIn'),
    quick_slash: M(['attack'], 'pierce'),
    twin_cut: M(['attack2', 'attack'], 'lunge'),
    venom_burst: M(['attack2', 'attack'], 'hopIn'),
    venom_dagger: M(['combo', 'attack2'], 'zigzag'),
    shred: M(['combo', 'attack2'], 'spinDash'),
    gale: M(['combo', 'attack2'], 'blink'),
    backstab: M(['special', 'attack2'], 'blink'),
    assassinate: M(['special', 'attack2'], 'dive'),
    shadow_dance: M(['airAttack', 'combo'], 'zigzag'),
    blade_storm: M(['special', 'combo'], 'spinDash'),
    finisher: M(['airAttack', 'attack2'], 'leap'),
    dagger_throw: M(['attack'], 'recoil'),
    thousand_cuts: M(['combo', 'special'], 'pierce'),
    death_mark: M(['special', 'attack2'], 'uppercut'),
    dodge: M(['roll', 'defend'], 'backstep'),
    dagger_parry: M(['defend', 'attack'], 'crouch'),
    scout: M(['idle'], 'lean'),
    sand_throw: M(['attack'], 'crouch'),
    poison_fog: M(['special', 'cast'], 'sway'),
    expose: M(['idle'], 'bow'),
    shadow_step: M(['roll', 'idle'], 'rise'),
    toxic_bloom: M(['special', 'cast'], 'pulse'),
    smoke_bomb: M(['defend', 'cast'], 'spin'),
    shadow_chain: M(['airAttack', 'jump'], 'hop'),

    // ── 공용 ──
    momentum: M(['attack'], 'roll'),
    catch_breath: M(['idle'], 'pulse'),
    brace: M(['defend', 'idle'], 'backstep'),
    second_wind: M(['airAttack', 'cast'], 'spin'),
    regrowth: M(['defend', 'cast'], 'float'),
    frenzy: M(['airAttack', 'jump'], 'twirl'),
    bandage: M(['defend', 'idle'], 'bow'),
    adrenaline: M(['special', 'jump'], 'recoil'),
};

/** 원거리로만 싸우는 주인공이 근접 카드를 쓸 때 대신할 제자리 움직임 */
export const STILL_FOR: Partial<Record<HeroMotion, HeroMotion>> = { roll: 'hop' };

type KF = Keyframe[];

/** 대상에게 다가가는 움직임. o(ms)는 전체 시간 중 위치(0~1) */
function approach(motion: HeroMotion, dx: number, run: number, hold: number, back: number, o: (ms: number) => number): KF {
    const at = (x: number, y = 0, extra = '') => `translate(${x}px,${y}px)${extra ? ' ' + extra : ''}`;
    const home: Keyframe = { transform: at(0) };
    const ret = (y = 0): Keyframe => ({ transform: at(dx, y), offset: o(run + hold), easing: 'cubic-bezier(0.45,0,0.35,1)' });
    switch (motion) {
        case 'leap':
            // 웅크렸다 높이 뛰어올라 대상 위에서 내려찍는다
            return [
                { transform: at(0, 0, 'scale(1,1)'), easing: 'ease-out' },
                { transform: at(-6, 4, 'scale(1.1,0.85)'), offset: o(run * 0.2), easing: 'cubic-bezier(0.3,0.6,0.5,1)' },
                { transform: at(dx * 0.55, -120, 'scale(0.95,1.08)'), offset: o(run * 0.7), easing: 'cubic-bezier(0.6,0,1,0.6)' },
                { transform: at(dx, 0, 'scale(1.15,0.85)'), offset: o(run) },
                { transform: at(dx, 0, 'scale(1,1)'), offset: o(run + 100) },
                ret(),
                { transform: at(dx * 0.5, -50), offset: o(run + hold + back * 0.5), easing: 'cubic-bezier(0.45,0,0.35,1)' },
                home,
            ];
        case 'slide':
            // 몸을 낮추고 바닥을 쓸 듯 미끄러져 들어가 찌른다
            return [
                { transform: at(0, 0, 'skewX(0deg)'), easing: 'ease-out' },
                { transform: at(-8, 6, 'skewX(8deg)'), offset: o(run * 0.3), easing: 'cubic-bezier(0.7,0,0.9,0.5)' },
                { transform: at(dx + 18, 8, 'skewX(-14deg)'), offset: o(run), easing: 'cubic-bezier(0.1,0.8,0.3,1)' },
                { transform: at(dx, 0, 'skewX(0deg)'), offset: o(run + 140) },
                ret(),
                home,
            ];
        case 'blink':
            // 연기 속으로 사라졌다가 대상 바로 앞에 나타난다. 돌아올 때는 뒤로 훌쩍 뛰어 물러난다
            // (돌아올 때도 투명해지면 공격할 때마다 캐릭터가 깜박여 버그처럼 보인다)
            return [
                { transform: at(0), opacity: 1 },
                { transform: at(-6, 2, 'scale(1.1,0.9)'), opacity: 1, offset: o(run * 0.4) },
                { transform: at(-6, 0, 'scaleX(0.2)'), opacity: 0, offset: o(run * 0.5) },
                { transform: at(dx, 0, 'scaleX(0.2)'), opacity: 0, offset: o(run * 0.78) },
                { transform: at(dx, 0, 'scaleX(1.15)'), opacity: 1, offset: o(run * 0.9) },
                { transform: at(dx, 0, 'scaleX(1)'), opacity: 1, offset: o(run) },
                { transform: at(dx), opacity: 1, offset: o(run + hold), easing: 'cubic-bezier(0.2,0.8,0.4,1)' },
                { transform: at(dx * 0.45, -60), opacity: 1, offset: o(run + hold + back * 0.5), easing: 'cubic-bezier(0.6,0,0.8,0.4)' },
                { transform: at(0), opacity: 1 },
            ];
        case 'charge':
            // 고개를 숙이고 어깨부터 들이받아 대상을 밀어붙인다
            return [
                { transform: at(0, 0, 'rotate(0deg)'), easing: 'ease-in' },
                { transform: at(-14, 2, 'rotate(-6deg)'), offset: o(run * 0.35), easing: 'cubic-bezier(0.8,0,1,0.6)' },
                { transform: at(dx + 22, 2, 'rotate(10deg)'), offset: o(run) },
                { transform: at(dx + 4, 0, 'rotate(2deg)'), offset: o(run + 120) },
                ret(),
                home,
            ];
        case 'pierce':
            // 대상을 꿰뚫고 뒤쪽까지 지나갔다가 돌아온다
            return [
                { transform: at(0, 0, 'skewX(0deg)'), easing: 'cubic-bezier(0.7,0,1,0.5)' },
                { transform: at(-8, 0, 'skewX(10deg)'), offset: o(run * 0.3), easing: 'cubic-bezier(0.9,0,1,1)' },
                { transform: at(dx, 0, 'skewX(-20deg)'), offset: o(run) },
                { transform: at(dx + 90, 0, 'skewX(-8deg)'), offset: o(run + Math.min(160, hold * 0.5)), easing: 'cubic-bezier(0.2,0.8,0.4,1)' },
                { transform: at(dx + 90, 0, 'skewX(0deg)'), offset: o(run + hold), easing: 'cubic-bezier(0.45,0,0.35,1)' },
                home,
            ];
        case 'zigzag':
            // 위아래로 꺾으며 파고든다
            return [
                home,
                { transform: at(dx * 0.3, -26), offset: o(run * 0.33), easing: 'cubic-bezier(0.5,0,0.6,1)' },
                { transform: at(dx * 0.6, 10), offset: o(run * 0.66), easing: 'cubic-bezier(0.5,0,0.6,1)' },
                { transform: at(dx, 0), offset: o(run) },
                ret(),
                { transform: at(dx * 0.5, -20), offset: o(run + hold + back * 0.5) },
                home,
            ];
        case 'uppercut':
            // 낮게 들어가 칼과 함께 치켜 올라갔다 내려온다
            return [
                { transform: at(0, 0, 'scale(1,1)') },
                { transform: at(dx * 0.6, 6, 'scale(1.1,0.85)'), offset: o(run * 0.7), easing: 'cubic-bezier(0.2,0.7,0.4,1)' },
                { transform: at(dx, 4, 'scale(1.1,0.9)'), offset: o(run) },
                { transform: at(dx + 6, -70, 'scale(0.95,1.1)'), offset: o(run + Math.min(180, hold * 0.6)), easing: 'cubic-bezier(0.4,0,1,1)' },
                { transform: at(dx, 0, 'scale(1,1)'), offset: o(run + hold) },
                home,
            ];
        case 'spinDash':
            // 몸을 팽이처럼 뒤집으며 돌진한다
            return [
                { transform: at(0, 0, 'scaleX(1)') },
                { transform: at(dx * 0.25, 0, 'scaleX(-1)'), offset: o(run * 0.3) },
                { transform: at(dx * 0.55, 0, 'scaleX(1)'), offset: o(run * 0.6) },
                { transform: at(dx * 0.8, 0, 'scaleX(-1)'), offset: o(run * 0.85) },
                { transform: at(dx, 0, 'scaleX(1)'), offset: o(run) },
                { transform: at(dx, 0, 'scaleX(1)'), offset: o(run + hold), easing: 'cubic-bezier(0.45,0,0.35,1)' },
                home,
            ];
        case 'hopIn':
            // 깡충 두 번 뛰어 들어간다
            return [
                home,
                { transform: at(dx * 0.45, -40), offset: o(run * 0.25), easing: 'ease-in' },
                { transform: at(dx * 0.6, 0, 'scale(1.1,0.9)'), offset: o(run * 0.5), easing: 'ease-out' },
                { transform: at(dx * 0.85, -50), offset: o(run * 0.75), easing: 'ease-in' },
                { transform: at(dx, 0, 'scale(1.15,0.85)'), offset: o(run) },
                { transform: at(dx, 0, 'scale(1,1)'), offset: o(run + 100) },
                ret(),
                home,
            ];
        case 'backflip':
            // 치자마자 공중제비를 돌며 뒤로 물러난다
            return [
                home,
                { transform: at(dx + 10, 0), offset: o(run), easing: 'cubic-bezier(0.2,0.7,0.4,1)' },
                { transform: at(dx, 0), offset: o(run + hold * 0.6) },
                { transform: at(dx * 0.5, -90, 'rotate(-180deg)'), offset: o(run + hold + back * 0.5) },
                { transform: at(0, 0, 'rotate(-360deg)') },
            ];
        case 'stepIn':
            // 성큼 큰 걸음으로 다가가 자리를 잡고 벤다
            return [
                home,
                { transform: at(dx * 0.5, -8), offset: o(run * 0.5), easing: 'ease-in-out' },
                { transform: at(dx, 0, 'scale(1.05,0.95)'), offset: o(run), easing: 'ease-out' },
                { transform: at(dx, 0, 'scale(1,1)'), offset: o(run + 140) },
                ret(),
                home,
            ];
        case 'dive':
            // 하늘 높이 떠올랐다가 비스듬히 내리꽂는다
            return [
                home,
                { transform: at(-10, -150, 'rotate(-20deg)'), offset: o(run * 0.55), easing: 'cubic-bezier(0.2,0.8,0.4,1)' },
                { transform: at(-10, -150, 'rotate(-20deg)'), offset: o(run * 0.7), easing: 'cubic-bezier(0.8,0,1,0.6)' },
                { transform: at(dx, 0, 'rotate(15deg)'), offset: o(run) },
                { transform: at(dx, 0, 'rotate(0deg)'), offset: o(run + 120) },
                ret(),
                home,
            ];
        case 'roll':
            // 몸을 말아 굴러 들어가 일어서며 벤다
            return [
                { transform: at(0, 0, 'rotate(0deg)') },
                { transform: at(dx * 0.85, 14, 'rotate(330deg) scale(0.8)'), offset: o(run * 0.85), easing: 'linear' },
                { transform: at(dx, 0, 'rotate(360deg) scale(1)'), offset: o(run) },
                { transform: at(dx, 0, 'rotate(360deg)'), offset: o(run + hold), easing: 'cubic-bezier(0.45,0,0.35,1)' },
                { transform: at(0, 0, 'rotate(360deg)') },
            ];
        default:
            // lunge: 뒤로 젖혔다 쏜살같이 달려든다
            return [
                { transform: 'translateX(0)', easing: 'cubic-bezier(0.3, 0, 0.5, 1)' },
                { transform: 'translateX(-10px)', offset: o(run * 0.25), easing: 'cubic-bezier(0.6, 0, 0.9, 0.7)' },
                { transform: `translateX(${dx + 10}px)`, offset: o(run), easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
                { transform: `translateX(${dx}px)`, offset: o(run + Math.min(120, hold * 0.4)) },
                { transform: `translateX(${dx}px)`, offset: o(run + hold), easing: 'cubic-bezier(0.45, 0, 0.35, 1)' },
                { transform: 'translateX(0)' },
            ];
    }
}

/** 제자리 움직임. 시전 순간(run)에 가장 크게 움직이고 천천히 돌아온다 */
function inPlace(motion: HeroMotion, run: number, hold: number, o: (ms: number) => number): KF | null {
    const peak = o(run);
    const after = o(run + hold);
    const T = (t: string, offset?: number, easing?: string): Keyframe => ({ transform: t, ...(offset !== undefined ? { offset } : {}), ...(easing ? { easing } : {}) });
    const id = 'translate(0,0) rotate(0deg) scale(1,1)';
    switch (motion) {
        case 'hop':
            return [T(id), T('translate(0,4px) scale(1.08,0.9)', peak * 0.6, 'ease-out'), T('translate(0,-34px) scale(0.95,1.05)', peak, 'ease-in'), T('translate(0,0) scale(1.08,0.92)', o(run + 160)), T(id, after)];
        case 'crouch':
            return [T(id), T('translate(0,10px) scale(1.1,0.82)', peak, 'ease-out'), T('translate(0,10px) scale(1.1,0.82)', after, 'ease-in-out'), T(id)];
        case 'kneel':
            return [T(id), T('translate(-4px,16px) rotate(-4deg) scale(1,0.78)', peak, 'cubic-bezier(0.2,0.8,0.4,1)'), T('translate(-4px,16px) rotate(-4deg) scale(1,0.78)', after), T(id)];
        case 'rise':
            return [T(id), T('translate(0,-46px)', peak, 'cubic-bezier(0.2,0.8,0.4,1)'), T('translate(0,-52px)', after, 'ease-in-out'), T(id)];
        case 'spin':
            return [T('scaleX(1)'), T('scaleX(-1)', peak * 0.33), T('scaleX(1)', peak * 0.66), T('scaleX(-1)', peak), T('scaleX(1)', o(run + 120)), T('scaleX(1)')];
        case 'recoil':
            return [T(id), T('translate(6px,0) rotate(4deg)', peak * 0.8, 'ease-in'), T('translate(-18px,0) rotate(-10deg)', o(run + 80), 'cubic-bezier(0.2,0.8,0.4,1)'), T(id, after, 'ease-in-out'), T(id)];
        case 'stomp':
            return [T(id), T('translate(0,-24px) scale(0.95,1.08)', peak * 0.7, 'ease-out'), T('translate(0,4px) scale(1.2,0.8)', peak, 'ease-in'), T('translate(0,0) scale(1,1)', o(run + 140)), T(id)];
        case 'sway':
            return [T(id), T('translate(-10px,0) rotate(-6deg)', peak * 0.5, 'ease-in-out'), T('translate(10px,0) rotate(6deg)', peak, 'ease-in-out'), T('translate(-4px,0) rotate(-2deg)', o(run + hold * 0.5)), T(id)];
        case 'lean':
            return [T(id), T('translate(-4px,0) rotate(-4deg)', peak * 0.6), T('translate(14px,4px) rotate(10deg)', peak, 'cubic-bezier(0.2,0.8,0.4,1)'), T('translate(14px,4px) rotate(10deg)', after), T(id)];
        case 'pulse':
            return [T(id), T('scale(1.12,1.12)', peak * 0.5, 'ease-in-out'), T('scale(0.96,0.96)', peak, 'ease-in-out'), T('scale(1.08,1.08)', o(run + hold * 0.5)), T(id)];
        case 'shake': {
            const n = 8;
            const out: KF = [T(id)];
            for (let i = 1; i <= n; i++) out.push(T(`translate(${i % 2 ? 4 : -4}px,${i % 3 ? -1 : 1}px) scale(${1 + i * 0.01})`, peak * (i / n)));
            out.push(T('scale(1.1)', o(run + 100)), T(id));
            return out;
        }
        case 'backstep':
            return [T(id), T('translate(-40px,-12px)', peak * 0.8, 'cubic-bezier(0.2,0.8,0.4,1)'), T('translate(-44px,0) scale(1.05,0.95)', peak), T('translate(-44px,0)', after, 'ease-in-out'), T(id)];
        case 'float':
            return [T(id), T('translate(0,-24px)', peak * 0.6, 'ease-out'), T('translate(0,-30px)', peak, 'ease-in-out'), T('translate(0,-20px)', o(run + hold * 0.5), 'ease-in-out'), T('translate(0,-28px)', after, 'ease-in-out'), T(id)];
        case 'twirl':
            return [T('translate(0,0) scaleX(1)'), T('translate(0,-30px) scaleX(-1)', peak * 0.4), T('translate(0,-40px) scaleX(1)', peak * 0.7), T('translate(0,-30px) scaleX(-1)', peak * 0.85), T('translate(0,0) scaleX(1)', peak), T('translate(0,0) scaleX(1)')];
        case 'bow':
            return [T(id), T('translate(4px,6px) rotate(12deg)', peak, 'ease-in-out'), T('translate(4px,6px) rotate(12deg)', after), T(id)];
        default:
            return null;
    }
}

/**
 * 주인공 몸 움직임. dx는 대상 앞까지 거리(오른쪽 +, 제자리 움직임은 쓰지 않음).
 * startIn 뒤 run 동안 다가가고(제자리면 기를 쏟는 순간까지), hold 동안 머문 뒤, back 동안 돌아온다.
 */
export function playHeroMotion(el: HTMLElement, motion: HeroMotion, dx: number, startIn: number, run: number, hold: number, back: number) {
    if (motion === 'stay') return;
    const total = run + hold + back;
    const o = (ms: number) => Math.min(1, Math.max(0, ms / total));
    const frames = IN_PLACE.has(motion) ? inPlace(motion, run, hold, o) : approach(motion, dx, run, hold, back, o);
    if (!frames) return;
    const fighter = el.closest<HTMLElement>('.fighter');
    const delay = Math.max(0, startIn);
    const anim = el.animate(frames, { duration: total, delay });
    window.setTimeout(() => fighter && (fighter.style.zIndex = '4'), delay);
    anim.finished.then(() => fighter && (fighter.style.zIndex = '')).catch(() => {});
}
