// 주인공 몸동작: pixelfx 이펙트들의 act(포즈 타임라인)를 빌려 쓴다.
import { READY, type FxModule } from 'pixelfx';
import * as swordSlash from 'pixelfx/fx/melee/sword-slash';
import * as doubleSlash from 'pixelfx/fx/melee/double-slash';
import * as daggerFlurry from 'pixelfx/fx/melee/dagger-flurry';
import * as heavyCleave from 'pixelfx/fx/melee/heavy-cleave';
import * as spinSlash from 'pixelfx/fx/melee/spin-slash';
import * as scytheReap from 'pixelfx/fx/melee/scythe-reap';
import * as hammerSmash from 'pixelfx/fx/melee/hammer-smash';
import * as thrust from 'pixelfx/fx/melee/thrust';
import * as shieldBlock from 'pixelfx/fx/impacts/shield-block';
import * as hitFlash from 'pixelfx/fx/impacts/hit-flash';
import * as rage from 'pixelfx/fx/status/rage';
import * as spellCharge from 'pixelfx/fx/arcane/spell-charge';
import * as heal from 'pixelfx/fx/holy/heal';
import * as chargeUp from 'pixelfx/fx/lightning/charge-up';

export const HERO_ACTS: Record<string, FxModule> = {
    slash: swordSlash,
    double: doubleSlash,
    dagger: daggerFlurry,
    cleave: heavyCleave,
    spin: spinSlash,
    reap: scytheReap,
    smash: hammerSmash,
    thrust,
    block: shieldBlock,
    hurt: hitFlash,
    rage,
    cast: spellCharge,
    heal,
    charge: chargeUp,
};

/** 카드별 동작 (없으면 공격은 slash, 기술은 cast) */
export const CARD_ACT: Record<string, string> = {
    slash: 'slash',
    torch_swing: 'slash',
    twin_cut: 'double',
    shield_bash: 'smash',
    sweep: 'spin',
    heavy_blow: 'cleave',
    venom_dagger: 'dagger',
    gale: 'dagger',
    blood_strike: 'reap',
    thunder: 'charge',
    blade_storm: 'spin',
    guard: 'block',
    crouch: 'block',
    brace: 'block',
    iron_wall: 'block',
    second_wind: 'block',
    fury: 'rage',
    regrowth: 'heal',
    frenzy: 'charge',
};

/** 칼을 들고 숨 쉬며 서 있는 자세 */
const GUARD = { ...READY, weapon: 'sword', fx: 12, fy: -21, sa: -0.85 };
export const IDLE_ACT: FxModule = {
    meta: { name: 'idle', size: [80, 64], origin: [34, 60], duration: 1e9, loop: false },
    act: { poses: [[0, GUARD]] },
};
