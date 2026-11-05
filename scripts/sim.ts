// 밸런스 시뮬레이터: 탐욕 AI가 런을 끝까지 돌려 직업별 승률과 사망 지점을 잰다.
// 실행: npx esbuild scripts/sim.ts --bundle --platform=node --outfile=/tmp/sim.cjs && node /tmp/sim.cjs 100
import { reducer, type Action, type GameState } from '../src/game/run';
import { canPlay, intentDamage } from '../src/game/combat';
import { cardStats, needsTarget, CARDS } from '../src/game/cards';
import { EVENTS } from '../src/game/events';
import type { ClassId, CombatState, RunState } from '../src/game/types';

const RANK: Record<string, number> = { starter: 0, common: 1, uncommon: 2, rare: 3, unique: 4 };

function incoming(c: CombatState) {
    let n = 0;
    for (const e of c.enemies) {
        if (e.hp <= 0) continue;
        const d = intentDamage(e, c.player);
        if (d !== null) n += d * (e.intent.hits ?? 1);
    }
    return n;
}

function value(c: CombatState) {
    if (c.result === 'win') return 1e6 + c.player.hp * 100;
    if (c.result === 'lose') return -1e6;
    let v = c.player.hp * 1.5;
    const inc = incoming(c);
    v += Math.min(c.player.block, inc) * 1.4 + Math.min(Math.max(0, c.player.block - inc), 10) * 0.1;
    for (const e of c.enemies) {
        if (e.hp <= 0) continue;
        v -= e.hp + 10;
        v += (e.status.vulnerable ?? 0) * 2 + (e.status.weak ?? 0) * 2 + (e.status.poison ?? 0) * 1.5 + (e.status.burn ?? 0) * 1.2 + Math.min(e.status.frost ?? 0, 3) * 3;
        v -= (e.status.strength ?? 0) * 2;
    }
    const s = c.player.status;
    v += (s.strength ?? 0) * 5 + (s.thorns ?? 0) * 3 + (s.regen ?? 0) * 4 + (s.energize ?? 0) * 8;
    v += c.hand.length * 0.8 + c.energy * 0.6;
    return v;
}

function combatTurn(st: GameState): GameState {
    for (let guard = 0; guard < 30; guard++) {
        const run = st.run!;
        if (run.screen.kind !== 'combat') return st;
        const c = run.screen.combat;
        if (c.result) return st;
        const base = value(c);
        let best: { a: Action; v: number } | null = null;
        c.hand.forEach((card, idx) => {
            if (!canPlay(c, card)) return;
            const targets = needsTarget(card) ? c.enemies.filter((e) => e.hp > 0).map((e) => e.uid) : [null];
            for (const t of targets) {
                const a: Action = { type: 'play', idx, target: t };
                let sum = 0;
                for (let k = 0; k < 2; k++) {
                    const n = reducer(st, a);
                    sum += n.run!.screen.kind === 'combat' ? value((n.run!.screen as { combat: CombatState }).combat) : base;
                }
                const v = sum / 2;
                if (!best || v > best.v) best = { a, v };
            }
        });
        if (!best || (best as { v: number }).v <= base - 0.01) break;
        st = reducer(st, (best as { a: Action }).a);
    }
    return reducer(st, { type: 'endTurn' });
}

function bfsPath(run: RunState, ok: (id: number) => boolean): number[] | null {
    const prev = new Map<number, number>();
    const q = [run.pos];
    prev.set(run.pos, -1);
    while (q.length) {
        const id = q.shift()!;
        if (id !== run.pos && ok(id)) {
            const path = [id];
            let p = prev.get(id)!;
            while (p !== run.pos) {
                path.unshift(p);
                p = prev.get(p)!;
            }
            return path;
        }
        for (const n of run.map.cells[id]!.links) if (!prev.has(n) && run.map.cells[n]!.y <= run.map.cells[id]!.y) {
            prev.set(n, id);
            q.push(n);
        }
    }
    return null;
}

interface Result { win: boolean; floor: number; diedTo?: string; kind?: string; hpAtBoss: number[]; deck: number }

export function playRun(cls: ClassId): Result {
    let st: GameState = reducer({ run: null }, { type: 'new', cls });
    const hpAtBoss: number[] = [];
    let lastFight = '';
    const sideSteps = new Map<number, number>();
    let lastKind = '';
    for (let steps = 0; steps < 20000; steps++) {
        const run = st.run!;
        const sc = run.screen;
        switch (sc.kind) {
            case 'victory':
                return { win: true, floor: run.floor, hpAtBoss, deck: run.deck.length };
            case 'gameover':
                return { win: false, floor: run.floor, diedTo: lastFight, kind: lastKind, hpAtBoss, deck: run.deck.length };
            case 'combat':
                lastFight = sc.combat.enemies.map((e) => e.defId).join('+');
                lastKind = sc.combat.kind;
                if (sc.combat.turn === 1 && sc.combat.kind === 'boss' && hpAtBoss.length === run.floor) hpAtBoss.push(run.hp / run.maxHp);
                st = sc.combat.result ? reducer(st, { type: 'combatDone' }) : combatTurn(st);
                break;
            case 'reward': {
                if (!sc.goldTaken) st = reducer(st, { type: 'takeGold' });
                else if (sc.relicChoices && !sc.relicTaken) st = reducer(st, { type: 'takeRelic', id: sc.relicChoices[Math.floor(Math.random() * sc.relicChoices.length)] });
                else if (sc.relic && !sc.relicTaken) st = reducer(st, { type: 'takeRelic' });
                else if (!sc.cardsDone) {
                    const best = [...sc.cards].sort((a, b) => RANK[CARDS[b].rarity] - RANK[CARDS[a].rarity] + Math.random() - 0.5)[0];
                    st = run.deck.length > 26 && RANK[CARDS[best].rarity] < 2 ? reducer(st, { type: 'skipCards' }) : reducer(st, { type: 'takeCard', id: best });
                } else st = reducer(st, { type: 'leave' });
                break;
            }
            case 'rest':
                if (sc.done) st = reducer(st, { type: 'leave' });
                else st = reducer(st, { type: run.hp < run.maxHp * 0.55 ? 'rest' : 'restUpgrade' });
                break;
            case 'pick': {
                const cands = sc.purpose === 'remove'
                    ? [...run.deck].sort((a, b) => RANK[CARDS[a.id].rarity] - RANK[CARDS[b.id].rarity] + (CARDS[a.id].type === 'attack' ? -0.1 : 0))
                    : [...run.deck].filter((x) => (x.level ?? 1) < 3).sort((a, b) => RANK[CARDS[b.id].rarity] - RANK[CARDS[a.id].rarity]);
                st = cands[0] ? reducer(st, { type: 'pick', uid: cands[0].uid }) : reducer(st, { type: 'pickCancel' });
                break;
            }
            case 'shop': {
                const i = sc.cards.findIndex((it) => !it.sold && it.price <= run.gold && RANK[CARDS[it.id].rarity] >= 2);
                if (i >= 0) st = reducer(st, { type: 'buy', idx: i });
                else if (!sc.removed && run.gold >= sc.removePrice) st = reducer(st, { type: 'shopRemove' });
                else st = reducer(st, { type: 'leave' });
                break;
            }
            case 'treasure':
                st = reducer(st, sc.taken ? { type: 'leave' } : { type: 'treasureTake' });
                break;
            case 'event': {
                if (sc.result) {
                    st = reducer(st, { type: 'leave' });
                    break;
                }
                const ev = EVENTS[sc.eventId];
                const ok = ev.choices.map((ch, i) => ({ ch, i })).filter(({ ch }) => !ch.enabled || ch.enabled(run));
                const pickIdx = ok[Math.floor(Math.random() * ok.length)]?.i ?? 0;
                const n = reducer(st, { type: 'eventChoice', idx: pickIdx });
                st = n.run === st.run || JSON.stringify(n.run!.screen) === JSON.stringify(sc) ? reducer(st, { type: 'leave' }) : n;
                break;
            }
            case 'dialogue':
                st = reducer(st, { type: 'dialogueNext' });
                break;
            case 'floorClear':
                st = reducer(st, { type: 'nextFloor' });
                break;
            case 'map': {
                // 사람처럼 갈림길을 고른다: 위로 나아가되, 체력이 낮으면 모닥불, 여유 있으면 강적·보물
                const cells = run.map.cells;
                const here = cells[run.pos]!;
                const hp = run.hp / run.maxHp;
                const canUp = here.links.some((id) => cells[id]!.y < here.y);
                if (!canUp) {
                    // 위로 갈 길이 없으면 같은 줄에서 위로 이어진 방까지 곧장 간다
                    const path = bfsPath(run, (id) => cells[id]!.y === here.y && cells[id]!.links.some((n) => cells[n]!.y < here.y));
                    if (path) {
                        st = reducer(st, { type: 'move', to: path[0] });
                        break;
                    }
                }
                // 위로 갈 길이 없으면 옆으로는 몇 번이든 간다
                const side = canUp && (sideSteps.get(here.y) ?? 0) >= 2;
                let best: { id: number; v: number } | null = null;
                for (const id of here.links) {
                    const r = cells[id]!;
                    if (r.y > here.y) continue;
                    if (r.y === here.y && side) continue;
                    let v = r.y < here.y ? 2 : -1;
                    if (r.cleared || r.visited) v -= 3;
                    else if (r.type === 'rest') v += hp < 0.55 ? 6 : 1;
                    else if (r.type === 'shop') v += run.gold >= 75 ? 3 : -1;
                    else if (r.type === 'treasure') v += 4;
                    else if (r.type === 'event') v += 2;
                    else if (r.type === 'elite') v += hp > 0.7 ? 2 : -5;
                    else if (r.type === 'combat') v += hp < 0.4 ? -2 : 1;
                    else if (r.type === 'boss') v += 10;
                    v += Math.random() * 0.5;
                    if (!best || v > best.v) best = { id, v };
                }
                if (!best) return { win: false, floor: run.floor, diedTo: 'stuck', hpAtBoss, deck: run.deck.length };
                if (cells[best.id]!.y === here.y) sideSteps.set(here.y, (sideSteps.get(here.y) ?? 0) + 1);
                else sideSteps.clear();
                st = reducer(st, { type: 'move', to: best.id });
                break;
            }
        }
    }
    return { win: false, floor: st.run!.floor, diedTo: 'timeout', hpAtBoss, deck: 0 };
}

const N = Number(process.argv[2] ?? 200);
const classes: ClassId[] = ['knight', 'mage', 'rogue'];
for (const cls of classes) {
    const res: Result[] = [];
    for (let i = 0; i < N; i++) res.push(playRun(cls));
    const wins = res.filter((r) => r.win).length;
    const byFloor = [0, 1, 2].map((f) => res.filter((r) => !r.win && r.floor === f).length);
    const killers = new Map<string, number>();
    for (const r of res) if (!r.win) killers.set(`${r.kind}:${r.diedTo}`, (killers.get(`${r.kind}:${r.diedTo}`) ?? 0) + 1);
    const top = [...killers].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', ');
    const bossHp = [0, 1, 2].map((f) => {
        const xs = res.filter((r) => r.hpAtBoss[f] !== undefined).map((r) => r.hpAtBoss[f]);
        return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) + '%' : '-';
    });
    console.log(`${cls.padEnd(7)} win ${((wins / N) * 100).toFixed(0).padStart(3)}%  deaths by floor ${byFloor.join('/')}  hp@boss ${bossHp.join('/')}`);
    console.log(`        top killers: ${top}`);
}
