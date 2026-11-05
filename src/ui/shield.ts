// 기사의 방패: 받은 캐릭터 그림에는 방패가 없어서, 방패 기술을 쓸 때 도트 방패를 손에 들려 준다.
// 몸(data-body) 안에 붙이므로 돌진·도약 같은 몸동작을 그대로 따라간다.

// k 테두리, l 밝은 쇠, s 어두운 쇠, b 파랑, d 진한 파랑, g 금, w 반짝임
const ROWS = [
    'kkkkkkkkkkkk',
    'kwlllllllllk',
    'klbbbbbbbbsk',
    'klbbbggbbdsk',
    'klbbbggbbdsk',
    'klggggggggsk',
    'klggggggggsk',
    'klbbbggbbdsk',
    'klbbbggbbdsk',
    '.klbbggbdsk.',
    '.klbbbbbdsk.',
    '..klbbbdsk..',
    '...klbdsk...',
    '....klsk....',
    '.....kk.....',
];
const PAL: Record<string, string> = { k: '#120c1c', l: '#e8ecf4', s: '#7a8296', b: '#3a7ae0', d: '#1e4a9a', g: '#ffd84a', w: '#ffffff' };

let url: string | null = null;
function shieldUrl(): string {
    if (url) return url;
    const rects: string[] = [];
    ROWS.forEach((row, y) => [...row].forEach((ch, x) => PAL[ch] && rects.push(`<rect x='${x}' y='${y}' width='1' height='1' fill='${PAL[ch]}'/>`)));
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 15' shape-rendering='crispEdges'>${rects.join('')}</svg>`;
    url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
    return url;
}

/**
 * 방패를 들어 올렸다가(startMs) 맞는 순간(hitMs) 앞으로 내밀어 치고, endMs에 내린다.
 * guard: 제자리에서 앞을 막는 자세 (반격 태세)
 */
export function spawnShield(hero: HTMLElement, startMs: number, hitMs: number, endMs: number, guard = false) {
    const el = document.createElement('div');
    el.className = 'knight-shield';
    el.style.backgroundImage = shieldUrl();
    if (getComputedStyle(hero).position === 'static') hero.style.position = 'relative';
    hero.appendChild(el);
    const total = Math.max(endMs, hitMs + 200);
    const at = (ms: number) => Math.min(1, Math.max(0, (ms - startMs) / (total - startMs)));
    const up = at(startMs + 140);
    const pre = at(hitMs - 60);
    const hit = at(hitMs);
    const back = at(hitMs + 160);
    const frames: Keyframe[] = guard
        ? [
              { opacity: 0, transform: 'translate(-10px, 10px) rotate(-20deg) scale(0.7)', offset: 0 },
              { opacity: 1, transform: 'translate(0, 0) rotate(-4deg) scale(1)', offset: up },
              { opacity: 1, transform: 'translate(4px, 0) rotate(0deg) scale(1.1)', filter: 'brightness(2)', offset: Math.min(0.95, Math.max(up, hit)) },
              { opacity: 1, transform: 'translate(2px, 0) rotate(-2deg) scale(1)', filter: 'none', offset: Math.min(0.97, Math.max(up, back)) },
              { opacity: 0, transform: 'translate(-6px, 6px) rotate(-14deg) scale(0.85)', offset: 1 },
          ]
        : [
              { opacity: 0, transform: 'translate(-12px, 12px) rotate(-30deg) scale(0.7)', offset: 0 },
              { opacity: 1, transform: 'translate(0, 0) rotate(-8deg) scale(1)', offset: up },
              { opacity: 1, transform: 'translate(-6px, 0) rotate(-12deg) scale(1)', offset: Math.max(up, pre) },
              // 내밀어 친다: 앞으로 쑥, 번쩍
              { opacity: 1, transform: 'translate(18px, -2px) rotate(6deg) scale(1.2)', filter: 'brightness(2.4)', offset: Math.max(up, hit) },
              { opacity: 1, transform: 'translate(8px, 0) rotate(0deg) scale(1.05)', filter: 'none', offset: Math.min(0.97, Math.max(up, back)) },
              { opacity: 0, transform: 'translate(-8px, 8px) rotate(-18deg) scale(0.85)', offset: 1 },
          ];
    const a = el.animate(frames, { duration: total - startMs, delay: startMs, fill: 'both', easing: 'linear' });
    a.finished.then(() => el.remove()).catch(() => el.remove());
}
