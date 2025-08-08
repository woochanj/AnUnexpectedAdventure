import Phaser from 'phaser';

interface NPC {
    sprite: Phaser.GameObjects.Sprite;
    name: string;
    dialogue: string[];
    currentDialogue: number;
}

interface InventoryItem {
    name: string;
    description: string;
    icon: string;
}

export class RPGGameScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys!: any;
    private npcs: NPC[] = [];
    private dialogueBox!: Phaser.GameObjects.Container;
    private isInDialogue: boolean = false;
    private currentNPC: NPC | null = null;
    private inventory: InventoryItem[] = [];
    private inventoryUI!: Phaser.GameObjects.Container;
    private showInventory: boolean = false;
    private quests: string[] = [];
    private questUI!: Phaser.GameObjects.Container;
    
    // 모바일 터치 지원을 위한 변수들
    private joystick!: Phaser.GameObjects.Container;
    private joystickBase!: Phaser.GameObjects.Graphics;
    private joystickThumb!: Phaser.GameObjects.Graphics;
    private joystickActive: boolean = false;
    private touchCurrentPos: { x: number, y: number } = { x: 0, y: 0 };
    private isMobile: boolean = false;
    
    // 애니메이션 관련 변수들
    private isMoving: boolean = false;
    private animationFrame: number = 0;
    private animationTimer: number = 0;
    private animationSpeed: number = 60; // 애니메이션 속도 (ms) - 더 빠르고 부드럽게
    private lastDirection: string = 'down'; // 이전 방향 추적

    constructor() {
        super({ key: 'RPGGameScene' });
    }

    preload() {
        // 스프라이트시트를 프레임별로 분할해서 로드
        this.load.spritesheet('player', 'assets/PIPOYA FREE RPG Character Sprites 32x32/Male/Male 01-1.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
        this.load.spritesheet('player2', 'assets/PIPOYA FREE RPG Character Sprites 32x32/Male/Male 02-1.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
        this.load.spritesheet('player3', 'assets/PIPOYA FREE RPG Character Sprites 32x32/Male/Male 03-1.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
        this.load.spritesheet('player4', 'assets/PIPOYA FREE RPG Character Sprites 32x32/Male/Male 04-1.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
        this.load.spritesheet('female1', 'assets/PIPOYA FREE RPG Character Sprites 32x32/Female/Female 01-1.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
        this.load.spritesheet('female2', 'assets/PIPOYA FREE RPG Character Sprites 32x32/Female/Female 02-1.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
        
        // NPC 이미지들 - 스프라이트시트로 로드
        this.load.spritesheet('npc1', 'assets/PIPOYA FREE RPG Character Sprites 32x32/Male/Male 05-1.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
        this.load.spritesheet('npc2', 'assets/PIPOYA FREE RPG Character Sprites 32x32/Female/Female 03-1.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
        this.load.spritesheet('npc3', 'assets/PIPOYA FREE RPG Character Sprites 32x32/Male/Male 06-1.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
        this.load.spritesheet('npc4', 'assets/PIPOYA FREE RPG Character Sprites 32x32/Female/Female 04-1.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
        this.load.spritesheet('npc5', 'assets/PIPOYA FREE RPG Character Sprites 32x32/Male/Male 07-1.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
        this.load.spritesheet('npc6', 'assets/PIPOYA FREE RPG Character Sprites 32x32/Female/Female 05-1.png', { 
            frameWidth: 32, 
            frameHeight: 32 
        });
    }

    create() {
        // 모바일 디바이스 감지 (더 정확한 방법)
        this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 배경색 설정 (더 예쁜 하늘색)
        this.cameras.main.setBackgroundColor('#87CEEB');

        // 맵 생성 (더 예쁜 배경)
        this.createMap();
        
        // 플레이어 생성 - 첫 번째 프레임 사용 (인덱스 0)
        this.player = this.physics.add.sprite(400, 300, 'player');
        this.player.setFrame(0); // 첫 번째 프레임 사용
        this.player.setScale(1.5); // 스케일을 1.5로 조정
        this.player.setCollideWorldBounds(true);

        // NPC들 생성
        this.createNPCs();

        // 입력 설정
        this.setupInput();

        // UI 생성
        this.createUI();
        
        // 모바일 조이스틱 생성
        if (this.isMobile) {
            this.createMobileControls();
        }

        // 충돌 설정
        this.setupCollisions();

        // 초기 퀘스트 추가
        this.addQuest('마을 사람들과 대화하세요');
        this.addQuest('인벤토리를 확인하세요 (I키)');
    }

    private createMap() {
        // 더 예쁜 배경 생성
        const colors = [0x90EE90, 0x98FB98, 0x8FBC8F, 0x9ACD32, 0x7CFC00];
        
        for (let x = 0; x < 800; x += 32) {
            for (let y = 0; y < 600; y += 32) {
                // 랜덤한 색상으로 자연스러운 잔디 효과
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                this.add.rectangle(x + 16, y + 16, 32, 32, randomColor);
                
                // 가끔 작은 꽃이나 장식 추가
                if (Math.random() < 0.05) {
                    this.add.circle(x + 16, y + 16, 2, 0xFF69B4); // 분홍색 꽃
                }
                if (Math.random() < 0.03) {
                    this.add.circle(x + 16, y + 16, 1, 0xFFFF00); // 노란색 꽃
                }
            }
        }

        // 장식물 추가 (더 예쁘게) - placeholder 대신 도형 사용
        this.add.circle(100, 100, 20, 0x8B4513).setScale(1.5); // 나무 대신 원형
        this.add.circle(700, 150, 20, 0x8B4513).setScale(1.5);
        this.add.circle(200, 500, 20, 0x8B4513).setScale(1.5);
        
        // 추가 장식물들
        this.add.circle(150, 80, 8, 0x87CEEB); // 하늘색 구름
        this.add.circle(160, 85, 6, 0x87CEEB);
        this.add.circle(170, 80, 7, 0x87CEEB);
        
        // 작은 연못
        this.add.ellipse(650, 450, 60, 40, 0x4682B4);
        this.add.ellipse(650, 450, 50, 30, 0x5F9EA0);
        
        // 돌들
        this.add.circle(300, 200, 4, 0x696969);
        this.add.circle(320, 210, 3, 0x696969);
        this.add.circle(310, 195, 2, 0x696969);
    }

    private createNPCs() {
        const npcData = [
            { x: 200, y: 200, name: '마을장로', dialogue: ['안녕하세요, 용사님!', '마을에 온 것을 환영합니다.', '도움이 필요하시면 언제든 말씀해주세요.'], image: 'npc1' },
            { x: 600, y: 400, name: '상인', dialogue: ['좋은 물건 많이 있습니다!', '특별한 아이템도 있으니 확인해보세요.', '다음에 또 들러주세요!'], image: 'npc2' },
            { x: 300, y: 500, name: '여행자', dialogue: ['먼 곳에서 왔습니다.', '이 마을은 정말 평화로워 보이네요.', '여행 중에 좋은 이야기들을 많이 들었습니다.'], image: 'npc3' }
        ];

        npcData.forEach(data => {
            const npcSprite = this.physics.add.sprite(data.x, data.y, data.image);
            npcSprite.setFrame(0); // 첫 번째 프레임 사용
            npcSprite.setScale(1.0); // 스케일을 1.0으로 변경
            npcSprite.setInteractive();

            const npc: NPC = {
                sprite: npcSprite,
                name: data.name,
                dialogue: data.dialogue,
                currentDialogue: 0
            };

            this.npcs.push(npc);

            // NPC 이름 표시
            this.add.text(data.x, data.y - 40, data.name, {
                fontSize: '16px',
                color: '#fff',
                backgroundColor: '#000',
                padding: { x: 4, y: 2 }
            }).setOrigin(0.5);
        });
    }

    private setupInput() {
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.wasdKeys = this.input.keyboard!.addKeys('W,A,S,D');

        // I키로 인벤토리 토글
        this.input.keyboard!.on('keydown-I', () => {
            this.toggleInventory();
        });

        // E키로 상호작용
        this.input.keyboard!.on('keydown-E', () => {
            this.interactWithNPC();
        });

        // 스페이스바로 대화 진행
        this.input.keyboard!.on('keydown-SPACE', () => {
            this.nextDialogue();
        });

        // 이미지 변경 키들
        this.input.keyboard!.on('keydown-ONE', () => {
            this.changePlayerImage('player'); // 기본 이미지
        });
        
        this.input.keyboard!.on('keydown-TWO', () => {
            this.changePlayerImage('player2'); // 두 번째 캐릭터
        });
        
        this.input.keyboard!.on('keydown-THREE', () => {
            this.changePlayerImage('player3'); // 세 번째 캐릭터
        });
        
        this.input.keyboard!.on('keydown-FOUR', () => {
            this.changePlayerImage('player4'); // 네 번째 캐릭터
        });
        
        this.input.keyboard!.on('keydown-FIVE', () => {
            this.changePlayerImage('female1'); // 여성 캐릭터 1
        });
        
        this.input.keyboard!.on('keydown-SIX', () => {
            this.changePlayerImage('female2'); // 여성 캐릭터 2
        });
        
        // R키로 랜덤 이미지 생성
        this.input.keyboard!.on('keydown-R', () => {
            this.createRandomPlayerImage();
        });

        // 모바일 터치 이벤트 설정
        if (this.isMobile) {
            this.setupTouchEvents();
        }
    }

    private setupTouchEvents() {
        // 터치 시작
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.touchCurrentPos = { x: pointer.x, y: pointer.y };
            
            // 조이스틱 영역 확인
            const joystickBounds = this.joystick.getBounds();
            if (Phaser.Geom.Rectangle.Contains(joystickBounds, pointer.x, pointer.y)) {
                this.joystickActive = true;
            }
        });

        // 터치 이동
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.joystickActive) {
                this.touchCurrentPos = { x: pointer.x, y: pointer.y };
                this.updateJoystick();
            }
        });

        // 터치 종료
        this.input.on('pointerup', () => {
            this.joystickActive = false;
            this.resetJoystick();
        });

        // 더블 탭으로 상호작용
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // 조이스틱 영역이 아닌 곳에서 더블 탭
            const joystickBounds = this.joystick.getBounds();
            if (!Phaser.Geom.Rectangle.Contains(joystickBounds, pointer.x, pointer.y)) {
                // 탭 위치에서 가장 가까운 NPC 찾기
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                let closestNPC: NPC | null = null;
                let minDistance = Infinity;

                this.npcs.forEach(npc => {
                    const distance = Phaser.Math.Distance.Between(
                        worldPoint.x, worldPoint.y,
                        npc.sprite.x, npc.sprite.y
                    );
                    if (distance < minDistance && distance < 50) {
                        minDistance = distance;
                        closestNPC = npc;
                    }
                });

                if (closestNPC) {
                    this.startDialogue(closestNPC);
                }
            }
        });
    }

    private createMobileControls() {
        // 조이스틱 생성
        this.joystick = this.add.container(100, 500);
        
        // 조이스틱 베이스
        this.joystickBase = this.add.graphics();
        this.joystickBase.fillStyle(0x666666, 0.5);
        this.joystickBase.fillCircle(0, 0, 50);
        this.joystickBase.lineStyle(2, 0xffffff, 0.8);
        this.joystickBase.strokeCircle(0, 0, 50);
        
        // 조이스틱 썸
        this.joystickThumb = this.add.graphics();
        this.joystickThumb.fillStyle(0xffffff, 0.8);
        this.joystickThumb.fillCircle(0, 0, 20);
        this.joystickThumb.lineStyle(2, 0x000000, 0.5);
        this.joystickThumb.strokeCircle(0, 0, 20);
        
        this.joystick.add([this.joystickBase, this.joystickThumb]);
        
        // 액션 버튼들
        this.createActionButtons();
    }

    private createActionButtons() {
        // 상호작용 버튼
        const interactBtn = this.add.graphics();
        interactBtn.fillStyle(0x4CAF50, 0.8);
        interactBtn.fillRoundedRect(0, 0, 80, 40, 10);
        interactBtn.lineStyle(2, 0xffffff, 0.8);
        interactBtn.strokeRoundedRect(0, 0, 80, 40, 10);
        
        const interactText = this.add.text(40, 20, 'E', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        const interactContainer = this.add.container(700, 500);
        interactContainer.add([interactBtn, interactText]);
        interactContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, 80, 40), Phaser.Geom.Rectangle.Contains);
        
        interactContainer.on('pointerdown', () => {
            this.interactWithNPC();
        });

        // 인벤토리 버튼
        const inventoryBtn = this.add.graphics();
        inventoryBtn.fillStyle(0x2196F3, 0.8);
        inventoryBtn.fillRoundedRect(0, 0, 80, 40, 10);
        inventoryBtn.lineStyle(2, 0xffffff, 0.8);
        inventoryBtn.strokeRoundedRect(0, 0, 80, 40, 10);
        
        const inventoryText = this.add.text(40, 20, 'I', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        const inventoryContainer = this.add.container(700, 450);
        inventoryContainer.add([inventoryBtn, inventoryText]);
        inventoryContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, 80, 40), Phaser.Geom.Rectangle.Contains);
        
        inventoryContainer.on('pointerdown', () => {
            this.toggleInventory();
        });
    }

    private updateJoystick() {
        if (!this.joystickActive) return;

        const joystickPos = { x: this.joystick.x, y: this.joystick.y };
        const deltaX = this.touchCurrentPos.x - joystickPos.x;
        const deltaY = this.touchCurrentPos.y - joystickPos.y;
        
        // 조이스틱 범위 제한
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = 50;
        
        if (distance > maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            const limitedX = Math.cos(angle) * maxDistance;
            const limitedY = Math.sin(angle) * maxDistance;
            this.joystickThumb.setPosition(limitedX, limitedY);
        } else {
            this.joystickThumb.setPosition(deltaX, deltaY);
        }
    }

    private resetJoystick() {
        this.joystickThumb.setPosition(0, 0);
    }

    private changePlayerImage(imageKey: string) {
        if (this.player) {
            const currentFrame = this.player.frame?.name || 0;
            this.player.setTexture(imageKey);
            this.player.setFrame(currentFrame); // 현재 프레임 유지
            console.log(`플레이어 이미지가 ${imageKey}로 변경되었습니다!`);
        }
    }

    private createRandomPlayerImage() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        canvas.width = 32;
        canvas.height = 32;
        
        // 랜덤 색상 생성
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        ctx.fillStyle = randomColor;
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('P', 16, 22);
        
        const dataURL = canvas.toDataURL();
        
        // 동적으로 텍스처 추가 (올바른 방법)
        const img = new Image();
        img.onload = () => {
            this.textures.addImage('random_player', img);
            this.changePlayerImage('random_player');
        };
        img.src = dataURL;
    }

    private createUI() {
        // 대화창 생성
        this.dialogueBox = this.add.container(400, 500);
        const dialogueBg = this.add.rectangle(0, 0, 600, 100, 0x000000, 0.8);
        const dialogueText = this.add.text(0, 0, '', {
            fontSize: '16px',
            color: '#fff',
            wordWrap: { width: 580 }
        }).setOrigin(0.5);
        this.dialogueBox.add([dialogueBg, dialogueText]);
        this.dialogueBox.setVisible(false);

        // 인벤토리 UI 생성
        this.inventoryUI = this.add.container(400, 300);
        const inventoryBg = this.add.rectangle(0, 0, 400, 300, 0x000000, 0.9);
        const inventoryTitle = this.add.text(0, -120, '인벤토리', {
            fontSize: '24px',
            color: '#fff'
        }).setOrigin(0.5);
        this.inventoryUI.add([inventoryBg, inventoryTitle]);
        this.inventoryUI.setVisible(false);

        // 퀘스트 UI 생성
        this.questUI = this.add.container(150, 100);
        const questBg = this.add.rectangle(0, 0, 250, 200, 0x000000, 0.7);
        const questTitle = this.add.text(0, -80, '퀘스트', {
            fontSize: '18px',
            color: '#fff'
        }).setOrigin(0.5);
        this.questUI.add([questBg, questTitle]);

        // 조작법 안내
        this.add.text(16, 16, 'WASD: 이동 | E: 상호작용 | I: 인벤토리 | SPACE: 대화 진행', {
            fontSize: '14px',
            color: '#fff',
            backgroundColor: '#000',
            padding: { x: 4, y: 2 }
        });

        // 이미지 변경 안내
        this.add.text(16, 40, '1: 기본캐릭터 | 2: 캐릭터2 | 3: 캐릭터3 | 4: 캐릭터4 | 5: 여성1 | 6: 여성2 | R: 랜덤', {
            fontSize: '12px',
            color: '#fff',
            backgroundColor: '#000',
            padding: { x: 4, y: 2 }
        });
    }

    private setupCollisions() {
        // 플레이어와 NPC 충돌 감지
        this.npcs.forEach(npc => {
            this.physics.add.overlap(this.player, npc.sprite, () => {
                // NPC 근처에 있을 때 상호작용 가능 표시
                npc.sprite.setTint(0xffff00);
            });
        });
    }

    private interactWithNPC() {
        if (this.isInDialogue) return;

        // 가장 가까운 NPC 찾기
        let closestNPC: NPC | null = null;
        let minDistance = Infinity;

        this.npcs.forEach(npc => {
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                npc.sprite.x, npc.sprite.y
            );
            if (distance < minDistance && distance < 50) {
                minDistance = distance;
                closestNPC = npc;
            }
        });

        if (closestNPC) {
            this.startDialogue(closestNPC);
        }
    }

    private startDialogue(npc: NPC) {
        this.isInDialogue = true;
        this.currentNPC = npc;
        npc.currentDialogue = 0;
        this.showDialogue(npc.dialogue[0]);
        
        // 인벤토리에 아이템 추가 (첫 번째 대화에서)
        if (npc.name === '마을장로' && this.inventory.length === 0) {
            this.addToInventory('치유 물약', '체력을 회복시키는 물약입니다.', 'potion');
        }
    }

    private showDialogue(text: string) {
        const dialogueText = this.dialogueBox.getAt(1) as Phaser.GameObjects.Text;
        dialogueText.setText(text);
        this.dialogueBox.setVisible(true);
    }

    private nextDialogue() {
        if (!this.isInDialogue || !this.currentNPC) return;

        this.currentNPC.currentDialogue++;
        
        if (this.currentNPC.currentDialogue >= this.currentNPC.dialogue.length) {
            // 대화 종료
            this.endDialogue();
        } else {
            // 다음 대화 표시
            this.showDialogue(this.currentNPC.dialogue[this.currentNPC.currentDialogue]);
        }
    }

    private endDialogue() {
        this.isInDialogue = false;
        this.currentNPC = null;
        this.dialogueBox.setVisible(false);
        
        // NPC 하이라이트 제거
        this.npcs.forEach(npc => npc.sprite.clearTint());
    }

    private toggleInventory() {
        this.showInventory = !this.showInventory;
        this.inventoryUI.setVisible(this.showInventory);
        this.updateInventoryDisplay();
    }

    private addToInventory(name: string, description: string, icon: string) {
        this.inventory.push({ name, description, icon });
        this.updateInventoryDisplay();
    }

    private updateInventoryDisplay() {
        // 기존 아이템 표시 제거
        this.inventoryUI.getAll().slice(2).forEach(item => item.destroy());

        // 아이템 목록 표시
        this.inventory.forEach((item, index) => {
            const itemText = this.add.text(-150, -60 + (index * 30), 
                `${item.name}: ${item.description}`, {
                fontSize: '14px',
                color: '#fff',
                wordWrap: { width: 280 }
            });
            this.inventoryUI.add(itemText);
        });
    }

    private addQuest(quest: string) {
        this.quests.push(quest);
        this.updateQuestDisplay();
    }

    private updateQuestDisplay() {
        // 기존 퀘스트 표시 제거
        this.questUI.getAll().slice(2).forEach(item => item.destroy());

        // 퀘스트 목록 표시
        this.quests.forEach((quest, index) => {
            const questText = this.add.text(-100, -50 + (index * 25), 
                `• ${quest}`, {
                fontSize: '12px',
                color: '#fff',
                wordWrap: { width: 200 }
            });
            this.questUI.add(questText);
        });
    }

    update(_time: number, delta: number) {
        if (this.isInDialogue) return;

        let velocityX = 0;
        let velocityY = 0;
        let direction = 'down';

        // 키보드 입력 처리
        if (this.wasdKeys.A.isDown || this.cursors.left.isDown) {
            velocityX = -160;
            direction = 'left';
        } else if (this.wasdKeys.D.isDown || this.cursors.right.isDown) {
            velocityX = 160;
            direction = 'right';
        }

        if (this.wasdKeys.W.isDown || this.cursors.up.isDown) {
            velocityY = -160;
            direction = 'up';
        } else if (this.wasdKeys.S.isDown || this.cursors.down.isDown) {
            velocityY = 160;
            direction = 'down';
        }

        // 모바일 조이스틱 입력 처리
        if (this.isMobile && this.joystickActive) {
            const joystickPos = { x: this.joystick.x, y: this.joystick.y };
            const thumbPos = { x: this.joystickThumb.x, y: this.joystickThumb.y };
            const deltaX = thumbPos.x - joystickPos.x;
            const deltaY = thumbPos.y - joystickPos.y;
            
            // 데드존 설정 (작은 움직임은 무시)
            const deadzone = 10;
            if (Math.abs(deltaX) > deadzone) {
                velocityX = (deltaX / 50) * 160; // 조이스틱 위치에 비례한 속도
                direction = deltaX > 0 ? 'right' : 'left';
            }
            if (Math.abs(deltaY) > deadzone) {
                velocityY = (deltaY / 50) * 160;
                direction = deltaY > 0 ? 'down' : 'up';
            }
        }

        // 이동 상태 업데이트
        this.isMoving = velocityX !== 0 || velocityY !== 0;

        // 대각선 이동 정규화
        if (velocityX !== 0 && velocityY !== 0) {
            this.player.setVelocity(velocityX * 0.707, velocityY * 0.707);
        } else {
            this.player.setVelocity(velocityX, velocityY);
        }

        // 애니메이션 업데이트
        this.updateAnimation(delta);

        // 방향에 따른 캐릭터 프레임 변경
        this.updatePlayerDirection(direction);
    }

    private updatePlayerDirection(direction: string) {
        if (!this.player) return;

        // 방향이 변경되었는지 확인
        const directionChanged = this.lastDirection !== direction;
        this.lastDirection = direction;

        let baseFrameIndex = 0; // 기본 프레임 (아래쪽 보기)

        switch (direction) {
            case 'up':
                baseFrameIndex = 9; // 위쪽 보기 (뒤를 바라봄) - 네 번째 행 첫 번째
                break;
            case 'down':
                baseFrameIndex = 0; // 아래쪽 보기 (정면) - 첫 번째 행 첫 번째
                break;
            case 'left':
                baseFrameIndex = 3; // 왼쪽 보기 (왼쪽을 바라봄) - 두 번째 행 첫 번째
                break;
            case 'right':
                baseFrameIndex = 6; // 오른쪽 보기 (오른쪽을 바라봄) - 세 번째 행 첫 번째
                break;
        }

        // 애니메이션 프레임 계산
        let frameIndex = baseFrameIndex;
        if (this.isMoving) {
            frameIndex = baseFrameIndex + this.animationFrame;
        }

        // 방향 변경 시 부드러운 전환을 위해 첫 번째 프레임부터 시작
        if (directionChanged && this.isMoving) {
            this.animationFrame = 0;
            this.animationTimer = 0;
            frameIndex = baseFrameIndex;
        }

        // 프레임이 존재하는지 확인하고 설정
        if (this.player.texture.frameTotal > frameIndex) {
            this.player.setFrame(frameIndex);
        }
    }

    private updateAnimation(delta: number) {
        if (!this.isMoving) {
            // 멈춤 상태에서는 첫 번째 프레임으로 부드럽게 전환
            if (this.animationFrame !== 0) {
                this.animationTimer += delta;
                if (this.animationTimer >= this.animationSpeed * 0.5) {
                    this.animationFrame = 0;
                    this.animationTimer = 0;
                }
            }
            return;
        }

        this.animationTimer += delta;
        
        // 더 부드러운 애니메이션을 위해 타이밍 조정
        if (this.animationTimer >= this.animationSpeed) {
            this.animationFrame = (this.animationFrame + 1) % 3; // 0, 1, 2 반복
            this.animationTimer = 0;
        }
    }
}
