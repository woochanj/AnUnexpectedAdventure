import { useEffect, useState, type ReactNode } from 'react';
import { describeCard, cardStats, RARITY_INFO, STATUS_INFO } from '../game/cards';
import { RELICS } from '../game/relics';
import type { CardInst, StatusMap, Status } from '../game/types';
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
            <span className="card-type">
                {s.def.unplayable ? '저주' : s.def.ultimate ? '궁극기' : TYPE_LABEL[s.def.type]} · <em className={`rar rar-${s.def.rarity}`}>{RARITY_INFO[s.def.rarity].name}</em>
            </span>
            <span className="card-desc">
                {describeCard(card).map((l, i) => (
                    <span key={i}>{l}</span>
                ))}
            </span>
            {footer && <span className="card-footer">{footer}</span>}
        </button>
    );
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
                <span key={k} className={`status ${STATUS_INFO[k].debuff ? 'debuff' : 'buff'} st-${k}`} title={`${STATUS_INFO[k].name}: ${STATUS_INFO[k].desc}`}>
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
