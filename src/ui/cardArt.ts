import { clearFrame, composite, createFrame, createFx, type FxModule } from 'pixelfx';
import { CARD_VFX } from './vfx';
import { cleanOpts } from './creatures';

const cache = new Map<string, string | null>();

/** 이펙트의 가장 화려한 한 장면을 잘라 data URL로 (key마다 한 번만 계산) */
export function stillOf(key: string, mod: FxModule, opts: Record<string, unknown> = {}): string | null {
    if (cache.has(key)) return cache.get(key)!;
    const url = render(mod, opts);
    cache.set(key, url);
    return url;
}

/**
 * 카드 일러스트: 그 카드의 pixelfx 이펙트를 몇 시점 렌더링해 가장 화려한 장면을 고르고,
 * 그려진 영역만 잘라 PNG data URL로 만든다. 카드 종류마다 한 번만 계산한다.
 */
export function cardArt(cardId: string): string | null {
    const spec = CARD_VFX[cardId]?.[0];
    if (!spec) return null;
    return stillOf(`card:${cardId}`, spec.mod, spec.opts);
}

function render(mod: FxModule, opts: Record<string, unknown>): string | null {
    if (typeof document === 'undefined') return null;
    const [w, h] = mod.meta.size;
    const [ox, oy] = mod.meta.origin;
    const dur = Math.min(mod.meta.duration ?? 1, 2.5);
    const frame = createFrame(w, h);
    const rgba = new Uint8ClampedArray(w * h * 4);

    let best: Uint8ClampedArray | null = null;
    let bestScore = -1;
    const samples = 10;
    const fx = createFx(mod, { ...cleanOpts(opts), flip: false, seed: 7, x: ox, y: oy });
    let t = 0;
    for (let i = 1; i <= samples; i++) {
        const target = (dur * 0.85 * i) / samples;
        fx.update(target - t);
        t = target;
        clearFrame(frame);
        fx.draw(frame);
        composite(frame, rgba, null);
        let score = 0;
        for (let p = 3; p < rgba.length; p += 4) if (rgba[p] > 40) score++;
        if (score > bestScore) {
            bestScore = score;
            best = rgba.slice();
        }
    }
    if (!best || bestScore < 10) return null;

    // 그려진 부분만 잘라낸다
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
            if (best[(y * w + x) * 4 + 3] > 24) {
                if (x < x0) x0 = x;
                if (y < y0) y0 = y;
                if (x > x1) x1 = x;
                if (y > y1) y1 = y;
            }
    const cw = x1 - x0 + 1;
    const ch = y1 - y0 + 1;
    const cv = document.createElement('canvas');
    cv.width = cw;
    cv.height = ch;
    const ctx = cv.getContext('2d')!;
    const img = new ImageData(cw, ch);
    for (let y = 0; y < ch; y++) img.data.set(best.subarray(((y + y0) * w + x0) * 4, ((y + y0) * w + x0 + cw) * 4), y * cw * 4);
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL();
}
