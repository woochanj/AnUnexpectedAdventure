import { useState } from 'react';
import { regionOf } from '../game/biomes';
import type { RunState } from '../game/types';
import { CardGrid, Modal, RelicIcon } from './common';

export function Hud({ run, hp, onQuit }: { run: RunState; hp?: number; onQuit: () => void }) {
    const [deckOpen, setDeckOpen] = useState(false);
    const curHp = hp ?? run.hp;
    return (
        <header className="hud">
            <div className="hud-stats">
                <span className="hud-stat hp" title="체력">
                    <i className="ico ico-heart" /> {curHp}/{run.maxHp}
                </span>
                <span className="hud-stat gold" title="골드">
                    <i className="ico ico-coin" /> {run.gold}
                </span>
                <span className="hud-stat floor" title="현재 층">
                    지역 {run.floor + 1} · {regionOf(run).name}
                </span>
            </div>
            <div className="hud-relics">
                {run.relics.map((r) => (
                    <RelicIcon key={r} id={r} />
                ))}
            </div>
            <div className="hud-actions">
                <button className="btn btn-small" onClick={() => setDeckOpen(true)}>
                    덱 {run.deck.length}
                </button>
                <button
                    className="btn btn-small btn-ghost"
                    onClick={() => {
                        if (confirm('타이틀로 돌아갈까요? 진행 상황은 저장되어 이어할 수 있어요.')) onQuit();
                    }}
                >
                    메뉴
                </button>
            </div>
            {deckOpen && (
                <Modal title={`내 덱 (${run.deck.length}장)`} onClose={() => setDeckOpen(false)}>
                    <CardGrid cards={run.deck} />
                </Modal>
            )}
        </header>
    );
}
