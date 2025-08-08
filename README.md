# Phaser.js RPG + Vite + TypeScript 게임

현대적인 웹 RPG 게임 개발을 위한 Phaser.js, Vite, TypeScript 조합 프로젝트입니다.

## 🚀 기술 스택

- **Phaser.js 3.90.0** - 2D 게임 프레임워크
- **Vite 7.0.6** - 빠른 개발 서버 및 빌드 도구
- **TypeScript 5.9.2** - 타입 안전성
- **Node.js** - 개발 환경

## 📦 설치

```bash
npm install
```

## 🎮 개발 서버 실행

```bash
npm run dev
```

개발 서버가 `http://localhost:5173`에서 실행됩니다.

## 🏗️ 빌드

```bash
npm run build
```

## 👀 미리보기

```bash
npm run preview
```

## 🎯 게임 조작법

- **WASD / 방향키**: 플레이어 이동
- **E키**: NPC와 상호작용
- **I키**: 인벤토리 열기/닫기
- **SPACE**: 대화 진행
- **1키**: 기본 이미지로 변경
- **2키**: 동적 생성 이미지로 변경
- **3키**: NPC 이미지로 변경
- **4키**: 랜덤 색상 이미지로 변경

## 📁 프로젝트 구조

```
game/
├── src/
│   ├── scenes/
│   │   ├── GameScene.ts       # 플랫폼 점프 게임
│   │   └── RPGGameScene.ts    # RPG 게임 씬
│   └── main.ts                # 게임 진입점
├── index.html                 # HTML 템플릿
├── vite.config.ts             # Vite 설정
├── tsconfig.json              # TypeScript 설정
└── package.json               # 프로젝트 의존성
```

## 🔧 주요 기능

- ✅ Hot Module Replacement (HMR)
- ✅ TypeScript 지원
- ✅ Phaser.js 3.90.0 최신 버전
- ✅ 반응형 게임 캔버스
- ✅ FPS 모니터링
- ✅ 개발 모드 디버깅 지원

## 🎨 RPG 게임 특징

### 🗺️ 월드 시스템
- **타일맵 기반 맵**: 초록색 잔디 타일로 구성된 마을
- **장식물**: 나무, 건물 등 환경 요소
- **경계 시스템**: 월드 경계 내에서만 이동 가능

### 👥 NPC 시스템
- **마을장로**: 환영 메시지와 치유 물약 제공
- **상인**: 상점 시스템 (향후 확장 가능)
- **여행자**: 여행 이야기 공유

### 💬 대화 시스템
- **단계별 대화**: SPACE키로 대화 진행
- **NPC별 고유 대화**: 각 NPC마다 다른 대화 내용
- **상호작용 거리**: NPC 근처에서만 대화 가능

### 📦 인벤토리 시스템
- **아이템 관리**: 아이템 수집 및 관리
- **UI 인터페이스**: I키로 인벤토리 열기/닫기
- **아이템 설명**: 각 아이템의 상세 설명

### 📋 퀘스트 시스템
- **퀘스트 목록**: 현재 진행 중인 퀘스트 표시
- **자동 퀘스트**: NPC 대화 시 자동으로 퀘스트 추가
- **UI 표시**: 화면 좌상단에 퀘스트 목록 표시

### 🎮 조작 시스템
- **WASD 이동**: 8방향 이동 지원
- **대각선 이동 정규화**: 일정한 이동 속도 유지
- **상호작용 키**: E키로 NPC와 상호작용

## 🚀 확장 가능한 기능들

### ⚔️ 전투 시스템
```typescript
// 전투 시스템 예시
class CombatSystem {
    attack(target: Enemy) {
        // 공격 로직
    }
    
    useItem(item: InventoryItem) {
        // 아이템 사용 로직
    }
}
```

### 🗺️ 맵 시스템
```typescript
// 타일맵 시스템 예시
this.load.tilemapTiledJSON('map', 'assets/map.json');
this.load.image('tiles', 'assets/tiles.png');
```

### 🎵 사운드 시스템
```typescript
// 배경음악 시스템 예시
this.load.audio('bgm', 'assets/bgm.mp3');
this.sound.play('bgm', { loop: true });
```

### 🎨 애니메이션 시스템
```typescript
// 캐릭터 애니메이션 예시
this.anims.create({
    key: 'walk',
    frames: this.anims.generateFrameNumbers('player'),
    frameRate: 10,
    repeat: -1
});
```

## 🚀 배포

빌드된 파일은 `dist` 폴더에 생성됩니다. 정적 웹 서버에서 호스팅할 수 있습니다.

```bash
npm run build
# dist 폴더의 내용을 웹 서버에 업로드
```

## 📝 라이선스

MIT License

