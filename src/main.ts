import Phaser from 'phaser';
import { RPGGameScene } from './scenes/RPGGameScene.js';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#87CEEB', // 더 예쁜 하늘색
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: [RPGGameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// 게임 인스턴스 생성
const game = new Phaser.Game(config);

// 개발 모드에서 게임 객체를 전역에 노출 (디버깅용)
if (import.meta.env.DEV) {
    (window as any).game = game;
}
