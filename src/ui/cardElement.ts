// 카드의 속성: 집을 때 모으는 이펙트, 조준 화살표 색, 모으는 소리가 여기에 맞춰진다.
export type Element = 'fire' | 'ice' | 'lightning' | 'poison' | 'arcane' | 'shadow' | 'steel' | 'guard' | 'nature' | 'blood' | 'wind';

const BY_CARD: Record<string, Element> = {
    // 기사
    slash: 'steel', twin_cut: 'steel', sweep: 'steel', heavy_blow: 'steel', cleave_line: 'steel', shield_bash: 'guard',
    guard: 'guard', crouch: 'guard', iron_wall: 'guard', brace: 'guard', oath_blade: 'arcane',
    torch_swing: 'fire', fury: 'blood', blood_strike: 'blood', thorn_stance: 'nature',
    // 마법사
    spark: 'fire', fireball: 'fire', fire_ring: 'fire',
    frost_bolt: 'ice', ice_lance: 'ice', frost_armor: 'ice', blizzard: 'ice',
    chain_lightning: 'lightning', thunder: 'lightning',
    ward: 'arcane', arcane_shield: 'arcane', focus: 'arcane', arcane_missiles: 'arcane', archmage: 'arcane', frenzy: 'arcane',
    // 도적
    stab: 'steel', dagger_throw: 'steel', backstab: 'shadow', blade_storm: 'wind', gale: 'wind', dodge: 'wind', dagger_parry: 'guard', scout: 'wind', sand_throw: 'wind',
    poison_stab: 'poison', venom_dagger: 'poison', poison_fog: 'poison', toxic_bloom: 'poison',
    expose: 'shadow', shadow_step: 'shadow', shadow_dance: 'shadow',
    // 공용
    catch_breath: 'wind', second_wind: 'wind', regrowth: 'nature',
    dread: 'shadow',
    // 연계 카드
    shield_slam: 'guard', chain_strike: 'steel', war_cry: 'blood', counter_stance: 'guard', execution: 'blood', rally: 'guard', rising_slash: 'steel',
    frost_touch: 'ice', shatter: 'ice', glacier: 'ice', ignite: 'fire', combust: 'fire', flame_chain: 'fire', mana_flow: 'arcane', tidal_wave: 'arcane',
    quick_slash: 'wind', finisher: 'wind', venom_burst: 'poison', shred: 'steel', smoke_bomb: 'shadow', assassinate: 'shadow', shadow_chain: 'shadow',
    bandage: 'nature', adrenaline: 'blood', momentum: 'steel',
    titan_strike: 'blood', last_stand: 'guard', meteor: 'fire', absolute_zero: 'ice', thousand_cuts: 'wind', death_mark: 'shadow',
};

export const cardElement = (id: string): Element => BY_CARD[id] ?? 'steel';

export interface Pal {
    hi: string;
    mid: string;
    lo: string;
    ink: string;
    glow: string;
}

export const ELEMENT_PAL: Record<Element, Pal> = {
    fire: { hi: '#fff6c8', mid: '#ffb43c', lo: '#e0481e', ink: '#3a1420', glow: 'rgba(255,130,30,0.9)' },
    ice: { hi: '#ffffff', mid: '#9ae6ff', lo: '#3a8ae0', ink: '#14204a', glow: 'rgba(120,210,255,0.85)' },
    lightning: { hi: '#ffffff', mid: '#fff36a', lo: '#c8a0ff', ink: '#2a1a50', glow: 'rgba(255,240,120,0.9)' },
    poison: { hi: '#f2ffd2', mid: '#92e24c', lo: '#2c9a46', ink: '#10301c', glow: 'rgba(130,230,80,0.8)' },
    arcane: { hi: '#fbeaff', mid: '#c88aff', lo: '#6a3ad8', ink: '#1e1240', glow: 'rgba(190,120,255,0.85)' },
    shadow: { hi: '#d8c8ff', mid: '#7a5ab8', lo: '#3a2468', ink: '#0e0820', glow: 'rgba(110,70,190,0.8)' },
    steel: { hi: '#ffffff', mid: '#d8e4f0', lo: '#7890b0', ink: '#1e1a40', glow: 'rgba(220,235,255,0.75)' },
    guard: { hi: '#fffbe0', mid: '#ffd860', lo: '#4a8ad8', ink: '#1a1a48', glow: 'rgba(255,220,110,0.8)' },
    nature: { hi: '#f4ffd8', mid: '#7ad86a', lo: '#2a8a4a', ink: '#10301c', glow: 'rgba(120,220,110,0.8)' },
    blood: { hi: '#ffd8d0', mid: '#ff5a4a', lo: '#a01a2a', ink: '#2a0a14', glow: 'rgba(255,60,50,0.85)' },
    wind: { hi: '#ffffff', mid: '#c8f4e8', lo: '#6ab8b0', ink: '#14303a', glow: 'rgba(190,250,235,0.7)' },
};
