import { useEffect, useRef, useState, type Dispatch } from 'react';
import { ENEMIES, FLOORS } from '../game/enemies';
import type { Action } from '../game/run';
import type { Room, RoomType, RunState } from '../game/types';
import { HeroView } from './Actors';
import { stillOf } from './cardArt';
import { FX } from './creatures';

const ROOM_NAME: Record<RoomType, string> = {
    start: '입구', combat: '적', elite: '강적', treasure: '보물', rest: '모닥불', shop: '상인', event: '???', boss: '보스',
};

function RoomIcon({ room }: { room: Room }) {
    if ((room.type === 'combat' || room.type === 'elite' || room.type === 'boss') && room.encounter) {
        const def = ENEMIES[room.encounter[0]];
        const url = stillOf(`enemy:${def.id}`, FX[def.look.fx], { palette: def.look.palette });
        return url ? <img src={url} alt="" className={`room-enemy room-enemy-${room.type}`} draggable={false} /> : null;
    }
    return <span className={`room-glyph glyph-${room.type}`} aria-hidden />;
}

export function MapScreen({ run, dispatch }: { run: RunState; dispatch: Dispatch<Action> }) {
    const { map } = run;
    const here = map.cells[run.pos]!;
    const [walking, setWalking] = useState(false);
    const lastPos = useRef(run.pos);

    useEffect(() => {
        if (lastPos.current === run.pos) return;
        lastPos.current = run.pos;
        setWalking(true);
        const t = setTimeout(() => setWalking(false), 260);
        return () => clearTimeout(t);
    }, [run.pos]);

    useEffect(() => {
        const keys: Record<string, 'up' | 'down' | 'left' | 'right'> = {
            ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right',
        };
        const onKey = (e: KeyboardEvent) => {
            const dir = keys[e.key] ?? keys[e.key.toLowerCase()];
            if (!dir || e.repeat) return;
            e.preventDefault();
            dispatch({ type: 'moveDir', dir });
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [dispatch]);

    const rooms = map.cells.filter((r): r is Room => !!r);
    const corridors: { a: Room; b: Room }[] = [];
    for (const r of rooms) for (const id of r.links) if (id > r.id) corridors.push({ a: r, b: map.cells[id]! });

    const theme = FLOORS[run.floor];
    const unexplored = rooms.filter((r) => !r.visited).length;
    const bossSeen = rooms.some((r) => r.type === 'boss' && r.seen);

    return (
        <div className={`map-screen floor-${run.floor}`}>
            <div className="map-title">
                <h1>{theme.name}</h1>
                <p>{theme.subtitle}</p>
            </div>
            <div className="map-board" style={{ ['--cols' as string]: map.w, ['--rows' as string]: map.h }}>
                {corridors.map(({ a, b }) => {
                    if (!a.seen || !b.seen) return null;
                    const horiz = a.y === b.y;
                    return (
                        <div
                            key={`${a.id}-${b.id}`}
                            className={`corridor ${horiz ? 'h' : 'v'} ${a.visited && b.visited ? 'walked' : ''}`}
                            style={{ ['--x' as string]: Math.min(a.x, b.x), ['--y' as string]: Math.min(a.y, b.y) }}
                        />
                    );
                })}
                {rooms.map((r) => {
                    const reachable = here.links.includes(r.id);
                    const cls = [
                        'room', `room-${r.type}`,
                        r.seen ? 'seen' : 'hidden', r.visited && 'visited', r.cleared && 'cleared', reachable && 'reachable', r.id === run.pos && 'current',
                    ].filter(Boolean).join(' ');
                    const label = r.seen ? (r.cleared && r.type !== 'shop' && r.type !== 'start' ? `${ROOM_NAME[r.type]} (정리됨)` : ROOM_NAME[r.type]) : '알 수 없음';
                    return (
                        <button
                            key={r.id}
                            className={cls}
                            style={{ ['--x' as string]: r.x, ['--y' as string]: r.y }}
                            onClick={() => reachable && dispatch({ type: 'move', to: r.id })}
                            disabled={!reachable}
                            title={label}
                            aria-label={label}
                        >
                            {r.seen && r.id !== run.pos && (!r.cleared || r.type === 'shop' || r.type === 'boss') && <RoomIcon room={r} />}
                        </button>
                    );
                })}
                <div className="map-player" style={{ ['--x' as string]: here.x, ['--y' as string]: here.y }}>
                    <HeroView scale={1} flip={run.facing === 'left'} className={walking ? 'walking' : ''} />
                </div>
            </div>
            <div className="map-foot">
                <span>
                    {bossSeen ? '보스의 기척이 느껴진다.' : '이 층 어딘가에 보스가 있다.'} · 남은 미탐험 방 {unexplored}
                </span>
                <span className="muted">방향키 / WASD 또는 인접한 방을 눌러 이동</span>
            </div>
            <div className="legend">
                {(['combat', 'elite', 'event', 'treasure', 'rest', 'shop', 'boss'] as RoomType[]).map((t) => (
                    <span key={t} className="legend-item">
                        <span className={`legend-dot dot-${t}`} /> {ROOM_NAME[t] === '???' ? '사건' : ROOM_NAME[t]}
                    </span>
                ))}
            </div>
        </div>
    );
}
