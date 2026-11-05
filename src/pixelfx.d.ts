// pixelfx는 순수 JS 라이브러리라 쓰는 부분만 타입을 선언한다.
declare module 'pixelfx' {
    export interface Frame {
        w: number;
        h: number;
        ox: number;
        oy: number;
        color: Uint32Array;
        light: Uint32Array;
    }
    export interface FxMeta {
        name: string;
        size: [number, number];
        origin: [number, number];
        duration?: number;
        loop?: boolean;
    }
    export interface FxModule {
        meta: FxMeta;
        act?: { poses?: [number, Record<string, unknown>, string?][]; hits?: { t: number }[] };
        create?: (opts: Record<string, unknown>) => unknown;
    }
    export interface ActInstance {
        readonly t: number;
        readonly frozen: boolean;
        update(dt: number): void;
        draw(frame: Frame, o?: { body?: boolean; target?: boolean }): void;
        done(): boolean;
    }
    export function createAct(mod: FxModule, o?: FxOptions): ActInstance;
    export function actSpan(mod: FxModule): { from: number; to: number };
    export const READY: Record<string, unknown>;
    export const DUMMY_PAL: Record<string, string>;
    export interface FxInstance {
        readonly t: number;
        meta: FxMeta;
        update(dt: number): void;
        draw(frame: Frame, layer?: 'back' | 'front'): void;
        stop(): void;
        done(): boolean;
    }
    export interface FxOptions {
        x?: number;
        y?: number;
        flip?: boolean;
        angle?: number;
        seed?: number;
        palette?: string[];
        light?: number;
        [key: string]: unknown;
    }
    export function createFrame(w: number, h: number, ox?: number, oy?: number): Frame;
    export function clearFrame(f: Frame): Frame;
    export function createFx(mod: FxModule, o?: FxOptions): FxInstance;
    export function composite(f: Frame, out: Uint8ClampedArray, bg?: number | Uint32Array | null, lightK?: number): Uint8ClampedArray;
}

declare module 'pixelfx/fx/*' {
    export const meta: import('pixelfx').FxMeta;
}
