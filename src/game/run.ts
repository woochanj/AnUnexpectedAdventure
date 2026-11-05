import { CARDS, cardPool, STARTER_DECK } from './cards';
import { endTurn, playCard, startCombat } from './combat';
import { EVENTS, type EventApi } from './events';
import { generateFloor, reveal, revealAll } from './map';
import { BOSS_RELICS, RELIC_IDS, RELICS } from './relics';
import type { CardInst, CombatKind, Dir, Room, RunState, ShopScreen } from './types';
import { pick, rand, shuffle } from './util';

export const FLOOR_COUNT = 3;
const SAVE_KEY = 'aua-run-v2';

export type Action =
    | { type: 'new' }
    | { type: 'load'; run: RunState }
    | { type: 'quit' }
    | { type: 'move'; to: number }
    | { type: 'moveDir'; dir: Dir }
    | { type: 'play'; idx: number; target: string | null }
    | { type: 'endTurn' }
    | { type: 'combatDone' }
    | { type: 'takeGold' }
    | { type: 'takeCard'; id: string }
    | { type: 'skipCards' }
    | { type: 'takeRelic' }
    | { type: 'leave' }
    | { type: 'rest' }
    | { type: 'restUpgrade' }
    | { type: 'pick'; uid: string }
    | { type: 'pickCancel' }
    | { type: 'buy'; idx: number }
    | { type: 'shopRemove' }
    | { type: 'treasureTake' }
    | { type: 'eventChoice'; idx: number }
    | { type: 'nextFloor' };

export interface GameState {
    run: RunState | null;
}

// ───────────────────────── 저장/불러오기 ─────────────────────────

export function loadRun(): RunState | null {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? (JSON.parse(raw) as RunState) : null;
    } catch {
        return null;
    }
}

export function saveRun(run: RunState | null) {
    try {
        if (!run || run.screen.kind === 'gameover' || run.screen.kind === 'victory') localStorage.removeItem(SAVE_KEY);
        else localStorage.setItem(SAVE_KEY, JSON.stringify(run));
    } catch {
        /* 저장 불가 환경은 무시 */
    }
}

// ───────────────────────── 헬퍼 ─────────────────────────

const room = (run: RunState): Room => run.map.cells[run.pos]!;
const visionRadius = (run: RunState) => (run.relics.includes('lantern') ? 2 : 1);

function newCard(run: RunState, id: string): CardInst {
    return { uid: `c${run.uidSeq++}`, id, upgraded: false };
}

function gainGold(run: RunState, n: number) {
    const mult = n > 0 && run.relics.includes('lucky_coin') ? 1.5 : 1;
    run.gold = Math.max(0, run.gold + Math.round(n * mult));
}

function healRun(run: RunState, n: number) {
    run.hp = Math.min(run.maxHp, run.hp + n);
}

function gainRelic(run: RunState, id: string) {
    if (run.relics.includes(id)) return;
    run.relics.push(id);
    if (id === 'boots') {
        run.maxHp += 10;
        run.hp += 10;
    }
    if (id === 'compass') revealAll(run.map);
    if (id === 'lantern') reveal(run.map, run.pos, 2);
}

function randomRelic(run: RunState, boss = false): string | null {
    const pool = (boss ? BOSS_RELICS : RELIC_IDS.filter((r) => !BOSS_RELICS.includes(r))).filter((r) => !run.relics.includes(r));
    if (pool.length === 0) return boss ? randomRelic(run, false) : null;
    return pick(pool);
}

function rollRarity(kind: CombatKind | 'shop'): 'common' | 'uncommon' | 'rare' {
    const r = Math.random() * 100;
    if (kind === 'boss') return 'rare';
    const [c, u] = kind === 'elite' ? [45, 85] : [62, 94];
    return r < c ? 'common' : r < u ? 'uncommon' : 'rare';
}

function cardChoices(kind: CombatKind): string[] {
    const out: string[] = [];
    let guard = 0;
    while (out.length < 3 && guard++ < 50) {
        const id = pick(cardPool(rollRarity(kind)));
        if (!out.includes(id)) out.push(id);
    }
    return out;
}

function upgradeRandom(run: RunState, n: number): string[] {
    const cands = shuffle(run.deck.filter((c) => !c.upgraded)).slice(0, n);
    for (const c of cands) c.upgraded = true;
    return cands.map((c) => CARDS[c.id].name);
}

function makeApi(run: RunState): EventApi {
    return {
        gainGold: (n) => gainGold(run, n),
        loseHp: (n) => (run.hp = Math.max(0, run.hp - n)),
        heal: (n) => healRun(run, n),
        gainMaxHp: (n) => {
            run.maxHp += n;
            run.hp += n;
        },
        addRandomCard: (rarity) => {
            const id = pick(cardPool(rarity));
            run.deck.push(newCard(run, id));
            return CARDS[id].name;
        },
        addCard: (id) => {
            run.deck.push(newCard(run, id));
            return CARDS[id].name;
        },
        gainRandomRelic: () => {
            const id = randomRelic(run);
            if (!id) return null;
            gainRelic(run, id);
            return RELICS[id].name;
        },
        upgradeRandom: (n) => upgradeRandom(run, n),
        openPick: (purpose) => {
            run.screen = { kind: 'pick', purpose, returnTo: run.screen };
        },
        startFight: (enemies, elite) => {
            run.screen = { kind: 'combat', combat: startCombat(run, elite ? 'elite' : 'normal', enemies) };
        },
        revealMap: () => revealAll(run.map),
    };
}

// ───────────────────────── 진행 ─────────────────────────

export function newRun(): RunState {
    const map = generateFloor(0);
    const run: RunState = {
        floor: 0,
        hp: 70,
        maxHp: 70,
        gold: 99,
        deck: [],
        relics: [],
        map,
        pos: map.start,
        facing: 'right',
        screen: { kind: 'map' },
        uidSeq: 0,
        stats: { kills: 0, rooms: 1, turns: 0 },
    };
    run.deck = STARTER_DECK.map((id) => newCard(run, id));
    reveal(map, map.start, visionRadius(run));
    return run;
}

function enterRoom(run: RunState) {
    const r = room(run);
    if (!r.visited) run.stats.rooms++;
    r.visited = true;
    reveal(run.map, r.id, visionRadius(run));
    if (r.cleared) {
        run.screen = { kind: 'map' };
        return;
    }
    switch (r.type) {
        case 'combat':
        case 'elite':
        case 'boss': {
            const kind: CombatKind = r.type === 'combat' ? 'normal' : r.type;
            run.screen = { kind: 'combat', combat: startCombat(run, kind, r.encounter ?? []) };
            break;
        }
        case 'treasure':
            run.screen = { kind: 'treasure', relic: randomRelic(run), gold: rand(20, 40), taken: false };
            break;
        case 'rest':
            run.screen = { kind: 'rest', done: false };
            break;
        case 'shop':
            run.screen = r.shop ? structuredClone(r.shop) : makeShop(run);
            break;
        case 'event':
            run.screen = { kind: 'event', eventId: r.eventId ?? 'spring' };
            break;
        default:
            run.screen = { kind: 'map' };
    }
}

function makeShop(run: RunState): ShopScreen {
    const ids = new Set<string>();
    const want: ('common' | 'uncommon' | 'rare')[] = ['common', 'common', 'uncommon', 'uncommon', 'rare'];
    const cards = want.map((rar) => {
        let id = pick(cardPool(rar));
        for (let i = 0; i < 10 && ids.has(id); i++) id = pick(cardPool(rar));
        ids.add(id);
        const base = rar === 'common' ? 50 : rar === 'uncommon' ? 75 : 140;
        return { id, price: base + rand(-6, 12) + run.floor * 5, sold: false };
    });
    return { kind: 'shop', cards, removePrice: 75 + run.floor * 15, removed: false };
}

function leaveRoom(run: RunState) {
    const r = room(run);
    if (r.type !== 'shop') r.cleared = true;
    run.screen = { kind: 'map' };
}

function finishCombat(run: RunState) {
    if (run.screen.kind !== 'combat') return;
    const c = run.screen.combat;
    if (c.result === 'lose') {
        run.hp = 0;
        run.screen = { kind: 'gameover' };
        return;
    }
    if (c.result !== 'win') return;
    run.hp = c.player.hp;
    if (run.relics.includes('blood_charm')) healRun(run, 6);
    room(run).cleared = true;

    const gold = c.kind === 'boss' ? rand(70, 90) : c.kind === 'elite' ? rand(28, 38) : rand(11, 20);
    const relic = c.kind === 'elite' ? randomRelic(run) : c.kind === 'boss' ? randomRelic(run, true) : null;
    run.screen = {
        kind: 'reward',
        combatKind: c.kind,
        gold,
        goldTaken: false,
        cards: cardChoices(c.kind),
        cardsDone: false,
        relic,
        relicTaken: false,
    };
}

function startFloor(run: RunState, floor: number) {
    run.floor = floor;
    run.map = generateFloor(floor);
    run.pos = run.map.start;
    run.facing = 'right';
    reveal(run.map, run.pos, visionRadius(run));
    if (run.relics.includes('compass')) revealAll(run.map);
    run.screen = { kind: 'map' };
}

const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function move(run: RunState, to: number) {
    if (run.screen.kind !== 'map') return;
    const here = room(run);
    if (!here.links.includes(to)) return;
    const there = run.map.cells[to]!;
    const dx = there.x - here.x;
    const dy = there.y - here.y;
    run.facing = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    run.pos = to;
    enterRoom(run);
}

// ───────────────────────── 리듀서 ─────────────────────────

export function reducer(state: GameState, action: Action): GameState {
    if (action.type === 'new') return { run: newRun() };
    if (action.type === 'quit') return { run: null };
    if (action.type === 'load') return { run: action.run };
    if (!state.run) return state;

    const run = structuredClone(state.run);
    const sc = run.screen;

    switch (action.type) {
        case 'move':
            move(run, action.to);
            break;
        case 'moveDir': {
            const [dx, dy] = DIRS[action.dir];
            const here = room(run);
            const target = run.map.cells[(here.y + dy) * run.map.w + (here.x + dx)];
            const inBounds = here.x + dx >= 0 && here.x + dx < run.map.w && here.y + dy >= 0 && here.y + dy < run.map.h;
            if (inBounds && target) move(run, target.id);
            else if (sc.kind === 'map') run.facing = action.dir;
            break;
        }
        case 'play':
            if (sc.kind === 'combat') playCard(sc.combat, run, action.idx, action.target);
            break;
        case 'endTurn':
            if (sc.kind === 'combat') endTurn(sc.combat, run);
            break;
        case 'combatDone':
            finishCombat(run);
            break;
        case 'takeGold':
            if (sc.kind === 'reward' && !sc.goldTaken) {
                gainGold(run, sc.gold);
                sc.goldTaken = true;
            }
            break;
        case 'takeCard':
            if (sc.kind === 'reward' && !sc.cardsDone && sc.cards.includes(action.id)) {
                run.deck.push(newCard(run, action.id));
                sc.cardsDone = true;
            }
            break;
        case 'skipCards':
            if (sc.kind === 'reward') sc.cardsDone = true;
            break;
        case 'takeRelic':
            if (sc.kind === 'reward' && sc.relic && !sc.relicTaken) {
                gainRelic(run, sc.relic);
                sc.relicTaken = true;
            }
            break;
        case 'leave':
            if (sc.kind === 'reward' && sc.combatKind === 'boss') {
                run.screen = run.floor + 1 >= FLOOR_COUNT ? { kind: 'victory' } : { kind: 'floorClear' };
            } else {
                leaveRoom(run);
            }
            break;
        case 'rest':
            if (sc.kind === 'rest' && !sc.done) {
                const n = Math.round(run.maxHp * 0.3);
                healRun(run, n);
                run.screen = { kind: 'rest', done: true, message: `모닥불 곁에서 잠시 눈을 붙였다. 체력을 ${n} 회복했다.` };
            }
            break;
        case 'restUpgrade':
            if (sc.kind === 'rest' && !sc.done) run.screen = { kind: 'pick', purpose: 'upgrade', returnTo: sc };
            break;
        case 'pick':
            if (sc.kind === 'pick') {
                const card = run.deck.find((c) => c.uid === action.uid);
                if (!card) break;
                const name = CARDS[card.id].name;
                let msg: string;
                if (sc.purpose === 'upgrade') {
                    if (card.upgraded) break;
                    card.upgraded = true;
                    msg = `[${name}] 카드를 강화했다.`;
                } else {
                    if (sc.cost) gainGold(run, -sc.cost);
                    run.deck = run.deck.filter((c) => c.uid !== action.uid);
                    msg = `[${name}] 카드를 덱에서 지웠다.`;
                }
                const back = sc.returnTo;
                if (back.kind === 'rest') run.screen = { kind: 'rest', done: true, message: `모닥불 앞에서 기술을 갈고닦았다. ${msg}` };
                else if (back.kind === 'shop') run.screen = { ...back, removed: true };
                else if (back.kind === 'event') run.screen = { ...back, result: msg };
                else run.screen = back;
            }
            break;
        case 'pickCancel':
            if (sc.kind === 'pick') run.screen = sc.returnTo;
            break;
        case 'buy':
            if (sc.kind === 'shop') {
                const item = sc.cards[action.idx];
                if (item && !item.sold && run.gold >= item.price) {
                    run.gold -= item.price;
                    item.sold = true;
                    run.deck.push(newCard(run, item.id));
                }
            }
            break;
        case 'shopRemove':
            if (sc.kind === 'shop' && !sc.removed && run.gold >= sc.removePrice) {
                run.screen = { kind: 'pick', purpose: 'remove', returnTo: sc, cost: sc.removePrice };
            }
            break;
        case 'treasureTake':
            if (sc.kind === 'treasure' && !sc.taken) {
                if (sc.relic) gainRelic(run, sc.relic);
                gainGold(run, sc.gold);
                sc.taken = true;
            }
            break;
        case 'eventChoice':
            if (sc.kind === 'event' && !sc.result) {
                const choice = EVENTS[sc.eventId].choices[action.idx];
                if (!choice || (choice.enabled && !choice.enabled(run))) break;
                const text = choice.run(run, makeApi(run));
                if (run.hp <= 0) run.screen = { kind: 'gameover' };
                else if (text !== null && run.screen.kind === 'event') run.screen = { ...run.screen, result: text };
            }
            break;
        case 'nextFloor':
            if (sc.kind === 'floorClear') {
                healRun(run, Math.round((run.maxHp - run.hp) * 0.5));
                startFloor(run, run.floor + 1);
            }
            break;
    }

    // 상점 상태는 방에 남겨 두어 다시 와도 같은 물건이 있도록
    if (run.screen.kind === 'shop') room(run).shop = structuredClone(run.screen);

    return { run };
}
