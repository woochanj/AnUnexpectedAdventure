import { FLOORS } from './enemies';
import { EVENT_IDS } from './events';
import type { FloorMap, Room, RoomType } from './types';
import { pick, shuffle } from './util';

const W = 5;
const H = 9;

/** 아래에서 위로 올라가는 갈림길 지도를 만든다. */
export function generateFloor(floor: number): FloorMap {
    const cells: (Room | null)[] = new Array(W * H).fill(null);
    const theme = FLOORS[floor];
    const target = 19 + floor * 2;

    const make = (x: number, y: number): Room => ({
        id: y * W + x, x, y, type: 'combat', links: [], seen: false, visited: false, cleared: false,
    });
    const link = (a: Room, b: Room) => {
        if (!a.links.includes(b.id)) a.links.push(b.id);
        if (!b.links.includes(a.id)) b.links.push(a.id);
    };

    // 아래(시작)에서 위(보스)로 올라가는 지도. 모바일 세로 화면에 맞춘다.
    // 가운데 층(줄)마다 방 2~4개, 같은 칸의 위쪽 방과 잇는다(앞으로).
    // 같은 줄에서는 좌우로 이어 길을 갈아탈 수 있다. 아래로는 돌아갈 수 없다.
    // p = 진행 단계(0 = 맨 아래 시작, STEPS-1 = 맨 위 보스), l = 갈래(가로 위치)
    const STEPS = H;
    const LANES = W;
    const yOf = (p: number) => STEPS - 1 - p;
    const mid = Math.floor(LANES / 2);
    const at = (l: number, p: number) => (l >= 0 && p >= 0 && l < LANES && p < STEPS ? cells[yOf(p) * W + l] : null);
    const start = make(mid, yOf(0));
    cells[start.id] = start;
    const rooms: Room[] = [start];
    const steps: number[][] = [[mid]];
    const perStep = Math.max(2, Math.min(4, Math.round(target / (STEPS - 2))));
    for (let p = 1; p < STEPS - 1; p++) {
        const lanes = new Set<number>();
        // 아래 줄에서 이어지는 칸 하나는 꼭 둔다
        lanes.add(pick(steps[p - 1]));
        if (p === 1 || p === STEPS - 2) lanes.add(mid);
        const want = perStep + (Math.random() < 0.35 ? 1 : 0) - (Math.random() < 0.25 ? 1 : 0);
        let guard = 0;
        while (lanes.size < Math.min(LANES, Math.max(2, want)) && guard++ < 40) {
            const base = pick([...lanes]);
            const l = base + (Math.random() < 0.5 ? -1 : 1);
            if (l >= 0 && l < LANES) lanes.add(l);
        }
        const list = [...lanes].sort((a, b) => a - b);
        steps.push(list);
        for (const l of list) {
            const r = make(l, yOf(p));
            cells[r.id] = r;
            rooms.push(r);
        }
    }
    const far = make(mid, yOf(STEPS - 1));
    cells[far.id] = far;
    rooms.push(far);
    steps.push([mid]);
    // 앞으로(위로) 잇기
    for (let p = 0; p < STEPS - 1; p++)
        for (const l of steps[p]) {
            const n = at(l, p + 1);
            if (n) link(at(l, p)!, n);
        }
    // 같은 줄 좌우 잇기 (맞닿은 방끼리, 가끔 끊어 길이 갈리게)
    for (let p = 1; p < STEPS - 1; p++)
        for (const l of steps[p]) {
            const r = at(l, p)!;
            const n = at(l + 1, p);
            const hasUp = r.links.some((id) => cells[id]!.y < r.y);
            const hasDown = (m: Room) => m.links.some((id) => cells[id]!.y > m.y);
            if (n && (Math.random() < 0.55 || !hasUp || !hasDown(n))) link(r, n);
        }
    // 막다른 방 정리: 시작에서 닿지 않거나 보스까지 못 가는 방은 옆과 이어 주고, 그래도 안 되면 지운다
    for (let pass = 0; pass < 3; pass++) {
        const fwd = reachForward(cells, start.id);
        const back = reachBackward(cells, far.id);
        for (const r of rooms) {
            if (r === start || r === far || (fwd.has(r.id) && back.has(r.id))) continue;
            for (const n of [cells[r.id - 1], cells[r.id + 1]]) if (n && n.y === r.y) link(r, n);
        }
    }
    {
        const fwd = reachForward(cells, start.id);
        const back = reachBackward(cells, far.id);
        for (const r of [...rooms]) {
            if (r === start || r === far || (fwd.has(r.id) && back.has(r.id))) continue;
            for (const id of r.links) cells[id]!.links = cells[id]!.links.filter((x) => x !== r.id);
            cells[r.id] = null;
            rooms.splice(rooms.indexOf(r), 1);
        }
    }

    far.type = 'boss';
    far.encounter = theme.boss;

    // 4) 나머지 방 종류 배치. 엘리트는 시작점에서 조금 떨어진 곳에.
    const rest = shuffle(rooms.filter((r) => r !== start && r !== far));
    const elitesWanted = 1 + (floor > 0 ? 1 : 0);
    // 엘리트는 중간보다 위쪽에
    const eliteSpots = rest.filter((r) => r.y <= H - 4 && r.y >= 1).slice(0, elitesWanted);
    for (const r of eliteSpots) r.type = 'elite';

    const plan: RoomType[] = ['treasure', 'rest', 'rest', 'rest', 'shop', 'event', 'event', 'event'];
    if (floor > 0) plan.push('treasure');
    const others = rest.filter((r) => r.type === 'combat');
    // 시작 방 바로 옆은 전투로 남겨 둔다
    const pool = others.filter((r) => !start.links.includes(r.id));
    for (const t of plan) {
        const r = pool.pop();
        if (r) r.type = t;
    }

    // 마나의 샘은 두 번째 지역부터, 지역마다 40% 확률로 한 곳
    const events = shuffle(EVENT_IDS.filter((e) => e !== 'mana_spring' && !e.startsWith('moren_')));
    if (floor > 0 && Math.random() < 0.4) events.push('mana_spring');
    // 지역마다 지도 제작자 모렐을 한 번 만난다 (이야기 사건)
    events.push(`moren_${floor + 1}`);
    for (const r of rooms) {
        if (r.type === 'combat') r.encounter = pick(theme.encounters);
        if (r.type === 'elite') r.encounter = pick(theme.elites);
        if (r.type === 'event') r.eventId = events.pop() ?? pick(EVENT_IDS.filter((e) => e !== 'mana_spring' && !e.startsWith('moren_')));
    }

    start.visited = true;
    start.cleared = true;
    start.seen = true;

    return { w: W, h: H, cells, start: start.id };
}

/** 시작에서 앞으로(위·좌우) 갈 수 있는 방 */
function reachForward(cells: (Room | null)[], from: number): Set<number> {
    const seen = new Set([from]);
    const q = [from];
    while (q.length) {
        const r = cells[q.shift()!]!;
        for (const n of r.links) {
            const m = cells[n];
            if (m && m.y <= r.y && !seen.has(n)) {
                seen.add(n);
                q.push(n);
            }
        }
    }
    return seen;
}

/** 이 방들에서 보스까지 앞으로 갈 수 있는지 (거꾸로 탐색) */
function reachBackward(cells: (Room | null)[], to: number): Set<number> {
    const seen = new Set([to]);
    const q = [to];
    while (q.length) {
        const r = cells[q.shift()!]!;
        for (const n of r.links) {
            const m = cells[n];
            if (m && m.y >= r.y && !seen.has(n)) {
                seen.add(n);
                q.push(n);
            }
        }
    }
    return seen;
}

/** 앞으로 갈 수 있는 이동인가 (아래로는 돌아가지 않는다) */
export const canStep = (from: Room, to: Room) => to.y <= from.y;

export function bfs(cells: (Room | null)[], from: number): Map<number, number> {
    const dist = new Map<number, number>([[from, 0]]);
    const q = [from];
    while (q.length) {
        const id = q.shift()!;
        const r = cells[id]!;
        for (const n of r.links) {
            if (!dist.has(n)) {
                dist.set(n, dist.get(id)! + 1);
                q.push(n);
            }
        }
    }
    return dist;
}

/** 현재 위치에서 시야 범위 안의 방을 밝힌다. */
export function reveal(map: FloorMap, pos: number, radius: number) {
    const dist = bfs(map.cells, pos);
    for (const [id, d] of dist) if (d <= radius) map.cells[id]!.seen = true;
}

export function revealAll(map: FloorMap) {
    for (const r of map.cells) if (r) r.seen = true;
}
