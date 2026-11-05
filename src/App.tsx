import { useEffect, useReducer, useState } from 'react';
import { loadRun, reducer, saveRun } from './game/run';
import { HEROES, HeroView } from './ui/Actors';
import { CombatScreen } from './ui/CombatScreen';
import { Hud } from './ui/Hud';
import { MapScreen } from './ui/MapScreen';
import { EndScreen, EventScreen, FloorClearScreen, PickScreen, RestScreen, RewardScreen, ShopView, TreasureScreen } from './ui/RoomScreens';

function Title({ onNew, onContinue, canContinue }: { onNew: (hero: string) => void; onContinue: () => void; canContinue: boolean }) {
    const [hero, setHero] = useState(() => {
        try {
            return localStorage.getItem('aua-hero') ?? HEROES[0].id;
        } catch {
            return HEROES[0].id;
        }
    });
    const pick = (id: string) => {
        setHero(id);
        try {
            localStorage.setItem('aua-hero', id);
        } catch {
            /* 저장 불가 환경은 무시 */
        }
    };
    return (
        <div className="title-screen">
            <div className="title-art">
                <HeroView char={hero} scale={4} />
            </div>
            <h1 className="title-logo">
                <small>An</small> Unexpected Adventure
            </h1>
            <p className="title-sub">카드 한 장, 횃불 하나로 내려가는 세 층의 던전</p>
            <div className="hero-pick" role="radiogroup" aria-label="주인공 고르기">
                {HEROES.map((h) => (
                    <button key={h.id} role="radio" aria-checked={hero === h.id} className={`hero-option ${hero === h.id ? 'on' : ''}`} onClick={() => pick(h.id)}>
                        <b>{h.name}</b>
                        <span>{h.desc}</span>
                    </button>
                ))}
            </div>
            <div className="title-buttons">
                {canContinue && (
                    <button className="btn btn-primary" onClick={onContinue}>
                        이어하기
                    </button>
                )}
                <button className={`btn ${canContinue ? '' : 'btn-primary'}`} onClick={() => (!canContinue || confirm('새 모험을 시작하면 저장된 진행이 사라져요. 시작할까요?')) && onNew(hero)}>
                    새 모험
                </button>
            </div>
            <ul className="title-help">
                <li>안개 낀 지도를 돌아다니며 방을 하나씩 밝혀 나가세요.</li>
                <li>전투는 카드로 합니다. 매 턴 에너지 3, 카드 5장.</li>
                <li>적 머리 위의 표시는 다음 행동입니다. 미리 막아내세요.</li>
                <li>각 층 가장 깊은 곳의 보스를 쓰러뜨리면 다음 층으로.</li>
            </ul>
        </div>
    );
}

export default function App() {
    const [state, dispatch] = useReducer(reducer, { run: null });
    const [saved, setSaved] = useState(() => loadRun());
    const run = state.run;

    useEffect(() => {
        if (run) saveRun(run);
    }, [run]);

    if (!run) {
        return (
            <Title
                canContinue={!!saved}
                onNew={(hero) => dispatch({ type: 'new', hero })}
                onContinue={() => saved && dispatch({ type: 'load', run: saved })}
            />
        );
    }

    const quit = () => {
        setSaved(loadRun());
        dispatch({ type: 'quit' });
    };

    const sc = run.screen;
    if (sc.kind === 'gameover' || sc.kind === 'victory') {
        return <EndScreen run={run} win={sc.kind === 'victory'} onTitle={quit} />;
    }

    let body;
    switch (sc.kind) {
        case 'map':
            body = <MapScreen run={run} dispatch={dispatch} />;
            break;
        case 'combat':
            body = <CombatScreen key={`${run.pos}-${run.stats.rooms}`} combat={sc.combat} floor={run.floor} hero={run.hero} dispatch={dispatch} />;
            break;
        case 'reward':
            body = <RewardScreen s={sc} dispatch={dispatch} />;
            break;
        case 'rest':
            body = <RestScreen s={sc} run={run} dispatch={dispatch} />;
            break;
        case 'shop':
            body = <ShopView s={sc} run={run} dispatch={dispatch} />;
            break;
        case 'treasure':
            body = <TreasureScreen s={sc} dispatch={dispatch} />;
            break;
        case 'event':
            body = <EventScreen s={sc} run={run} dispatch={dispatch} />;
            break;
        case 'pick':
            body = <PickScreen s={sc} run={run} dispatch={dispatch} />;
            break;
        case 'floorClear':
            body = <FloorClearScreen run={run} dispatch={dispatch} />;
            break;
    }

    return (
        <div className="app">
            <Hud run={run} hp={sc.kind === 'combat' ? sc.combat.player.hp : undefined} onQuit={quit} />
            <main className="stage">{body}</main>
        </div>
    );
}
