export interface RelicDef {
    id: string;
    name: string;
    desc: string;
    glyph: string;
}

const LIST: RelicDef[] = [
    { id: 'compass', name: '낡은 나침반', desc: '새 층에 도착하면 지도 전체가 드러난다.', glyph: '🧭' },
    { id: 'lantern', name: '기름 등불', desc: '두 칸 떨어진 방까지 미리 보인다.', glyph: '🏮' },
    { id: 'iron_shield', name: '무쇠 방패', desc: '전투 시작 시 방어도 8.', glyph: '🛡️' },
    { id: 'whetstone', name: '숫돌', desc: '전투 시작 시 힘 1.', glyph: '🪨' },
    { id: 'blood_charm', name: '피 묻은 부적', desc: '전투 승리 후 체력 6 회복.', glyph: '🩸' },
    { id: 'lucky_coin', name: '행운의 동전', desc: '얻는 골드 50% 증가.', glyph: '🪙' },
    { id: 'boots', name: '여행자의 장화', desc: '획득 시 최대 체력 +10.', glyph: '🥾' },
    { id: 'herb_pouch', name: '독초 주머니', desc: '전투 시작 시 모든 적에게 독 3.', glyph: '🌿' },
    { id: 'ember', name: '꺼지지 않는 불씨', desc: '최대 에너지 +1.', glyph: '🔥' },
];

export const RELICS: Record<string, RelicDef> = Object.fromEntries(LIST.map((r) => [r.id, r]));
export const RELIC_IDS = LIST.map((r) => r.id);
/** 보스 보상으로만 나오는 유물 */
export const BOSS_RELICS = ['ember'];
