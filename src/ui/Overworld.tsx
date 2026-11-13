// 파티 원정의 걸어 다니는 지도: 위에서 내려다본 타일 세계를 직접 걸어 다닌다.
// 색은 전투 배경(scenery.ts)과 같은 지역 팔레트에서 뽑아, 전투 화면과 한 세계로 보이게 한다.
import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { ENEMIES } from '../game/enemies';
import { buildWorld, walkable, FLOWER, PATH, SOLID, TALL, TREE, WATER, type World, type WorldObj } from '../game/overworld';
import type { Action } from '../game/run';
import type { Dir, Room, RunState } from '../game/types';
import { regionOf } from '../game/biomes';
import { HeroView, monsterStill } from './Actors';
import { SCENERY, type SceneryTheme } from './scenery';
import { spriteStillStyle } from './SpriteActor';
import { sfx } from './sfx';

const PX = 16; // 타일 한 칸의 도트 수
const STEP_MS = 150;
const WILD_CHANCE = 0.1;
const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const LABEL: Partial<Record<string, string>> = { shop: '상점', rest: '쉼터', treasure: '보물', event: '?', elite: '강적', boss: '수호자' };

function mix(a: string, b: string, t: number) {
    const p = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
}

/** 세계를 한 장의 도트 그림으로 그린다 (칸마다 16도트) */
function paint(ctx: CanvasRenderingContext2D, world: World, th: SceneryTheme, seed: number, rooms: (Room | null)[]) {
    let a = (seed * 2654435761) >>> 0 || 1;
    const R = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
    const INK = '#1a1028';
    const C = {
        ground: mix(th.rock, th.rockTop, 0.38),
        groundD: mix(th.rock, th.rockDark, 0.15),
        groundL: mix(th.rock, th.rockTop, 0.62),
        under: mix(th.rock, th.rockDark, 0.45),
        path: mix(th.rockTop, '#e8d2a4', 0.4),
        pathD: mix(mix(th.rockTop, '#e8d2a4', 0.4), th.rockDark, 0.28),
        leaf: th.rockDark,
        leafM: mix(th.rockDark, th.rock, 0.55),
        leafH: mix(th.rock, th.rockTop, 0.55),
        tall: mix(th.rockDark, th.flora[2] ?? '#7cf0a0', 0.5),
        tallH: mix(th.flora[2] ?? '#7cf0a0', '#ffffff', 0.25),
        water: th.bottom,
        waterH: mix(th.bottom, '#ffffff', 0.55),
        wall: mix(th.rockTop, '#fff4dc', 0.6),
    };
    const r = (x: number, y: number, w: number, h: number, c: string) => {
        ctx.fillStyle = c;
        ctx.fillRect(x, y, w, h);
    };
    const { w, h, tiles } = world;
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? TREE : tiles[y * w + x]);

    // 1) 땅
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const t = at(x, y);
            const X = x * PX, Y = y * PX;
            if (t === PATH || t === SOLID) {
                r(X, Y, PX, PX, C.path);
                for (let i = 0; i < 3; i++) r(X + Math.floor(R() * 14), Y + Math.floor(R() * 14), 2, 1, C.pathD);
                // 풀과 맞닿은 가장자리는 들쭉날쭉하게
                if (at(x, y - 1) !== PATH && at(x, y - 1) !== SOLID) for (let i = 0; i < PX; i += 4) r(X + i + Math.floor(R() * 2), Y, 2, 1 + Math.floor(R() * 2), C.ground);
                if (at(x, y + 1) !== PATH && at(x, y + 1) !== SOLID) for (let i = 0; i < PX; i += 4) r(X + i + Math.floor(R() * 2), Y + PX - 2, 2, 2, C.pathD);
            } else if (t === WATER) {
                r(X, Y, PX, PX, C.water);
                for (let i = 0; i < 2; i++) r(X + 2 + Math.floor(R() * 8), Y + 3 + i * 7 + Math.floor(R() * 2), 5, 1, C.waterH);
                if (at(x, y - 1) !== WATER) r(X, Y, PX, 2, C.under);
            } else {
                r(X, Y, PX, PX, t === TREE ? C.under : C.ground);
                for (let i = 0; i < 3; i++) r(X + Math.floor(R() * 15), Y + Math.floor(R() * 15), 1, 1, t === TREE ? C.leaf : C.groundD);
                if (t !== TREE) r(X + Math.floor(R() * 14), Y + Math.floor(R() * 14), 1, 2, C.groundL);
                if (t === FLOWER) {
                    for (let i = 0; i < 2; i++) {
                        const fx = X + 3 + Math.floor(R() * 10), fy = Y + 3 + Math.floor(R() * 10);
                        r(fx, fy, 2, 2, th.flora[Math.floor(R() * th.flora.length)]);
                        r(fx, fy + 2, 1, 2, C.tall);
                    }
                }
                if (t === TALL) {
                    // 키 큰 풀: 줄지어 선 풀잎 (밟으면 무언가 튀어나온다)
                    for (let gy = 2; gy < PX; gy += 5)
                        for (let gx = (gy % 2) * 2; gx < PX; gx += 4) {
                            r(X + gx, Y + gy, 1, 4, C.tall);
                            r(X + gx + 1, Y + gy - 1, 1, 4, C.tallH);
                            r(X + gx + 2, Y + gy + 1, 1, 3, C.tall);
                        }
                }
            }
        }
    // 2) 나무: 위에서 아래로 그려 아래 나무가 위 나무를 가린다
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            if (at(x, y) !== TREE) continue;
            const X = x * PX + Math.floor(R() * 3) - 1, Y = y * PX;
            r(X + 7, Y + 9, 2, 5, '#3a2418');
            r(X + 3, Y - 5, 10, 2, C.leaf);
            r(X + 1, Y - 3, 14, 11, C.leaf);
            r(X + 2, Y + 8, 12, 2, C.leaf);
            r(X + 3, Y - 3, 10, 8, C.leafM);
            r(X + 2, Y - 1, 4, 5, C.leafM);
            r(X + 4, Y - 3, 5, 2, C.leafH);
            r(X + 3, Y - 1, 2, 3, C.leafH);
        }
    // 3) 집·상자·사람
    const house = (X: number, Y: number, roof: string) => {
        r(X + 1, Y + 13, 30, 18, INK);
        r(X + 2, Y + 14, 28, 16, C.wall);
        r(X + 2, Y + 26, 28, 4, mix(th.rockTop, th.rock, 0.5));
        r(X - 1, Y + 3, 34, 13, INK);
        r(X, Y + 4, 32, 11, roof);
        r(X + 2, Y + 4, 28, 3, mix(roof, '#ffffff', 0.4));
        r(X, Y + 12, 32, 3, mix(roof, '#000000', 0.3));
        r(X + 18, Y + 19, 9, 12, INK);
        r(X + 19, Y + 20, 7, 10, '#6a3a1e');
        r(X + 24, Y + 25, 1, 2, '#ffd24a');
        r(X + 5, Y + 18, 9, 8, INK);
        r(X + 6, Y + 19, 7, 6, '#9ad8ff');
        r(X + 9, Y + 19, 1, 6, INK);
    };
    for (const o of world.objs) {
        const X = o.x * PX, Y = o.y * PX;
        const done = o.room >= 0 && !!rooms[o.room]?.cleared;
        if (o.w === 2) house(X, Y, o.kind === 'shop' ? '#e8b030' : o.kind === 'rest' ? '#d8504a' : mix(th.flora[0], '#8a7a9a', 0.45));
        else if (o.kind === 'treasure') {
            r(X + 2, Y + 5, 12, 10, INK);
            r(X + 3, Y + 6, 10, 8, '#9a6428');
            if (done) {
                r(X + 2, Y + 2, 12, 4, INK);
                r(X + 3, Y + 3, 10, 2, '#6a4018');
                r(X + 4, Y + 6, 8, 3, '#1a1028');
            } else {
                r(X + 3, Y + 6, 10, 2, '#c08a3a');
                r(X + 3, Y + 9, 10, 2, '#ffd24a');
                r(X + 7, Y + 9, 2, 3, '#fff2b0');
            }
        } else if (o.kind === 'event') {
            const cloak = th.flora[th.flora.length - 1];
            r(X + 4, Y + 1, 8, 14, INK);
            r(X + 5, Y + 6, 6, 8, cloak);
            r(X + 5, Y + 2, 6, 5, '#f0c8a0');
            r(X + 5, Y + 2, 6, 2, mix(cloak, '#000000', 0.3));
            r(X + 6, Y + 5, 1, 1, INK);
            r(X + 9, Y + 5, 1, 1, INK);
        }
    }
}

function Monster({ room, size }: { room: Room; size: number }) {
    const def = ENEMIES[room.encounter?.[0] ?? ''];
    if (!def) return null;
    if (def.look.kind === 'sprite') return <span className="ow-mon" style={{ ...spriteStillStyle(def.look.sprite ?? 'slime', size), filter: def.look.filter }} />;
    return <img className="ow-mon" src={monsterStill(def.id, def.look)} alt="" draggable={false} style={{ height: size }} />;
}

export function Overworld({ run, dispatch }: { run: RunState; dispatch: Dispatch<Action> }) {
    const theme = regionOf(run);
    const seed = run.expedition * 7 + run.floor * 31 + 5;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const world = useMemo(() => buildWorld(run.map, seed), [seed]);
    const cells = run.map.cells;

    // 화면 크기에 맞춘 칸 크기와 카메라
    const viewRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState({ w: 800, h: 500 });
    useEffect(() => {
        const el = viewRef.current;
        if (!el) return;
        const fit = () => setView({ w: el.clientWidth, h: el.clientHeight });
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const T = view.w < 640 ? 32 : 48;

    // 땅 그림: 지역이 바뀌거나 상자를 열었을 때만 다시 그린다
    const cvRef = useRef<HTMLCanvasElement>(null);
    const opened = cells.filter((r) => r?.type === 'treasure' && r.cleared).length;
    useEffect(() => {
        const cv = cvRef.current;
        if (!cv) return;
        cv.width = world.w * PX;
        cv.height = world.h * PX;
        paint(cv.getContext('2d')!, world, SCENERY[theme.id] ?? SCENERY.cave, seed, cells);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [world, theme.id, opened]);

    // 선 자리: 전투·상점에서 돌아오면 떠났던 그 칸, 처음이면 지금 방 한가운데
    const [pos, setPos] = useState(() => (run.ow && run.ow.f === run.floor ? { x: run.ow.x, y: run.ow.y } : world.center(run.pos)));
    const [trail, setTrail] = useState(() => [pos, pos]);
    const [left, setLeft] = useState(false);
    const [walking, setWalking] = useState(false);
    const posRef = useRef(pos);
    const busy = useRef(false);
    const sinceWild = useRef(0);

    /** 이 칸을 막고 있는 물체 (쓰러뜨린 적은 사라진다) */
    const objAt = (x: number, y: number): WorldObj | null => {
        for (const o of world.objs) {
            if (x < o.x || y < o.y || x >= o.x + o.w || y >= o.y + o.h) continue;
            const fight = o.kind === 'combat' || o.kind === 'elite' || o.kind === 'boss';
            if (fight && cells[o.room]?.cleared) continue;
            return o;
        }
        return null;
    };

    const step = (dir: Dir) => {
        if (busy.current) return;
        const p = posRef.current;
        const [dx, dy] = DIRS[dir];
        const nx = p.x + dx, ny = p.y + dy;
        if (dx) setLeft(dx < 0);
        const o = objAt(nx, ny);
        if (o) {
            // 집 문(아랫줄)·상자·사람·적에게 다가가면 들어간다. 집 지붕 쪽은 그냥 벽
            if (o.room >= 0 && ny === o.y + o.h - 1) {
                busy.current = true;
                sfx.step();
                dispatch({ type: 'ow', x: p.x, y: p.y, room: o.room });
            }
            return;
        }
        const t = world.tiles[ny * world.w + nx];
        if (nx < 0 || ny < 0 || nx >= world.w || ny >= world.h || !walkable(t)) return;
        const np = { x: nx, y: ny };
        posRef.current = np;
        setTrail((tr) => [p, tr[0]]);
        setPos(np);
        setWalking(true);
        sfx.step();
        // 키 큰 풀을 밟으면 가끔 무언가 튀어나온다 (연달아 나오지는 않게)
        sinceWild.current++;
        if (t === TALL && sinceWild.current > 4 && Math.random() < WILD_CHANCE) {
            busy.current = true;
            window.setTimeout(() => dispatch({ type: 'ow', x: nx, y: ny, wild: true }), STEP_MS + 80);
        }
    };
    const stepRef = useRef(step);
    stepRef.current = step;

    // 누르고 있으면 계속 걷는다 (키보드, 화면 방향 버튼 모두)
    const held = useRef<Dir | null>(null);
    useEffect(() => {
        const KEY: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
        const down = (e: KeyboardEvent) => {
            const d = KEY[e.key] ?? KEY[e.key.toLowerCase()];
            if (!d) return;
            e.preventDefault();
            if (held.current !== d) {
                held.current = d;
                stepRef.current(d);
            }
        };
        const up = (e: KeyboardEvent) => {
            const d = KEY[e.key] ?? KEY[e.key.toLowerCase()];
            if (d && held.current === d) held.current = null;
        };
        const tick = window.setInterval(() => {
            if (held.current) stepRef.current(held.current);
            else setWalking(false);
        }, STEP_MS);
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.clearInterval(tick);
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, []);
    const press = (d: Dir) => ({
        onPointerDown: (e: React.PointerEvent) => {
            e.preventDefault();
            held.current = d;
            stepRef.current(d);
        },
        onPointerUp: () => (held.current = null),
        onPointerLeave: () => (held.current = null),
        onPointerCancel: () => (held.current = null),
    });

    // 카메라: 주인공을 가운데에, 세계 밖은 보이지 않게
    const clamp = (v: number, max: number) => Math.max(0, Math.min(Math.max(0, max), v));
    const camX = clamp(pos.x * T + T / 2 - view.w / 2, world.w * T - view.w);
    const camY = clamp(pos.y * T + T / 2 - view.h / 2, world.h * T - view.h);
    const party = run.party ?? [{ hero: run.hero }];
    const spots = [pos, ...trail];
    const heroScale = T / 22;

    return (
        <div className="ow" ref={viewRef} style={{ ['--t' as string]: `${T}px`, ['--step' as string]: `${STEP_MS}ms` }}>
            <div className="ow-world" style={{ width: world.w * T, height: world.h * T, transform: `translate(${-camX}px, ${-camY}px)` }}>
                <canvas ref={cvRef} className="ow-ground" style={{ width: world.w * T, height: world.h * T }} />
                {world.objs.map((o) => {
                    const room = o.room >= 0 ? cells[o.room] : null;
                    if (!room) return null;
                    const fight = o.kind === 'combat' || o.kind === 'elite' || o.kind === 'boss';
                    if (fight && room.cleared) return null;
                    return (
                        <div key={o.room} className={`ow-obj ow-${o.kind}`} style={{ left: (o.x + o.w / 2) * T, top: (o.y + o.h) * T, zIndex: o.y + o.h }}>
                            {fight && <Monster room={room} size={T * (o.kind === 'boss' ? 1.7 : o.kind === 'elite' ? 1.3 : 0.95)} />}
                            {LABEL[o.kind] && <span className={`ow-label ol-${o.kind}`}>{LABEL[o.kind]}</span>}
                        </div>
                    );
                })}
                {/* 동료가 뒤를 따라온다 (뒤에 선 사람부터 그려 앞사람이 가리게) */}
                {party
                    .map((m, i) => ({ m, i, p: spots[i] ?? pos }))
                    .reverse()
                    .map(({ m, i, p }) => (
                        <div key={i} className={`ow-actor ${i ? 'follower' : ''}`} style={{ left: (p.x + 0.5) * T, top: (p.y + 1) * T - 3, zIndex: p.y + 1 }}>
                            <HeroView char={m.hero} scale={heroScale} flip={left} walking={walking} />
                        </div>
                    ))}
            </div>
            <div className="ow-banner">
                <b>{theme.name}</b>
                <span>지역 {run.floor + 1}</span>
            </div>
            <div className="ow-hint">방향키·WASD로 걷기 · 집 문, 상자, 사람, 적에게 다가가면 들어갑니다 · 키 큰 풀에서는 무언가 튀어나와요</div>
            <div className="ow-pad" aria-label="이동">
                <button className="up" aria-label="위로" {...press('up')}>▲</button>
                <button className="left" aria-label="왼쪽으로" {...press('left')}>◀</button>
                <button className="right" aria-label="오른쪽으로" {...press('right')}>▶</button>
                <button className="down" aria-label="아래로" {...press('down')}>▼</button>
            </div>
        </div>
    );
}
