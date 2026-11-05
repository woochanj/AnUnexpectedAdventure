import { cardStats, CURSE_CARD, ELEMENT_NAME } from './cards';
import { ENEMIES } from './enemies';
import type { Affix, CardInst, CombatKind, Effect, CombatState, Cue, EnemyState, Fighter, Fx, Intent, RunState, SpellElement, Status } from './types';
import { CLASSES } from './classes';
import { ENERGY_RELICS } from './relics';
import { pick, rand, shuffle } from './util';

const HAND_SIZE = 5;
const MAX_HAND = 10;

function fx(c: CombatState, target: string, text: string, kind: 'dmg' | 'block' | 'heal' | 'status', extra: Partial<Fx> = {}) {
    c.fx.push({ id: ++c.fxSeq, target, text, kind, delay: c.delay, ...extra });
    if (c.fx.length > 24) c.fx.splice(0, c.fx.length - 24);
}

function cue(c: CombatState, q: Omit<Cue, 'id' | 'delay'>) {
    c.cues.push({ ...q, id: ++c.cueSeq, delay: c.delay });
    if (c.cues.length > 30) c.cues.splice(0, c.cues.length - 30);
}

/** 공격 카드를 낸 뒤 주인공이 예비동작을 하고 이펙트가 시작되기까지(초) */
export const ATTACK_WINDUP = 0.42;
/** 강한 기술이 기를 모으는 시간(초) */
export const CHARGE_TIME = 0.65;
/** 이 카드를 낸 뒤 주인공이 움직이기 시작해 공격이 닿기 직전까지(초) */
/** 궁극기는 이만큼 더 오래 모은다 */
export const ULTIMATE_EXTRA = 0.55;
export const chargeOf = (def: { charge?: boolean; ultimate?: boolean }) => (def.charge ? CHARGE_TIME : 0) + (def.ultimate ? ULTIMATE_EXTRA : 0);
/** 원거리 공격(주문·투척)은 손끝에 기를 모았다가 쏘아 보내는 만큼 준비가 길다 */
export const RANGED_GATHER = 0.25;
export const windupOf = (def: { type: string; charge?: boolean; ultimate?: boolean; ranged?: boolean }) =>
    (def.type === 'attack' ? ATTACK_WINDUP + (def.ranged ? RANGED_GATHER : 0) : 0) + chargeOf(def);

/** 공격 이펙트가 대상에 닿기까지 걸리는 시간(초) */
export const IMPACT_DELAY = 0.08;

/** 냉기가 이만큼 쌓이면 적이 한 번 얼어붙는다 */
export const FREEZE_AT = 3;

/** 적 한 명의 행동 사이 간격(초) */
export const ENEMY_STEP = 1.35;
/** 적 턴 첫 행동까지(초): 몬스터가 웅크렸다 달려드는 시간보다 길어야 타격이 도착과 맞는다 */
export const ENEMY_LEAD = 1.35;

function addStatus(f: Fighter, s: Status, n: number) {
    f.status[s] = (f.status[s] ?? 0) + n;
    if ((f.status[s] ?? 0) <= 0) delete f.status[s];
}

const alive = (c: CombatState) => c.enemies.filter((e) => e.hp > 0);

/** 정예/보스 성향: 이름 앞에 붙는 말과 설명 */
export const AFFIXES: Record<Affix, { name: string; desc: string }> = {
    brutal: { name: '광폭한', desc: '힘을 가지고 시작한다' },
    tough: { name: '단단한', desc: '체력이 30% 더 많다' },
    spiky: { name: '가시 돋친', desc: '때리면 가시에 찔린다' },
    regen: { name: '되살아나는', desc: '매 턴 체력을 회복한다' },
    venom: { name: '맹독의', desc: '공격할 때마다 독을 묻힌다' },
};

function applyAffix(e: EnemyState, a: Affix, strong: boolean) {
    e.affix = a;
    if (a === 'brutal') addStatus(e, 'strength', strong ? 3 : 2);
    if (a === 'tough') e.hp = e.maxHp = Math.round(e.maxHp * 1.3);
    if (a === 'spiky') addStatus(e, 'thorns', strong ? 4 : 3);
    if (a === 'regen') addStatus(e, 'regen', strong ? 5 : 3);
}

/** 보스가 체력 절반 아래로 떨어지면 한 번 분노한다 */
function checkEnrage(c: CombatState) {
    for (const e of alive(c)) {
        const n = ENEMIES[e.defId].enrage;
        if (!n || e.enraged || e.hp > e.maxHp / 2) continue;
        e.enraged = true;
        cue(c, { kind: 'enemyBuff', target: e.uid });
        addStatus(e, 'strength', n);
        fx(c, e.uid, `분노! 힘 +${n}`, 'status');
    }
}

function pickIntent(e: EnemyState): Intent {
    const def = ENEMIES[e.defId];
    if (def.random) {
        // 같은 행동을 연속으로 하지 않도록
        const choices = def.moves.map((_, i) => i).filter((i) => i !== e.moveIdx || def.moves.length === 1);
        e.moveIdx = pick(choices);
    } else {
        e.moveIdx = (e.moveIdx + 1) % def.moves.length;
    }
    return def.moves[e.moveIdx];
}

export function startCombat(run: RunState, kind: CombatKind, enemyIds: string[]): CombatState {
    const deck = run.deck.map((c) => ({ ...c }));
    const c: CombatState = {
        kind,
        player: { hp: run.hp, maxHp: run.maxHp, block: 0, status: {} },
        enemies: enemyIds.map((id, i) => {
            const def = ENEMIES[id];
            const hp = rand(def.hp[0], def.hp[1]);
            const e: EnemyState = {
                uid: `e${i}`, defId: id, hp, maxHp: hp, block: 0, status: {},
                moveIdx: def.random ? -1 : rand(0, def.moves.length - 1) - 1,
                intent: {},
            };
            // 보스는 항상 첫 행동부터
            if (kind === 'boss') e.moveIdx = -1;
            e.intent = pickIntent(e);
            return e;
        }),
        curseSeq: 0,
        draw: shuffle(deck),
        hand: [],
        discard: [],
        exhaust: [],
        energy: 0,
        maxEnergy: 3 + run.relics.filter((r) => ENERGY_RELICS.includes(r)).length,
        reviveLeft: run.relics.includes('phoenix_feather') ? 1 : 0,
        turn: 0,
        fx: [],
        fxSeq: 0,
        cues: [],
        cueSeq: 0,
        critChance: CLASSES[run.cls]?.crit ?? 0.1,
        delay: 0,
        gritOn: run.cls === 'knight',
    };
    // 정예와 보스는 무작위 성향을 하나 가진다 (같은 적이라도 매번 다르게)
    if (kind !== 'normal') {
        // 보스는 이미 단단하므로 체력 증가는 빼고, 수치도 정예와 같게
        const pool = (Object.keys(AFFIXES) as Affix[]).filter((a) => kind !== 'boss' || a !== 'tough');
        for (const e of c.enemies) applyAffix(e, pick(pool), false);
    }
    if (run.relics.includes('whetstone')) addStatus(c.player, 'strength', 1);
    if (run.relics.includes('war_banner')) addStatus(c.player, 'strength', 2);
    if (run.relics.includes('herb_pouch')) for (const e of c.enemies) addStatus(e, 'poison', 3);
    startPlayerTurn(c, run);
    if (run.relics.includes('iron_shield')) gainBlock(c, 'player', c.player, 8);
    return c;
}

function drawCards(c: CombatState, n: number) {
    for (let i = 0; i < n; i++) {
        if (c.hand.length >= MAX_HAND) return;
        if (c.draw.length === 0) {
            if (c.discard.length === 0) return;
            c.draw = shuffle(c.discard);
            c.discard = [];
        }
        c.hand.push(c.draw.pop()!);
    }
}

function gainBlock(c: CombatState, key: string, f: Fighter, n: number) {
    f.block += n;
    fx(c, key, `+${n}`, 'block');
}

function heal(c: CombatState, key: string, f: Fighter, n: number) {
    const before = f.hp;
    f.hp = Math.min(f.maxHp, f.hp + n);
    if (f.hp > before) fx(c, key, `+${f.hp - before}`, 'heal');
}

/** 공격자 상태를 반영한 피해량 */
export function attackDamage(base: number, attacker: Fighter, defender: Fighter | null): number {
    let d = base + (attacker.status.strength ?? 0);
    if (attacker.status.weak) d = Math.floor(d * 0.75);
    if (defender?.status.vulnerable) d = Math.floor(d * 1.5);
    return Math.max(0, d);
}

/** 방어도를 먼저 깎고 남은 만큼 체력 감소 */
function hit(c: CombatState, key: string, f: Fighter, amount: number, crit = false) {
    const absorbed = Math.min(f.block, amount);
    f.block -= absorbed;
    const lost = amount - absorbed;
    f.hp = Math.max(0, f.hp - lost);
    fx(c, key, lost > 0 ? `-${lost}` : '막음', lost > 0 ? 'dmg' : 'block', { crit: crit && lost > 0, amount: lost });
    return lost;
}

/** 적의 치명타 확률 */
const ENEMY_CRIT = 0.05;

function attack(c: CombatState, aKey: string, attacker: Fighter, dKey: string, defender: Fighter, base: number) {
    if (attacker.hp <= 0 || defender.hp <= 0) return 0;
    // 치명타: 피해 1.5배
    const chance = aKey === 'player' ? c.critChance : ENEMY_CRIT;
    // 회피: 확률로 공격을 통째로 피한다 (가시도 터지지 않음)
    const evade = Math.min(75, defender.status.evade ?? 0);
    if (evade > 0 && Math.random() * 100 < evade) {
        fx(c, dKey, '회피!', 'status');
        return 0;
    }
    const crit = Math.random() < chance;
    const d = attackDamage(base, attacker, defender);
    const blockBefore = defender.block;
    const lost = hit(c, dKey, defender, crit ? Math.floor(d * 1.5) : d, crit);
    // 기사의 투지: 방어도로 공격을 막아 낼 때마다 1
    if (dKey === 'player' && c.gritOn && d > 0 && defender.block < blockBefore) gainGrit(c, 1);
    const thorns = defender.status.thorns ?? 0;
    if (thorns > 0 && attacker.hp > 0) hit(c, aKey, attacker, thorns);
    return lost;
}

/** 투지는 10까지 */
export const GRIT_MAX = 10;
function gainGrit(c: CombatState, n: number) {
    const before = c.player.status.grit ?? 0;
    const next = Math.min(GRIT_MAX, before + n);
    if (next === before) return;
    c.player.status.grit = next;
    fx(c, 'player', `투지 +${next - before}`, 'status');
}

/** 원소 반응: 직전과 다른 원소를 쓰면 새 원소에 따라 덤이 붙는다 */
function reaction(el: SpellElement, all: boolean): Effect[] {
    if (el === 'fire') return [{ kind: 'apply', status: 'burn', amount: 3, to: all ? 'all' : 'target' }];
    if (el === 'frost') return [{ kind: 'apply', status: 'frost', amount: 1, to: all ? 'all' : 'target' }];
    if (el === 'lightning') return [{ kind: 'draw', amount: 1 }];
    return [{ kind: 'block', amount: 5 }];
}
const REACTION_NOTE: Record<SpellElement, string> = { fire: '화상 +3', frost: '냉기 +1', lightning: '카드 1장', earth: '방어도 +5' };
/** 같은 원소를 연달아 쓰면 공명: 피해 +3 */
export const RESONANCE = 3;

function loseHp(c: CombatState, key: string, f: Fighter, n: number, label: string) {
    f.hp = Math.max(0, f.hp - n);
    fx(c, key, `${label} -${n}`, 'dmg', { dot: true, amount: n });
}

function checkEnd(c: CombatState) {
    if (c.player.hp <= 0 && (c.reviveLeft ?? 0) > 0) {
        // 불사조 깃털: 한 번 되살아난다
        c.reviveLeft = 0;
        c.revived = true;
        c.player.hp = Math.ceil(c.player.maxHp / 2);
        fx(c, 'player', '불사조! 부활', 'heal');
    }
    if (c.player.hp <= 0) c.result = 'lose';
    else if (alive(c).length === 0) c.result = 'win';
}

function startPlayerTurn(c: CombatState, run: RunState) {
    c.turn++;
    c.played = 0;
    c.attacksPlayed = 0;
    c.lastType = null;
    c.lastEl = null;
    run.stats.turns++;
    c.player.block = 0;
    delete c.player.status.evade; // 회피는 적 턴 한 번만
    const poison = c.player.status.poison ?? 0;
    if (poison > 0) {
        loseHp(c, 'player', c.player, poison, '독');
        addStatus(c.player, 'poison', -1);
        checkEnd(c);
        if (c.result) return;
    }
    c.energy = c.maxEnergy + (c.player.status.energize ?? 0);
    let n = HAND_SIZE + (run.relics.includes('sage_tome') ? 1 : 0);
    if (c.turn === 1 && run.relics.includes('rusty_hourglass')) n -= 2;
    drawCards(c, n);
}

export function canPlay(c: CombatState, card: CardInst): boolean {
    const s = cardStats(card);
    return !c.result && !s.def.unplayable && s.cost <= c.energy;
}

export function playCard(c: CombatState, run: RunState, handIdx: number, targetUid: string | null) {
    const card = c.hand[handIdx];
    if (!card || !canPlay(c, card)) return;
    const s = cardStats(card);
    const target = c.enemies.find((e) => e.uid === targetUid && e.hp > 0) ?? alive(c)[0] ?? null;

    c.energy -= s.cost;
    c.hand.splice(handIdx, 1);
    c.delay = 0;
    cue(c, { kind: 'card', card: card.id, target: target?.uid ?? null });
    // 숫자와 흔들림은 이펙트가 대상에 닿는 순간(약 0.08초 뒤)에 맞춘다
    if (s.def.type === 'attack') c.delay = windupOf(s.def) + IMPACT_DELAY;
    else if (s.def.charge) c.delay = windupOf(s.def);

    // 연계: '직전 카드가 ~이면' 조건을 풀고, 이번 턴 앞서 낸 카드 수로 보너스를 정한다
    const before = c.played ?? 0;
    const flat: Effect[] = [];
    let triggered = false;
    for (const e of s.effects) {
        if (e.kind === 'after') {
            if (c.lastType === e.type) {
                flat.push(...e.effects);
                triggered = true;
            }
        } else flat.push(e);
    }
    if (triggered) fx(c, 'player', '연계!', 'status');
    let comboBonus = flat.reduce((n, e) => n + (e.kind === 'combo' ? e.per * before : 0), 0);
    // 마법사 원소: 같은 원소를 연달아 쓰면 공명(피해 +3), 다른 원소로 바꾸면 반응(새 원소의 덤)
    // 알림은 카드를 낸 직후에 (주문이 날아가는 동안 읽히게), 대상 표시는 맞는 순간에
    const el = s.def.el;
    const all = flat.some((e) => e.kind === 'damageAll');
    const procAt = { delay: 0.12, impact: c.delay };
    if (el && c.lastEl) {
        if (c.lastEl === el) {
            const hits = flat.some((e) => e.kind === 'damage' || e.kind === 'damageAll');
            comboBonus += RESONANCE;
            fx(c, 'player', `${ELEMENT_NAME[el]} 공명!`, 'status', { ...procAt, proc: { kind: 'resonance', el, note: hits ? `피해 +${RESONANCE}` : '공명', impact: procAt.impact, all } });
        } else {
            fx(c, 'player', `${ELEMENT_NAME[c.lastEl]}+${ELEMENT_NAME[el]} 반응!`, 'status', { ...procAt, proc: { kind: 'reaction', el, from: c.lastEl, note: REACTION_NOTE[el], impact: procAt.impact, all } });
            flat.push(...reaction(el, all));
        }
    }
    if (el) c.lastEl = el;
    const strike = (amount: number) => {
        if (target) attack(c, 'player', c.player, target.uid, target, amount);
    };

    for (const e of flat) {
        if (c.result) break;
        switch (e.kind) {
            case 'damage':
                for (let i = 0; i < (e.hits ?? 1); i++) strike(e.amount + comboBonus);
                break;
            case 'damageAll':
                for (let i = 0; i < (e.hits ?? 1); i++) for (const en of alive(c)) attack(c, 'player', c.player, en.uid, en, e.amount + comboBonus);
                break;
            case 'block':
                gainBlock(c, 'player', c.player, e.amount);
                break;
            case 'draw':
                drawCards(c, e.amount);
                break;
            case 'energy':
                c.energy += e.amount;
                break;
            case 'heal':
                heal(c, 'player', c.player, e.amount);
                break;
            case 'apply': {
                const targets = e.to === 'self' ? [c.player] : e.to === 'all' ? alive(c) : target ? [target] : [];
                for (const t of targets) {
                    addStatus(t, e.status, e.amount);
                    const key = t === c.player ? 'player' : (t as EnemyState).uid;
                    fx(c, key, `${statusShort(e.status)} +${e.amount}`, 'status');
                }
                break;
            }
            case 'doublePoison':
                if (target && target.status.poison) {
                    fx(c, target.uid, `독 ×2`, 'status');
                    addStatus(target, 'poison', target.status.poison);
                }
                break;
            case 'blockDamage':
                if (c.player.block > 0) strike(c.player.block);
                break;
            case 'shatter':
                if (target && target.status.frost) {
                    const n = target.status.frost;
                    delete target.status.frost;
                    fx(c, target.uid, `산산조각 ×${n}`, 'status');
                    strike(n * e.per);
                }
                break;
            case 'finisher':
                strike((c.attacksPlayed ?? 0) * e.per);
                break;
            case 'bonusVs':
                if (target && (target.status[e.status] ?? 0) > 0) strike(e.amount);
                break;
            case 'detonate':
                if (target && (target.status[e.status] ?? 0) > 0) {
                    const n = (target.status[e.status] ?? 0) * e.mult;
                    fx(c, target.uid, `${statusShort(e.status)} 폭발!`, 'status');
                    loseHp(c, target.uid, target, n, statusShort(e.status));
                }
                break;
            case 'grit':
                gainGrit(c, e.amount);
                break;
            case 'unleash': {
                const n = c.player.status.grit ?? 0;
                if (n > 0 && target) {
                    delete c.player.status.grit;
                    fx(c, 'player', `투지 폭발 ×${n}`, 'status', { delay: 0.12, proc: { kind: 'unleash', n, note: `피해 +${n * e.per}`, impact: c.delay } });
                    strike(n * e.per);
                }
                break;
            }
            case 'combo':
                break;
        }
        checkEnd(c);
    }

    for (const en of c.enemies) if (en.hp <= 0) markDead(c, en, run);
    checkEnrage(c);

    c.played = before + 1;
    if (s.def.type === 'attack') c.attacksPlayed = (c.attacksPlayed ?? 0) + 1;
    c.lastType = s.def.type;
    if (s.def.type === 'power' || s.exhaust) c.exhaust.push(card);
    else c.discard.push(card);
    checkEnd(c);
}

function markDead(c: CombatState, e: EnemyState, run: RunState) {
    if (e.dead) return;
    e.dead = true;
    cue(c, { kind: 'death', target: e.uid });
    e.status = {};
    e.block = 0;
    run.stats.kills++;
}

function statusShort(s: Status): string {
    return { strength: '힘', vulnerable: '취약', weak: '약화', poison: '독', thorns: '가시', regen: '재생', energize: '활력', frost: '냉기', burn: '화상', evade: '회피', grit: '투지' }[s];
}

export function endTurn(c: CombatState, run: RunState) {
    if (c.result) return;

    // 플레이어 턴 종료
    // 저주 카드는 손에 남아 있으면 사라진다
    for (const card of c.hand) (cardStats(card).def.unplayable ? c.exhaust : c.discard).push(card);
    c.hand = [];
    const regen = c.player.status.regen ?? 0;
    if (regen > 0) heal(c, 'player', c.player, regen);
    addStatus(c.player, 'weak', c.player.status.weak ? -1 : 0);
    addStatus(c.player, 'vulnerable', c.player.status.vulnerable ? -1 : 0);

    // 적 턴: 행동마다 지연을 늘려 화면에서 한 명씩 움직이게 한다.
    // 첫 적도 예고(0.38초)와 달려드는 동작(최대 0.86초)을 마친 뒤 맞도록 ENEMY_LEAD만큼 늦게 시작한다
    c.delay = ENEMY_LEAD;
    for (const e of c.enemies) {
        if (e.hp <= 0) continue;
        e.block = 0;
        const poison = e.status.poison ?? 0;
        if (poison > 0) {
            cue(c, { kind: 'poison', target: e.uid });
            loseHp(c, e.uid, e, poison, '독');
            addStatus(e, 'poison', -1);
            if (e.hp <= 0) {
                markDead(c, e, run);
                continue;
            }
            checkEnrage(c);
        }
        // 화상: 수치만큼 피해, 그 뒤 절반으로
        const burn = e.status.burn ?? 0;
        if (burn > 0) {
            loseHp(c, e.uid, e, burn, '화상');
            e.status.burn = Math.floor(burn / 2);
            if (!e.status.burn) delete e.status.burn;
            if (e.hp <= 0) {
                markDead(c, e, run);
                continue;
            }
            checkEnrage(c);
        }
        const regenE = e.status.regen ?? 0;
        if (regenE > 0) heal(c, e.uid, e, regenE);
        // 냉기 3 이상이면 얼어붙어 이번 행동을 건너뛴다
        if ((e.status.frost ?? 0) >= FREEZE_AT) {
            delete e.status.frost;
            fx(c, e.uid, '빙결! 행동 불가', 'status');
            cue(c, { kind: 'enemyDebuff', target: e.uid });
            addStatus(e, 'weak', e.status.weak ? -1 : 0);
            addStatus(e, 'vulnerable', e.status.vulnerable ? -1 : 0);
            c.delay += ENEMY_STEP * 0.6;
            continue;
        }
        const it = e.intent;
        if (it.attack !== undefined) cue(c, { kind: 'enemyAttack', source: e.uid, defId: e.defId, target: 'player', amount: attackDamage(it.attack, e, c.player), hits: it.hits ?? 1 });
        if (it.block) {
            cue(c, { kind: 'enemyBlock', target: e.uid });
            gainBlock(c, e.uid, e, it.block);
        }
        if (it.attack !== undefined) {
            const base = c.delay;
            let dealt = 0;
            for (let i = 0; i < (it.hits ?? 1); i++) {
                c.delay = base + IMPACT_DELAY + i * 0.14;
                dealt += attack(c, e.uid, e, 'player', c.player, it.attack);
                if (e.affix === 'venom' && c.player.hp > 0) addStatus(c.player, 'poison', 1);
            }
            if (e.affix === 'venom') fx(c, 'player', `독 +${it.hits ?? 1}`, 'status');
            if (it.drain && dealt > 0 && e.hp > 0) {
                cue(c, { kind: 'enemyHeal', target: e.uid });
                heal(c, e.uid, e, dealt);
            }
            c.delay = base;
        }
        if (e.hp <= 0) {
            markDead(c, e, run); // 가시에 맞아 죽음
            checkEnd(c);
            if (c.result) return;
            continue;
        }
        if (it.buff) {
            cue(c, { kind: 'enemyBuff', target: e.uid });
            addStatus(e, it.buff.status, it.buff.amount);
            fx(c, e.uid, `${statusShort(it.buff.status)} +${it.buff.amount}`, 'status');
        }
        if (it.debuff) {
            cue(c, { kind: 'enemyDebuff', source: e.uid, target: 'player' });
            addStatus(c.player, it.debuff.status, it.debuff.amount);
            fx(c, 'player', `${statusShort(it.debuff.status)} +${it.debuff.amount}`, 'status');
        }
        if (it.curse) {
            cue(c, { kind: 'enemyDebuff', source: e.uid, target: 'player' });
            for (let i = 0; i < it.curse; i++) c.discard.push({ uid: `curse${(c.curseSeq = (c.curseSeq ?? 0) + 1)}`, id: CURSE_CARD, upgraded: false });
            fx(c, 'player', `저주 +${it.curse}`, 'status');
        }
        if (it.healAll)
            for (const a of alive(c)) {
                cue(c, { kind: 'enemyHeal', target: a.uid });
                heal(c, a.uid, a, it.healAll);
            }
        addStatus(e, 'weak', e.status.weak ? -1 : 0);
        addStatus(e, 'vulnerable', e.status.vulnerable ? -1 : 0);
        checkEnd(c);
        if (c.result) return;
        c.delay += ENEMY_STEP;
    }
    checkEnd(c);
    if (c.result) return;

    for (const e of alive(c)) e.intent = pickIntent(e);
    startPlayerTurn(c, run);
}

/** 화면에 표시할 적 의도 피해량 */
export function intentDamage(e: EnemyState, player: Fighter): number | null {
    if (e.intent.attack === undefined) return null;
    return attackDamage(e.intent.attack, e, player);
}
