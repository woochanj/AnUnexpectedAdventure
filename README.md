# An Unexpected Adventure

안개 낀 던전을 한 칸씩 밝히며 내려가는 **로그라이크 덱빌딩 카드 게임**입니다. React + TypeScript로 만들었고,
캐릭터·몬스터·이펙트는 모두 [pixelfx](https://github.com/patch-gg/pixelfx)로 코드에서 그립니다.

## 실행

```bash
npm install
```

```bash
npm run dev
```

`http://localhost:5173`에서 열립니다. 빌드는 `npm run build`입니다.

## 게임 방식

- **직업**: 기사(체력 80, 방어·강타·힘, 모습 4종), 마법사(체력 62, 화염·냉기·번개를 제자리에서 원거리로), 도적(체력 68, 독·연속 공격·드로우) 중에서 고릅니다.
- **카드 등급**: 기본 · 일반 · 고급 · 희귀 · 유니크(직업별 전용, 강적·보스·상점에서 드물게). 보상은 내 직업 카드와 공용 카드에서 나옵니다.
- **카드 레벨**: 모닥불·사건에서 강화할 때마다 Lv.1 → Lv.2 → Lv.3. 강화 전에 바뀌는 수치를 보여주고 확인을 받습니다.

- **탐험**: 지도에서 인접한 방으로 이동하면 주변 방이 밝혀집니다. 방향키/WASD 또는 클릭으로 움직입니다.
- **전투**: 매 턴 에너지 3, 카드 5장. 적 머리 위의 말풍선은 다음 행동이니 미리 막아내세요.
  키보드: `1`~`9` 카드, `E`/`Enter` 턴 종료, `Esc` 대상 선택 취소.
- **보상**: 전투 후 카드 3장 중 1장을 덱에 넣고, 강적과 보스는 유물을 줍니다.
- **방 종류**: 적 · 강적 · 사건(?) · 보물 · 모닥불(휴식/강화) · 상인(구매/카드 제거) · 보스.
- 3개 층(잠긴 동굴 → 안개 묘지 → 그림자 성채)의 보스를 모두 쓰러뜨리면 승리합니다.
- 진행 상황은 브라우저에 자동 저장되어 이어할 수 있습니다.

## 구조

```
src/game/      규칙 (화면과 무관한 순수 로직)
  cards.ts     카드 정의(직업·등급·레벨)와 설명 생성
  classes.ts   직업 (체력, 시작 덱, 모습)
  enemies.ts   적, 층 구성
  combat.ts    전투 엔진 (피해, 상태이상, 적 행동, 연출 신호 cue)
  map.ts       미로형 층 생성, 시야
  events.ts    사건 방
  relics.ts    유물
  run.ts       진행 상태 리듀서, 저장/불러오기
public/sprites/ 받은 스프라이트를 정리한 시트 (scripts/pack_sprites.py로 생성)
src/ui/        화면
  Actors.tsx   pixelfx 캔버스: 주인공(포즈 리그) / 생물·장식
  FxCanvas.tsx 전투 이펙트·배경 앰비언트 캔버스, 히트스톱
  vfx.ts       카드/행동 → pixelfx 이펙트 표
  heroActs.ts  카드 → 주인공 몸동작
  creatures.ts 적 모습 → pixelfx 모듈
```

## 크레딧

- 픽셀 이펙트: [pixelfx](https://github.com/patch-gg/pixelfx) (MIT, © Patch, Hugo Duprez 외 — 패키지의 NOTICE 참고)
- 주인공 "방랑 기사": [Hero Knight](https://luizmelo.itch.io/hero-knight) by LuizMelo (CC0)
- 몬스터 해골·고블린·버섯·날아다니는 눈: [Monsters Creatures Fantasy](https://luizmelo.itch.io/monsters-creatures-fantasy) by LuizMelo (CC0)
- 주인공 "마법사": [Wizard Pack](https://luizmelo.itch.io/wizard-pack) by LuizMelo (CC0)
- 주인공 "날랜 검객"(도적): [Martial Hero](https://luizmelo.itch.io/martial-hero) by LuizMelo (CC0)
- 주인공 "붉은/푸른 기사": [Fantasy Knight](https://aamatniekss.itch.io/fantasy-knight-free-pixelart-animated-character) by aamatniekss (게임에 사용 가능, 에셋 단독 재배포 금지)
- 생물 박쥐·슬라임·유령·거미·딱정벌레·벌·물고기·새: [SpritePilot Creatures](https://spritepilot.com/free-game-assets/creatures) (CC0)
- 그 밖의 캐릭터(고양이 기사, 다크 판타지 몬스터)는 이 저장소 코드로 직접 그립니다.
- 글꼴: [갈무리(Galmuri)](https://github.com/quiple/galmuri) (SIL OFL 1.1, © Lee Minseo)
