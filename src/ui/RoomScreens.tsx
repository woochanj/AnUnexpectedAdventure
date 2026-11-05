import { useState, type Dispatch, type ReactNode } from 'react';
import { cardLevel, MAX_LEVEL } from '../game/cards';
import { regionOf } from '../game/biomes';
import { EVENTS } from '../game/events';
import { RELICS } from '../game/relics';
import type { Action } from '../game/run';
import type { CardInst, RunState, Screen, ShopScreen } from '../game/types';
import { CardGrid, CardView, Modal } from './common';
import { FxView, HeroView } from './Actors';
import { FX } from './creatures';
import { sfx } from './sfx';
import { ForgeOverlay } from './Forge';

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
    // 고른 카드: 번쩍 커졌다가 덱으로 날아가고, 나머지는 물러난다. 연출이 끝나면 덱에 넣는다
    const [picked, setPicked] = useState<string | null>(null);
    const pick = (id: string) => {
        if (picked) return;
        sfx.card();
        sfx.upgrade();
        setPicked(id);
        window.setTimeout(() => dispatch({ type: 'takeCard', id }), 720);
    };
    return (
        <Panel title={s.combatKind === 'boss' ? '보스 처치!' : s.combatKind === 'elite' ? '강적을 쓰러뜨렸다' : '전리품'}>
            <div className="reward-list">
                <button className="reward-item" disabled={s.goldTaken} onClick={() => (sfx.coin(), dispatch({ type: 'takeGold' }))}>
                    <i className="ico ico-coin" /> {s.goldTaken ? '골드 획득함' : `골드 ${s.gold}`}
                </button>
                {s.relicChoices && !s.relicTaken && (
                    <div className="relic-choice">
                        <p className="panel-sub">보스 유물 — 하나만 고를 수 있다</p>
                        {s.relicChoices.map((id) => (
                            <button key={id} className="reward-item relic-option" onClick={() => (sfx.upgrade(), dispatch({ type: 'takeRelic', id }))}>
                                <span className="reward-glyph">{RELICS[id].glyph}</span>
                                <span>
                                    <b>{RELICS[id].name}</b>
                                    <small>{RELICS[id].desc}</small>
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                {s.relic && (!s.relicChoices || s.relicTaken) && (
                    <button className="reward-item" disabled={s.relicTaken} onClick={() => (sfx.upgrade(), dispatch({ type: 'takeRelic' }))}>
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
                    <div className={`card-row reward-cards ${picked ? 'has-pick' : ''}`}>
                        {s.cards.map((id, i) => (
                            <div key={id} className={`reward-card ${picked === id ? 'picked' : picked ? 'unpicked' : ''}`} style={{ ['--i' as string]: i }}>
                                <CardView card={{ id, upgraded: false }} onClick={() => pick(id)} />
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-ghost" disabled={!!picked} onClick={() => dispatch({ type: 'skipCards' })}>
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
                        <button className="choice" onClick={() => (sfx.heal(), dispatch({ type: 'rest' }))}>
                            <b>휴식</b> <span>체력 {heal} 회복</span>
                        </button>
                        <button className="choice" onClick={() => dispatch({ type: 'restUpgrade' })} disabled={run.deck.every((c) => cardLevel(c) >= MAX_LEVEL)}>
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
                        onClick={() => !it.sold && run.gold >= it.price && (sfx.coin(), dispatch({ type: 'buy', idx: i }))}
                        footer={it.sold ? '판매됨' : <span className={run.gold < it.price ? 'price no' : 'price'}>{it.price} G</span>}
                    />
                ))}
            </div>
            {s.relic && (
                <button
                    className="reward-item shop-relic"
                    disabled={s.relic.sold || run.gold < s.relic.price}
                    onClick={() => (sfx.upgrade(), dispatch({ type: 'buyRelic' }))}
                >
                    <span className="reward-glyph">{RELICS[s.relic.id].glyph}</span>
                    <span>
                        <b>{RELICS[s.relic.id].name}</b>
                        <small>{RELICS[s.relic.id].desc}</small>
                    </span>
                    <em className={run.gold < s.relic.price && !s.relic.sold ? 'price no' : 'price'}>{s.relic.sold ? '판매됨' : `${s.relic.price} G`}</em>
                </button>
            )}
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
                <button className="btn btn-primary" onClick={() => (sfx.coin(), dispatch({ type: 'treasureTake' }))}>
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
            <p className="panel-text">{typeof ev.text === 'function' ? ev.text(run) : ev.text}</p>
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
    // 고른 카드는 바로 바꾸지 않고, 강화 전/후(또는 지울 카드)를 보여준 뒤 확인을 받는다
    const [chosen, setChosen] = useState<CardInst | null>(null);
    // 강화를 누르면 바로 바꾸지 않고 대장간 연출을 보여 준 뒤에 반영한다
    const [forging, setForging] = useState<CardInst | null>(null);
    return (
        <Panel title={up ? '강화할 카드를 고르세요' : '지울 카드를 고르세요'} className="pick">
            <CardGrid cards={run.deck} isDisabled={up ? (c) => cardLevel(c) >= MAX_LEVEL : undefined} onPick={setChosen} />
            <button className="btn btn-ghost" onClick={() => dispatch({ type: 'pickCancel' })}>
                취소
            </button>
            {chosen && (
                <Modal title={up ? '이 카드를 강화할까요?' : '이 카드를 덱에서 지울까요?'} onClose={() => setChosen(null)}>
                    <div className="confirm-cards">
                        <div className="confirm-col">
                            <span className="confirm-label">{up ? `지금 · Lv.${cardLevel(chosen)}` : '지울 카드'}</span>
                            <CardView card={chosen} />
                        </div>
                        {up && (
                            <>
                                <span className="confirm-arrow" aria-hidden>
                                    ▶
                                </span>
                                <div className="confirm-col">
                                    <span className="confirm-label up">강화 후 · Lv.{cardLevel(chosen) + 1}</span>
                                    <CardView card={{ ...chosen, upgraded: true, level: cardLevel(chosen) + 1 }} />
                                </div>
                            </>
                        )}
                    </div>
                    {!up && s.cost ? <p className="panel-sub confirm-note">{s.cost} 골드가 들어요.</p> : null}
                    <div className="confirm-buttons">
                        <button className="btn btn-ghost" onClick={() => setChosen(null)}>
                            다시 고르기
                        </button>
                        <button
                            className="btn btn-primary"
                            autoFocus
                            onClick={() => {
                                if (up) setForging(chosen);
                                else {
                                    sfx.debuff();
                                    dispatch({ type: 'pick', uid: chosen.uid });
                                }
                                setChosen(null);
                            }}
                        >
                            {up ? '강화하기' : '지우기'}
                        </button>
                    </div>
                </Modal>
            )}
            {forging && <ForgeOverlay card={forging} onDone={() => dispatch({ type: 'pick', uid: forging.uid })} />}
        </Panel>
    );
}

export function FloorClearScreen({ run, dispatch }: { run: RunState; dispatch: D }) {
    const here = regionOf(run);
    const next = regionOf(run, run.floor + 1);
    return (
        <Panel title={`${here.name} 수호자 격파`} art={<FxView mod={FX['arcane/portal']} scale={3} />}>
            <p className="panel-text">
                {here.farewell}
                <br />
                다음 목적지: <b>{next.name}</b> — {next.subtitle}
            </p>
            <Journey run={run} />
            <p className="panel-sub">떠나기 전에 숨을 고른다 (잃은 체력의 절반 회복)</p>
            <button className="btn btn-primary" onClick={() => dispatch({ type: 'nextFloor' })}>
                다음 지역으로 떠난다
            </button>
        </Panel>
    );
}

/** 이번 탐험 여정: 지나온 지역 → 지금 → 앞으로 갈 곳 */
export function Journey({ run }: { run: RunState }) {
    return (
        <ol className="journey">
            {run.route.map((id, i) => {
                const b = regionOf(run, i);
                const state = i < run.floor + 1 ? 'done' : i === run.floor + 1 ? 'next' : 'later';
                return (
                    <li key={id} className={`journey-stop ${state}`}>
                        <span className="journey-dot">{i + 1}</span>
                        <span className="journey-name">{state === 'later' ? '???' : b.name}</span>
                    </li>
                );
            })}
        </ol>
    );
}

export function EndScreen({ run, win, onTitle }: { run: RunState; win: boolean; onTitle: () => void }) {
    return (
        <Panel title={win ? `탐험 #${run.expedition} 완주!` : `탐험 #${run.expedition} 여기까지`} className={win ? 'victory' : 'gameover'} art={
                <div className="art-stack">
                    <FxView mod={FX[win ? 'ui/level-up' : 'spawn/soul-rise']} scale={3} />
                    <HeroView char={run.hero} scale={3} />
                </div>
            }
        >
            <p className="panel-text">
                {win
                    ? `${run.route.map((_, i) => regionOf(run, i).name).join(' → ')}. 예상치 못한 탐험 여행은 이렇게 끝이 났다.`
                    : `${regionOf(run).name}에서 쓰러졌다. 하지만 다음 탐험대는 다른 길로 더 멀리 갈 것이다.`}
            </p>
            <dl className="stats">
                <dt>도달한 지역</dt>
                <dd>
                    {run.floor + 1} · {regionOf(run).name}
                </dd>
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
