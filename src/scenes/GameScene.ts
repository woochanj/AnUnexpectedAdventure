import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private score: number = 0;
    private scoreText!: Phaser.GameObjects.Text;
    private fpsText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // 간단한 도형으로 게임 생성
        this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
        this.load.image('platform', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    }

    create() {
        // 배경색 설정
        this.cameras.main.setBackgroundColor('#87CEEB');

        // 플랫폼 생성
        this.platforms = this.physics.add.staticGroup();
        this.platforms.create(400, 568, 'platform').setScale(800, 32).refreshBody();
        this.platforms.create(600, 400, 'platform').setScale(200, 32).refreshBody();
        this.platforms.create(50, 250, 'platform').setScale(200, 32).refreshBody();
        this.platforms.create(750, 220, 'platform').setScale(200, 32).refreshBody();

        // 플레이어 생성
        this.player = this.physics.add.sprite(100, 450, 'player');
        this.player.setScale(2);
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);

        // 플레이어와 플랫폼 충돌 설정
        this.physics.add.collider(this.player, this.platforms);

        // 키보드 입력 설정
        this.cursors = this.input.keyboard!.createCursorKeys();

        // 점수 텍스트
        this.scoreText = this.add.text(16, 16, '점수: 0', { 
            fontSize: '32px', 
            color: '#000' 
        });

        // FPS 텍스트
        this.fpsText = this.add.text(16, 50, 'FPS: 0', { 
            fontSize: '16px', 
            color: '#000' 
        });

        // 게임 설명
        this.add.text(400, 100, 'Phaser.js + Vite + TypeScript', {
            fontSize: '24px',
            color: '#000'
        }).setOrigin(0.5);

        this.add.text(400, 130, '방향키로 이동하세요!', {
            fontSize: '16px',
            color: '#000'
        }).setOrigin(0.5);
    }

    update() {
        // 플레이어 이동
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160);
        } else {
            this.player.setVelocityX(0);
        }

        // 점프
        if (this.cursors.up.isDown && this.player.body?.touching.down) {
            this.player.setVelocityY(-330);
        }

        // 점수 증가
        this.score += 1;
        this.scoreText.setText('점수: ' + this.score);

        // FPS 표시
        const fps = Math.round(this.game.loop.actualFps);
        this.fpsText.setText('FPS: ' + fps);
        
        // HTML의 FPS 표시도 업데이트
        const fpsElement = document.getElementById('fps');
        if (fpsElement) {
            fpsElement.textContent = fps.toString();
        }
    }
}
