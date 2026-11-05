import type { Dispatch, ReactNode } from 'react';
import { FLOORS } from '../game/enemies';
import { EVENTS } from '../game/events';
import { RELICS } from '../game/relics';
import type { Action } from '../game/run';
import type { RunState, Screen, ShopScreen } from '../game/types';
import { CardGrid, CardView } from './common';
import { FxView, HeroView } from './Actors';
import { FX } from './creatures';

type D = Dispatch<Action>;

function Panel({ title, art, children, className }: { title: string; art?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <div className={`panel-screen ${className ?? ''}`}>
            <div className="panel">
                {art && <div className="panel-art">{art}</div>}
                <h1 className="panel-title">{title}</h1>
                {children}
            </div>
        </div>
    );
}

export function RewardScreen({ s, dispatch }: { s: Extract<Screen, { kind: 'reward' }>; dispatch: D }) {
    return (
        <Panel title={s.combatKind === 'boss' ? '보스 처치!' : s.combatKind === 'elite' ? '강적을 쓰러뜨렸다' : '전리품'}>
            <div className="reward-list">
                <button className="reward-item" disabled={s.goldTaken} onClick={() => dispatch({ type: 'takeGold' })}>
                    <i className="ico ico-coin" /> {s.goldTaken ? '골드 획득함' : `골드 ${s.gold}`}
                </button>
                {s.relic && (
                    <button className="reward-item" disabled={s.relicTaken} onClick={() => dispatch({ type: 'takeRelic' })}>
                        <span className="reward-glyph">{RELICS[s.relic].glyph}</span>
                        <span>
                            <b>{RELICS[s.relic].name}</b>
                            <small>{RELICS[s.relic].desc}</small>
                        </span>
                        {s.relicTaken && <em>획득함</em>}
                    </button>
                )}
            </div>
            {!s.cardsDone ? (
                <>
                    <p className="panel-sub">카드 한 장을 덱에 넣을 수 있다</p>
                    <div className="card-row">
                        {s.cards.map((id) => (
                            <CardView key={id} card={{ id, upgraded: false }} onClick={() => dispatch({ type: 'takeCard', id })} />
                        ))}
                    </div>
                    <button className="btn btn-ghost" onClick={() => dispatch({ type: 'skipCards' })}>
                        카드 건너뛰기
                    </button>
                </>
            ) : (
                <p className="panel-sub">카드 선택 완료</p>
            )}
            <button className="btn btn-primary" onClick={() => dispatch({ type: 'leave' })}>
                {s.combatKind === 'boss' ? '앞으로' : '지도로 돌아가기'}
            </button>
        </Panel>
    );
}

export function RestScreen({ s, run, dispatch }: { s: Extract<Screen, { kind: 'rest' }>; run: RunState; dispatch: D }) {
    const heal = Math.round(run.maxHp * 0.3);
    return (
        <Panel title="모닥불" art={<FxView mod={FX['fire/campfire']} scale={3} />}>
            {s.done ? (
                <p className="panel-text">{s.message}</p>
            ) : (
                <>
                    <p className="panel-text">타닥타닥 불꽃이 튄다. 잠시 숨을 돌릴 수 있을 것 같다.</p>
                    <div className="choice-list">
                        <button className="choice" onClick={() => dispatch({ type: 'rest' })}>
                            <b>휴식</b> <span>체력 {heal} 회복</span>
                        </button>
                        <button className="choice" onClick={() => dispatch({ type: 'restUpgrade' })} disabled={run.deck.every((c) => c.upgraded)}>
                            <b>수련</b> <span>카드 1장 강화</span>
                        </button>
                    </div>
                </>
            )}
            <button className="btn btn-primary" onClick={() => dispatch({ type: 'leave' })}>
                {s.done ? '길을 나선다' : '그냥 지나간다'}
            </button>
        </Panel>
    );
}

export function ShopView({ s, run, dispatch }: { s: ShopScreen; run: RunState; dispatch: D }) {
    return (
        <Panel title="떠돌이 상인" art={<FxView mod={FX['pickups/coin-spin']} scale={4} />}>
            <p className="panel-text">"물건 좀 보고 가. 이런 데서 이만한 물건 못 구해."</p>
            <div className="card-row shop-row">
                {s.cards.map((it, i) => (
                    <CardView
                        key={i}
                        card={{ id: it.id, upgraded: false }}
                        disabled={it.sold || run.gold < it.price}
                        onClick={() => !it.sold && run.gold >= it.price && dispatch({ type: 'buy', idx: i })}
                        footer={it.sold ? '판매됨' : <span className={run.gold < it.price ? 'price no' : 'price'}>{it.price} G</span>}
                    />
                ))}
            </div>
            <button className="choice" disabled={s.removed || run.gold < s.removePrice} onClick={() => dispatch({ type: 'shopRemove' })}>
                <b>카드 제거</b> <span>{s.removed ? '이용함' : `${s.removePrice} G — 덱에서 카드 1장을 지운다`}</span>
            </button>
            <button className="btn btn-primary" onClick={() => dispatch({ type: 'leave' })}>
                떠난다
            </button>
        </Panel>
    );
}

export function TreasureScreen({ s, dispatch }: { s: Extract<Screen, { kind: 'treasure' }>; dispatch: D }) {
    return (
        <Panel
            title="보물 상자"
            art={s.taken ? <FxView key="open" mod={FX['pickups/chest-open']} scale={3} /> : <FxView key="idle" mod={FX['pickups/loot-beam']} scale={2} opts={{ palette: ['#3a2406', '#7a4a0c', '#c8841a', '#f0b84a', '#ffe08a', '#fff6d0'] }} />}
        >
            {!s.taken ? (
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'treasureTake' })}>
                    상자를 연다
                </button>
            ) : (
                <div className="reward-list">
                    {s.relic && (
                        <div className="reward-item static">
                            <span className="reward-glyph">{RELICS[s.relic].glyph}</span>
                            <span>
                                <b>{RELICS[s.relic].name}</b>
                                <small>{RELICS[s.relic].desc}</small>
                            </span>
                        </div>
                    )}
                    <div className="reward-item static">
                        <i className="ico ico-coin" /> 골드 {s.gold}
                    </div>
                </div>
            )}
            {s.taken && (
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'leave' })}>
                    지도로 돌아가기
                </button>
            )}
        </Panel>
    );
}

export function EventScreen({ s, run, dispatch }: { s: Extract<Screen, { kind: 'event' }>; run: RunState; dispatch: D }) {
    const ev = EVENTS[s.eventId];
    return (
        <Panel title={ev.title} className="event">
            <p className="panel-text">{ev.text}</p>
            {s.result ? (
                <>
                    <p className="panel-result">{s.result}</p>
                    <button className="btn btn-primary" onClick={() => dispatch({ type: 'leave' })}>
                        계속 탐험한다
                    </button>
                </>
            ) : (
                <div className="choice-list">
                    {ev.choices.map((ch, i) => {
                        const ok = !ch.enabled || ch.enabled(run);
                        return (
                            <button key={i} className="choice" disabled={!ok} onClick={() => dispatch({ type: 'eventChoice', idx: i })}>
                                <b>{ch.label}</b> {ch.hint && <span>{ch.hint}</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </Panel>
    );
}

export function PickScreen({ s, run, dispatch }: { s: Extract<Screen, { kind: 'pick' }>; run: RunState; dispatch: D }) {
    const up = s.purpose === 'upgrade';
    return (
        <Panel title={up ? '강화할 카드를 고르세요' : '지울 카드를 고르세요'} className="pick">
            <CardGrid cards={run.deck} isDisabled={up ? (c) => c.upgraded : undefined} onPick={(c) => dispatch({ type: 'pick', uid: c.uid })} />
            <button className="btn btn-ghost" onClick={() => dispatch({ type: 'pickCancel' })}>
                취소
            </button>
        </Panel>
    );
}

export function FloorClearScreen({ run, dispatch }: { run: RunState; dispatch: D }) {
    const next = FLOORS[run.floor + 1];
    return (
        <Panel title={`${FLOORS[run.floor].name} 돌파`} art={<FxView mod={FX['arcane/portal']} scale={3} />}>
            <p className="panel-text">
                아래로 이어지는 계단을 찾았다. 계단 아래에서 차가운 바람이 불어온다.
                <br />
                다음 층: <b>{next.name}</b> — {next.subtitle}
            </p>
            <p className="panel-sub">내려가기 전에 숨을 고른다 (잃은 체력의 절반 회복)</p>
            <button className="btn btn-primary" onClick={() => dispatch({ type: 'nextFloor' })}>
                계단을 내려간다
            </button>
        </Panel>
    );
}

export function EndScreen({ run, win, onTitle }: { run: RunState; win: boolean; onTitle: () => void }) {
    return (
        <Panel title={win ? '그림자를 걷어냈다' : '모험은 여기까지'} className={win ? 'victory' : 'gameover'} art={
                <div className="art-stack">
                    <FxView mod={FX[win ? 'ui/level-up' : 'spawn/soul-rise']} scale={3} />
                    <HeroView scale={3} />
                </div>
            }
        >
            <p className="panel-text">
                {win ? '성채 깊은 곳에서 마침내 빛이 새어 나왔다. 예상치 못한 모험은 이렇게 끝이 났다.' : `${FLOORS[run.floor].name}에서 쓰러졌다. 하지만 다음 모험가는 더 멀리 갈 것이다.`}
            </p>
            <dl className="stats">
                <dt>도달한 층</dt>
                <dd>{run.floor + 1}</dd>
                <dt>쓰러뜨린 적</dt>
                <dd>{run.stats.kills}</dd>
                <dt>탐험한 방</dt>
                <dd>{run.stats.rooms}</dd>
                <dt>덱 크기</dt>
                <dd>{run.deck.length}</dd>
                <dt>유물</dt>
                <dd>{run.relics.length ? run.relics.map((r) => RELICS[r].glyph).join(' ') : '없음'}</dd>
            </dl>
            <button className="btn btn-primary" onClick={onTitle}>
                타이틀로
            </button>
        </Panel>
    );
}
