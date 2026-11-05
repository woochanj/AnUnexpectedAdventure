// 탐험 여행의 지역. 새 탐험마다 이 중 FLOOR_COUNT곳을 무작위 순서로 지난다.
// 적의 세기는 몇 번째 지역인지(층)에 따라 정해지고, 지역은 풍경·이름·분위기를 정한다.

export interface Biome {
    id: string;
    name: string;
    subtitle: string;
    /** 지역을 떠날 때 보여줄 한 줄 */
    farewell: string;
}

export const BIOMES: Biome[] = [
    { id: 'cave', name: '잠긴 동굴', subtitle: '물에 잠긴 동굴, 빛이 물결 따라 일렁인다', farewell: '물빛이 등 뒤로 멀어진다.' },
    { id: 'graveyard', name: '안개 묘지', subtitle: '이름 모를 묘비들 사이로 안개가 흐른다', farewell: '안개 너머로 달이 진다.' },
    { id: 'castle', name: '노을 성채', subtitle: '노을에 물든 첨탑, 오래된 왕국의 흔적', farewell: '성문이 등 뒤에서 닫힌다.' },
    { id: 'forest', name: '버섯 숲', subtitle: '집채만 한 버섯 아래로 반딧불이 떠다닌다', farewell: '숲의 노랫소리가 잦아든다.' },
    { id: 'ruins', name: '사막 유적', subtitle: '모래에 반쯤 묻힌 기둥들이 길을 가리킨다', farewell: '모래바람이 발자국을 지운다.' },
    { id: 'ice', name: '얼음 협곡', subtitle: '하늘에 오로라가 흐르는 얼어붙은 골짜기', farewell: '입김이 하얗게 흩어진다.' },
];

export const BIOME = Object.fromEntries(BIOMES.map((b) => [b.id, b])) as Record<string, Biome>;

/** 이번 탐험에서 지날 지역 순서 */
export function pickRoute(n: number): string[] {
    const ids = BIOMES.map((b) => b.id);
    for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids.slice(0, n);
}

/** 예전 저장(경로 없음)과의 호환 */
const LEGACY = ['cave', 'graveyard', 'castle'];
export function regionOf(run: { route?: string[]; floor: number }, floor = run.floor): Biome {
    return BIOME[run.route?.[floor] ?? LEGACY[floor] ?? 'cave'];
}
