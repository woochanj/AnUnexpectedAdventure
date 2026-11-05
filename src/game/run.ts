import { CARDS, cardLevel, cardPool, MAX_LEVEL } from './cards';
import { CLASSES } from './classes';
import { pickRoute } from './biomes';
import { endTurn, playCard, startCombat } from './combat';
import { ENCOUNTER_IDS, EVENTS, type EventApi } from './events';
import { canStep, generateFloor, reveal, revealAll } from './map';
import { BOSS_RELICS, RELIC_IDS, RELICS } from './relics';
import type { CardInst, ClassId, CombatKind, Dir, Room, RunState, Screen, ShopScreen } from './types';
import { pick, rand, shuffle } from './util';

export const FLOOR_COUNT = 3;
const SAVE_KEY = 'aua-run-v4';

export type Action =
    | { type: 'new'; cls?: ClassId; hero?: string }
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
    | { type: 'takeRelic'; id?: string }
    | { type: 'buyRelic' }
    | { type: 'leave' }
    | { type: 'rest' }
    | { type: 'restUpgrade' }
    | { type: 'pick'; uid: string }
    | { type: 'pickCancel' }
    | { type: 'buy'; idx: number }
    | { type: 'shopRemove' }
    | { type: 'treasureTake' }
    | { type: 'eventChoice'; idx: number }
    | { type: 'nextFloor' }
    | { type: 'dialogueNext' };

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
    if (id === 'ember') {
        run.maxHp = Math.max(10, run.maxHp - 10);
        run.hp = Math.min(run.hp, run.maxHp);
    }
    if (id === 'compass') revealAll(run.map);
    if (id === 'lantern') reveal(run.map, run.pos, 2);
}

function randomRelic(run: RunState, boss = false): string | null {
    const pool = (boss ? BOSS_RELICS : RELIC_IDS.filter((r) => !BOSS_RELICS.includes(r))).filter((r) => !run.relics.includes(r));
    if (pool.length === 0) return boss ? randomRelic(run, false) : null;
    return pick(pool);
}

type Drop = 'common' | 'uncommon' | 'rare' | 'unique';

/** 보상 카드 등급 굴리기. 유니크는 강적에서 드물게, 보스에서 자주 */
function rollRarity(kind: CombatKind): Drop {
    const r = Math.random() * 100;
    if (kind === 'boss') return r < 30 ? 'unique' : 'rare';
    if (kind === 'elite') return r < 40 ? 'common' : r < 80 ? 'uncommon' : r < 96 ? 'rare' : 'unique';
    return r < 62 ? 'common' : r < 94 ? 'uncommon' : 'rare';
}

function cardChoices(run: RunState, kind: CombatKind): string[] {
    const out: string[] = [];
    let guard = 0;
    const want = run.relics.includes('cursed_crown') ? 2 : 3;
    while (out.length < want && guard++ < 60) {
        const pool = cardPool(rollRarity(kind), run.cls);
        if (!pool.length) continue;
        const id = pick(pool);
        if (!out.includes(id)) out.push(id);
    }
    return out;
}

/** 카드 레벨 올리기 (최대 Lv.3) */
export function levelUp(c: CardInst): boolean {
    const lv = cardLevel(c);
    if (lv >= MAX_LEVEL) return false;
    c.level = lv + 1;
    c.upgraded = true;
    return true;
}

function upgradeRandom(run: RunState, n: number): string[] {
    const cands = shuffle(run.deck.filter((c) => cardLevel(c) < MAX_LEVEL)).slice(0, n);
    for (const c of cands) levelUp(c);
    return cands.map((c) => `${CARDS[c.id].name} Lv.${cardLevel(c)}`);
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
            const id = pick(cardPool(rarity, run.cls));
            run.deck.push(newCard(run, id));
            return CARDS[id].name;
        },
        addCard: (id) => {
            run.deck.push(newCard(run, id));
            return CARDS[id].name;
        },
        gainRelic: (id) => {
            gainRelic(run, id);
            return RELICS[id].name;
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

export function newRun(cls: ClassId = 'knight', hero?: string): RunState {
    const map = generateFloor(0);
    const def = CLASSES[cls];
    const run: RunState = {
        cls,
        hero: hero && def.looks.includes(hero) ? hero : def.looks[0],
        route: pickRoute(FLOOR_COUNT),
        expedition: 1 + Math.floor(Math.random() * 9000),
        floor: 0,
        hp: def.hp,
        maxHp: def.hp,
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
    run.deck = def.deck.map((id) => newCard(run, id));
    reveal(map, map.start, visionRadius(run));
    // 프롤로그 → 첫 지역 도착
    run.screen = { kind: 'dialogue', scene: 'prologue', next: { kind: 'dialogue', scene: `region:${run.route[0]}`, next: { kind: 'map' } } };
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
            const combat: Screen = { kind: 'combat', combat: startCombat(run, kind, r.encounter ?? []) };
            // 보스는 싸우기 전에 한마디
            run.screen = kind === 'boss' && r.encounter?.[0] ? { kind: 'dialogue', scene: `boss:${r.encounter[0]}:intro`, next: combat } : combat;
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
    // 마지막 칸은 가끔 유니크
    const want: Drop[] = ['common', 'common', 'uncommon', 'uncommon', Math.random() < 0.2 ? 'unique' : 'rare'];
    const cards = want.map((rar) => {
        const pool = cardPool(rar, run.cls);
        let id = pick(pool);
        for (let i = 0; i < 10 && ids.has(id); i++) id = pick(pool);
        ids.add(id);
        const base = { common: 50, uncommon: 75, rare: 140, unique: 220 }[rar];
        return { id, price: base + rand(-6, 12) + run.floor * 5, sold: false };
    });
    // 유물 한 점 (보스 유물·사건 유물은 팔지 않는다)
    const relicPool = RELIC_IDS.filter((r) => !BOSS_RELICS.includes(r) && !run.relics.includes(r));
    const relic = relicPool.length ? { id: pick(relicPool), price: 150 + run.floor * 20 + rand(-10, 15), sold: false } : undefined;
    return { kind: 'shop', cards, removePrice: 75 + run.floor * 15, removed: false, relic };
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
    // 불사조 깃털은 한 번 쓰면 사라진다
    if (c.revived) run.relics = run.relics.filter((r) => r !== 'phoenix_feather');
    if (run.relics.includes('blood_charm')) healRun(run, 6);
    // 길 위 인카운터 전투였다면 가던 방은 아직 정리하지 않는다
    if (!run.pendingEnter) room(run).cleared = true;

    const gold = c.kind === 'boss' ? rand(70, 90) : c.kind === 'elite' ? rand(28, 38) : rand(11, 20);
    const relic = c.kind === 'elite' ? randomRelic(run) : null;
    // 보스: 보스 유물 셋 중 하나를 고른다
    const relicChoices = c.kind === 'boss' ? shuffle(BOSS_RELICS.filter((r) => !run.relics.includes(r))).slice(0, 3) : undefined;
    const reward: Screen = {
        kind: 'reward',
        combatKind: c.kind,
        gold,
        goldTaken: false,
        cards: cardChoices(run, c.kind),
        cardsDone: false,
        relic,
        relicTaken: false,
        relicChoices,
    };
    const boss = c.kind === 'boss' ? c.enemies[0]?.defId : null;
    run.screen = boss ? { kind: 'dialogue', scene: `boss:${boss}:defeat`, next: reward } : reward;
}

function startFloor(run: RunState, floor: number) {
    run.floor = floor;
    run.map = generateFloor(floor);
    run.pos = run.map.start;
    run.facing = 'right';
    reveal(run.map, run.pos, visionRadius(run));
    if (run.relics.includes('compass')) revealAll(run.map);
    run.screen = { kind: 'dialogue', scene: `region:${run.route[floor]}`, next: { kind: 'map' } };
}

const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function move(run: RunState, to: number) {
    if (run.screen.kind !== 'map') return;
    const here = room(run);
    if (!here.links.includes(to)) return;
    const there = run.map.cells[to]!;
    // 지나온 쪽(아래·옆으로 지나온 방)으로는 돌아가지 않는다
    if (!canStep(here, there, run.map.cells)) return;
    const dx = there.x - here.x;
    const dy = there.y - here.y;
    run.facing = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    run.pos = to;
    // 길 위의 랜덤 인카운터: 아직 안 가 본 방으로 가는 길에 가끔 무언가를 만난다
    if (!there.visited && there.type !== 'boss' && Math.random() < ENCOUNTER_CHANCE) {
        run.pendingEnter = true;
        reveal(run.map, there.id, visionRadius(run));
        run.screen = { kind: 'event', eventId: pick(ENCOUNTER_IDS), encounter: true };
        return;
    }
    enterRoom(run);
}

/** 한 칸 이동할 때 랜덤 인카운터가 일어날 확률 */
const ENCOUNTER_CHANCE = 0.14;

/** 랜덤 인카운터가 끝났으면 원래 가던 방으로 들어간다 */
function afterEncounter(run: RunState): boolean {
    if (!run.pendingEnter) return false;
    run.pendingEnter = false;
    enterRoom(run);
    return true;
}

// ───────────────────────── 리듀서 ─────────────────────────

export function reducer(state: GameState, action: Action): GameState {
    if (action.type === 'new') return { run: newRun(action.cls, action.hero) };
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
            if (sc.kind === 'reward' && !sc.relicTaken) {
                if (sc.relicChoices && action.id && sc.relicChoices.includes(action.id)) {
                    gainRelic(run, action.id);
                    sc.relic = action.id;
                    sc.relicTaken = true;
                } else if (sc.relic) {
                    gainRelic(run, sc.relic);
                    sc.relicTaken = true;
                }
            }
            break;
        case 'buyRelic':
            if (sc.kind === 'shop' && sc.relic && !sc.relic.sold && run.gold >= sc.relic.price) {
                run.gold -= sc.relic.price;
                sc.relic.sold = true;
                gainRelic(run, sc.relic.id);
            }
            break;
        case 'leave':
            if (sc.kind === 'reward' && sc.combatKind === 'boss') {
                run.screen = run.floor + 1 >= FLOOR_COUNT ? { kind: 'dialogue', scene: 'epilogue', next: { kind: 'victory' } } : { kind: 'floorClear' };
            } else if (!afterEncounter(run)) {
                leaveRoom(run);
            }
            break;
        case 'rest':
            if (sc.kind === 'rest' && !sc.done && run.relics.includes('blood_chalice')) {
                run.screen = { kind: 'rest', done: true, message: '피의 성배가 잠을 허락하지 않는다. 눈을 감아도 몸이 낫지 않았다.' };
            } else if (sc.kind === 'rest' && !sc.done) {
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
                    if (!levelUp(card)) break;
                    msg = `[${name}] 카드를 Lv.${cardLevel(card)}(으)로 강화했다.`;
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
        case 'dialogueNext':
            if (sc.kind === 'dialogue') run.screen = sc.next;
            break;
        case 'nextFloor':
            if (sc.kind === 'floorClear') {
                healRun(run, Math.round((run.maxHp - run.hp) * 0.7));
                startFloor(run, run.floor + 1);
            }
            break;
    }

    // 상점 상태는 방에 남겨 두어 다시 와도 같은 물건이 있도록
    if (run.screen.kind === 'shop') room(run).shop = structuredClone(run.screen);

    return { run };
}
