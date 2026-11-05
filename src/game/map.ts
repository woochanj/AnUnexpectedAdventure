import { FLOORS } from './enemies';
import { EVENT_IDS } from './events';
import type { FloorMap, Room, RoomType } from './types';
import { pick, shuffle } from './util';

const W = 7;
const H = 5;

/** 무작위로 뻗어나가는 미로형 던전을 만든다. */
export function generateFloor(floor: number): FloorMap {
    const cells: (Room | null)[] = new Array(W * H).fill(null);
    const theme = FLOORS[floor];
    const target = 15 + floor * 2;

    const make = (x: number, y: number): Room => ({
        id: y * W + x, x, y, type: 'combat', links: [], seen: false, visited: false, cleared: false,
    });
    const link = (a: Room, b: Room) => {
        if (!a.links.includes(b.id)) a.links.push(b.id);
        if (!b.links.includes(a.id)) b.links.push(a.id);
    };

    const sx = 0;
    const sy = Math.floor(H / 2);
    const start = make(sx, sy);
    cells[start.id] = start;
    const rooms: Room[] = [start];

    // 1) 기존 방에서 빈 이웃 칸으로 가지를 뻗는다 (최근 방을 선호해 긴 통로가 생기도록)
    let guard = 0;
    while (rooms.length < target && guard++ < 5000) {
        const from = Math.random() < 0.6 ? rooms[rooms.length - 1 - Math.floor(Math.random() * Math.min(3, rooms.length))] : pick(rooms);
        const dirs = shuffle([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 0]]);
        for (const [dx, dy] of dirs) {
            const nx = from.x + dx;
            const ny = from.y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            if (cells[ny * W + nx]) continue;
            const r = make(nx, ny);
            cells[r.id] = r;
            rooms.push(r);
            link(from, r);
            break;
        }
    }

    // 2) 이웃한 방 몇 군데를 추가로 이어 순환로를 만든다
    for (const r of rooms) {
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
            const n = cells[(r.y + dy) * W + (r.x + dx)];
            if (r.x + dx < W && r.y + dy < H && n && !r.links.includes(n.id) && Math.random() < 0.18) link(r, n);
        }
    }

    // 3) 시작점에서 가장 먼 방 = 보스방
    const dist = bfs(cells, start.id);
    const far = rooms.reduce((a, b) => ((dist.get(b.id) ?? 0) > (dist.get(a.id) ?? 0) ? b : a));

    start.type = 'start';
    far.type = 'boss';
    far.encounter = theme.boss;

    // 4) 나머지 방 종류 배치. 엘리트는 시작점에서 조금 떨어진 곳에.
    const rest = shuffle(rooms.filter((r) => r !== start && r !== far));
    const elitesWanted = 1 + (floor > 0 ? 1 : 0);
    const eliteSpots = rest.filter((r) => (dist.get(r.id) ?? 0) >= 3).slice(0, elitesWanted);
    for (const r of eliteSpots) r.type = 'elite';

    const plan: RoomType[] = ['treasure', 'rest', 'rest', 'shop', 'event', 'event', 'event'];
    if (floor > 0) plan.push('treasure');
    const others = rest.filter((r) => r.type === 'combat');
    // 시작 방 바로 옆은 전투로 남겨 둔다
    const pool = others.filter((r) => !start.links.includes(r.id));
    for (const t of plan) {
        const r = pool.pop();
        if (r) r.type = t;
    }

    const events = shuffle([...EVENT_IDS]);
    for (const r of rooms) {
        if (r.type === 'combat') r.encounter = pick(theme.encounters);
        if (r.type === 'elite') r.encounter = pick(theme.elites);
        if (r.type === 'event') r.eventId = events.pop() ?? pick(EVENT_IDS);
    }

    start.visited = true;
    start.cleared = true;
    start.seen = true;

    return { w: W, h: H, cells, start: start.id };
}

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
