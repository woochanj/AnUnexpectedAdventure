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

    // ═════════ 저주 (적이 덱에 섞어 넣음, 전투가 끝나면 사라짐) ═════════
    N({ id: 'dread', name: '불길한 예감', type: 'skill', rarity: 'starter', cost: 0, unplayable: true, effects: [], up: {} }),
];

/** 저주 카드 id */
export const CURSE_CARD = 'dread';

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
};

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
    return cardStats(inst).effects.some(
        (e) => e.kind === 'damage' || e.kind === 'doublePoison' || (e.kind === 'apply' && e.to === 'target'),
    );
}
