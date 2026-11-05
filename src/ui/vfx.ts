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
import * as burning from 'pixelfx/fx/status/burning';
import * as bleeding from 'pixelfx/fx/status/bleeding';
import * as snowflakeBurst from 'pixelfx/fx/ice/snowflake-burst';
import * as sparkArc from 'pixelfx/fx/lightning/spark-arc';
import * as lifeSteal from 'pixelfx/fx/shadow/life-steal';
import * as curseFx from 'pixelfx/fx/shadow/curse';
import * as shadowFlames from 'pixelfx/fx/shadow/shadow-flames';
import * as fireballFx from 'pixelfx/fx/fire/fireball';
import * as splash from 'pixelfx/fx/water/splash';
import * as dirtExplosion from 'pixelfx/fx/explosions/dirt-explosion';
import * as poisonCloud from 'pixelfx/fx/nature/poison-cloud';
import * as tornado from 'pixelfx/fx/nature/tornado';
import * as sunburst from 'pixelfx/fx/holy/sunburst';
import * as impactFrameMod from 'pixelfx/fx/impacts/impact-frame';
const rawImpactFrame = impactFrameMod as unknown as {
    meta: typeof impactFrameMod.meta;
    create: (o: object) => { update(dt: number): void; draw(p: object): void };
};

/** impactFrame은 320x180 사각형을 통째로 칠해 적 위에서 네모로 보인다. 가장자리를 타원으로 흐리게 한다. */
const impactFrame = {
    meta: rawImpactFrame.meta,
    create(o: object) {
        const inner = rawImpactFrame.create(o);
        return {
            update: (dt: number) => inner.update(dt),
            draw(p: { shade: (x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number, out: { a: number }) => unknown) => void }) {
                const soft = new Proxy(p, {
                    get(t, k) {
                        if (k !== 'shade') {
                            const v = Reflect.get(t, k);
                            return typeof v === 'function' ? v.bind(t) : v;
                        }
                        return (x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number, out: { a: number }) => unknown) =>
                            t.shade(x0, y0, x1, y1, (x, y, out) => {
                                const r = Math.hypot(x / 110, y / 62); // 가운데 0, 타원 가장자리 1
                                if (r >= 1) return 0;
                                const c = fn(x, y, out);
                                out.a *= Math.min(1, (1 - r) / 0.45); // 바깥 45%에서 서서히 사라짐
                                return c;
                            });
                    },
                });
                inner.draw(soft);
            },
        };
    },
};
import * as waterSplash from 'pixelfx/fx/water/splash';
import * as ripples from 'pixelfx/fx/water/ripples';
import * as waveCrash from 'pixelfx/fx/water/wave-crash';
import * as magicCircle from 'pixelfx/fx/arcane/magic-circle-cast';
import * as hitFlash from 'pixelfx/fx/impacts/hit-flash';
// 카드마다 다른 이펙트를 주려고 더 가져온 것들
import * as heavyLanding from 'pixelfx/fx/impacts/heavy-landing';
import * as parry from 'pixelfx/fx/impacts/parry';
import * as forceField from 'pixelfx/fx/scifi/force-field';
import * as halo from 'pixelfx/fx/holy/halo';
import * as blessing from 'pixelfx/fx/holy/blessing';
import * as cartoonPow from 'pixelfx/fx/explosions/cartoon-pow';
import * as exclamation from 'pixelfx/fx/ui/exclamation';
import * as thunderclap from 'pixelfx/fx/lightning/thunderclap';
import * as arcaneOrb from 'pixelfx/fx/arcane/arcane-orb';
import * as runeCircle from 'pixelfx/fx/arcane/rune-circle';
import * as waterOrb from 'pixelfx/fx/water/water-orb';
import * as iceLanceFly from 'pixelfx/fx/ice/ice-lance';
import * as plasmaShot from 'pixelfx/fx/projectiles/plasma-shot';
import * as energyDisc from 'pixelfx/fx/projectiles/energy-disc';
import * as haste from 'pixelfx/fx/status/haste';
import * as featherBurst from 'pixelfx/fx/holy/feather-burst';
import * as powerStar from 'pixelfx/fx/pickups/power-star';
import * as electrified from 'pixelfx/fx/lightning/electrified';
import * as fireTornado from 'pixelfx/fx/fire/fire-tornado';
import * as icicleFall from 'pixelfx/fx/ice/icicle-fall';
import * as iceCrystal from 'pixelfx/fx/ice/ice-crystal';
import * as whirlpool from 'pixelfx/fx/water/whirlpool';
import * as implosion from 'pixelfx/fx/explosions/implosion';
import * as toxicPuddle from 'pixelfx/fx/nature/toxic-puddle';
import * as graspingHands from 'pixelfx/fx/shadow/grasping-hands';
import * as potion from 'pixelfx/fx/pickups/potion';
import * as whipCrack from 'pixelfx/fx/melee/whip-crack';
import * as ricochet from 'pixelfx/fx/impacts/ricochet';
import { cardElement, type Element } from './cardElement';
import { CARD_MOVE } from './heroMoves';
import { ENEMIES } from '../game/enemies';
import type { Cue } from '../game/types';
import { CARDS } from '../game/cards';
import { ATTACK_WINDUP, chargeOf, windupOf } from '../game/combat';
import * as meteorFx from 'pixelfx/fx/fire/meteor';
import * as holyPillar from 'pixelfx/fx/holy/holy-pillar';
import * as blizzardVortex from 'pixelfx/fx/ice/blizzard-vortex';
import * as necroSkulls from 'pixelfx/fx/shadow/necro-skulls';
import * as nuke from 'pixelfx/fx/explosions/nuke';
import * as chargeUp from 'pixelfx/fx/lightning/charge-up';

export interface VfxSpec {
    /** 시전자에서 대상으로 날아간다: ms 동안, 처음엔 느리게 떴다가 가속 (arc: 포물선 높이 도트) */
    fly?: { ms: number; arc?: number };
    /** 발밑이 아니라 보이는 몸 높이의 이 비율 지점에 (0 발밑 · 0.5 몸 가운데 · 1 머리) */
    body?: number;
    /** 캐릭터 뒤에 그린다 (큰 폭발·충격파·마법진이 맞는 몸을 가리지 않게) */
    behind?: boolean;
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
    crouch: [{ ...BLOCK, speed: 1.6 }, { mod: heavyLanding, at: 'self', speed: 1.8 }],
    scout: [{ mod: haste, at: 'self', stopAfter: 0.7, speed: 1.4 }],
    sand_throw: [{ mod: dirtExplosion, at: 'target', speed: 1.8 }],
    catch_breath: [{ mod: featherBurst, at: 'self', speed: 1.8, stopAfter: 0.9 }],
    brace: [BLOCK, { mod: halo, at: 'self', dy: -70, stopAfter: 0.8, speed: 1.4 }],
    poison_fog: [{ mod: acidSplash, at: 'all', speed: 1.6 }],
    fury: [{ mod: rage, at: 'self', stopAfter: 1.1 }],
    iron_wall: [{ mod: forceField, at: 'self', stopAfter: 1, speed: 1.2, opts: { palette: ['#141a2a', '#2a3550', '#4a5a80', '#8a9ac0', '#c8d4f0', '#ffffff'] } }],
    thorn_stance: [{ mod: thorns, at: 'self', dx: -40, speed: 1.6 }],
    blood_strike: [{ mod: scytheReap, at: 'target', dx: -36, speed: 1.6, opts: { palette: BLOOD } }],
    gale: [{ mod: tornado, at: 'target', stopAfter: 0.6, speed: 1.6 }, { mod: daggerFlurry, at: 'target', dx: -28, delay: 0.1 }],
    expose: [{ mod: hexSigil, at: 'target', speed: 2.4 }],
    second_wind: [BLOCK, { mod: powerStar, at: 'self', dy: -70, stopAfter: 0.8, speed: 1.4 }],
    thunder: [{ mod: lightningStrike, at: 'target', speed: 1.5 }],
    regrowth: [{ mod: healingBloom, at: 'self', speed: 1.6 }],
    frenzy: [{ mod: electrified, at: 'self', stopAfter: 0.9, speed: 1.4 }],
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
    arcane_shield: [{ mod: arcaneOrb, at: 'self', dy: -40, stopAfter: 0.9, speed: 1.4 }],
    focus: [{ mod: runeCircle, at: 'self', stopAfter: 0.9, speed: 1.6 }],
    arcane_missiles: [{ mod: arcaneMissiles, at: 'target', dx: -60, speed: 1.4 }],
    fire_ring: [{ mod: fireRing, at: 'all', speed: 2.4 }],
    frost_armor: [{ mod: freeze, at: 'self', speed: 2.5, stopAfter: 1.2 }],
    blizzard: [{ mod: frostNova, at: 'all', speed: 2 }],
    archmage: [{ mod: magicCircle, at: 'self', speed: 1.4 }, { mod: manaBurst, at: 'self', delay: 0.25, speed: 1.2 }],
    // 도적
    stab: [{ mod: thrustFx, at: 'target', dx: -30 }],
    dodge: [{ mod: blinkOut, at: 'self', speed: 1.8 }, { mod: haste, at: 'self', delay: 0.1, stopAfter: 0.6, speed: 1.6 }],
    dagger_parry: [{ ...BLOCK, speed: 1.6 }, { mod: ricochet, at: 'self', dx: -20, dy: -30, delay: 0.05, speed: 1.6 }],
    poison_stab: [{ mod: thrustFx, at: 'target', dx: -30, opts: { palette: VENOM } }, { mod: toxicPuddle, at: 'target', delay: 0.1, stopAfter: 0.7, speed: 1.6 }],
    dagger_throw: [{ mod: hitSpark, at: 'target', opts: { seed: 3 } }],
    shadow_step: [{ mod: blinkIn, at: 'self', speed: 1.8 }],
    backstab: [{ mod: critHit, at: 'target' }],
    shadow_dance: [{ mod: shadowTendrils, at: 'target', speed: 2 }, { mod: daggerFlurry, at: 'target', dx: -28, delay: 0.1, opts: { palette: VENOM } }],
    // 궁극기
    titan_strike: [{ mod: hammerSmash, at: 'target', dx: -20, speed: 1.3 }, { mod: nuke, at: 'target', delay: 0.05, speed: 1.6, stopAfter: 1.4 }, { mod: groundSlam, at: 'target', delay: 0.05, speed: 1.2 }],
    last_stand: [{ mod: holyPillar, at: 'self', speed: 1.4 }, { mod: divineShield, at: 'self', delay: 0.2, stopAfter: 1.2 }, { mod: rage, at: 'self', delay: 0.3, stopAfter: 1 }],
    meteor: [{ mod: meteorFx, at: 'all', speed: 1.4 }, { mod: bigExplosion, at: 'all', delay: 0.35, speed: 2.6, stopAfter: 1.6 }],
    absolute_zero: [{ mod: blizzardVortex, at: 'all', speed: 1.6, stopAfter: 1.2 }, { mod: frostNova, at: 'all', delay: 0.2, speed: 1.6 }, { mod: iceSpikes, at: 'all', delay: 0.3, speed: 2 }],
    thousand_cuts: [
        { mod: daggerFlurry, at: 'target', dx: -28, speed: 1.3 },
        { mod: spinSlash, at: 'target', delay: 0.3, speed: 1.6 },
        { mod: doubleSlash, at: 'target', dx: -20, delay: 0.6, speed: 1.4 },
        { mod: spinSlash, at: 'target', delay: 0.9, speed: 1.6 },
        { mod: critHit, at: 'target', delay: 1.2 },
    ],
    death_mark: [{ mod: necroSkulls, at: 'target', speed: 1.6, stopAfter: 1.2 }, { mod: curseFx, at: 'target', delay: 0.2, speed: 1.4, stopAfter: 1 }, { mod: acidSplash, at: 'target', delay: 0.5, speed: 1.6 }],
    // 연계 카드
    shield_slam: [{ mod: cartoonPow, at: 'target', speed: 1.4 }, { mod: shieldBlock, at: 'target', dx: -20, speed: 1.4 }],
    chain_strike: [{ mod: swordSlash, at: 'target', dx: SLASH_DX }, { mod: doubleSlash, at: 'target', dx: -34, delay: 0.18 }],
    war_cry: [{ mod: exclamation, at: 'self', dy: -60, speed: 1.4 }, { mod: thunderclap, at: 'self', delay: 0.1, speed: 1.6, opts: { palette: ['#2a1406', '#5a2e0a', '#9a5a10', '#d89a20', '#ffd24a', '#fff2b0', '#ffffff'] } }],
    counter_stance: [BLOCK, { mod: thorns, at: 'self', dx: -40, speed: 1.6 }],
    execution: [{ mod: heavyCleave, at: 'target', dx: -32, speed: 1.4, opts: { palette: BLOOD } }, { mod: critHit, at: 'target', delay: 0.08 }],
    rally: [{ ...BLOCK, speed: 1 }, { mod: blessing, at: 'self', stopAfter: 0.9, speed: 1.4 }],
    rising_slash: [{ mod: uppercut, at: 'target', dx: -26, speed: 1.3 }],
    momentum: [{ mod: swordSlash, at: 'target', dx: SLASH_DX, opts: { angle: 0.4 } }],
    frost_touch: [{ mod: icicleFall, at: 'target', speed: 2 }],
    shatter: [{ mod: iceSpikes, at: 'target', speed: 2 }, { mod: iceShatter, at: 'target', delay: 0.15, speed: 2 }],
    glacier: [{ mod: iceCrystal, at: 'all', stopAfter: 0.9, speed: 1.4 }, { ...BLOCK, delay: 0.1 }],
    ignite: [{ mod: burning, at: 'target', stopAfter: 0.9, speed: 1.4 }, { mod: smallExplosion, at: 'target', speed: 3, stopAfter: 1, opts: { palette: FIRE } }],
    combust: [{ mod: implosion, at: 'target', speed: 2 }, { mod: bigExplosion, at: 'target', delay: 0.35, speed: 3, stopAfter: 1.4 }],
    flame_chain: [{ mod: fireTornado, at: 'all', stopAfter: 0.7, speed: 1.6 }],
    mana_flow: [{ mod: waterOrb, at: 'self', dy: -40, stopAfter: 0.9, speed: 1.4 }],
    tidal_wave: [{ mod: whirlpool, at: 'all', stopAfter: 0.5, speed: 1.6 }, { mod: waveCrash, at: 'all', delay: 0.2, speed: 1.4 }],
    quick_slash: [{ mod: thrustFx, at: 'target', dx: -30, speed: 1.4 }, { mod: parry, at: 'target', dx: -12, delay: 0.05, speed: 1.6 }],
    finisher: [{ mod: heavyCleave, at: 'target', dx: -32, speed: 1.5 }, { mod: critHit, at: 'target', delay: 0.1 }],
    venom_burst: [{ mod: acidSplash, at: 'target', speed: 1.8 }, { mod: sporeBurst, at: 'target', delay: 0.1, speed: 2 }],
    shred: [{ mod: clawSwipe, at: 'target', dx: -26, speed: 1.4 }, { mod: daggerFlurry, at: 'target', dx: -28, delay: 0.12 }],
    smoke_bomb: [{ mod: poof, at: 'self', speed: 1.2 }, { ...BLOCK, delay: 0.1 }],
    assassinate: [{ mod: shadowTendrils, at: 'target', speed: 2 }, { mod: critHit, at: 'target', delay: 0.1 }],
    shadow_chain: [{ mod: graspingHands, at: 'self', stopAfter: 0.8, speed: 2 }],
    bandage: [{ mod: heal, at: 'self', speed: 1.4 }, { mod: potion, at: 'self', dy: -70, stopAfter: 0.7, speed: 1.4 }],
    adrenaline: [{ mod: rage, at: 'self', stopAfter: 0.9 }, { mod: manaBurst, at: 'self', speed: 1.4, delay: 0.1 }],
};

const HEAL: VfxSpec = { mod: heal, at: 'target', speed: 1.4 };

/**
 * 피해량 단계별 타격 연출 (하스스톤 미니언 타격 분석을 따름).
 * 1: 작은 충격 · 2: +섬광 · 3: +맞은 방향으로 튀는 흙·돌 · 6: 모두 커짐 · 8: +충격파와 먼지구름
 * 화면 흔들림(4부터)과 판 흔들림(9), 주변이 튀어 오르는 것(10)은 CombatScreen에서.
 */
export function impactTier(amount: number, toPlayer: boolean): VfxSpec[] {
    const flip = toPlayer; // 흙은 맞은 쪽 뒤로 튄다
    const big = amount >= 6;
    const out: VfxSpec[] = [{ mod: hitSpark, at: 'target', body: 0.5, speed: big ? 1.2 : 1.6, opts: { flip } }];
    if (amount >= 2) out.push({ mod: hitFlash, at: 'target', speed: big ? 1.2 : 1.6 });
    // 흙·충격파·먼지는 캐릭터 뒤에 (맞는 몸이 가려지지 않게)
    if (amount >= 3) out.push({ mod: dirtExplosion, at: 'target', dx: toPlayer ? -10 : 10, speed: big ? 1.3 : 2, behind: true, opts: { flip } });
    if (amount >= 8) {
        out.push({ mod: groundSlam, at: 'target', delay: 0.03, speed: 1.3, behind: true, opts: { flip } });
        out.push({ mod: poof, at: 'target', delay: 0.25, speed: 0.9, behind: true });
    }
    return out;
}

/** 속성별 임팩트 섬광 색 */
function cardTint(el: Element): string {
    const T: Record<Element, string> = {
        fire: '#ffb04a', ice: '#bfe8ff', lightning: '#fff27a', poison: '#a8ef7a', arcane: '#d8b8ff', shadow: '#c8a0ff',
        steel: '#ffe6a0', guard: '#ffe6a0', nature: '#c8f08a', blood: '#ff8a8a', wind: '#b8f0e4',
    };
    return T[el] ?? '#ffffff';
}

/** 카드 그림이 다른 카드와 겹칠 때 따로 정한 그림 */
const CARD_ART: Record<string, VfxSpec> = {
    guard: BLOCK,
    dagger_parry: { mod: ricochet, at: 'self' },
    dodge: { mod: blinkOut, at: 'self' },
    counter_stance: { mod: parry, at: 'self' },
    chain_strike: { mod: whipCrack, at: 'target' },
    momentum: { mod: sparkArc, at: 'target', opts: { palette: ['#2a1406', '#5a2e0a', '#9a5a10', '#d89a20', '#ffd24a', '#fff2b0', '#ffffff'] } },
    blade_storm: { mod: spearSweep, at: 'target' },
    cleave_line: { mod: groundSlam, at: 'target' },
    finisher: { mod: sunburst, at: 'target', opts: { palette: BLOOD } },
    adrenaline: { mod: manaBurst, at: 'self' },
    shatter: { mod: snowflakeBurst, at: 'target' },
    quick_slash: { mod: hitFlash, at: 'target' },
    venom_burst: { mod: poisonCloud, at: 'target' },
    assassinate: { mod: curseFx, at: 'target' },
    ward: { mod: divineShield, at: 'self', opts: { palette: ['#0a1440', '#14286a', '#2448a8', '#4a7ad8', '#8ab4f8', '#d0e4ff', '#ffffff'] } },
};

/** 카드 일러스트로 쓸 이펙트: 따로 정한 것, 없으면 방패가 아닌 첫 이펙트 */
export function artSpec(id: string): VfxSpec | undefined {
    const list = CARD_VFX[id] ?? [];
    return CARD_ART[id] ?? list.find((s) => s.mod !== shieldBlock) ?? list[0];
}

/** 크게 퍼지는 이펙트: 캐릭터 뒤에 그려서 맞는 몸이 가려지지 않게 (앞에는 칼날·불꽃 튐만) */
const BEHIND = new Set<FxModule>([
    bigExplosion, nuke, sunburst, impactFrame as unknown as FxModule, groundSlam, dirtExplosion, poof, waveCrash, frostNova, fireRing, thunderclap, implosion,
    magicCircle, holyPillar, blizzardVortex, runeCircle, heavyLanding, iceCrystal, whirlpool, toxicPuddle, fireTornado, tornado, chargeUp, ripples, poisonCloud, healingBloom,
]);
/** 맞는 순간의 불꽃·섬광: 발밑이 아니라 몸 가운데에 (캐릭터에 입히는 이펙트는 제외) */
const BODY_HIT = new Set<FxModule>([hitSpark, critHit, bluntHit, zapHit, sparkArc, snowflakeBurst, manaBurst, cartoonPow, parry, smallExplosion]);
function layered(s: VfxSpec): VfxSpec {
    const behind = s.behind ?? BEHIND.has(s.mod);
    const body = s.body ?? (s.at !== 'self' && s.dy === undefined && BODY_HIT.has(s.mod) && !s.mod.meta.actor ? 0.5 : undefined);
    return { ...s, behind, ...(body !== undefined ? { body } : {}) };
}

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
            if (def?.charge) for (const ch of chargeVfx(cardElement(id), chargeOf(def), !!def.ultimate)) out.push({ ...ch, delay: ch.delay ?? 0 });
            // 마법사(물 사제): 발밑 물의 마법진, 물방울이 모였다가 물줄기로 날아가 물보라
            if (CARDS[id]?.cls === 'mage') for (const w of mageFlourish(id, c.id, attack, wait)) out.push({ ...w, delay: w.delay ?? 0 });
            // 기사(모험가): 금빛 칼날 궤적과 불꽃, 큰 기술은 땅이 갈라지는 충격파
            if (attack && CARDS[id].cls === 'knight') for (const k of knightFlourish(id, c.id)) out.push({ ...k, delay: wait + (k.delay ?? 0) });
            // 도적(바람 암살자): 바람 칼날이 덧붙는다
            if (attack && CARDS[id].cls === 'rogue') for (const w of windFlourish(id, c.id)) out.push({ ...w, delay: wait + (w.delay ?? 0) });
            // 순간이동하는 기술: 사라지는 자리에 연기, 나타나는 자리에 섬광 (그냥 투명해지면 버그처럼 보인다)
            if (CARD_MOVE[id]?.motion === 'blink') {
                const run = ATTACK_WINDUP - 0.02;
                const c0 = def ? chargeOf(def) : 0;
                out.push({ mod: blinkOut, at: 'self', delay: c0 + run * 0.4, speed: 2 });
                out.push({ mod: blinkIn, at: 'target', dx: -40, delay: c0 + run * 0.75, speed: 2.2 });
            }
            // 큰 일격(피해 12 이상)은 강타처럼 맞는 순간 화면이 번쩍인다
            const big = attack && def.effects.some((e) => (e.kind === 'damage' || e.kind === 'damageAll') && (e.amount ?? 0) * (e.hits ?? 1) >= 12);
            if (big && !(def.cls === 'knight' && KNIGHT_HEAVY.has(id)) && !specs.some((s) => s.mod === impactFrame)) {
                const all = def.effects.some((e) => e.kind === 'damageAll');
                out.push({ mod: impactFrame, at: all ? 'all' : 'target', delay: wait + 0.02, speed: 1.6, opts: { palette: ['#1a1030', cardTint(cardElement(id))] } });
            }
            // 맞는 자리에 속성별 여운 (불씨, 눈꽃, 전기, 독, 피 …)
            if (attack) {
                const all = CARDS[id].effects.some((e) => e.kind === 'damageAll');
                for (const im of elementImpact(cardElement(id), c.id)) out.push({ ...im, at: all ? 'all' : 'target', delay: wait + 0.06 + (im.delay ?? 0) });
            }
            return out.map(layered);
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
            return out.map(layered);
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
        [{ mod: burning, at: 'target', speed: 1.6, stopAfter: 0.7 }, { mod: smallExplosion, at: 'target', speed: 3, stopAfter: 0.8, opts: { palette: FIRE } }],
        [{ mod: smallExplosion, at: 'target', speed: 2.4, stopAfter: 1, opts: { palette: FIRE } }, { mod: hitSpark, at: 'target', body: 0.5, opts: { palette: FIRE } }],
    ],
    frost_bolt: [
        [{ mod: iceShatter, at: 'target', speed: 2.2 }],
        [{ mod: iceShatter, at: 'target', speed: 2.4 }, { mod: snowflakeBurst, at: 'target', body: 0.5, speed: 1.8 }],
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

/** 번개 주문 색 (노랑·흰빛, 어두운 색은 보라) */
const BOLT = ['#1a1040', '#3a2a80', '#8a70e0', '#e8d040', '#fff36a', '#fffbd0', '#ffffff'];
/** 물로 싸우는 주문: 이 카드만 물빛 (해일·마나 흐름) */
const WATER_SPELLS = new Set(['tidal_wave', 'mana_flow']);

/**
 * 마법사(물 사제) 주문 연출: 발밑 마법진 → 대상으로 날아가는 마력탄 → 맞는 자리 여운.
 * 색은 주문 속성을 따른다 (화염은 주황, 냉기는 하늘, 번개는 노랑, 비전은 보라, 물 주문만 물빛).
 * 예전에는 모든 주문에 물빛이 붙어 화염 주문에 얼음색이 섞여 보였다.
 */
function mageFlourish(id: string, seed: number, attack: boolean, wait: number): VfxSpec[] {
    const el = cardElement(id);
    const water = WATER_SPELLS.has(id);
    const pal = water ? WATER_LIGHT : el === 'fire' ? FIRE : el === 'ice' ? ICE : el === 'lightning' ? BOLT : ARCANE;
    const out: VfxSpec[] = [{ mod: magicCircle, at: 'self', speed: 1.6, stopAfter: wait + 0.5, opts: { palette: water ? WATER : pal } }];
    // 물방울은 물·냉기 주문에만 (화염·번개 주문에 물방울이 뜨면 속성이 섞여 보인다)
    if (water || el === 'ice') out.push({ mod: bubbles, at: 'self', speed: 1.6, stopAfter: wait + 0.4, opts: { palette: water ? WATER : ICE } });
    if (!attack) {
        if (water) out.push({ mod: ripples, at: 'self', speed: 1.6, stopAfter: 0.8, opts: { palette: WATER_LIGHT } });
        return out;
    }
    const all = CARDS[id].effects.some((e) => e.kind === 'damageAll');
    const at = all ? ('all' as const) : ('target' as const);
    // 기를 모았다가 내보낸다: 손끝에 속성 기운이 빨려 들고 → 투사체가 느리게 떴다가 가속해 꽂힌다
    const flyMs = el === 'fire' ? 340 : 280;
    out.push({ mod: spellCharge, at: 'self', dx: 26, dy: -46, delay: Math.max(0, wait - flyMs / 1000 - 0.3), stopAfter: 0.3, speed: 2.2, opts: { palette: pal } });
    const proj = water ? waterOrb : el === 'fire' ? fireballFx : el === 'ice' ? iceLanceFly : el === 'lightning' ? energyDisc : plasmaShot;
    out.push({ mod: proj, at, fly: { ms: flyMs, arc: el === 'fire' ? 26 : el === 'lightning' ? 4 : 10 }, delay: wait - flyMs / 1000, stopAfter: flyMs / 1000, speed: 1.4, opts: { palette: pal, seed } });
    const big = BIG_MAGE.has(id) || !!CARDS[id].charge;
    if (water) {
        out.push({ mod: waterSplash, at, delay: wait + 0.02, speed: 1.4, opts: { palette: WATER_LIGHT, stone: false } });
        out.push({ mod: ripples, at, delay: wait + 0.05, speed: 1.6, stopAfter: 0.8, opts: { palette: WATER } });
        out.push({ mod: waveCrash, at, dx: -10, delay: wait + 0.04, speed: 1.4, opts: { palette: WATER_LIGHT } });
    } else if (el === 'lightning') {
        // 뇌전: 맞는 자리에 전류가 튀고, 큰 주문은 천둥 충격파
        out.push({ mod: sparkArc, at, dy: -14, delay: wait + 0.02, speed: 1.8, stopAfter: 0.5, opts: { palette: BOLT } });
        if (big) out.push({ mod: thunderclap, at, delay: wait + 0.04, speed: 1.6, opts: { palette: BOLT } });
    } else if (el === 'arcane') {
        // 비전: 보랏빛 마력이 터지고, 큰 주문은 마력 구체와 룬
        out.push({ mod: manaBurst, at, dy: -10, delay: wait + 0.02, speed: 1.8, opts: { palette: ARCANE } });
        if (big) {
            out.push({ mod: arcaneOrb, at, dy: -40, delay: wait, speed: 1.8, stopAfter: 0.6, opts: { palette: ARCANE } });
            out.push({ mod: runeCircle, at, delay: wait + 0.05, speed: 1.8, stopAfter: 0.7, opts: { palette: ARCANE } });
        }
    } else if (el === 'ice') {
        if (big) out.push({ mod: icicleFall, at, delay: wait - 0.1, speed: 2.4, opts: { palette: ICE } });
    } else if (el === 'fire') {
        if (big) out.push({ mod: fireTornado, at, delay: wait + 0.04, speed: 1.8, stopAfter: 0.5, opts: { palette: FIRE } });
    }
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
function chargeVfx(el: Element, t: number, ultimate: boolean): VfxSpec[] {
    const palette = ELEMENT_FX_PAL[el];
    const opts = palette ? { palette } : {};
    const out: VfxSpec[] = [
        { mod: chargeUp, at: 'self', speed: 1.3, stopAfter: t + 0.1, opts },
        { mod: spellCharge, at: 'self', speed: 1.2, stopAfter: t, opts },
    ];
    // 궁극기: 발밑 마법진과 하늘로 치솟는 빛기둥까지
    if (ultimate) {
        out.push({ mod: magicCircle, at: 'self', speed: 1.4, stopAfter: t + 0.2, opts });
        out.push({ mod: holyPillar, at: 'self', delay: t * 0.4, speed: 1.6, stopAfter: t * 0.7, opts });
    }
    return out;
}

const GOLD = ['#2a1406', '#5a2e0a', '#9a5a10', '#d89a20', '#ffd24a', '#fff2b0', '#ffffff'];
/** 내려찍는 큰 기술 */
const KNIGHT_HEAVY = new Set(['heavy_blow', 'oath_blade', 'execution', 'shield_slam', 'shield_bash']);
/** 여러 번 베는 기술 */
const KNIGHT_MULTI = new Set(['cleave_line', 'chain_strike', 'sweep', 'momentum']);

/** 기사 공격에 덧붙는 금빛 연출 */
function knightFlourish(id: string, seed: number): VfxSpec[] {
    const all = CARDS[id].effects.some((e) => e.kind === 'damageAll');
    const at = all ? ('all' as const) : ('target' as const);
    const tilt = [-0.5, 0.35, -0.2, 0.55][seed % 4];
    // 칼날이 지나간 금빛 궤적 + 튀는 불꽃
    const out: VfxSpec[] = [
        { mod: swordSlash, at, dx: SLASH_DX + 6, dy: -6, speed: 1.3, opts: { palette: GOLD, angle: tilt } },
        { mod: hitSpark, at, delay: 0.04, opts: { palette: GOLD, seed: seed * 3 } },
    ];
    if (KNIGHT_MULTI.has(id)) {
        out.push({ mod: swordSlash, at, dx: SLASH_DX, delay: 0.16, speed: 1.4, opts: { palette: GOLD, angle: -tilt } });
        out.push({ mod: spinSlash, at, delay: 0.3, speed: 1.6, opts: { palette: GOLD } });
    }
    if (KNIGHT_HEAVY.has(id)) {
        // 내려찍는 순간: 번쩍, 햇살처럼 퍼지는 빛, 땅이 갈라지며 흙이 튄다
        out.push({ mod: impactFrame, at, speed: 1.6, opts: { palette: ['#2a1406', '#ffd24a'] } });
        out.push({ mod: sunburst, at, dy: -20, delay: 0.02, speed: 1.6, stopAfter: 0.6, opts: { palette: GOLD } });
        out.push({ mod: groundSlam, at, delay: 0.03, speed: 1.4 });
        out.push({ mod: dirtExplosion, at, delay: 0.06, speed: 1.6 });
    }
    return out;
}
