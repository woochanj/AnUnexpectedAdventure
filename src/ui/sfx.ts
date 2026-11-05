// 효과음: 파일 없이 Web Audio로 합성한다 (짧은 칩튠 풍).
// 브라우저 정책상 첫 사용자 입력 뒤에 소리가 난다.

type Wave = OscillatorType;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
const KEY = 'aua-sound';

export function soundOn(): boolean {
    try {
        return localStorage.getItem(KEY) !== 'off';
    } catch {
        return true;
    }
}
export function setSound(on: boolean) {
    try {
        localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {
        /* 무시 */
    }
}

function ac(): AudioContext | null {
    if (!soundOn()) return null;
    if (!ctx) {
        const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!C) return null;
        ctx = new C();
        master = ctx.createGain();
        master.gain.value = 0.35;
        master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
}

/** 음 하나: 주파수가 f0 → f1로 미끄러지고 짧게 사라진다 */
function tone(f0: number, f1: number, dur: number, wave: Wave = 'square', vol = 0.3, at = 0) {
    const c = ac();
    if (!c || !master) return;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
}

/** 잡음: 타격/바람 소리. 필터 주파수로 음색을 바꾼다 */
function noise(dur: number, freq: number, vol = 0.3, at = 0, type: BiquadFilterType = 'lowpass', sweepTo?: number) {
    const c = ac();
    if (!c || !master || !noiseBuf) return;
    const t = c.currentTime + at;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
}

export const sfx = {
    /** 강한 기술: 기를 모으는 상승음 */
    chargeUp(el: string) {
        const base = el === 'fire' ? 140 : el === 'ice' ? 520 : el === 'lightning' ? 220 : el === 'shadow' ? 90 : 180;
        tone(base, base * 4, 0.6, 'sawtooth', 0.05);
        tone(base * 1.5, base * 6, 0.6, 'triangle', 0.04, 0.05);
        noise(0.6, 400, 0.08, 0, 'bandpass', 3200);
    },
    /** 카드를 집어 기운을 모을 때 (속성별) */
    charge(el: string) {
        switch (el) {
            case 'fire':
                noise(0.35, 500, 0.16, 0, 'lowpass', 2400);
                tone(110, 220, 0.3, 'sawtooth', 0.04);
                break;
            case 'ice':
                [1600, 2100, 2600].forEach((f, i) => tone(f, f * 1.02, 0.12, 'triangle', 0.04, i * 0.05));
                noise(0.25, 6000, 0.05, 0, 'highpass');
                break;
            case 'lightning':
                noise(0.08, 3000, 0.14, 0, 'bandpass');
                noise(0.06, 3500, 0.12, 0.09, 'bandpass');
                tone(80, 160, 0.25, 'square', 0.04);
                break;
            case 'poison':
                [0, 0.08, 0.17].forEach((d) => tone(220 + Math.random() * 80, 420, 0.07, 'sine', 0.07, d));
                break;
            case 'arcane':
            case 'shadow':
                tone(el === 'arcane' ? 440 : 160, el === 'arcane' ? 880 : 240, 0.35, 'triangle', 0.06);
                tone(el === 'arcane' ? 660 : 120, el === 'arcane' ? 1320 : 180, 0.35, 'sine', 0.04, 0.04);
                break;
            case 'guard':
                tone(520, 780, 0.18, 'triangle', 0.06);
                break;
            case 'wind':
                noise(0.3, 900, 0.12, 0, 'bandpass', 2600);
                break;
            default:
                // 칼을 뽑는 소리
                noise(0.18, 3500, 0.1, 0, 'highpass');
                tone(1800, 2400, 0.12, 'triangle', 0.04, 0.02);
        }
    },
    /** 카드를 집거나 낼 때 */
    card() {
        noise(0.12, 2400, 0.12, 0, 'bandpass', 5200);
        tone(520, 760, 0.07, 'triangle', 0.08);
    },
    select() {
        tone(660, 880, 0.05, 'square', 0.05);
    },
    /** 칼 휘두르는 소리 */
    swing() {
        noise(0.16, 1800, 0.22, 0, 'bandpass', 600);
    },
    /** 주문 시전 */
    cast() {
        tone(300, 900, 0.22, 'sawtooth', 0.07);
        tone(450, 1350, 0.22, 'triangle', 0.06, 0.03);
    },
    /** 맞는 소리: 피해가 클수록 낮고 묵직하게 */
    hit(dmg: number, at = 0) {
        const heavy = Math.min(1, dmg / 20);
        noise(0.12 + heavy * 0.1, 900 - heavy * 500, 0.35 + heavy * 0.15, at);
        tone(180 - heavy * 90, 50, 0.14 + heavy * 0.1, 'square', 0.18, at);
    },
    crit(at = 0) {
        noise(0.25, 700, 0.45, at);
        tone(140, 40, 0.3, 'square', 0.22, at);
        tone(1200, 1800, 0.12, 'square', 0.08, at + 0.04);
        tone(1800, 2400, 0.16, 'square', 0.06, at + 0.1);
    },
    /** 받는 피해 (주인공) */
    hurt(at = 0) {
        noise(0.16, 600, 0.35, at);
        tone(240, 90, 0.18, 'sawtooth', 0.12, at);
    },
    block(at = 0) {
        tone(1400, 1100, 0.08, 'square', 0.08, at);
        tone(2100, 1600, 0.12, 'triangle', 0.07, at + 0.02);
        noise(0.06, 4000, 0.08, at, 'highpass');
    },
    heal(at = 0) {
        [660, 880, 1100].forEach((f, i) => tone(f, f * 1.01, 0.18, 'triangle', 0.07, at + i * 0.06));
    },
    poison(at = 0) {
        [0, 0.07, 0.14].forEach((d) => tone(300 + Math.random() * 120, 160, 0.09, 'sine', 0.1, at + d));
    },
    buff(at = 0) {
        tone(330, 660, 0.2, 'square', 0.07, at);
        tone(495, 990, 0.2, 'square', 0.05, at + 0.05);
    },
    debuff(at = 0) {
        tone(500, 200, 0.25, 'sawtooth', 0.07, at);
    },
    death(at = 0) {
        noise(0.4, 1200, 0.25, at, 'lowpass', 200);
        tone(400, 60, 0.4, 'triangle', 0.12, at);
    },
    coin() {
        tone(988, 988, 0.06, 'square', 0.07);
        tone(1319, 1319, 0.2, 'square', 0.07, 0.06);
    },
    victory() {
        [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.16, 'square', 0.08, i * 0.1));
    },
    defeat() {
        [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.22, 'triangle', 0.1, i * 0.16));
    },
    step() {
        noise(0.05, 500, 0.08);
    },
    /** 직업 체계 발동: 공명은 맑게 두 번, 반응은 위로 쓸어 올리고, 투지 폭발은 묵직하게 */
    proc(kind: 'resonance' | 'reaction' | 'unleash') {
        if (kind === 'resonance') [880, 1320].forEach((f, i) => tone(f, f, 0.1, 'triangle', 0.08, i * 0.07));
        else if (kind === 'reaction') tone(520, 1560, 0.22, 'square', 0.06);
        else {
            tone(140, 60, 0.3, 'sawtooth', 0.14);
            noise(0.25, 900, 0.14);
        }
    },
    /** 강화 망치질: 쇠가 부딪는 소리 */
    forge() {
        noise(0.08, 3200, 0.16, 0, 'bandpass');
        tone(1480, 1100, 0.09, 'square', 0.05);
        tone(220, 140, 0.12, 'triangle', 0.12);
    },
    upgrade() {
        [523, 784, 1047, 1568].forEach((f, i) => tone(f, f, 0.12, 'square', 0.06, i * 0.06));
    },
};
