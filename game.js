// Game State
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};

// Game Configuration
const config = {
    playerSpeed: 5,
    enemySpeed: 3,
    enemySpawnRate: 0.02,
    maxEnemies: 5,
    carWidth: 40,
    carHeight: 60,
    lives: 3
};

// Game Variables
let canvas, ctx;
let gameState = GameState.MENU;
let score = 0;
let lives = config.lives;
let player;
let enemies = [];
let keys = {};
let touchX = null;
let gameLoopId = null;

// Player Class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = config.carWidth;
        this.height = config.carHeight;
        this.speed = config.playerSpeed;
        this.color = '#00ff00';
    }

    draw() {
        // Draw car body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw car details
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 5, this.y + 10, 10, 15);
        ctx.fillRect(this.x + 25, this.y + 10, 10, 15);
        
        // Draw wheels
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x - 3, this.y + 10, 6, 15);
        ctx.fillRect(this.x + this.width - 3, this.y + 10, 6, 15);
        ctx.fillRect(this.x - 3, this.y + 35, 6, 15);
        ctx.fillRect(this.x + this.width - 3, this.y + 35, 6, 15);
    }

    update() {
        // Keyboard controls
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            this.x -= this.speed;
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            this.x += this.speed;
        }
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            this.y -= this.speed;
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            this.y += this.speed;
        }

        // Touch controls
        if (touchX !== null) {
            const targetX = touchX - this.width / 2;
            const dx = targetX - this.x;
            if (Math.abs(dx) > 5) {
                this.x += Math.sign(dx) * this.speed;
            }
        }

        // Keep player in bounds
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));
    }

    collidesWith(enemy) {
        return this.x < enemy.x + enemy.width &&
               this.x + this.width > enemy.x &&
               this.y < enemy.y + enemy.height &&
               this.y + this.height > enemy.y;
    }
}

// Enemy Class
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = config.carWidth;
        this.height = config.carHeight;
        this.speed = config.enemySpeed + Math.random() * 2;
        this.color = '#ff0000';
        this.passed = false;
    }

    draw() {
        // Draw car body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw car details
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 5, this.y + 35, 10, 15);
        ctx.fillRect(this.x + 25, this.y + 35, 10, 15);
        
        // Draw wheels
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x - 3, this.y + 10, 6, 15);
        ctx.fillRect(this.x + this.width - 3, this.y + 10, 6, 15);
        ctx.fillRect(this.x - 3, this.y + 35, 6, 15);
        ctx.fillRect(this.x + this.width - 3, this.y + 35, 6, 15);
    }

    update() {
        this.y += this.speed;

        // Score point when enemy passes player
        if (!this.passed && this.y > player.y + player.height) {
            this.passed = true;
            score += 10;
            updateHUD();
        }

        return this.y < canvas.height + this.height;
    }
}

// Initialize Game
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Event Listeners
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', startGame);
    document.getElementById('menu-button').addEventListener('click', showMenu);

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (gameState === GameState.PLAYING && 
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    // Touch controls
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchX = null;
    });

    // Touch button controls
    document.getElementById('touch-left').addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['ArrowLeft'] = true;
    });

    document.getElementById('touch-left').addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['ArrowLeft'] = false;
    });

    document.getElementById('touch-right').addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['ArrowRight'] = true;
    });

    document.getElementById('touch-right').addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['ArrowRight'] = false;
    });
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    const hud = document.getElementById('hud');
    const touchControls = document.getElementById('touch-controls');
    
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight - hud.clientHeight - 
                    (window.innerWidth <= 768 ? touchControls.clientHeight : 0);
}

function handleTouch(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        touchX = e.touches[0].clientX - rect.left;
    }
}

function startGame() {
    gameState = GameState.PLAYING;
    score = 0;
    lives = config.lives;
    enemies = [];
    
    // Initialize player in center bottom
    player = new Player(
        canvas.width / 2 - config.carWidth / 2,
        canvas.height - config.carHeight - 20
    );

    updateHUD();
    showScreen('game-screen');
    
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
    }
    gameLoop();
}

function showMenu() {
    gameState = GameState.MENU;
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    showScreen('menu-screen');
}

function gameOver() {
    gameState = GameState.GAME_OVER;
    document.getElementById('final-score').textContent = score;
    showScreen('game-over-screen');
    
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function updateHUD() {
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
}

function spawnEnemy() {
    if (enemies.length < config.maxEnemies && Math.random() < config.enemySpawnRate) {
        const x = Math.random() * (canvas.width - config.carWidth);
        enemies.push(new Enemy(x, -config.carHeight));
    }
}

function drawRoad() {
    // Draw road
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw road lines
    ctx.fillStyle = '#ffff00';
    const lineWidth = 5;
    const lineHeight = 30;
    const lineGap = 20;
    const offset = (Date.now() / 50) % (lineHeight + lineGap);

    for (let y = -offset; y < canvas.height; y += lineHeight + lineGap) {
        ctx.fillRect(canvas.width / 2 - lineWidth / 2, y, lineWidth, lineHeight);
    }
}

function gameLoop() {
    if (gameState !== GameState.PLAYING) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw road
    drawRoad();

    // Update and draw player
    player.update();
    player.draw();

    // Spawn enemies
    spawnEnemy();

    // Update and draw enemies
    enemies = enemies.filter(enemy => {
        enemy.update();
        enemy.draw();

        // Check collision
        if (player.collidesWith(enemy)) {
            lives--;
            updateHUD();
            
            if (lives <= 0) {
                gameOver();
                return false;
            }
            return false; // Remove enemy after collision
        }

        return enemy.y < canvas.height + enemy.height;
    });

    gameLoopId = requestAnimationFrame(gameLoop);
}

// Initialize game when page loads
window.addEventListener('load', init);
