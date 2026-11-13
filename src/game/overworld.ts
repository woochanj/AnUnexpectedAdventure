// 파티 원정의 걸어 다니는 지도 (포켓몬·젤다처럼 위에서 내려다본 타일 세계).
// 갈림길 지도(FloorMap)를 그대로 땅으로 옮긴다: 방 하나가 광장·집·적 한 무리, 방 사이 연결이 길.
// 같은 지역은 늘 같은 모양으로 만들어진다 (seed).
import type { FloorMap, RoomType } from './types';

export const TREE = 0, GRASS = 1, PATH = 2, TALL = 3, WATER = 4, FLOWER = 5, SOLID = 6;
/** 방 하나가 차지하는 칸 수 */
const CW = 8, CH = 7;

export interface WorldObj {
    /** 이 물체에 다가가면 들어가는 방 (-1이면 그냥 장식) */
    room: number;
    kind: RoomType;
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface World {
    w: number;
    h: number;
    tiles: Uint8Array;
    objs: WorldObj[];
    /** 방 한가운데 칸 */
    center(id: number): { x: number; y: number };
}

function rng(seed: number) {
    let a = (seed >>> 0) || 1;
    return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** 발로 밟을 수 있는 땅인가 (물체는 따로 본다) */
export const walkable = (t: number) => t === GRASS || t === PATH || t === TALL || t === FLOWER;

export function buildWorld(map: FloorMap, seed: number): World {
    const w = map.w * CW + 1;
    const h = map.h * CH + 2;
    const tiles = new Uint8Array(w * h); // 온통 숲에서 시작해 길을 낸다
    const R = rng(seed);
    const objs: WorldObj[] = [];
    const center = (id: number) => ({ x: 4 + (id % map.w) * CW, y: 4 + Math.floor(id / map.w) * CH });
    const inside = (x: number, y: number) => x >= 1 && y >= 1 && x < w - 1 && y < h - 1;
    /** 길은 무엇이든 덮고, 풀은 숲만 덮는다 */
    const put = (x: number, y: number, v: number, force = false) => {
        if (!inside(x, y)) return;
        const i = y * w + x;
        if (force || v === PATH || tiles[i] === TREE) tiles[i] = v;
    };
    const verge = () => (R() < 0.28 ? TALL : R() < 0.12 ? FLOWER : GRASS);

    // 길: 이어진 방끼리 곧은 길, 양옆은 풀밭. 가끔 길을 가로지르는 풀숲(그냥은 못 지나간다)
    for (const r of map.cells) {
        if (!r) continue;
        const a = center(r.id);
        for (const id of r.links) {
            if (id < r.id || !map.cells[id]) continue;
            const b = center(id);
            const vertical = a.x === b.x;
            const len = vertical ? Math.abs(b.y - a.y) : Math.abs(b.x - a.x);
            for (let k = 0; k <= len; k++) {
                const x = vertical ? a.x : Math.min(a.x, b.x) + k;
                const y = vertical ? Math.min(a.y, b.y) + k : a.y;
                put(x, y, PATH);
                if (vertical) (put(x - 1, y, verge()), put(x + 1, y, verge()));
                else (put(x, y - 1, verge()), put(x, y + 1, verge()));
            }
            if (R() < 0.5) {
                const mid = Math.floor(len / 2);
                for (let k = mid - 1; k <= mid; k++)
                    for (let s = -1; s <= 1; s++) {
                        const x = vertical ? a.x + s : Math.min(a.x, b.x) + k;
                        const y = vertical ? Math.min(a.y, b.y) + k : a.y + s;
                        put(x, y, TALL, true);
                    }
            }
        }
    }

    // 방: 마을·상점·쉼터·보물·사건은 돌 깔린 광장, 적이 있는 곳은 풀밭 공터
    for (const r of map.cells) {
        if (!r) continue;
        const { x: cx, y: cy } = center(r.id);
        // 출발점은 방 종류가 따로 없다: 마을로 삼는다
        const fight = r.id !== map.start && (r.type === 'combat' || r.type === 'elite' || r.type === 'boss');
        if (fight) {
            for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) put(x, y, GRASS);
            put(cx, cy, PATH);
            objs.push({ room: r.id, kind: r.type, x: cx, y: cy, w: 1, h: 1 });
            continue;
        }
        for (let y = cy - 2; y <= cy + 2; y++)
            for (let x = cx - 3; x <= cx + 3; x++) {
                const plaza = Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 1;
                put(x, y, plaza ? PATH : R() < 0.25 ? FLOWER : GRASS);
            }
        const house = (x: number, y: number, room: number, kind: RoomType) => {
            for (let yy = y; yy < y + 2; yy++) for (let xx = x; xx < x + 2; xx++) put(xx, yy, SOLID, true);
            objs.push({ room, kind, x, y, w: 2, h: 2 });
        };
        if (r.type === 'shop' || r.type === 'rest') house(cx - 2, cy - 2, r.id, r.type);
        else if (r.type === 'treasure' || r.type === 'event') {
            put(cx + 1, cy - 1, SOLID, true);
            objs.push({ room: r.id, kind: r.type, x: cx + 1, y: cy - 1, w: 1, h: 1 });
        } else {
            // 출발 마을: 집 두 채 (들어갈 수는 없다)
            house(cx - 2, cy - 2, -1, 'start');
            house(cx + 1, cy - 2, -1, 'start');
        }
    }

    // 숲 속 작은 연못
    for (let n = 0; n < 14; n++) {
        const x = 2 + Math.floor(R() * (w - 6));
        const y = 2 + Math.floor(R() * (h - 5));
        let free = true;
        for (let yy = y - 1; yy <= y + 2 && free; yy++) for (let xx = x - 1; xx <= x + 3; xx++) if (tiles[yy * w + xx] !== TREE) free = false;
        if (free) for (let yy = y; yy < y + 2; yy++) for (let xx = x; xx < x + 3; xx++) tiles[yy * w + xx] = WATER;
    }
    return { w, h, tiles, objs, center };
}
