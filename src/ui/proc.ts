// 직업 체계 발동 알림: 공명 · 반응 · 투지 폭발.
// 시인성이 먼저: 짧고 큰 글자, 단색 바탕, 원소 색 한 가지. 캐릭터와 적의 몸은 가리지 않는다
// (알림은 주인공 머리 위, 대상 표식은 적 발밑 뒤쪽에).
import type { Fx, SpellElement } from '../game/types';
import { ELEMENT_NAME } from '../game/cards';
import { sfx } from './sfx';

const SHORT: Record<SpellElement, string> = { fire: '화', frost: '냉', lightning: '번', earth: '대' };

function gem(el: SpellElement) {
    const g = document.createElement('span');
    g.className = `proc-gem pg-${el}`;
    g.textContent = SHORT[el];
    return g;
}

function after(ms: number, fn: () => void) {
    if (ms <= 0) fn();
    else window.setTimeout(fn, ms);
}

export function showProc(field: HTMLElement, f: Fx, targetUid: string | null) {
    const p = f.proc;
    if (!p) return;
    const hero = field.querySelector<HTMLElement>('[data-body="player"]');
    if (!hero) return;
    const fr = field.getBoundingClientRect();
    const hr = hero.getBoundingClientRect();

    // ── 알림: 주인공 머리 위 ──
    after(f.delay * 1000, () => {
        const b = document.createElement('div');
        b.className = `proc-banner proc-${p.kind} ${p.el ? `pe-${p.el}` : ''}`;
        const icons = document.createElement('span');
        icons.className = 'proc-icons';
        if (p.kind === 'unleash') {
            const g = document.createElement('span');
            g.className = 'proc-gem pg-grit';
            g.textContent = `${p.n}`;
            icons.appendChild(g);
        } else if (p.kind === 'reaction' && p.from && p.el) {
            icons.append(gem(p.from), Object.assign(document.createElement('i'), { textContent: '▶' }), gem(p.el));
        } else if (p.el) {
            icons.append(gem(p.el), gem(p.el));
        }
        const txt = document.createElement('span');
        txt.className = 'proc-text';
        const title = p.kind === 'unleash' ? '투지 폭발' : p.kind === 'resonance' ? `${ELEMENT_NAME[p.el!]} 공명` : `${ELEMENT_NAME[p.from!]}·${ELEMENT_NAME[p.el!]} 반응`;
        txt.innerHTML = `<b>${title}</b><small>${p.note}</small>`;
        b.append(icons, txt);
        // 주인공 머리 위 가운데, 판 밖으로 나가지 않게
        const cx = hr.left + hr.width / 2 - fr.left;
        b.style.left = `${Math.max(90, Math.min(fr.width - 90, cx))}px`;
        // 몸 상자 위쪽이 판 밖이면(키 큰 캐릭터) 판 안쪽에 둔다
        b.style.top = `${Math.max(64, hr.top - fr.top - 8)}px`;
        field.appendChild(b);
        const a = b.animate(
            [
                { opacity: 0, transform: 'translate(-50%, -60%) scale(0.6)' },
                { opacity: 1, transform: 'translate(-50%, -100%) scale(1.12)', offset: 0.1 },
                { opacity: 1, transform: 'translate(-50%, -100%) scale(1)', offset: 0.18 },
                { opacity: 1, transform: 'translate(-50%, -100%) scale(1)', offset: 0.82 },
                { opacity: 0, transform: 'translate(-50%, -130%) scale(0.96)' },
            ],
            { duration: 1500, easing: 'ease-out', fill: 'both' },
        );
        a.finished.then(() => b.remove()).catch(() => b.remove());
        sfx.proc(p.kind);

        // 투지 폭발: 주인공이 주황빛으로 달아오른다 (몸을 덮지 않는 테두리 빛)
        if (p.kind === 'unleash') {
            const sprite = hero.querySelector<HTMLElement>('canvas');
            sprite?.animate(
                [
                    { filter: 'drop-shadow(0 0 0 rgba(255,140,40,0))' },
                    { filter: 'drop-shadow(0 0 6px rgba(255,150,40,1)) drop-shadow(0 0 2px #fff0c0)', offset: 0.3 },
                    { filter: 'drop-shadow(0 0 6px rgba(255,150,40,1)) drop-shadow(0 0 2px #fff0c0)', offset: 0.8 },
                    { filter: 'drop-shadow(0 0 0 rgba(255,140,40,0))' },
                ],
                { duration: Math.max(600, (p.impact - f.delay) * 1000 + 300), composite: 'add' },
            );
        }
    });

    // ── 대상 표식: 맞는 순간 적 발밑에 원소 색 고리 (몸 뒤에) ──
    const targets = p.all
        ? Array.from(field.querySelectorAll<HTMLElement>('[data-alive="1"] [data-body]'))
        : targetUid
          ? [field.querySelector<HTMLElement>(`[data-body="${targetUid}"]`)].filter((x): x is HTMLElement => !!x)
          : [];
    if (p.kind === 'reaction' && p.el === 'earth') return; // 대지 반응은 내 방어도: 적 표식 없음
    if (p.kind === 'reaction' && p.el === 'lightning') return; // 번개 반응은 카드 뽑기
    after(p.impact * 1000, () => {
        for (const t of targets) {
            const r = t.getBoundingClientRect();
            const ring = document.createElement('div');
            ring.className = `proc-ring ${p.kind === 'unleash' ? 'pr-grit' : `pr-${p.el}`}`;
            ring.style.left = `${r.left + r.width / 2 - fr.left}px`;
            ring.style.top = `${r.bottom - fr.top - 6}px`;
            field.appendChild(ring);
            const a = ring.animate(
                [
                    { opacity: 0.95, transform: 'translate(-50%, -50%) scale(0.3, 0.12)' },
                    { opacity: 0.85, transform: 'translate(-50%, -50%) scale(1, 0.32)', offset: 0.35 },
                    { opacity: 0, transform: 'translate(-50%, -50%) scale(1.5, 0.45)' },
                ],
                { duration: 650, easing: 'ease-out', fill: 'both' },
            );
            a.finished.then(() => ring.remove()).catch(() => ring.remove());
        }
    });
}
