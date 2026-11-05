import { useState } from 'react';
import { regionOf } from '../game/biomes';
import type { RunState } from '../game/types';
import { CardGrid, Modal, RelicIcon } from './common';
import { setSound, sfx, soundOn } from './sfx';

export function Hud({ run, hp, onQuit }: { run: RunState; hp?: number; onQuit: () => void }) {
    const [deckOpen, setDeckOpen] = useState(false);
    const [sound, setSoundState] = useState(soundOn());
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
                    <small>지역 {run.floor + 1}</small> {regionOf(run).name}
                </span>
            </div>
            <div className="hud-relics">
                {run.relics.map((r) => (
                    <RelicIcon key={r} id={r} />
                ))}
            </div>
            <div className="hud-actions">
                <button
                    className={`hud-btn ${sound ? '' : 'off'}`}
                    title={sound ? '소리 끄기' : '소리 켜기'}
                    aria-label={sound ? '소리 끄기' : '소리 켜기'}
                    onClick={() => {
                        setSound(!sound);
                        setSoundState(!sound);
                        if (!sound) sfx.select();
                    }}
                >
                    <span className="hud-glyph" aria-hidden>♪</span>
                </button>
                <button className="hud-btn deck" title="내 덱" aria-label={`내 덱 ${run.deck.length}장`} onClick={() => setDeckOpen(true)}>
                    <span className="hud-glyph deck-glyph" aria-hidden />
                    <b className="hud-badge">{run.deck.length}</b>
                </button>
                <button
                    className="hud-btn"
                    title="메뉴"
                    aria-label="메뉴"
                    onClick={() => {
                        if (confirm('타이틀로 돌아갈까요? 진행 상황은 저장되어 이어할 수 있어요.')) onQuit();
                    }}
                >
                    <span className="hud-glyph" aria-hidden>☰</span>
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
