// 이야기 장면: 지역 배경 위에 아래쪽 대화창. 한 글자씩 써지고, 누르면 다음 줄로.
import { useEffect, useRef, useState, type Dispatch } from 'react';
import { regionOf } from '../game/biomes';
import { ENEMIES } from '../game/enemies';
import type { Action } from '../game/run';
import { sceneLines, type Line } from '../game/story';
import type { RunState, Screen } from '../game/types';
import { HeroView, MonsterView, SceneryView } from './Actors';
import { sfx } from './sfx';

function Portrait({ line, run }: { line: Line; run: RunState }) {
    if (line.who === 'narrator') return null;
    if (line.who === 'hero') return <HeroView char={run.hero} scale={3} />;
    if (line.face === 'moren') return <HeroView char="wizard" scale={2} />;
    const def = line.face ? ENEMIES[line.face] : undefined;
    if (def) return <MonsterView look={{ ...def.look, scale: Math.min(def.look.scale ?? 3, 3) }} scale={2} />;
    return null;
}

export function DialogueScreen({ s, run, dispatch }: { s: Extract<Screen, { kind: 'dialogue' }>; run: RunState; dispatch: Dispatch<Action> }) {
    const lines = sceneLines(s.scene, run);
    const [i, setI] = useState(0);
    const [shown, setShown] = useState(0);
    const line = lines[i];
    const timer = useRef(0);

    // 장면이 바뀌면 처음부터
    useEffect(() => {
        setI(0);
        setShown(0);
    }, [s.scene]);

    // 한 글자씩
    useEffect(() => {
        if (!line) return;
        setShown(0);
        let n = 0;
        const t = window.setInterval(() => {
            n += 1;
            setShown(n);
            if (n % 3 === 0) sfx.select();
            if (n >= line.text.length) clearInterval(t);
        }, 28);
        timer.current = t;
        return () => clearInterval(t);
    }, [line]);

    // 대사가 없으면 바로 넘긴다
    useEffect(() => {
        if (!lines.length) dispatch({ type: 'dialogueNext' });
    }, [lines.length, dispatch]);

    const next = () => {
        if (!line) return;
        // 쓰는 중이면 먼저 한 줄을 다 보여 준다
        if (shown < line.text.length) {
            clearInterval(timer.current);
            return setShown(line.text.length);
        }
        if (i + 1 < lines.length) setI(i + 1);
        else dispatch({ type: 'dialogueNext' });
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                next();
            } else if (e.key === 'Escape') dispatch({ type: 'dialogueNext' });
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    if (!line) return null;
    const name = line.who === 'hero' ? '나' : line.who === 'narrator' ? '' : line.who;
    const region = regionOf(run);
    return (
        <div className={`dialogue-scene ${line.who === 'narrator' ? 'narrating' : ''}`} onClick={next}>
            <div className="scenery" aria-hidden>
                <SceneryView biome={region.id} ground seed={run.expedition + run.floor * 7} />
            </div>
            <div className="dialogue-chapter">{s.scene === 'prologue' ? '프롤로그' : s.scene === 'epilogue' ? '에필로그' : region.name}</div>
            <div className="dialogue-box">
                <div className={`dialogue-portrait ${line.who === 'hero' ? 'hero' : ''}`}>
                    <Portrait line={line} run={run} />
                </div>
                <div className="dialogue-body">
                    {name && <div className="dialogue-name">{name}</div>}
                    <p className="dialogue-text">{line.text.slice(0, shown)}</p>
                    <div className="dialogue-foot">
                        <span>
                            {i + 1} / {lines.length}
                        </span>
                        <span className="dialogue-next">{shown < line.text.length ? '' : i + 1 < lines.length ? '▼ 다음' : '▶ 계속'}</span>
                    </div>
                </div>
                <button
                    className="btn btn-small btn-ghost dialogue-skip"
                    onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'dialogueNext' });
                    }}
                >
                    건너뛰기
                </button>
            </div>
        </div>
    );
}
