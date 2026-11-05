import { useEffect, useRef, useState, type ReactNode } from 'react';
import { describeCard, cardStats, ELEMENT_NAME, RARITY_INFO, STATUS_INFO } from '../game/cards';
import { RELICS } from '../game/relics';
import type { CardInst, Fx, StatusMap, Status } from '../game/types';

/**
 * 체력은 카드를 내거나 턴을 넘기는 순간 계산되지만, 화면에는 일격이 '닿는 순간' 줄어야 한다.
 * 아직 닿지 않은 피해·회복(fx.delay가 남은 것)을 되돌려 보여 준다.
 */
export function useLandedHp(fx: Fx[] | undefined, target: string, hp: number, max: number): number {
    const land = useRef<Map<number, number> | null>(null);
    const [, tick] = useState(0);
    const now = performance.now();
    if (!land.current) {
        // 처음 그릴 때 이미 있던 신호는 다 닿은 것으로 본다 (이어하기·새로고침)
        land.current = new Map((fx ?? []).map((f) => [f.id, 0]));
    }
    for (const f of fx ?? []) if (!land.current.has(f.id)) land.current.set(f.id, now + f.delay * 1000);
    // 닿는 순간 다시 그리도록 타이머를 건다. 그리기와 분리해야 개발 모드의 두 번 그리기에도 빠지지 않는다.
    // 새 신호가 와도 앞서 건 타이머는 지우지 않는다 (지우면 그 일격이 닿아도 숫자가 안 바뀐다)
    const timers = useRef<number[]>([]);
    const scheduled = useRef(new Set<number>());
    useEffect(() => {
        const t = performance.now();
        for (const f of fx ?? []) {
            const at = land.current!.get(f.id) ?? 0;
            if (f.target !== target || at <= t || scheduled.current.has(f.id)) continue;
            scheduled.current.add(f.id);
            timers.current.push(window.setTimeout(() => tick((x) => x + 1), at - t + 10));
        }
    }, [fx, target]);
    useEffect(() => () => timers.current.forEach(clearTimeout), []);
    let pending = 0;
    for (const f of fx ?? []) {
        if (f.target !== target || (land.current.get(f.id) ?? 0) <= now) continue;
        if (f.kind === 'dmg') pending += f.amount ?? 0;
        else if (f.kind === 'heal') pending -= Number(/\+(\d+)/.exec(f.text)?.[1] ?? 0);
    }
    return Math.max(0, Math.min(max, hp + pending));
}
import { cardArt } from './cardArt';

const TYPE_LABEL = { attack: '공격', skill: '기술', power: '지속' } as const;

export function CardView({
    card, onClick, disabled, selected, cost, small, footer,
}: {
    card: Pick<CardInst, 'id' | 'upgraded' | 'level'>;
    onClick?: () => void;
    disabled?: boolean;
    selected?: boolean;
    cost?: number;
    small?: boolean;
    footer?: ReactNode;
}) {
    const s = cardStats(card);
    const art = cardArt(card.id);
    return (
        <button
            type="button"
            className={[
                'card', `card-${s.def.type}`, `rarity-${s.def.rarity}`,
                disabled && 'card-disabled', selected && 'card-selected', small && 'card-small', s.level > 1 && 'card-up', s.def.unplayable && 'card-curse', s.cost < s.def.cost && 'cost-down', s.def.ultimate && 'card-ultimate',
            ].filter(Boolean).join(' ')}
            onClick={onClick}
            aria-disabled={disabled}
        >
            <span className="card-cost" title={s.cost < s.def.cost ? `강화로 코스트 ${s.def.cost} → ${s.cost}` : '코스트 (에너지)'}>{s.def.unplayable ? '✕' : (cost ?? s.cost)}</span>
            <span className="card-name">{s.name}</span>
            <span className="card-art">
                {art ? <img src={art} alt="" draggable={false} /> : <span className={`card-art-fallback art-${s.def.type}`} />}
            </span>
            {s.level > 1 && <span className={`card-level lv${s.level}`}>Lv.{s.level}</span>}
            {s.def.el && (
                <span className={`card-el el-${s.def.el}`} title={`${ELEMENT_NAME[s.def.el]} 주문: 같은 원소를 연달아 쓰면 공명, 다른 원소로 바꾸면 반응`}>
                    {ELEMENT_NAME[s.def.el]}
                </span>
            )}
            <span className="card-type">
                {s.def.unplayable ? '저주' : s.def.ultimate ? '궁극기' : TYPE_LABEL[s.def.type]} · <em className={`rar rar-${s.def.rarity}`}>{RARITY_INFO[s.def.rarity].name}</em>
            </span>
            {/* 카드 크기는 모두 같다: 설명이 길면 글자를 줄여 칸 안에 넣는다 */}
            {(() => {
                const lines = describeCard(card);
                const len = lines.join('').length + lines.length * 4;
                return (
                    <span className={`card-desc ${len > 46 ? 'xlong' : len > 30 ? 'long' : ''}`}>
                        {lines.map((l, i) => (
                            <span key={i}>{l}</span>
                        ))}
                    </span>
                );
            })()}
            {footer && <span className="card-footer">{footer}</span>}
        </button>
    );
}

/** 일격이 닿는 순간에 줄어드는 체력 막대 */
export function LandedHpBar({ fx, target, hp, max, block }: { fx: Fx[]; target: string; hp: number; max: number; block?: number }) {
    return <HpBar hp={useLandedHp(fx, target, hp, max)} max={max} block={block} />;
}

export function HpBar({ hp, max, block = 0 }: { hp: number; max: number; block?: number }) {
    // 깎인 만큼 흰 조각을 잠깐 남겼다가 줄인다
    const [lag, setLag] = useState(hp);
    const [hitKey, setHitKey] = useState(0);
    useEffect(() => {
        if (hp < lag) {
            setHitKey((k) => k + 1);
            const t = setTimeout(() => setLag(hp), 520);
            return () => clearTimeout(t);
        }
        setLag(hp);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hp]);
    const pct = Math.max(0, Math.min(1, hp / max));
    // 하스스톤처럼: 붉은 체력 보석에 큰 숫자, 옆으로 장식 테두리 안의 체력 줄, 방어도는 방패 보석
    return (
        <div key={hitKey} className={`hp2 ${hitKey ? 'hp2-hit' : ''} ${pct <= 0.3 ? 'hp2-low' : ''}`} title={`체력 ${hp} / ${max}${block ? ` · 방어도 ${block}` : ''}`}>
            <span className="hp2-gem">
                <b>{hp}</b>
            </span>
            <span className="hp2-track">
                <span className="hp2-lag" style={{ width: `${(Math.max(lag, hp) / max) * 100}%` }} />
                <span className="hp2-fill" style={{ width: `${pct * 100}%` }} />
                <span className="hp2-max">/ {max}</span>
            </span>
            {block > 0 && (
                <span className="hp2-armor">
                    <b>{block}</b>
                </span>
            )}
        </div>
    );
}

export function StatusList({ status }: { status: StatusMap }) {
    const entries = Object.entries(status).filter(([, v]) => v && v > 0) as [Status, number][];
    if (!entries.length) return <div className="statuses" />;
    return (
        <div className="statuses">
            {entries.map(([k, v]) => (
                <span key={k} className={`status ${STATUS_INFO[k].debuff ? 'debuff' : 'buff'} st-${k} ${k === 'grit' && v >= 10 ? 'full' : ''}`} style={k === 'grit' ? { ['--g' as string]: `${v * 10}%` } : undefined} title={`${STATUS_INFO[k].name}: ${STATUS_INFO[k].desc}`}>
                    {STATUS_INFO[k].name} {v}
                </span>
            ))}
        </div>
    );
}

export function RelicIcon({ id }: { id: string }) {
    const r = RELICS[id];
    return (
        <span className="relic" title={`${r.name} — ${r.desc}`} tabIndex={0}>
            {r.glyph}
            <span className="relic-tip">
                <b>{r.name}</b>
                {r.desc}
            </span>
        </span>
    );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
    useEffect(() => {
        const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', k);
        return () => window.removeEventListener('keydown', k);
    }, [onClose]);
    return (
        <div className="modal-bg" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <h2>{title}</h2>
                    <button className="btn btn-ghost" onClick={onClose}>
                        닫기
                    </button>
                </div>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
}

export function CardGrid({ cards, onPick, isDisabled }: { cards: CardInst[]; onPick?: (c: CardInst) => void; isDisabled?: (c: CardInst) => boolean }) {
    const sorted = [...cards].sort((a, b) => a.id.localeCompare(b.id) || (a.level ?? (a.upgraded ? 2 : 1)) - (b.level ?? (b.upgraded ? 2 : 1)));
    if (!sorted.length) return <p className="muted">카드가 없습니다.</p>;
    return (
        <div className="card-grid">
            {sorted.map((c) => (
                <CardView key={c.uid} card={c} small disabled={isDisabled?.(c)} onClick={onPick && !isDisabled?.(c) ? () => onPick(c) : undefined} />
            ))}
        </div>
    );
}
