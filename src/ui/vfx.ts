// 게임의 연출 신호(Cue)를 pixelfx 이펙트로 바꾸는 표.
// 이펙트는 https://github.com/patch-gg/pixelfx (MIT) 의 것을 그대로 쓴다.
import type { FxModule } from 'pixelfx';
import * as swordSlash from 'pixelfx/fx/melee/sword-slash';
import * as doubleSlash from 'pixelfx/fx/melee/double-slash';
import * as daggerFlurry from 'pixelfx/fx/melee/dagger-flurry';
import * as heavyCleave from 'pixelfx/fx/melee/heavy-cleave';
import * as spinSlash from 'pixelfx/fx/melee/spin-slash';
import * as scytheReap from 'pixelfx/fx/melee/scythe-reap';
import * as hitSpark from 'pixelfx/fx/impacts/hit-spark';
import * as critHit from 'pixelfx/fx/impacts/crit-hit';
import * as bluntHit from 'pixelfx/fx/impacts/blunt-hit';
import * as shieldBlock from 'pixelfx/fx/impacts/shield-block';
import * as lightningStrike from 'pixelfx/fx/lightning/lightning-strike';
import * as acidSplash from 'pixelfx/fx/nature/acid-splash';
import * as sporeBurst from 'pixelfx/fx/nature/spore-burst';
import * as thorns from 'pixelfx/fx/nature/thorns';
import * as healingBloom from 'pixelfx/fx/nature/healing-bloom';
import * as hexSigil from 'pixelfx/fx/shadow/hex-sigil';
import * as rage from 'pixelfx/fx/status/rage';
import * as heal from 'pixelfx/fx/holy/heal';
import * as manaBurst from 'pixelfx/fx/arcane/mana-burst';
import * as spellCharge from 'pixelfx/fx/arcane/spell-charge';
import * as poof from 'pixelfx/fx/spawn/poof';
import * as poisoned from 'pixelfx/fx/status/poisoned';
import * as smallExplosion from 'pixelfx/fx/explosions/small-explosion';
import * as bigExplosion from 'pixelfx/fx/explosions/big-explosion';
import * as iceShatter from 'pixelfx/fx/ice/ice-shatter';
import * as iceSpikes from 'pixelfx/fx/ice/ice-spikes';
import * as frostNova from 'pixelfx/fx/ice/frost-nova';
import * as freeze from 'pixelfx/fx/ice/freeze';
import * as zapHit from 'pixelfx/fx/lightning/zap-hit';
import * as fireRing from 'pixelfx/fx/fire/fire-ring';
import * as arcaneMissiles from 'pixelfx/fx/arcane/arcane-missiles';
import * as blinkIn from 'pixelfx/fx/arcane/blink-in';
import * as blinkOut from 'pixelfx/fx/arcane/blink-out';
import * as smite from 'pixelfx/fx/holy/smite';
import * as divineShield from 'pixelfx/fx/holy/divine-shield';
import * as shadowTendrils from 'pixelfx/fx/shadow/shadow-tendrils';
import * as thrustFx from 'pixelfx/fx/melee/thrust';
import * as clawSwipe from 'pixelfx/fx/melee/claw-swipe';
import * as uppercut from 'pixelfx/fx/melee/uppercut';
import * as spearSweep from 'pixelfx/fx/melee/spear-sweep';
import * as hammerSmash from 'pixelfx/fx/melee/hammer-smash';
import * as groundSlam from 'pixelfx/fx/impacts/ground-slam';
import * as impactFrame from 'pixelfx/fx/impacts/impact-frame';
import * as burning from 'pixelfx/fx/status/burning';
import * as bleeding from 'pixelfx/fx/status/bleeding';
import * as snowflakeBurst from 'pixelfx/fx/ice/snowflake-burst';
import * as sparkArc from 'pixelfx/fx/lightning/spark-arc';
import * as lifeSteal from 'pixelfx/fx/shadow/life-steal';
import * as curseFx from 'pixelfx/fx/shadow/curse';
import * as shadowFlames from 'pixelfx/fx/shadow/shadow-flames';
import * as fireballFx from 'pixelfx/fx/fire/fireball';
import * as splash from 'pixelfx/fx/water/splash';
import * as magicMissile from 'pixelfx/fx/projectiles/magic-missile';
import * as dirtExplosion from 'pixelfx/fx/explosions/dirt-explosion';
import * as poisonCloud from 'pixelfx/fx/nature/poison-cloud';
import * as tornado from 'pixelfx/fx/nature/tornado';
import * as waterSplash from 'pixelfx/fx/water/splash';
import * as ripples from 'pixelfx/fx/water/ripples';
import * as waveCrash from 'pixelfx/fx/water/wave-crash';
import * as magicCircle from 'pixelfx/fx/arcane/magic-circle-cast';
import * as hitFlash from 'pixelfx/fx/impacts/hit-flash';
import { cardElement, type Element } from './cardElement';
import { ENEMIES } from '../game/enemies';
import type { Cue } from '../game/types';
import { CARDS } from '../game/cards';
import { ATTACK_WINDUP, CHARGE_TIME, windupOf } from '../game/combat';
import * as chargeUp from 'pixelfx/fx/lightning/charge-up';

export interface VfxSpec {
    mod: FxModule;
    /** 어디에 그릴지: 카드 대상, 살아 있는 모든 적, 플레이어 자신 */
    at: 'target' | 'all' | 'self';
    /** 대상 발 위치에서 얼마나 떨어뜨릴지 (픽셀 단위, 공격자 쪽이 음수) */
    dx?: number;
    dy?: number;
    speed?: number;
    /** 반복 이펙트를 이 시간(초) 뒤에 멈춤 */
    stopAfter?: number;
    delay?: number;
    opts?: Record<string, unknown>;
}

const FIRE = ['#3a0d05', '#7a1e08', '#c2410c', '#f08a3c', '#ffcf6b', '#fff2c0', '#ffffff'];
const VENOM = ['#0f2a12', '#1d5a1f', '#2f8f2b', '#5fcf4a', '#a8ef7a', '#e6ffd0', '#ffffff'];
const BLOOD = ['#1a0306', '#4a0a12', '#8a1424', '#c8283a', '#ff5a5a', '#ffc0c0', '#ffffff'];

// 칼질 계열은 시전자 바로 앞에 그려지므로 대상보다 조금 왼쪽에 놓는다
const SLASH_DX = -30;

const BLOCK: VfxSpec = { mod: shieldBlock, at: 'self', dx: -6, speed: 1.3 };

export const CARD_VFX: Record<string, VfxSpec[]> = {
    slash: [{ mod: swordSlash, at: 'target', dx: SLASH_DX }],
    guard: [BLOCK],
    torch_swing: [{ mod: swordSlash, at: 'target', dx: SLASH_DX, opts: { palette: FIRE } }],
    twin_cut: [{ mod: doubleSlash, at: 'target', dx: -34 }],
    shield_bash: [{ mod: bluntHit, at: 'target' }, { ...BLOCK, delay: 0.1 }],
    sweep: [{ mod: spinSlash, at: 'all' }],
    heavy_blow: [{ mod: heavyCleave, at: 'target', dx: -32, speed: 1.6 }],
    venom_dagger: [{ mod: daggerFlurry, at: 'target', dx: -28, opts: { palette: VENOM } }],
    crouch: [BLOCK],
    scout: [{ mod: spellCharge, at: 'self', stopAfter: 0.7, speed: 1.4 }],
    sand_throw: [{ mod: hexSigil, at: 'target', speed: 2.6 }],
    catch_breath: [{ mod: spellCharge, at: 'self', stopAfter: 0.7, speed: 1.4 }],
    brace: [BLOCK],
    poison_fog: [{ mod: acidSplash, at: 'all', speed: 1.6 }],
    fury: [{ mod: rage, at: 'self', stopAfter: 1.1 }],
    iron_wall: [{ ...BLOCK, speed: 1 }],
    thorn_stance: [{ mod: thorns, at: 'self', dx: -40, speed: 1.6 }],
    blood_strike: [{ mod: scytheReap, at: 'target', dx: -36, speed: 1.6, opts: { palette: BLOOD } }],
    gale: [{ mod: daggerFlurry, at: 'target', dx: -28 }],
    expose: [{ mod: hexSigil, at: 'target', speed: 2.4 }],
    second_wind: [BLOCK, { mod: spellCharge, at: 'self', stopAfter: 0.6, speed: 1.4 }],
    thunder: [{ mod: lightningStrike, at: 'target', speed: 1.5 }],
    regrowth: [{ mod: healingBloom, at: 'self', speed: 1.6 }],
    frenzy: [{ mod: manaBurst, at: 'self', speed: 1.2 }],
    toxic_bloom: [{ mod: sporeBurst, at: 'target', speed: 1.8 }],
    blade_storm: [{ mod: spinSlash, at: 'all' }, { mod: spinSlash, at: 'all', delay: 0.25 }, { mod: spinSlash, at: 'all', delay: 0.5 }],

    // 기사
    cleave_line: [{ mod: heavyCleave, at: 'target', dx: -32, speed: 1.8 }, { mod: heavyCleave, at: 'target', dx: -32, speed: 1.8, delay: 0.3 }],
    oath_blade: [{ mod: smite, at: 'target', speed: 1.8 }, { ...BLOCK, delay: 0.2 }],
    // 마법사 (모두 대상 위치에서 터진다)
    spark: [{ mod: smallExplosion, at: 'target', speed: 3, stopAfter: 1.2, opts: { palette: FIRE } }],
    ward: [{ mod: divineShield, at: 'self', stopAfter: 0.9, opts: { palette: ['#0a1440', '#14286a', '#2448a8', '#4a7ad8', '#8ab4f8', '#d0e4ff', '#ffffff'] } }],
    frost_bolt: [{ mod: iceShatter, at: 'target', speed: 2.2 }],
    chain_lightning: [{ mod: zapHit, at: 'all' }],
    fireball: [{ mod: bigExplosion, at: 'target', speed: 3.2, stopAfter: 1.6 }],
    ice_lance: [{ mod: iceSpikes, at: 'target', speed: 2.2 }],
    arcane_shield: [{ mod: divineShield, at: 'self', stopAfter: 0.9 }],
    focus: [{ mod: spellCharge, at: 'self', stopAfter: 0.7, speed: 1.4 }],
    arcane_missiles: [{ mod: arcaneMissiles, at: 'target', dx: -60, speed: 1.4 }],
    fire_ring: [{ mod: fireRing, at: 'all', speed: 2.4 }],
    frost_armor: [{ mod: freeze, at: 'self', speed: 2.5, stopAfter: 1.2 }],
    blizzard: [{ mod: frostNova, at: 'all', speed: 2 }],
    archmage: [{ mod: manaBurst, at: 'self', speed: 1.2 }],
    // 도적
    stab: [{ mod: thrustFx, at: 'target', dx: -30 }],
    dodge: [{ mod: blinkOut, at: 'self', speed: 1.8 }],
    poison_stab: [{ mod: thrustFx, at: 'target', dx: -30, opts: { palette: VENOM } }],
    dagger_throw: [{ mod: hitSpark, at: 'target', opts: { seed: 3 } }],
    shadow_step: [{ mod: blinkIn, at: 'self', speed: 1.8 }],
    backstab: [{ mod: critHit, at: 'target' }],
    shadow_dance: [{ mod: shadowTendrils, at: 'target', speed: 2 }, { mod: daggerFlurry, at: 'target', dx: -28, delay: 0.1, opts: { palette: VENOM } }],
    // 연계 카드
    shield_slam: [{ mod: bluntHit, at: 'target', speed: 1.3 }, { mod: shieldBlock, at: 'target', dx: -20, speed: 1.4 }],
    chain_strike: [{ mod: swordSlash, at: 'target', dx: SLASH_DX }, { mod: doubleSlash, at: 'target', dx: -34, delay: 0.18 }],
    war_cry: [{ mod: rage, at: 'self', stopAfter: 0.9 }],
    counter_stance: [BLOCK, { mod: thorns, at: 'self', dx: -40, speed: 1.6 }],
    execution: [{ mod: heavyCleave, at: 'target', dx: -32, speed: 1.4, opts: { palette: BLOOD } }, { mod: critHit, at: 'target', delay: 0.08 }],
    rally: [{ ...BLOCK, speed: 1 }],
    rising_slash: [{ mod: uppercut, at: 'target', dx: -26, speed: 1.3 }],
    momentum: [{ mod: swordSlash, at: 'target', dx: SLASH_DX, opts: { angle: 0.4 } }],
    frost_touch: [{ mod: iceShatter, at: 'target', speed: 2.4 }],
    shatter: [{ mod: iceSpikes, at: 'target', speed: 2 }, { mod: iceShatter, at: 'target', delay: 0.15, speed: 2 }],
    glacier: [{ mod: frostNova, at: 'all', speed: 1.8 }, { ...BLOCK, delay: 0.1 }],
    ignite: [{ mod: smallExplosion, at: 'target', speed: 3, stopAfter: 1, opts: { palette: FIRE } }],
    combust: [{ mod: bigExplosion, at: 'target', speed: 3, stopAfter: 1.4 }],
    flame_chain: [{ mod: fireRing, at: 'all', speed: 2.6 }],
    mana_flow: [{ mod: spellCharge, at: 'self', stopAfter: 0.7, speed: 1.4 }],
    tidal_wave: [{ mod: frostNova, at: 'all', speed: 1.6, opts: { palette: ['#06142e', '#0c2c5a', '#14508c', '#2a86c8', '#5ac0ec', '#a8e6ff', '#ffffff'] } }],
    quick_slash: [{ mod: thrustFx, at: 'target', dx: -30, speed: 1.4 }],
    finisher: [{ mod: heavyCleave, at: 'target', dx: -32, speed: 1.5 }, { mod: critHit, at: 'target', delay: 0.1 }],
    venom_burst: [{ mod: acidSplash, at: 'target', speed: 1.8 }, { mod: sporeBurst, at: 'target', delay: 0.1, speed: 2 }],
    shred: [{ mod: daggerFlurry, at: 'target', dx: -28 }],
    smoke_bomb: [{ mod: blinkOut, at: 'self', speed: 1.6 }, { ...BLOCK, delay: 0.1 }],
    assassinate: [{ mod: shadowTendrils, at: 'target', speed: 2 }, { mod: critHit, at: 'target', delay: 0.1 }],
    shadow_chain: [{ mod: blinkIn, at: 'self', speed: 1.8 }],
    bandage: [{ mod: healingBloom, at: 'self', speed: 1.6 }],
    adrenaline: [{ mod: rage, at: 'self', stopAfter: 0.9 }, { mod: manaBurst, at: 'self', speed: 1.4, delay: 0.1 }],
};

const HEAL: VfxSpec = { mod: heal, at: 'target', speed: 1.4 };

/** 카드가 아닌 신호에 대한 이펙트. 위치는 cue.target 기준 */
export function cueVfx(c: Cue): VfxSpec[] {
    switch (c.kind) {
        case 'card': {
            const id = c.card ?? '';
            const alts = CARD_ALT[id];
            // 기본 카드는 낼 때마다 다른 베기·찌르기·불꽃 중 하나
            const specs = alts ? alts[c.id % alts.length] : CARD_VFX[id] ?? [];
            const attack = CARDS[id]?.type === 'attack';
            // 공격 카드는 주인공이 칼을 젖히는 동안 기다렸다가 터진다
            const def = CARDS[id];
            const wait = def ? windupOf(def) : attack ? ATTACK_WINDUP : 0;
            const out = specs.map((s) => ({ ...s, delay: (s.delay ?? 0) + wait }));
            // 강한 기술: 발밑에서 기를 모은다 (속성 색)
            if (def?.charge) for (const ch of chargeVfx(cardElement(id))) out.push({ ...ch, delay: ch.delay ?? 0 });
            // 마법사(물 사제): 발밑 물의 마법진, 물방울이 모였다가 물줄기로 날아가 물보라
            if (CARDS[id]?.cls === 'mage') for (const w of waterFlourish(id, c.id, attack, wait)) out.push({ ...w, delay: w.delay ?? 0 });
            // 도적(바람 암살자): 바람 칼날이 덧붙는다
            if (attack && CARDS[id].cls === 'rogue') for (const w of windFlourish(id, c.id)) out.push({ ...w, delay: wait + (w.delay ?? 0) });
            // 맞는 자리에 속성별 여운 (불씨, 눈꽃, 전기, 독, 피 …)
            if (attack) {
                const all = CARDS[id].effects.some((e) => e.kind === 'damageAll');
                for (const im of elementImpact(cardElement(id), c.id)) out.push({ ...im, at: all ? 'all' : 'target', delay: wait + 0.06 + (im.delay ?? 0) });
            }
            return out;
        }
        case 'enemyAttack': {
            const big = (c.amount ?? 0) >= 14;
            const hits = Math.min(c.hits ?? 1, 5);
            const look = c.defId ? ENEMIES[c.defId]?.look : undefined;
            const out: VfxSpec[] = [];
            for (let i = 0; i < hits; i++) {
                for (const sp of enemyHit(look, c.id + i)) out.push({ ...sp, at: 'target', delay: 0.08 + i * 0.14 + (sp.delay ?? 0), opts: { flip: true, seed: c.id * 7 + i, ...sp.opts } });
            }
            // 큰 공격은 땅이 울린다
            if (big) out.push({ mod: groundSlam, at: 'target', delay: 0.1, speed: 1.6, opts: { flip: true } });
            return out;
        }
        case 'enemyBlock':
            return [{ ...BLOCK, at: 'target', dx: 6, opts: { flip: true } }];
        case 'enemyBuff':
            return [{ mod: rage, at: 'target', stopAfter: 0.9 }];
        case 'enemyDebuff':
            return [{ mod: hexSigil, at: 'target', speed: 2.6 }];
        case 'enemyHeal':
            return [HEAL];
        case 'poison':
            return [{ mod: poisoned, at: 'target', stopAfter: 0.8 }];
        case 'death':
            // 쓰러지는 동작을 먼저 보여 주고 연기
            return [{ mod: poof, at: 'target', delay: 0.6 }];
    }
}

// ───────────── 층별 배경 앰비언트 (전투 화면 뒤쪽 캔버스에 계속 재생) ─────────────
import * as spiritFlame from 'pixelfx/fx/fire/spirit-flame';
import * as fog from 'pixelfx/fx/weather/fog';
import * as fireflies from 'pixelfx/fx/weather/fireflies';
import * as bubbles from 'pixelfx/fx/water/bubbles';
import * as bat from 'pixelfx/fx/critters/bat';
import * as wisp from 'pixelfx/fx/critters/wisp';

export interface Ambient {
    mod: FxModule;
    /** 캔버스 너비/높이에 대한 비율로 원점 위치 */
    fx: number;
    fy: number;
    opts?: Record<string, unknown>;
    /** 화면 너비에 맞춰 가로로 반복할 간격(픽셀). 안개처럼 넓게 깔리는 것에 사용 */
    tile?: number;
}

const VIOLET_FOG = ['#2a1430', '#3e1e44', '#5a2c5a', '#7a3e72', '#a0568a', '#c878a4', '#e8a8c4', '#fde4ee'];
const BLOOD_FLAME = ['#2a0a04', '#5a1a08', '#9a3a0c', '#d8661a', '#ff9a2a', '#ffc24a', '#ffe08a', '#fff4d0', '#ffffff'];

export const FLOOR_AMBIENT: Ambient[][] = [
    [
        { mod: bubbles, fx: 0.1, fy: 0.75 },
        { mod: wisp, fx: 0.22, fy: 0.5, opts: { seed: 6 } },
        { mod: wisp, fx: 0.8, fy: 0.42, opts: { seed: 11 } },
        { mod: bat, fx: 0.55, fy: 0.16, opts: { seed: 4 } },
    ],
    [
        { mod: fog, fx: 0.5, fy: 1.02, tile: 320, opts: { light: 0.7 } },
        { mod: wisp, fx: 0.14, fy: 0.62 },
        { mod: wisp, fx: 0.86, fy: 0.5, opts: { seed: 4 } },
    ],
    [
        { mod: spiritFlame, fx: 0.07, fy: 0.42, opts: { palette: BLOOD_FLAME } },
        { mod: spiritFlame, fx: 0.93, fy: 0.42, opts: { seed: 3, palette: BLOOD_FLAME } },
        { mod: bat, fx: 0.4, fy: 0.15, opts: { seed: 2 } },
        { mod: fog, fx: 0.5, fy: 1.02, tile: 320, opts: { palette: VIOLET_FOG, light: 0.6 } },
    ],
];

/** 지도 화면 배경 앰비언트 (전투보다 잔잔하게) */
export const MAP_AMBIENT: Ambient[][] = [
    [
        { mod: wisp, fx: 0.12, fy: 0.62, opts: { seed: 4 } },
        { mod: wisp, fx: 0.86, fy: 0.4, opts: { seed: 7 } },
        { mod: bubbles, fx: 0.06, fy: 1.0 },
        { mod: bat, fx: 0.8, fy: 0.14, opts: { seed: 9 } },
    ],
    [
        { mod: fog, fx: 0.5, fy: 1.02, tile: 320, opts: { light: 0.6 } },
        { mod: wisp, fx: 0.1, fy: 0.55, opts: { seed: 8 } },
        { mod: wisp, fx: 0.9, fy: 0.75, opts: { seed: 2 } },
    ],
    [
        { mod: fog, fx: 0.5, fy: 1.02, tile: 320, opts: { palette: VIOLET_FOG, light: 0.5 } },
        { mod: bat, fx: 0.15, fy: 0.2, opts: { seed: 7 } },
        { mod: wisp, fx: 0.88, fy: 0.6, opts: { seed: 3, palette: ['#0e0618', '#241040', '#3e1a6a', '#6a2ea0', '#9a52d0', '#c99af0', '#f2e2ff'] } },
    ],
];

// ───────────── 지역별 앰비언트 (지도와 전투 공통) ─────────────
import * as aurora from 'pixelfx/fx/weather/aurora';
import * as cherryBlossoms from 'pixelfx/fx/weather/cherry-blossoms';
import * as fallingLeaves from 'pixelfx/fx/weather/falling-leaves';
import * as blizzard from 'pixelfx/fx/weather/blizzard';
import * as butterfly from 'pixelfx/fx/critters/butterfly';
import * as birdFx from 'pixelfx/fx/critters/bird';

const WARM_FLAME = ['#2a0a04', '#5a1a08', '#9a3a0c', '#d8661a', '#ff9a2a', '#ffc24a', '#ffe08a', '#fff4d0', '#ffffff'];

export const AMBIENT: Record<string, Ambient[]> = {
    cave: [
        { mod: bubbles, fx: 0.1, fy: 0.78 },
        { mod: bubbles, fx: 0.92, fy: 0.7, opts: { seed: 6 } },
        { mod: wisp, fx: 0.24, fy: 0.5, opts: { seed: 6 } },
        { mod: bat, fx: 0.62, fy: 0.16, opts: { seed: 4 } },
    ],
    graveyard: [
        { mod: fog, fx: 0.5, fy: 1.02, tile: 320, opts: { light: 0.6 } },
        { mod: wisp, fx: 0.14, fy: 0.6, opts: { seed: 8 } },
        { mod: wisp, fx: 0.86, fy: 0.45, opts: { seed: 2 } },
    ],
    castle: [
        { mod: spiritFlame, fx: 0.07, fy: 0.42, opts: { palette: WARM_FLAME } },
        { mod: spiritFlame, fx: 0.93, fy: 0.42, opts: { seed: 3, palette: WARM_FLAME } },
        { mod: birdFx, fx: 0.55, fy: 0.16, opts: { seed: 5 } },
        { mod: cherryBlossoms, fx: 0.5, fy: 1.0, tile: 320 },
    ],
    forest: [
        { mod: fireflies, fx: 0.5, fy: 1.0, tile: 320, opts: { light: 0.9 } },
        { mod: fallingLeaves, fx: 0.5, fy: 1.0, tile: 320 },
        { mod: butterfly, fx: 0.3, fy: 0.4, opts: { seed: 3 } },
    ],
    ruins: [
        { mod: birdFx, fx: 0.7, fy: 0.18, opts: { seed: 2 } },
        { mod: birdFx, fx: 0.3, fy: 0.24, opts: { seed: 9 } },
    ],
    ice: [
        { mod: aurora, fx: 0.5, fy: 0.7, tile: 320, opts: { light: 0.8 } },
        { mod: blizzard, fx: 0.5, fy: 1.0, tile: 320, opts: { light: 0.5 } },
    ],
};


// ───────────── 공격 다양화 ─────────────

const ICE = ['#0a1a3a', '#14326a', '#2a62b0', '#5aa0e8', '#9ad4ff', '#dff4ff', '#ffffff'];
const ARCANE = ['#14082a', '#2e1460', '#5a2aa8', '#8a5ae0', '#c09aff', '#efe0ff', '#ffffff'];

/** 기본 카드는 같은 카드라도 낼 때마다 모양이 바뀐다 */
const CARD_ALT: Record<string, VfxSpec[][]> = {
    slash: [
        [{ mod: swordSlash, at: 'target', dx: SLASH_DX }],
        [{ mod: uppercut, at: 'target', dx: -26, speed: 1.3 }],
        [{ mod: swordSlash, at: 'target', dx: SLASH_DX, dy: -10, opts: { angle: -0.5 } }],
        [{ mod: spearSweep, at: 'target', dx: -34, speed: 1.4 }],
    ],
    stab: [
        [{ mod: thrustFx, at: 'target', dx: -30 }],
        [{ mod: daggerFlurry, at: 'target', dx: -28, stopAfter: 0.35 }],
        [{ mod: thrustFx, at: 'target', dx: -30, dy: -8, opts: { angle: 0.35 } }],
    ],
    spark: [
        [{ mod: smallExplosion, at: 'target', speed: 3, stopAfter: 1.2, opts: { palette: FIRE } }],
        [{ mod: fireballFx, at: 'target', dx: -40, speed: 1.8, stopAfter: 0.8 }],
        [{ mod: magicMissile, at: 'target', dx: -50, speed: 1.6, opts: { palette: FIRE } }, { mod: smallExplosion, at: 'target', delay: 0.12, speed: 3, stopAfter: 1, opts: { palette: FIRE } }],
    ],
    frost_bolt: [
        [{ mod: iceShatter, at: 'target', speed: 2.2 }],
        [{ mod: magicMissile, at: 'target', dx: -50, speed: 1.6, opts: { palette: ICE } }, { mod: iceShatter, at: 'target', delay: 0.1, speed: 2.4 }],
    ],
    heavy_blow: [
        [{ mod: heavyCleave, at: 'target', dx: -32, speed: 1.6 }],
        [{ mod: hammerSmash, at: 'target', dx: -20, speed: 1.5 }],
    ],
    torch_swing: [
        [{ mod: swordSlash, at: 'target', dx: SLASH_DX, opts: { palette: FIRE } }],
        [{ mod: uppercut, at: 'target', dx: -26, speed: 1.3, opts: { palette: FIRE } }],
    ],
    poison_stab: [
        [{ mod: thrustFx, at: 'target', dx: -30, opts: { palette: VENOM } }],
        [{ mod: daggerFlurry, at: 'target', dx: -28, stopAfter: 0.35, opts: { palette: VENOM } }],
    ],
};

/** 맞은 자리에 남는 속성 여운. seed로 매번 조금 다르게 */
function elementImpact(el: Element, seed: number): VfxSpec[] {
    const pickOne = (xs: VfxSpec[]) => [xs[seed % xs.length]];
    switch (el) {
        case 'fire':
            return pickOne([{ mod: burning, at: 'target', stopAfter: 0.7, speed: 1.4 }, { mod: smallExplosion, at: 'target', speed: 3, stopAfter: 0.6, opts: { palette: FIRE } }]);
        case 'ice':
            return [{ mod: snowflakeBurst, at: 'target', speed: 1.6 }];
        case 'lightning':
            return pickOne([{ mod: sparkArc, at: 'target', speed: 1.6, stopAfter: 0.5 }, { mod: zapHit, at: 'target' }]);
        case 'poison':
            return pickOne([{ mod: poisoned, at: 'target', stopAfter: 0.8, speed: 1.4 }, { mod: acidSplash, at: 'target', speed: 2 }]);
        case 'shadow':
            return pickOne([{ mod: shadowFlames, at: 'target', stopAfter: 0.6, speed: 1.6 }, { mod: curseFx, at: 'target', stopAfter: 0.6, speed: 1.6 }]);
        case 'blood':
            return [{ mod: bleeding, at: 'target', stopAfter: 0.8, speed: 1.4 }];
        case 'arcane':
            return [{ mod: impactFrame, at: 'target', speed: 1.4, opts: { palette: ARCANE } }];
        case 'wind':
            return [{ mod: hitSpark, at: 'target', dy: -10, opts: { palette: ['#14303a', '#2a5a64', '#4a8a8a', '#7ac8c0', '#b8f0e4', '#e8fff8', '#ffffff'] } }];
        default:
            return pickOne([{ mod: hitSpark, at: 'target' }, { mod: bluntHit, at: 'target', speed: 1.3 }, { mod: hitSpark, at: 'target', dy: -14 }]);
    }
}

/** 적 종류에 맞는 타격 이펙트: 짐승은 할퀴기, 덩치는 둔기, 유령은 그림자, 투척은 폭발 … */
function enemyHit(look: (typeof ENEMIES)[string]['look'] | undefined, seed: number): VfxSpec[] {
    const k = look ? (look.kind === 'sprite' ? look.sprite ?? '' : look.kind) : '';
    const r = look?.ranged;
    if (r === 'goblin-bomb') return [{ mod: smallExplosion, at: 'target', speed: 2.6, stopAfter: 1 }, { mod: dirtExplosion, at: 'target', speed: 1.8, delay: 0.04 }];
    if (r === 'mushroom-spore') return [{ mod: sporeBurst, at: 'target', speed: 2 }, { mod: poisonCloud, at: 'target', speed: 2, stopAfter: 0.6 }];
    if (r === 'eye-bolt') return [{ mod: zapHit, at: 'target', opts: { palette: ARCANE } }];
    const v = seed % 2;
    if (['rat', 'bat', 'bird', 'spider', 'gargoyle', 'bee', 'crow'].includes(k)) return [{ mod: clawSwipe, at: 'target', dx: 26, speed: 1.4, opts: { angle: v ? 0.3 : -0.2 } }];
    if (['slime', 'ooze'].includes(k)) return [{ mod: acidSplash, at: 'target', speed: 2 }];
    if (k === 'fish') return [{ mod: splash, at: 'target', speed: 1.8 }, { mod: hitSpark, at: 'target' }];
    if (['ghost', 'wraith', 'cultist', 'eye', 'flameskull'].includes(k)) return v ? [{ mod: lifeSteal, at: 'target', speed: 1.8, stopAfter: 0.7 }] : [{ mod: shadowFlames, at: 'target', speed: 1.8, stopAfter: 0.6 }];
    if (['beetle', 'mushroom', 'ghoul'].includes(k)) return [{ mod: bluntHit, at: 'target', speed: 1.3 }];
    if (['skeleton', 'knight', 'goblin'].includes(k)) return v ? [{ mod: swordSlash, at: 'target', dx: 30, speed: 1.2 }] : [{ mod: heavyCleave, at: 'target', dx: 30, speed: 1.6 }];
    return [{ mod: hitSpark, at: 'target' }];
}

const WIND = ['#0a2a30', '#145058', '#2a8a8a', '#4ad0c0', '#9af4e0', '#e0fff8', '#ffffff'];
const MULTI_ROGUE = new Set(['twin_cut', 'gale', 'blade_storm', 'shadow_dance', 'venom_dagger']);
const BIG_ROGUE = new Set(['backstab', 'shadow_dance', 'blade_storm']);

/** 바람 암살자 공격에 덧붙는 바람 칼날: 회오리 베기, 엇갈린 X자, 큰 기술은 돌풍과 번쩍임 */
function windFlourish(id: string, seed: number): VfxSpec[] {
    const all = CARDS[id].effects.some((e) => e.kind === 'damageAll');
    const at = all ? ('all' as const) : ('target' as const);
    const out: VfxSpec[] = [{ mod: spinSlash, at, speed: 1.7, opts: { palette: WIND, angle: seed % 2 ? 0.4 : -0.4 } }];
    if (MULTI_ROGUE.has(id)) {
        out.push({ mod: doubleSlash, at, dx: -20, delay: 0.1, speed: 1.4, opts: { palette: WIND } });
        out.push({ mod: doubleSlash, at, dx: -20, delay: 0.22, speed: 1.4, opts: { palette: WIND, flip: true } });
    }
    if (BIG_ROGUE.has(id) || id === 'gale') out.push({ mod: tornado, at, delay: 0.05, speed: 1.8, stopAfter: 0.7, opts: { palette: WIND } });
    if (BIG_ROGUE.has(id)) out.push({ mod: hitFlash, at, delay: 0.08, opts: { palette: WIND } });
    return out;
}

const WATER = ['#06142e', '#0c2c5a', '#14508c', '#2a86c8', '#5ac0ec', '#a8e6ff', '#ffffff'];
/** 밝은 배경 위에서 검게 뭉치지 않도록 어두운 색을 뺀 물빛 */
const WATER_LIGHT = ['#1a5a9c', '#2a86c8', '#4aaee0', '#7ad0f4', '#b4ecff', '#e4faff', '#ffffff'];
const BIG_MAGE = new Set(['fireball', 'thunder', 'blizzard', 'fire_ring', 'chain_lightning', 'ice_lance', 'archmage']);

/** 물 사제 주문 연출. 시전(발밑) → 물방울 모임 → 대상에 물줄기·물보라, 큰 주문은 파도 */
function waterFlourish(id: string, seed: number, attack: boolean, wait: number): VfxSpec[] {
    const out: VfxSpec[] = [
        { mod: magicCircle, at: 'self', speed: 1.6, stopAfter: wait + 0.5, opts: { palette: WATER } },
        { mod: bubbles, at: 'self', speed: 1.6, stopAfter: wait + 0.4, opts: { palette: WATER } },
    ];
    if (!attack) {
        out.push({ mod: ripples, at: 'self', speed: 1.6, stopAfter: 0.8, opts: { palette: WATER_LIGHT } });
        return out;
    }
    const all = CARDS[id].effects.some((e) => e.kind === 'damageAll');
    const at = all ? ('all' as const) : ('target' as const);
    out.push({ mod: magicMissile, at, dx: -60, dy: -6, delay: wait - 0.12, speed: 1.6, opts: { palette: WATER_LIGHT, seed } });
    out.push({ mod: waterSplash, at, delay: wait + 0.02, speed: 1.4, opts: { palette: WATER_LIGHT, stone: false } });
    out.push({ mod: ripples, at, delay: wait + 0.05, speed: 1.6, stopAfter: 0.8, opts: { palette: WATER } });
    if (BIG_MAGE.has(id)) out.push({ mod: waveCrash, at, dx: -10, delay: wait + 0.04, speed: 1.4, opts: { palette: WATER_LIGHT } });
    return out;
}

const ELEMENT_FX_PAL: Partial<Record<Element, string[]>> = {
    fire: FIRE,
    ice: ICE,
    poison: VENOM,
    blood: BLOOD,
    arcane: ARCANE,
    shadow: ['#08040e', '#1e1036', '#3a2468', '#6a4aa8', '#a88ae0', '#e0d0ff', '#ffffff'],
    wind: WIND,
    steel: ['#141824', '#2a3448', '#4a5a78', '#7a90b0', '#b8c8e0', '#e8f0ff', '#ffffff'],
};

/** 기 모으기: 빛이 빨려들고(charge-up) 마력 소용돌이(spell-charge)가 커진다 */
function chargeVfx(el: Element): VfxSpec[] {
    const palette = ELEMENT_FX_PAL[el];
    const opts = palette ? { palette } : {};
    return [
        { mod: chargeUp, at: 'self', speed: 1.3, stopAfter: CHARGE_TIME + 0.1, opts },
        { mod: spellCharge, at: 'self', speed: 1.2, stopAfter: CHARGE_TIME, opts },
    ];
}
