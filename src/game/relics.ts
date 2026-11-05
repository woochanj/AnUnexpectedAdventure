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
    // 보스 유물: 에너지 +1에는 대가가 따른다
    { id: 'ember', name: '꺼지지 않는 불씨', desc: '최대 에너지 +1. 얻을 때 최대 체력 -10.', glyph: '🔥' },
    { id: 'cursed_crown', name: '저주받은 왕관', desc: '최대 에너지 +1. 전투 보상 카드가 2장만 나온다.', glyph: '👑' },
    { id: 'rusty_hourglass', name: '녹슨 모래시계', desc: '최대 에너지 +1. 전투 첫 턴에 카드를 2장 덜 뽑는다.', glyph: '⏳' },
    { id: 'blood_chalice', name: '피의 성배', desc: '최대 에너지 +1. 모닥불에서 쉬어도 회복하지 않는다.', glyph: '🏆' },
    { id: 'war_banner', name: '전쟁 깃발', desc: '전투 시작 시 힘 2.', glyph: '🚩' },
    { id: 'sage_tome', name: '현자의 책', desc: '매 턴 카드를 1장 더 뽑는다.', glyph: '📖' },
    { id: 'phoenix_feather', name: '불사조 깃털', desc: '한 번, 쓰러질 때 체력 절반으로 되살아난다. (쓰면 사라짐)', glyph: '🪶' },
    // 사건 전용
    { id: 'mana_spring', name: '샘의 축복', desc: '최대 에너지 +1.', glyph: '💧' },
];

export const RELICS: Record<string, RelicDef> = Object.fromEntries(LIST.map((r) => [r.id, r]));
/** 보스 보상으로만 나오는 유물 (셋 중 하나를 고른다) */
export const BOSS_RELICS = ['ember', 'cursed_crown', 'rusty_hourglass', 'blood_chalice', 'war_banner', 'sage_tome', 'phoenix_feather'];
/** 사건으로만 얻는 유물 */
export const EVENT_RELICS = ['mana_spring'];
/** 일반 보물·정예·상점에서 나오는 유물 */
export const RELIC_IDS = LIST.map((r) => r.id).filter((id) => !EVENT_RELICS.includes(id));
/** 최대 에너지를 1씩 올리는 유물 */
export const ENERGY_RELICS = ['ember', 'cursed_crown', 'rusty_hourglass', 'blood_chalice', 'mana_spring'];
