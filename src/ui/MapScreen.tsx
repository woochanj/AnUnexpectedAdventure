import { useEffect, useRef, useState, type Dispatch } from 'react';
import { ENEMIES, FLOORS } from '../game/enemies';
import { FLOOR_COUNT, type Action } from '../game/run';
import type { Room, RoomType, RunState } from '../game/types';
import { FxView, HeroView, SceneryView } from './Actors';
import { stillOf } from './cardArt';
import { FX } from './creatures';
import { FxCanvas } from './FxCanvas';
import { MAP_AMBIENT } from './vfx';

const ROOM_NAME: Record<RoomType, string> = {
    start: '입구', combat: '적', elite: '강적', treasure: '보물', rest: '모닥불', shop: '상인', event: '사건', boss: '보스',
};

const LEGEND: RoomType[] = ['combat', 'elite', 'event', 'treasure', 'rest', 'shop', 'boss'];

function RoomIcon({ room }: { room: Room }) {
    if ((room.type === 'combat' || room.type === 'elite' || room.type === 'boss') && room.encounter) {
        const def = ENEMIES[room.encounter[0]];
        const url = stillOf(`enemy:${def.id}`, FX[def.look.fx], { palette: def.look.palette });
        return url ? <img src={url} alt="" className={`room-enemy room-enemy-${room.type}`} draggable={false} /> : null;
    }
    // 모닥불은 지도에서도 실제로 타오른다
    if (room.type === 'rest') return <FxView mod={FX['fire/campfire']} scale={1} maxW={44} className="room-fire" />;
    return <span className={`room-glyph glyph-${room.type}`} aria-hidden />;
}

function roomLabel(r: Room): string {
    if (!r.seen) return '안개에 가려진 방';
    if (r.cleared && r.type !== 'shop' && r.type !== 'start') return `${ROOM_NAME[r.type]} · 정리됨`;
    if (r.encounter) return `${ROOM_NAME[r.type]} · ${ENEMIES[r.encounter[0]].name}`;
    return ROOM_NAME[r.type];
}

export function MapScreen({ run, dispatch }: { run: RunState; dispatch: Dispatch<Action> }) {
    const { map } = run;
    const here = map.cells[run.pos]!;
    const [walking, setWalking] = useState(false);
    const lastPos = useRef(run.pos);
    const sceneRef = useRef<HTMLDivElement>(null);

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
    const visited = rooms.filter((r) => r.visited).length;
    const progress = Math.round((visited / rooms.length) * 100);
    const boss = rooms.find((r) => r.type === 'boss');
    const bossText = boss?.cleared ? '보스를 쓰러뜨렸다' : boss?.seen ? '보스의 방을 찾았다!' : '어딘가에 보스가 숨어 있다';

    return (
        <div className={`map-scene floor-${run.floor}`} ref={sceneRef}>
            <div className="scenery" aria-hidden>
                <SceneryView floor={run.floor} seed={run.floor + 11} />
            </div>
            <FxCanvas container={sceneRef} ambient={MAP_AMBIENT[run.floor]} className="fx-back" />

            <header className="map-banner">
                <span className="map-floor-badge">
                    <small>FLOOR</small>
                    {run.floor + 1}
                    <small>/ {FLOOR_COUNT}</small>
                </span>
                <span className="map-banner-text">
                    <b>{theme.name}</b>
                    <span>{theme.subtitle}</span>
                </span>
            </header>

            <div className="map-layout">
                <div className="map-frame">
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
                            const label = roomLabel(r);
                            const showIcon = r.seen && r.id !== run.pos && (!r.cleared || r.type === 'shop' || r.type === 'boss');
                            return (
                                <button
                                    key={r.id}
                                    className={cls}
                                    style={{ ['--x' as string]: r.x, ['--y' as string]: r.y, ['--d' as string]: `${((r.x * 7 + r.y * 13) % 10) * -0.4}s` }}
                                    onClick={() => reachable && dispatch({ type: 'move', to: r.id })}
                                    disabled={!reachable}
                                    aria-label={label}
                                    data-label={label}
                                >
                                    <span className="room-top">{showIcon && <RoomIcon room={r} />}</span>
                                    {reachable && <span className="room-arrow" aria-hidden />}
                                </button>
                            );
                        })}
                        <div className="map-player" style={{ ['--x' as string]: here.x, ['--y' as string]: here.y }}>
                            <HeroView scale={1} flip={run.facing === 'left'} className={walking ? 'walking' : ''} />
                        </div>
                    </div>
                </div>

                <aside className="map-journal">
                    <h2>탐험 일지</h2>
                    <div className="journal-row">
                        <span>탐험한 방</span>
                        <b>
                            {visited} / {rooms.length}
                        </b>
                    </div>
                    <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <p className={`journal-boss ${boss?.seen ? 'found' : ''}`}>{bossText}</p>
                    <div className="legend">
                        {LEGEND.map((t) => (
                            <span key={t} className="legend-chip">
                                <span className={`legend-ico ico-room-${t}`} aria-hidden />
                                {ROOM_NAME[t]}
                            </span>
                        ))}
                    </div>
                    <p className="journal-hint">
                        <kbd>W</kbd>
                        <kbd>A</kbd>
                        <kbd>S</kbd>
                        <kbd>D</kbd> 또는 화살표가 뜬 방을 눌러 이동
                    </p>
                </aside>
            </div>
        </div>
    );
}
