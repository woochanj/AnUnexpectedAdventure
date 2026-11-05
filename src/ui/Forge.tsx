import { useEffect, useMemo, useState } from 'react';
import { cardLevel, describeCard } from '../game/cards';
import type { CardInst } from '../game/types';
import { CardView } from './common';
import { FxView } from './Actors';
import { FX } from './creatures';
import { sfx } from './sfx';

/**
 * 카드 강화 연출: 카드가 떠올라 망치질 세 번에 달아오르고, 번쩍이며 새 카드로 바뀐 뒤
 * 불꽃이 튀고 레벨 도장이 찍힌다. 바뀐 수치는 "전 → 후"로 보여 준다.
 */
export function ForgeOverlay({ card, onDone }: { card: CardInst; onDone: () => void }) {
    const lv = cardLevel(card) + 1;
    const next = useMemo(() => ({ ...card, upgraded: true, level: lv }), [card, lv]);
    const [phase, setPhase] = useState<'heat' | 'done'>('heat');
    const [ready, setReady] = useState(false);
    // 바뀐 줄만 골라 "전 → 후"
    const diff = useMemo(() => {
        const a = describeCard(card);
        const b = describeCard(next);
        const out: { from: string; to: string }[] = [];
        for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) out.push({ from: a[i] ?? '', to: b[i] ?? '' });
        return out;
    }, [card, next]);
    // 튀는 불꽃 조각 (매번 같은 모양이면 심심하니 무작위)
    const sparks = useMemo(
        () =>
            Array.from({ length: 28 }, (_, i) => {
                const a = (i / 28) * Math.PI * 2 + Math.random() * 0.3;
                const r = 90 + Math.random() * 120;
                return { dx: Math.cos(a) * r, dy: Math.sin(a) * r - 30, d: Math.random() * 120, s: 3 + Math.floor(Math.random() * 3) };
            }),
        [],
    );
    useEffect(() => {
        const ts = [
            ...[300, 560, 820].map((t) => window.setTimeout(() => sfx.forge(), t)),
            window.setTimeout(() => {
                setPhase('done');
                sfx.upgrade();
            }, 1000),
            window.setTimeout(() => setReady(true), 1700),
        ];
        return () => ts.forEach(clearTimeout);
    }, []);
    return (
        <div className={`forge forge-${phase}`} onClick={() => ready && onDone()} role="dialog" aria-label="카드 강화">
            <div className="forge-rays" />
            {phase === 'done' && <FxView mod={FX['pickups/loot-beam']} scale={4} className="forge-beam" />}
            <div className="forge-stage">
                {phase === 'heat' ? (
                    <div className="forge-card heat">
                        <CardView card={card} />
                        {[0, 1, 2].map((i) => (
                            <span key={i} className="forge-strike" style={{ animationDelay: `${300 + i * 260}ms` }} />
                        ))}
                    </div>
                ) : (
                    <div className="forge-card born">
                        <CardView card={next} />
                        <span className="forge-flash" />
                        {sparks.map((p, i) => (
                            <i key={i} className="forge-spark" style={{ ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: `${p.dy}px`, animationDelay: `${p.d}ms`, width: p.s, height: p.s }} />
                        ))}
                        <span className={`forge-stamp lv${lv}`}>Lv.{lv}</span>
                    </div>
                )}
            </div>
            {phase === 'done' && (
                <div className="forge-diff">
                    {diff.map((d, i) => (
                        <div key={i} style={{ animationDelay: `${400 + i * 140}ms` }}>
                            <s>{d.from}</s> <b>▶</b> <em>{d.to}</em>
                        </div>
                    ))}
                </div>
            )}
            <button className={`btn btn-primary forge-ok ${ready ? 'show' : ''}`} onClick={(e) => (e.stopPropagation(), onDone())} disabled={!ready}>
                좋아요
            </button>
        </div>
    );
}
