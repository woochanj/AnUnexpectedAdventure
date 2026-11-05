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
import type { Cue } from '../game/types';
import { CARDS } from '../game/cards';
import { ATTACK_WINDUP } from '../game/combat';

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
};

const HEAL: VfxSpec = { mod: heal, at: 'target', speed: 1.4 };

/** 카드가 아닌 신호에 대한 이펙트. 위치는 cue.target 기준 */
export function cueVfx(c: Cue): VfxSpec[] {
    switch (c.kind) {
        case 'card': {
            const specs = CARD_VFX[c.card ?? ''] ?? [];
            // 공격 카드는 주인공이 칼을 젖히는 동안 기다렸다가 터진다
            const wait = CARDS[c.card ?? '']?.type === 'attack' ? ATTACK_WINDUP : 0;
            return specs.map((s) => ({ ...s, delay: (s.delay ?? 0) + wait }));
        }
        case 'enemyAttack': {
            const big = (c.amount ?? 0) >= 14;
            const hits = Math.min(c.hits ?? 1, 5);
            return Array.from({ length: hits }, (_, i) => ({
                mod: big ? critHit : hitSpark,
                at: 'target' as const,
                delay: 0.08 + i * 0.14,
                opts: { flip: true, seed: c.id * 7 + i },
            }));
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
            return [{ mod: poof, at: 'target' }];
    }
}

// ───────────── 층별 배경 앰비언트 (전투 화면 뒤쪽 캔버스에 계속 재생) ─────────────
import * as spiritFlame from 'pixelfx/fx/fire/spirit-flame';
import * as fog from 'pixelfx/fx/weather/fog';
import * as bubbles from 'pixelfx/fx/water/bubbles';
import * as fishSchool from 'pixelfx/fx/critters/fish-school';
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

const VIOLET_FOG = ['#0e0a18', '#1c1430', '#2c1f48', '#43306a', '#5f4890', '#8468b4', '#ad94d6', '#e2d4f6'];

export const FLOOR_AMBIENT: Ambient[][] = [
    [
        { mod: bubbles, fx: 0.12, fy: 0.7 },
        { mod: bubbles, fx: 0.88, fy: 0.7, opts: { seed: 6 } },
        { mod: fishSchool, fx: 0.55, fy: 0.2 },
    ],
    [
        { mod: fog, fx: 0.5, fy: 1.02, tile: 320, opts: { light: 0.7 } },
        { mod: wisp, fx: 0.14, fy: 0.62 },
        { mod: wisp, fx: 0.86, fy: 0.5, opts: { seed: 4 } },
    ],
    [
        { mod: spiritFlame, fx: 0.07, fy: 0.42, opts: { palette: ['#10041a', '#2a0838', '#4a1060', '#6e1c8a', '#9a34b8', '#c264de', '#e6a8f6', '#f8e0ff', '#ffffff'] } },
        { mod: spiritFlame, fx: 0.93, fy: 0.42, opts: { seed: 3, palette: ['#10041a', '#2a0838', '#4a1060', '#6e1c8a', '#9a34b8', '#c264de', '#e6a8f6', '#f8e0ff', '#ffffff'] } },
        { mod: bat, fx: 0.4, fy: 0.15, opts: { seed: 2 } },
        { mod: fog, fx: 0.5, fy: 1.02, tile: 320, opts: { palette: VIOLET_FOG, light: 0.6 } },
    ],
];

/** 지도 화면 배경 앰비언트 (전투보다 잔잔하게) */
export const MAP_AMBIENT: Ambient[][] = [
    [
        { mod: fishSchool, fx: 0.8, fy: 0.22 },
        { mod: fishSchool, fx: 0.18, fy: 0.62, opts: { seed: 4 } },
        { mod: bubbles, fx: 0.06, fy: 1.0 },
        { mod: bubbles, fx: 0.95, fy: 0.9, opts: { seed: 9 } },
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
