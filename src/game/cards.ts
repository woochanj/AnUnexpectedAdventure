import type { CardDef, CardInst, Effect, Rarity, Status } from './types';

const dmg = (amount: number, hits?: number): Effect => ({ kind: 'damage', amount, hits });
const dmgAll = (amount: number, hits?: number): Effect => ({ kind: 'damageAll', amount, hits });
const block = (amount: number): Effect => ({ kind: 'block', amount });
const draw = (amount: number): Effect => ({ kind: 'draw', amount });
const energy = (amount: number): Effect => ({ kind: 'energy', amount });
const heal = (amount: number): Effect => ({ kind: 'heal', amount });
const apply = (status: Status, amount: number, to: 'target' | 'all' | 'self'): Effect => ({ kind: 'apply', status, amount, to });

const LIST: CardDef[] = [
    // ── 시작 카드 ──
    { id: 'slash', name: '베기', type: 'attack', rarity: 'starter', cost: 1, effects: [dmg(6)], up: { effects: [dmg(9)] } },
    { id: 'guard', name: '막기', type: 'skill', rarity: 'starter', cost: 1, effects: [block(5)], up: { effects: [block(8)] } },
    {
        id: 'torch_swing', name: '횃불 휘두르기', type: 'attack', rarity: 'starter', cost: 1,
        effects: [dmg(5), apply('vulnerable', 1, 'target')],
        up: { effects: [dmg(7), apply('vulnerable', 2, 'target')] },
    },

    // ── 일반 ──
    { id: 'twin_cut', name: '연속 베기', type: 'attack', rarity: 'common', cost: 1, effects: [dmg(3, 2)], up: { effects: [dmg(4, 2)] } },
    {
        id: 'shield_bash', name: '방패 치기', type: 'attack', rarity: 'common', cost: 1,
        effects: [dmg(5), block(4)], up: { effects: [dmg(7), block(6)] },
    },
    { id: 'sweep', name: '휩쓸기', type: 'attack', rarity: 'common', cost: 1, effects: [dmgAll(5)], up: { effects: [dmgAll(8)] } },
    { id: 'heavy_blow', name: '강타', type: 'attack', rarity: 'common', cost: 2, effects: [dmg(14)], up: { effects: [dmg(19)] } },
    {
        id: 'venom_dagger', name: '독 바른 단검', type: 'attack', rarity: 'common', cost: 1,
        effects: [dmg(4), apply('poison', 3, 'target')], up: { effects: [dmg(5), apply('poison', 5, 'target')] },
    },
    { id: 'crouch', name: '웅크리기', type: 'skill', rarity: 'common', cost: 1, effects: [block(8)], up: { effects: [block(11)] } },
    { id: 'scout', name: '정찰', type: 'skill', rarity: 'common', cost: 1, effects: [draw(2)], up: { cost: 0 } },
    {
        id: 'sand_throw', name: '모래 뿌리기', type: 'skill', rarity: 'common', cost: 0,
        effects: [apply('weak', 1, 'target')], up: { effects: [apply('weak', 2, 'target')] },
    },
    {
        id: 'catch_breath', name: '숨 고르기', type: 'skill', rarity: 'common', cost: 0, exhaust: true,
        effects: [energy(1), draw(1)], up: { effects: [energy(2), draw(1)] },
    },
    {
        id: 'brace', name: '대비', type: 'skill', rarity: 'common', cost: 1,
        effects: [block(5), draw(1)], up: { effects: [block(8), draw(1)] },
    },

    // ── 고급 ──
    {
        id: 'poison_fog', name: '독안개', type: 'skill', rarity: 'uncommon', cost: 1,
        effects: [apply('poison', 4, 'all')], up: { effects: [apply('poison', 6, 'all')] },
    },
    { id: 'fury', name: '분노', type: 'power', rarity: 'uncommon', cost: 1, effects: [apply('strength', 2, 'self')], up: { effects: [apply('strength', 3, 'self')] } },
    { id: 'iron_wall', name: '철벽', type: 'skill', rarity: 'uncommon', cost: 2, effects: [block(16)], up: { effects: [block(21)] } },
    { id: 'thorn_stance', name: '가시 자세', type: 'power', rarity: 'uncommon', cost: 1, effects: [apply('thorns', 3, 'self')], up: { effects: [apply('thorns', 5, 'self')] } },
    {
        id: 'blood_strike', name: '피의 일격', type: 'attack', rarity: 'uncommon', cost: 2, exhaust: true,
        effects: [dmg(12), heal(4)], up: { effects: [dmg(15), heal(6)] },
    },
    { id: 'gale', name: '질풍', type: 'attack', rarity: 'uncommon', cost: 1, effects: [dmg(2, 4)], up: { effects: [dmg(2, 5)] } },
    {
        id: 'expose', name: '약점 간파', type: 'skill', rarity: 'uncommon', cost: 1,
        effects: [apply('vulnerable', 2, 'target'), apply('weak', 2, 'target')],
        up: { effects: [apply('vulnerable', 3, 'target'), apply('weak', 3, 'target')] },
    },
    {
        id: 'second_wind', name: '재정비', type: 'skill', rarity: 'uncommon', cost: 1,
        effects: [block(6), energy(1)], up: { effects: [block(9), energy(1)] },
    },

    // ── 희귀 ──
    { id: 'thunder', name: '천둥 강타', type: 'attack', rarity: 'rare', cost: 2, exhaust: true, effects: [dmg(26)], up: { effects: [dmg(34)] } },
    { id: 'regrowth', name: '재생의 숨결', type: 'power', rarity: 'rare', cost: 2, effects: [apply('regen', 3, 'self')], up: { effects: [apply('regen', 4, 'self')] } },
    { id: 'frenzy', name: '광기', type: 'power', rarity: 'rare', cost: 2, effects: [apply('energize', 1, 'self')], up: { cost: 1 } },
    { id: 'toxic_bloom', name: '맹독 개화', type: 'skill', rarity: 'rare', cost: 1, effects: [{ kind: 'doublePoison' }], up: { cost: 0 } },
    { id: 'blade_storm', name: '칼날 폭풍', type: 'attack', rarity: 'rare', cost: 2, effects: [dmgAll(4, 3)], up: { effects: [dmgAll(5, 3)] } },
];

export const CARDS: Record<string, CardDef> = Object.fromEntries(LIST.map((c) => [c.id, c]));

export function cardPool(rarity: Rarity): string[] {
    return LIST.filter((c) => c.rarity === rarity).map((c) => c.id);
}

/** 강화 여부를 반영한 실제 카드 정보 */
export function cardStats(inst: { id: string; upgraded: boolean }) {
    const def = CARDS[inst.id];
    const u = inst.upgraded ? def.up : {};
    return {
        def,
        name: def.name + (inst.upgraded ? '+' : ''),
        cost: u.cost ?? def.cost,
        effects: u.effects ?? def.effects,
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

export function describeCard(inst: { id: string; upgraded: boolean }): string[] {
    const s = cardStats(inst);
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

export const STARTER_DECK = ['slash', 'slash', 'slash', 'slash', 'slash', 'guard', 'guard', 'guard', 'guard', 'torch_swing'];
