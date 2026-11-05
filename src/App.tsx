import { useEffect, useReducer, useState } from 'react';
import { loadRun, reducer, saveRun } from './game/run';
import { HEROES, HeroView } from './ui/Actors';
import { CLASS_IDS, CLASSES } from './game/classes';
import { regionOf } from './game/biomes';
import type { ClassId } from './game/types';
import { CombatScreen } from './ui/CombatScreen';
import { Hud } from './ui/Hud';
import { MapScreen } from './ui/MapScreen';
import { EndScreen, EventScreen, FloorClearScreen, PickScreen, RestScreen, RewardScreen, ShopView, TreasureScreen } from './ui/RoomScreens';

const store = {
    get: (k: string) => {
        try {
            return localStorage.getItem(k);
        } catch {
            return null;
        }
    },
    set: (k: string, v: string) => {
        try {
            localStorage.setItem(k, v);
        } catch {
            /* 저장 불가 환경은 무시 */
        }
    },
};

function Title({ onNew, onContinue, canContinue }: { onNew: (cls: ClassId, hero: string) => void; onContinue: () => void; canContinue: boolean }) {
    const [cls, setCls] = useState<ClassId>(() => (CLASS_IDS.includes(store.get('aua-class') as ClassId) ? (store.get('aua-class') as ClassId) : 'knight'));
    const [looks, setLooks] = useState<Record<string, string>>(() => {
        try {
            return JSON.parse(store.get('aua-looks') ?? '{}');
        } catch {
            return {};
        }
    });
    const def = CLASSES[cls];
    const hero = looks[cls] && def.looks.includes(looks[cls]) ? looks[cls] : def.looks[0];
    const pickClass = (id: ClassId) => {
        setCls(id);
        store.set('aua-class', id);
    };
    const pickLook = (id: string) => {
        const next = { ...looks, [cls]: id };
        setLooks(next);
        store.set('aua-looks', JSON.stringify(next));
    };
    return (
        <div className="title-screen">
            <div className="title-art">
                <HeroView char={hero} scale={4} />
            </div>
            <h1 className="title-logo">
                <small>An</small> Unexpected Adventure
            </h1>
            <p className="title-sub">카드 한 벌 들고 떠나는, 매번 다른 세 지역의 탐험 여행</p>
            <div className="class-pick" role="radiogroup" aria-label="직업 고르기">
                {CLASS_IDS.map((id) => {
                    const c = CLASSES[id];
                    return (
                        <button key={id} role="radio" aria-checked={cls === id} className={`class-option ${cls === id ? 'on' : ''}`} onClick={() => pickClass(id)}>
                            <b>{c.name}</b>
                            <span className="class-hp">체력 {c.hp}</span>
                            <span>{c.desc}</span>
                        </button>
                    );
                })}
            </div>
            {def.looks.length > 1 && (
                <div className="look-pick" role="radiogroup" aria-label="외형 고르기">
                    <span className="look-label">외형</span>
                    {def.looks.map((id) => {
                        const h = HEROES.find((x) => x.id === id)!;
                        return (
                            <button key={id} role="radio" aria-checked={hero === id} className={`look-option ${hero === id ? 'on' : ''}`} onClick={() => pickLook(id)}>
                                {h.name}
                            </button>
                        );
                    })}
                </div>
            )}
            <div className="title-buttons">
                {canContinue && (
                    <button className="btn btn-primary" onClick={onContinue}>
                        이어하기
                    </button>
                )}
                <button className={`btn ${canContinue ? '' : 'btn-primary'}`} onClick={() => (!canContinue || confirm('새 모험을 시작하면 저장된 진행이 사라져요. 시작할까요?')) && onNew(cls, hero)}>
                    새 모험
                </button>
            </div>
            <ul className="title-help">
                <li>탐험할 때마다 여섯 지역 중 세 곳이 무작위로 정해지고, 길도 매번 새로 생겨요.</li>
                <li>전투는 카드로 합니다. 매 턴 에너지 3, 카드 5장.</li>
                <li>카드는 일반 · 고급 · 희귀 · 유니크 등급이 있고, 모닥불에서 Lv.3까지 강화할 수 있어요.</li>
                <li>지역 가장 깊은 곳의 수호자를 쓰러뜨리면 다음 지역으로 떠납니다.</li>
            </ul>
            <p className="title-credits">
                캐릭터: <a href="https://chierit.itch.io/" target="_blank" rel="noreferrer">chierit</a> (Elementals, CC-BY 4.0) ·{' '}
                <a href="https://rvros.itch.io/animated-pixel-hero" target="_blank" rel="noreferrer">rvros</a> ·{' '}
                <a href="https://luizmelo.itch.io/" target="_blank" rel="noreferrer">LuizMelo</a> ·{' '}
                <a href="https://aamatniekss.itch.io/" target="_blank" rel="noreferrer">aamatniekss</a> · SpritePilot
                <br />
                이펙트: <a href="https://github.com/patch-gg/pixelfx" target="_blank" rel="noreferrer">pixelfx</a> · 글꼴: 갈무리
            </p>
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
                onNew={(cls, hero) => dispatch({ type: 'new', cls, hero })}
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
            body = <CombatScreen key={`${run.pos}-${run.stats.rooms}`} combat={sc.combat} biome={regionOf(run).id} seed={run.expedition + run.floor * 7 + 3} hero={run.hero} dispatch={dispatch} />;
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
