import { cardStats } from './cards';
import { ENEMIES } from './enemies';
import type { CardInst, CombatKind, CombatState, Cue, EnemyState, Fighter, Fx, Intent, RunState, Status } from './types';
import { CLASSES } from './classes';
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
export const ATTACK_WINDUP = 0.3;
/** 공격 이펙트가 대상에 닿기까지 걸리는 시간(초) */
export const IMPACT_DELAY = 0.08;

/** 적 한 명의 행동 사이 간격(초) */
export const ENEMY_STEP = 0.8;

function addStatus(f: Fighter, s: Status, n: number) {
    f.status[s] = (f.status[s] ?? 0) + n;
    if ((f.status[s] ?? 0) <= 0) delete f.status[s];
}

const alive = (c: CombatState) => c.enemies.filter((e) => e.hp > 0);

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
        draw: shuffle(deck),
        hand: [],
        discard: [],
        exhaust: [],
        energy: 0,
        maxEnergy: 3 + (run.relics.includes('ember') ? 1 : 0),
        turn: 0,
        fx: [],
        fxSeq: 0,
        cues: [],
        cueSeq: 0,
        critChance: CLASSES[run.cls]?.crit ?? 0.1,
        delay: 0,
    };
    if (run.relics.includes('whetstone')) addStatus(c.player, 'strength', 1);
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
    if (attacker.hp <= 0 || defender.hp <= 0) return;
    // 치명타: 피해 1.5배
    const chance = aKey === 'player' ? c.critChance : ENEMY_CRIT;
    const crit = Math.random() < chance;
    const d = attackDamage(base, attacker, defender);
    hit(c, dKey, defender, crit ? Math.floor(d * 1.5) : d, crit);
    const thorns = defender.status.thorns ?? 0;
    if (thorns > 0 && attacker.hp > 0) hit(c, aKey, attacker, thorns);
}

function loseHp(c: CombatState, key: string, f: Fighter, n: number, label: string) {
    f.hp = Math.max(0, f.hp - n);
    fx(c, key, `${label} -${n}`, 'dmg', { dot: true, amount: n });
}

function checkEnd(c: CombatState) {
    if (c.player.hp <= 0) c.result = 'lose';
    else if (alive(c).length === 0) c.result = 'win';
}

function startPlayerTurn(c: CombatState, run: RunState) {
    c.turn++;
    run.stats.turns++;
    c.player.block = 0;
    const poison = c.player.status.poison ?? 0;
    if (poison > 0) {
        loseHp(c, 'player', c.player, poison, '독');
        addStatus(c.player, 'poison', -1);
        checkEnd(c);
        if (c.result) return;
    }
    c.energy = c.maxEnergy + (c.player.status.energize ?? 0);
    drawCards(c, HAND_SIZE);
}

export function canPlay(c: CombatState, card: CardInst): boolean {
    return !c.result && cardStats(card).cost <= c.energy;
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
    if (s.def.type === 'attack') c.delay = ATTACK_WINDUP + IMPACT_DELAY;

    for (const e of s.effects) {
        if (c.result) break;
        switch (e.kind) {
            case 'damage':
                for (let i = 0; i < (e.hits ?? 1); i++) if (target) attack(c, 'player', c.player, target.uid, target, e.amount);
                break;
            case 'damageAll':
                for (let i = 0; i < (e.hits ?? 1); i++) for (const en of alive(c)) attack(c, 'player', c.player, en.uid, en, e.amount);
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
        }
        checkEnd(c);
    }

    for (const en of c.enemies) if (en.hp <= 0) markDead(c, en, run);

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
    return { strength: '힘', vulnerable: '취약', weak: '약화', poison: '독', thorns: '가시', regen: '재생', energize: '활력' }[s];
}

export function endTurn(c: CombatState, run: RunState) {
    if (c.result) return;

    // 플레이어 턴 종료
    c.discard.push(...c.hand);
    c.hand = [];
    const regen = c.player.status.regen ?? 0;
    if (regen > 0) heal(c, 'player', c.player, regen);
    addStatus(c.player, 'weak', c.player.status.weak ? -1 : 0);
    addStatus(c.player, 'vulnerable', c.player.status.vulnerable ? -1 : 0);

    // 적 턴: 행동마다 지연을 늘려 화면에서 한 명씩 움직이게 한다
    c.delay = 0.1;
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
        }
        const it = e.intent;
        if (it.attack !== undefined) cue(c, { kind: 'enemyAttack', source: e.uid, target: 'player', amount: attackDamage(it.attack, e, c.player), hits: it.hits ?? 1 });
        if (it.block) {
            cue(c, { kind: 'enemyBlock', target: e.uid });
            gainBlock(c, e.uid, e, it.block);
        }
        if (it.attack !== undefined) {
            const base = c.delay;
            for (let i = 0; i < (it.hits ?? 1); i++) {
                c.delay = base + IMPACT_DELAY + i * 0.14;
                attack(c, e.uid, e, 'player', c.player, it.attack);
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
