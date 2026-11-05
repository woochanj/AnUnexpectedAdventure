// 잔상: 빠르게 움직이는 캐릭터의 지금 모습을 일정 간격으로 찍어, 바람빛으로 물들여 흩어지게 한다.
export function spawnAfterimages(field: HTMLElement, body: HTMLElement, startIn: number, duration: number, tint = 'cyan') {
    const every = 45;
    const start = performance.now() + Math.max(0, startIn);
    const end = start + duration;
    const filter =
        tint === 'cyan'
            ? 'brightness(0) invert(1) sepia(1) saturate(6) hue-rotate(130deg) brightness(1.1)'
            : tint === 'gold'
              ? 'brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(5deg) brightness(1.05)'
              : 'brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(230deg)';
    let timer = 0;
    const snap = () => {
        const now = performance.now();
        if (now > end) return;
        const src = body.querySelector<HTMLCanvasElement>('canvas');
        if (src && src.width) {
            const box = field.getBoundingClientRect();
            const r = src.getBoundingClientRect();
            const cv = document.createElement('canvas');
            cv.width = src.width;
            cv.height = src.height;
            cv.getContext('2d')!.drawImage(src, 0, 0);
            cv.className = 'afterimage';
            Object.assign(cv.style, {
                position: 'absolute',
                left: `${r.left - box.left}px`,
                top: `${r.top - box.top}px`,
                width: `${r.width}px`,
                height: `${r.height}px`,
                // 뒤집힌 그림은 지금 transform의 좌우만 따른다 (위치는 이미 r에 들어 있음)
                transform: src.style.transform.includes('scaleX(-1)') ? 'scaleX(-1)' : '',
                filter,
                imageRendering: 'pixelated',
                pointerEvents: 'none',
                zIndex: '3',
                mixBlendMode: 'screen',
            });
            field.appendChild(cv);
            const a = cv.animate([{ opacity: 0.75 }, { opacity: 0 }], { duration: 320, easing: 'steps(4, end)', fill: 'forwards' });
            a.finished.then(() => cv.remove()).catch(() => cv.remove());
        }
        timer = window.setTimeout(snap, every);
    };
    window.setTimeout(snap, Math.max(0, startIn));
    return () => clearTimeout(timer);
}
