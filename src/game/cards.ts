import type { CardDef, CardInst, ClassId, Effect, Rarity, Status } from './types';

const dmg = (amount: number, hits?: number): Effect => ({ kind: 'damage', amount, hits });
const dmgAll = (amount: number, hits?: number): Effect => ({ kind: 'damageAll', amount, hits });
const block = (amount: number): Effect => ({ kind: 'block', amount });
const draw = (amount: number): Effect => ({ kind: 'draw', amount });
const energy = (amount: number): Effect => ({ kind: 'energy', amount });
const heal = (amount: number): Effect => ({ kind: 'heal', amount });
const apply = (status: Status, amount: number, to: 'target' | 'all' | 'self'): Effect => ({ kind: 'apply', status, amount, to });

type Def = Omit<CardDef, 'cls'>;
const K = (d: Def): CardDef => ({ ...d, cls: 'knight' });
const M = (d: Def): CardDef => ({ ...d, cls: 'mage', ranged: d.type === 'attack' ? true : d.ranged });
const R = (d: Def): CardDef => ({ ...d, cls: 'rogue' });
const N = (d: Def): CardDef => ({ ...d, cls: 'neutral' });

const LIST: CardDef[] = [
    // ═════════ 기사 ═════════
    K({ id: 'slash', name: '베기', type: 'attack', rarity: 'starter', cost: 1, effects: [dmg(6)], up: { effects: [dmg(9)] } }),
    K({ id: 'guard', name: '막기', type: 'skill', rarity: 'starter', cost: 1, effects: [block(5)], up: { effects: [block(8)] } }),
    K({
        id: 'torch_swing', name: '횃불 휘두르기', type: 'attack', rarity: 'starter', cost: 1,
        effects: [dmg(5), apply('vulnerable', 1, 'target')], up: { effects: [dmg(7), apply('vulnerable', 2, 'target')] },
    }),
    K({ id: 'shield_bash', name: '방패 치기', type: 'attack', rarity: 'common', cost: 1, effects: [dmg(5), block(4)], up: { effects: [dmg(7), block(6)] } }),
    K({ id: 'sweep', name: '휩쓸기', type: 'attack', rarity: 'common', cost: 1, effects: [dmgAll(5)], up: { effects: [dmgAll(8)] } }),
    K({ id: 'heavy_blow', name: '강타', type: 'attack', rarity: 'common', cost: 2, effects: [dmg(14)], up: { effects: [dmg(19)] } }),
    K({ id: 'crouch', name: '웅크리기', type: 'skill', rarity: 'common', cost: 1, effects: [block(8)], up: { effects: [block(11)] } }),
    K({ id: 'iron_wall', name: '철벽', type: 'skill', rarity: 'uncommon', cost: 2, effects: [block(16)], up: { effects: [block(21)] } }),
    K({ id: 'fury', name: '분노', type: 'power', rarity: 'uncommon', cost: 1, effects: [apply('strength', 2, 'self')], up: { effects: [apply('strength', 3, 'self')] } }),
    K({ id: 'thorn_stance', name: '가시 자세', type: 'power', rarity: 'uncommon', cost: 1, effects: [apply('thorns', 3, 'self')], up: { effects: [apply('thorns', 5, 'self')] } }),
    K({
        id: 'blood_strike', name: '피의 일격', type: 'attack', rarity: 'uncommon', cost: 2, exhaust: true,
        effects: [dmg(12), heal(4)], up: { effects: [dmg(15), heal(6)] },
    }),
    K({ id: 'cleave_line', name: '연속 내려찍기', type: 'attack', rarity: 'rare', cost: 2, effects: [dmg(9, 2)], up: { effects: [dmg(12, 2)] } }),
    K({
        id: 'oath_blade', name: '맹세의 검', type: 'attack', rarity: 'unique', cost: 2,
        effects: [dmg(18), block(12), apply('strength', 2, 'self')], up: { effects: [dmg(24), block(16), apply('strength', 3, 'self')] },
    }),

    // ═════════ 마법사 ═════════
    M({ id: 'spark', name: '불꽃 화살', type: 'attack', rarity: 'starter', cost: 1, effects: [dmg(6)], up: { effects: [dmg(9)] } }),
    M({ id: 'ward', name: '마력 방벽', type: 'skill', rarity: 'starter', cost: 1, effects: [block(5)], up: { effects: [block(8)] } }),
    M({
        id: 'frost_bolt', name: '서리 화살', type: 'attack', rarity: 'starter', cost: 1,
        effects: [dmg(6), apply('weak', 1, 'target')], up: { effects: [dmg(8), apply('weak', 2, 'target')] },
    }),
    M({ id: 'chain_lightning', name: '연쇄 번개', type: 'attack', rarity: 'common', cost: 1, effects: [dmgAll(5)], up: { effects: [dmgAll(8)] } }),
    M({
        id: 'fireball', name: '화염구', type: 'attack', rarity: 'common', cost: 2,
        effects: [dmg(13), apply('vulnerable', 1, 'target')], up: { effects: [dmg(17), apply('vulnerable', 2, 'target')] },
    }),
    M({ id: 'ice_lance', name: '얼음 창', type: 'attack', rarity: 'common', cost: 1, effects: [dmg(8), apply('weak', 1, 'target')], up: { effects: [dmg(11), apply('weak', 1, 'target')] } }),
    M({ id: 'arcane_shield', name: '비전 보호막', type: 'skill', rarity: 'common', cost: 1, effects: [block(7), draw(1)], up: { effects: [block(10), draw(1)] } }),
    M({ id: 'focus', name: '집중', type: 'skill', rarity: 'common', cost: 1, effects: [draw(2)], up: { cost: 0 } }),
    M({ id: 'arcane_missiles', name: '비전 화살비', type: 'attack', rarity: 'uncommon', cost: 1, effects: [dmg(3, 4)], up: { effects: [dmg(4, 4)] } }),
    M({
        id: 'fire_ring', name: '불의 고리', type: 'attack', rarity: 'uncommon', cost: 2,
        effects: [dmgAll(8), apply('vulnerable', 1, 'all')], up: { effects: [dmgAll(11), apply('vulnerable', 2, 'all')] },
    }),
    M({ id: 'frost_armor', name: '서리 갑옷', type: 'power', rarity: 'uncommon', cost: 1, effects: [apply('thorns', 3, 'self'), block(4)], up: { effects: [apply('thorns', 4, 'self'), block(7)] } }),
    M({ id: 'thunder', name: '낙뢰', type: 'attack', rarity: 'rare', cost: 2, exhaust: true, effects: [dmg(26)], up: { effects: [dmg(34)] } }),
    M({
        id: 'blizzard', name: '눈보라', type: 'attack', rarity: 'rare', cost: 2,
        effects: [dmgAll(10), apply('weak', 2, 'all')], up: { effects: [dmgAll(14), apply('weak', 3, 'all')] },
    }),
    M({
        id: 'archmage', name: '대마법사의 각성', type: 'power', rarity: 'unique', cost: 2,
        effects: [apply('strength', 3, 'self'), apply('energize', 1, 'self')], up: { effects: [apply('strength', 4, 'self'), apply('energize', 1, 'self')], cost: 1 },
    }),

    // ═════════ 도적 ═════════
    R({ id: 'stab', name: '찌르기', type: 'attack', rarity: 'starter', cost: 1, effects: [dmg(6)], up: { effects: [dmg(9)] } }),
    R({ id: 'dodge', name: '회피', type: 'skill', rarity: 'starter', cost: 1, effects: [block(5)], up: { effects: [block(8)] } }),
    R({
        id: 'poison_stab', name: '독 찌르기', type: 'attack', rarity: 'starter', cost: 1,
        effects: [dmg(3), apply('poison', 3, 'target')], up: { effects: [dmg(4), apply('poison', 5, 'target')] },
    }),
    R({ id: 'twin_cut', name: '연속 베기', type: 'attack', rarity: 'common', cost: 1, effects: [dmg(3, 2)], up: { effects: [dmg(4, 2)] } }),
    R({
        id: 'venom_dagger', name: '독 바른 단검', type: 'attack', rarity: 'common', cost: 1,
        effects: [dmg(4), apply('poison', 3, 'target')], up: { effects: [dmg(5), apply('poison', 5, 'target')] },
    }),
    R({ id: 'scout', name: '정찰', type: 'skill', rarity: 'common', cost: 1, effects: [draw(2)], up: { cost: 0 } }),
    R({ id: 'sand_throw', name: '모래 뿌리기', type: 'skill', rarity: 'common', cost: 0, effects: [apply('weak', 1, 'target')], up: { effects: [apply('weak', 2, 'target')] } }),
    R({ id: 'dagger_throw', name: '단검 투척', type: 'attack', rarity: 'common', cost: 0, ranged: true, effects: [dmg(4)], up: { effects: [dmg(6)] } }),
    R({ id: 'gale', name: '질풍', type: 'attack', rarity: 'uncommon', cost: 1, effects: [dmg(2, 4)], up: { effects: [dmg(2, 5)] } }),
    R({ id: 'poison_fog', name: '독안개', type: 'skill', rarity: 'uncommon', cost: 1, effects: [apply('poison', 4, 'all')], up: { effects: [apply('poison', 6, 'all')] } }),
    R({
        id: 'expose', name: '약점 간파', type: 'skill', rarity: 'uncommon', cost: 1,
        effects: [apply('vulnerable', 2, 'target'), apply('weak', 2, 'target')], up: { effects: [apply('vulnerable', 3, 'target'), apply('weak', 3, 'target')] },
    }),
    R({ id: 'shadow_step', name: '그림자 걸음', type: 'skill', rarity: 'uncommon', cost: 1, effects: [block(8), draw(1)], up: { effects: [block(11), draw(1)] } }),
    R({ id: 'backstab', name: '등 찌르기', type: 'attack', rarity: 'uncommon', cost: 1, exhaust: true, effects: [dmg(12)], up: { effects: [dmg(17)] } }),
    R({ id: 'toxic_bloom', name: '맹독 개화', type: 'skill', rarity: 'rare', cost: 1, effects: [{ kind: 'doublePoison' }], up: { cost: 0 } }),
    R({ id: 'blade_storm', name: '칼날 폭풍', type: 'attack', rarity: 'rare', cost: 2, effects: [dmgAll(4, 3)], up: { effects: [dmgAll(5, 3)] } }),
    R({
        id: 'shadow_dance', name: '그림자 춤', type: 'attack', rarity: 'unique', cost: 2,
        effects: [dmg(3, 6), apply('poison', 3, 'target')], up: { effects: [dmg(4, 6), apply('poison', 4, 'target')] },
    }),

    // ═════════ 공용 ═════════
    N({ id: 'catch_breath', name: '숨 고르기', type: 'skill', rarity: 'common', cost: 0, exhaust: true, effects: [energy(1), draw(1)], up: { effects: [energy(2), draw(1)] } }),
    N({ id: 'brace', name: '대비', type: 'skill', rarity: 'common', cost: 1, effects: [block(5), draw(1)], up: { effects: [block(8), draw(1)] } }),
    N({ id: 'second_wind', name: '재정비', type: 'skill', rarity: 'uncommon', cost: 1, effects: [block(6), energy(1)], up: { effects: [block(9), energy(1)] } }),
    N({ id: 'regrowth', name: '재생의 숨결', type: 'power', rarity: 'rare', cost: 2, effects: [apply('regen', 3, 'self')], up: { effects: [apply('regen', 4, 'self')] } }),
    N({ id: 'frenzy', name: '광기', type: 'power', rarity: 'rare', cost: 2, effects: [apply('energize', 1, 'self')], up: { cost: 1 } }),

    // ═════════ 연계 카드 ═════════
    // 기사: 방어도와 연계
    K({ id: 'shield_slam', name: '방패 강타', type: 'attack', rarity: 'uncommon', cost: 1, effects: [{ kind: 'blockDamage' }], up: { cost: 0 } }),
    K({ id: 'chain_strike', name: '연계 베기', type: 'attack', rarity: 'common', cost: 1, effects: [dmg(4), { kind: 'combo', per: 3 }], up: { effects: [dmg(6), { kind: 'combo', per: 4 }] } }),
    K({ id: 'war_cry', name: '함성', type: 'skill', rarity: 'common', cost: 0, effects: [draw(1), { kind: 'after', type: 'attack', effects: [energy(1)] }], up: { effects: [draw(2), { kind: 'after', type: 'attack', effects: [energy(1)] }] } }),
    K({ id: 'counter_stance', name: '반격 태세', type: 'skill', rarity: 'common', cost: 1, effects: [block(6), apply('thorns', 1, 'self')], up: { effects: [block(8), apply('thorns', 2, 'self')] } }),
    K({ id: 'execution', name: '처형', type: 'attack', rarity: 'rare', cost: 2, effects: [dmg(12), { kind: 'bonusVs', status: 'vulnerable', amount: 12 }], up: { effects: [dmg(15), { kind: 'bonusVs', status: 'vulnerable', amount: 15 }] } }),
    K({ id: 'rally', name: '전열 정비', type: 'skill', rarity: 'uncommon', cost: 1, effects: [block(7), { kind: 'after', type: 'skill', effects: [block(5), draw(1)] }], up: { effects: [block(10), { kind: 'after', type: 'skill', effects: [block(6), draw(1)] }] } }),
    K({ id: 'rising_slash', name: '치켜베기', type: 'attack', rarity: 'common', cost: 1, effects: [dmg(7), { kind: 'after', type: 'skill', effects: [dmg(5)] }], up: { effects: [dmg(9), { kind: 'after', type: 'skill', effects: [dmg(7)] }] } }),

    // 마법사: 냉기(얼리기)와 화상
    M({ id: 'frost_touch', name: '냉기 손길', type: 'attack', rarity: 'common', cost: 1, effects: [dmg(5), apply('frost', 2, 'target')], up: { effects: [dmg(7), apply('frost', 2, 'target')] } }),
    M({ id: 'shatter', name: '산산조각', type: 'attack', rarity: 'uncommon', cost: 1, effects: [dmg(3), { kind: 'shatter', per: 5 }], up: { effects: [dmg(5), { kind: 'shatter', per: 7 }] } }),
    M({ id: 'glacier', name: '빙하 감옥', type: 'skill', rarity: 'rare', cost: 2, effects: [apply('frost', 3, 'all'), block(8)], up: { effects: [apply('frost', 3, 'all'), block(12)] } }),
    M({ id: 'ignite', name: '점화', type: 'attack', rarity: 'common', cost: 1, effects: [dmg(4), apply('burn', 5, 'target')], up: { effects: [dmg(5), apply('burn', 7, 'target')] } }),
    M({ id: 'combust', name: '연소 폭발', type: 'attack', rarity: 'uncommon', cost: 1, effects: [{ kind: 'detonate', status: 'burn', mult: 2 }], up: { effects: [dmg(4), { kind: 'detonate', status: 'burn', mult: 2 }] } }),
    M({ id: 'flame_chain', name: '불꽃 연쇄', type: 'attack', rarity: 'uncommon', cost: 1, effects: [dmgAll(3), { kind: 'combo', per: 2 }], up: { effects: [dmgAll(5), { kind: 'combo', per: 3 }] } }),
    M({ id: 'mana_flow', name: '마나 흐름', type: 'skill', rarity: 'common', cost: 0, effects: [draw(1), { kind: 'after', type: 'attack', effects: [energy(1)] }], up: { effects: [draw(2), { kind: 'after', type: 'attack', effects: [energy(1)] }] } }),
    M({ id: 'tidal_wave', name: '해일', type: 'attack', rarity: 'rare', cost: 2, effects: [dmgAll(9), apply('weak', 1, 'all'), { kind: 'after', type: 'skill', effects: [dmgAll(5)] }], up: { effects: [dmgAll(12), apply('weak', 2, 'all'), { kind: 'after', type: 'skill', effects: [dmgAll(6)] }] } }),

    // 도적: 공격을 이어 붙여 마무리
    R({ id: 'quick_slash', name: '재빠른 베기', type: 'attack', rarity: 'common', cost: 0, effects: [dmg(3), { kind: 'after', type: 'attack', effects: [draw(1)] }], up: { effects: [dmg(5), { kind: 'after', type: 'attack', effects: [draw(1)] }] } }),
    R({ id: 'finisher', name: '마무리 일격', type: 'attack', rarity: 'uncommon', cost: 1, effects: [dmg(2), { kind: 'finisher', per: 5 }], up: { effects: [dmg(4), { kind: 'finisher', per: 6 }] } }),
    R({ id: 'venom_burst', name: '독 폭발', type: 'attack', rarity: 'uncommon', cost: 1, effects: [{ kind: 'detonate', status: 'poison', mult: 1 }, dmg(3)], up: { effects: [{ kind: 'detonate', status: 'poison', mult: 2 }, dmg(3)] } }),
    R({ id: 'shred', name: '난도질', type: 'attack', rarity: 'common', cost: 1, effects: [dmg(2, 3), { kind: 'combo', per: 1 }], up: { effects: [dmg(3, 3), { kind: 'combo', per: 1 }] } }),
    R({ id: 'smoke_bomb', name: '연막탄', type: 'skill', rarity: 'common', cost: 1, effects: [block(6), apply('weak', 1, 'all')], up: { effects: [block(8), apply('weak', 2, 'all')] } }),
    R({ id: 'assassinate', name: '암살', type: 'attack', rarity: 'rare', cost: 2, effects: [dmg(10), { kind: 'bonusVs', status: 'poison', amount: 10 }], up: { effects: [dmg(13), { kind: 'bonusVs', status: 'poison', amount: 13 }] } }),
    R({ id: 'shadow_chain', name: '그림자 연계', type: 'skill', rarity: 'uncommon', cost: 0, effects: [draw(1), { kind: 'after', type: 'attack', effects: [energy(1), draw(1)] }], up: { effects: [draw(2), { kind: 'after', type: 'attack', effects: [energy(1), draw(1)] }] } }),

    // 공용
    N({ id: 'bandage', name: '붕대 감기', type: 'skill', rarity: 'common', cost: 1, exhaust: true, effects: [heal(7)], up: { effects: [heal(10)] } }),
    N({ id: 'adrenaline', name: '아드레날린', type: 'skill', rarity: 'rare', cost: 0, exhaust: true, effects: [energy(1), draw(2)], up: { effects: [energy(2), draw(2)] } }),
    N({ id: 'momentum', name: '기세', type: 'attack', rarity: 'uncommon', cost: 1, effects: [dmg(4), { kind: 'combo', per: 2 }, { kind: 'after', type: 'attack', effects: [block(4)] }], up: { effects: [dmg(6), { kind: 'combo', per: 3 }, { kind: 'after', type: 'attack', effects: [block(5)] }] } }),

    // ═════════ 저주 (적이 덱에 섞어 넣음, 전투가 끝나면 사라짐) ═════════
    N({ id: 'dread', name: '불길한 예감', type: 'skill', rarity: 'starter', cost: 0, unplayable: true, effects: [], up: {} }),
];

/** 저주 카드 id */
export const CURSE_CARD = 'dread';

/** 기를 모으는 강한 기술 */
const CHARGED = new Set([
    'heavy_blow', 'cleave_line', 'oath_blade', 'execution',
    'fireball', 'thunder', 'blizzard', 'tidal_wave', 'archmage', 'glacier', 'shatter',
    'backstab', 'blade_storm', 'shadow_dance', 'finisher', 'assassinate',
]);
for (const c of LIST) if (CHARGED.has(c.id)) c.charge = true;

export const CARDS: Record<string, CardDef> = Object.fromEntries(LIST.map((c) => [c.id, c]));

/** 이 직업이 얻을 수 있는 카드 (직업 카드 + 공용) */
export function cardPool(rarity: Rarity, cls?: ClassId): string[] {
    return LIST.filter((c) => c.rarity === rarity && (!cls || c.cls === cls || c.cls === 'neutral')).map((c) => c.id);
}

export const MAX_LEVEL = 3;
export const cardLevel = (inst: { upgraded: boolean; level?: number }) => inst.level ?? (inst.upgraded ? 2 : 1);

export const RARITY_INFO: Record<Rarity, { name: string }> = {
    starter: { name: '기본' },
    common: { name: '일반' },
    uncommon: { name: '고급' },
    rare: { name: '희귀' },
    unique: { name: '유니크' },
};

/** Lv.3: 강화 수치에서 피해·방어·회복·상태이상을 한 번 더 30% 올린다 */
function boost(e: Effect): Effect {
    const up = (n: number) => Math.max(n + 1, Math.ceil(n * 1.3));
    switch (e.kind) {
        case 'damage':
        case 'damageAll':
        case 'block':
        case 'heal':
            return { ...e, amount: up(e.amount) };
        case 'apply':
            return e.status === 'energize' ? e : { ...e, amount: up(e.amount) };
        case 'combo':
        case 'shatter':
        case 'finisher':
            return { ...e, per: up(e.per) };
        case 'bonusVs':
            return { ...e, amount: up(e.amount) };
        case 'after':
            return { ...e, effects: e.effects.map(boost) };
        default:
            return e;
    }
}

/** 레벨을 반영한 실제 카드 정보 */
export function cardStats(inst: { id: string; upgraded: boolean; level?: number }) {
    const def = CARDS[inst.id];
    const lv = cardLevel(inst);
    const u = lv >= 2 ? def.up : {};
    let effects = u.effects ?? def.effects;
    let cost = u.cost ?? def.cost;
    if (lv >= 3) {
        effects = effects.map(boost);
        // 수치가 없는 카드(드로우·비용)는 Lv.3에서 비용을 1 더 줄인다
        if (effects.every((e, i) => e === (u.effects ?? def.effects)[i])) cost = Math.max(0, cost - 1);
    }
    return {
        def,
        level: lv,
        name: def.name,
        cost,
        effects,
        exhaust: u.exhaust ?? def.exhaust ?? false,
    };
}

export const STATUS_INFO: Record<Status, { name: string; desc: string; debuff: boolean }> = {
    strength: { name: '힘', desc: '공격 피해가 수치만큼 증가', debuff: false },
    vulnerable: { name: '취약', desc: '받는 공격 피해 50% 증가 (턴마다 1 감소)', debuff: true },
    weak: { name: '약화', desc: '주는 공격 피해 25% 감소 (턴마다 1 감소)', debuff: true },
    poison: { name: '독', desc: '턴 시작 시 수치만큼 체력을 잃고 1 감소', debuff: true },
    thorns: { name: '가시', desc: '공격받을 때 공격자에게 수치만큼 피해', debuff: false },
    regen: { name: '재생', desc: '턴 종료 시 수치만큼 체력 회복', debuff: false },
    energize: { name: '활력', desc: '매 턴 에너지를 수치만큼 추가로 얻음', debuff: false },
    frost: { name: '냉기', desc: '3 이상 쌓이면 다음 행동 때 얼어붙어 한 번 쉰다', debuff: true },
    burn: { name: '화상', desc: '턴 시작 시 수치만큼 피해, 그 뒤 절반으로 줄어듦', debuff: true },
};

const TYPE_NAME = { attack: '공격', skill: '기술', power: '지속' } as const;

function describeEffect(e: Effect): string {
    switch (e.kind) {
        case 'damage':
            return `피해 ${e.amount}${e.hits && e.hits > 1 ? ` × ${e.hits}회` : ''}`;
        case 'damageAll':
            return `모든 적에게 피해 ${e.amount}${e.hits && e.hits > 1 ? ` × ${e.hits}회` : ''}`;
        case 'block':
            return `방어도 ${e.amount}`;
        case 'draw':
            return `카드 ${e.amount}장 뽑기`;
        case 'energy':
            return `에너지 ${e.amount} 획득`;
        case 'heal':
            return `체력 ${e.amount} 회복`;
        case 'apply': {
            const n = STATUS_INFO[e.status].name;
            if (e.to === 'self') return `${n} ${e.amount} 얻기`;
            if (e.to === 'all') return `모든 적에게 ${n} ${e.amount}`;
            return `${n} ${e.amount} 부여`;
        }
        case 'doublePoison':
            return '대상의 독을 두 배로';
        case 'combo':
            return `연계: 이번 턴 먼저 낸 카드 1장당 피해 +${e.per}`;
        case 'after':
            return `직전 카드가 ${TYPE_NAME[e.type]}이면: ${e.effects.map(describeEffect).join(', ')}`;
        case 'blockDamage':
            return '현재 방어도만큼 피해';
        case 'shatter':
            return `대상의 냉기 1당 피해 ${e.per} (냉기 사라짐)`;
        case 'finisher':
            return `이번 턴 먼저 낸 공격 1장당 피해 ${e.per}`;
        case 'bonusVs':
            return `대상이 ${STATUS_INFO[e.status].name} 상태면 피해 +${e.amount}`;
        case 'detonate':
            return `대상의 ${STATUS_INFO[e.status].name} ×${e.mult}만큼 즉시 피해`;
    }
}

export function describeCard(inst: { id: string; upgraded: boolean; level?: number }): string[] {
    const s = cardStats(inst);
    if (s.def.unplayable) return ['낼 수 없음', '턴이 끝나면 사라짐'];
    const lines = s.effects.map(describeEffect);
    if (s.def.type === 'power') lines.push('지속 (전투 내내 유지)');
    if (s.exhaust) lines.push('소멸');
    return lines;
}

export function needsTarget(inst: CardInst): boolean {
    const targeted = (e: Effect): boolean =>
        e.kind === 'damage' || e.kind === 'doublePoison' || (e.kind === 'apply' && e.to === 'target') ||
        e.kind === 'blockDamage' || e.kind === 'shatter' || e.kind === 'finisher' || e.kind === 'bonusVs' || e.kind === 'detonate' ||
        (e.kind === 'after' && e.effects.some(targeted));
    return cardStats(inst).effects.some(targeted);
}
