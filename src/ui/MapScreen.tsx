import { canStep } from '../game/map';
import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { ENEMIES } from '../game/enemies';
import { FLOOR_COUNT, type Action } from '../game/run';
import type { Room, RoomType, RunState } from '../game/types';
import { HeroView, monsterStill, SceneryView } from './Actors';
import { sfx } from './sfx';
import { spriteStillStyle } from './SpriteActor';
import { FxCanvas } from './FxCanvas';
import { AMBIENT } from './vfx';
import { regionOf } from '../game/biomes';

const ROOM_NAME: Record<RoomType, string> = {
    start: '입구', combat: '적', elite: '강적', treasure: '보물', rest: '모닥불', shop: '상인', event: '사건', boss: '보스',
};

const LEGEND: RoomType[] = ['combat', 'elite', 'event', 'treasure', 'rest', 'shop', 'boss'];

function RoomIcon({ room }: { room: Room }) {
    if ((room.type === 'combat' || room.type === 'elite' || room.type === 'boss') && room.encounter) {
        const def = ENEMIES[room.encounter[0]];
        if (def.look.kind === 'sprite')
            return <span className={`room-enemy room-sprite room-enemy-${room.type}`} style={{ ...spriteStillStyle(def.look.sprite ?? 'slime', room.type === 'combat' ? 30 : 40), filter: def.look.filter }} />;
        return <img src={monsterStill(def.id, def.look)} alt="" className={`room-enemy room-enemy-${room.type}`} draggable={false} />;
    }
    // 모닥불은 지도에서는 깔끔한 불꽃 표식으로 (진짜 불 이펙트는 연기가 위 칸까지 번져 지저분하다)
    return <span className={`room-glyph glyph-${room.type}`} aria-hidden />;
}

/**
 * 해적 보물지도처럼 찢긴 종이 가장자리. 지역마다 찢긴 모양이 다르다 (같은 지역에서는 늘 같은 모양).
 * 네 변을 따라 조금씩 안쪽으로 들쭉날쭉한 점을 찍고, 귀퉁이는 크게 떨어져 나간 것처럼.
 */
function tornEdge(seed: number): string {
    let x = seed * 9301 + 49297;
    const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
    const pts: string[] = [];
    const bite = (base: number) => base + rnd() * 2.6 + (rnd() < 0.12 ? 2.2 : 0);
    const step = 3.2;
    for (let t = 4; t <= 96; t += step * (0.6 + rnd() * 0.8)) pts.push(`${t.toFixed(1)}% ${bite(0).toFixed(1)}%`);
    pts.push(`${(97 + rnd()).toFixed(1)}% ${(2.5 + rnd() * 2).toFixed(1)}%`);
    for (let t = 4; t <= 96; t += step * (0.6 + rnd() * 0.8)) pts.push(`${(100 - bite(0)).toFixed(1)}% ${t.toFixed(1)}%`);
    pts.push(`${(96 - rnd() * 2).toFixed(1)}% ${(97 + rnd()).toFixed(1)}%`);
    for (let t = 96; t >= 4; t -= step * (0.6 + rnd() * 0.8)) pts.push(`${t.toFixed(1)}% ${(100 - bite(0)).toFixed(1)}%`);
    pts.push(`${(2.5 + rnd() * 2).toFixed(1)}% ${(96 - rnd() * 2).toFixed(1)}%`);
    for (let t = 96; t >= 4; t -= step * (0.6 + rnd() * 0.8)) pts.push(`${bite(0).toFixed(1)}% ${t.toFixed(1)}%`);
    pts.push(`${(3 + rnd() * 2).toFixed(1)}% ${(2 + rnd() * 2).toFixed(1)}%`);
    return `polygon(${pts.join(', ')})`;
}

/** 지역에 처음 들어왔을 때만 지도가 날아와 펼쳐진다 (방에서 돌아올 때마다 펼치면 번거롭다) */
const unfolded = new Set<string>();

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
    // 세로로 긴 지도: 주인공이 있는 칸이 늘 화면 안에 오도록 따라간다
    useEffect(() => {
        const t = window.setTimeout(() => {
            sceneRef.current?.querySelector('.map-player')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 300);
        return () => clearTimeout(t);
    }, [run.pos]);

    useEffect(() => {
        if (lastPos.current === run.pos) return;
        lastPos.current = run.pos;
        sfx.step();
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

    const theme = regionOf(run);
    const edge = useMemo(() => tornEdge(run.expedition * 7 + run.floor * 31 + 3), [run.expedition, run.floor]);
    const unfoldKey = `${run.expedition}-${run.floor}`;
    const [unfold] = useState(() => !unfolded.has(unfoldKey));
    useEffect(() => {
        unfolded.add(unfoldKey);
    }, [unfoldKey]);
    const visited = rooms.filter((r) => r.visited).length;
    const progress = Math.round((visited / rooms.length) * 100);
    const boss = rooms.find((r) => r.type === 'boss');
    const bossText = boss?.cleared ? '보스를 쓰러뜨렸다' : boss?.seen ? '보스의 방을 찾았다!' : '어딘가에 보스가 숨어 있다';

    return (
        <div className={`map-scene floor-${run.floor} biome-${theme.id}`} ref={sceneRef}>
            <div className="scenery" aria-hidden>
                <SceneryView biome={theme.id} seed={run.expedition + run.floor * 7} />
            </div>
            <FxCanvas container={sceneRef} ambient={AMBIENT[theme.id]} className="fx-back" />

            <header className="map-banner">
                <span className="map-floor-badge">
                    <small>지역</small>
                    {run.floor + 1}
                    <small>/ {FLOOR_COUNT}</small>
                </span>
                <span className="map-banner-text">
                    <b>{theme.name}</b>
                    <span>{theme.subtitle}</span>
                </span>
            </header>

            <div className="map-layout">
                {/* 탐험대가 직접 그려 나가는 양피지 지도: 안 간 곳은 그림자에 지워진 여백, 다가가면 잉크로 그려진다 */}
                <div className={`map-frame parchment ${unfold ? 'unfold' : ''}`} style={{ clipPath: edge }}>
                    <span className="map-compass" aria-hidden />
                    <span className={`map-doodle doodle-${theme.id}`} aria-hidden />
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
                            const reachable = here.links.includes(r.id) && canStep(here, r, map.cells);
                            const cls = [
                                'room', `room-${r.type}`,
                                r.seen ? 'seen' : 'hidden', r.visited && 'visited', r.cleared && 'cleared', reachable && 'reachable', r.id === run.pos && 'current',
                            ].filter(Boolean).join(' ');
                            const label = roomLabel(r);
                            // 지나온 방은 그림 대신 붉은 잉크 X 하나만 (모닥불 등이 그대로 타고 있으면 아직 안 쓴 방처럼 보인다)
                            const showIcon = r.seen && r.id !== run.pos && !r.visited;
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
                            <HeroView char={run.hero} scale={1.9} flip={run.facing === 'left'} walking={walking} className={walking ? 'walking' : ''} />
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
                    <details className="legend-fold">
                        <summary>표식 보기</summary>
                        <div className="legend">
                            {LEGEND.map((t) => (
                                <span key={t} className="legend-chip">
                                    <span className={`legend-ico ico-room-${t}`} aria-hidden />
                                    {ROOM_NAME[t]}
                                </span>
                            ))}
                        </div>
                    </details>
                    <p className="journal-hint">
                        <kbd>W</kbd>
                        <kbd>A</kbd>
                        <kbd>S</kbd>
                        <kbd>D</kbd> 또는 화살표가 뜬 방을 눌러 위로 나아가기
                    </p>
                </aside>
            </div>
        </div>
    );
}
