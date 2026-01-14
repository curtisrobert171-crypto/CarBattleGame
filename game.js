// ========================== HealthSystem ==========================
class HealthSystem {
    constructor(maxHealth = 100) {
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
        this.isDead = false;
        this.onHealthChanged = null;
        this.onDeath = null;
    }

    start() {
        this.currentHealth = this.maxHealth;
        this.updateHealth();
    }

    updateHealth() {
        if (this.onHealthChanged) {
            this.onHealthChanged(this.currentHealth / this.maxHealth);
        }
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.currentHealth -= amount;
        this.updateHealth();
        if (this.currentHealth <= 0) this.die();
    }

    die() {
        this.isDead = true;
        if (this.onDeath) {
            this.onDeath(this);
        }
    }
}

// ========================== WeaponBase ==========================
class WeaponBase {
    constructor(damage = 10, cooldown = 1) {
        this.damage = damage;
        this.cooldown = cooldown;
        this.nextFireTime = 0;
        this.damageToScoreCurve = null;
    }

    fire(target, matchTime) {
        if (matchTime < this.nextFireTime) return false;
        this.nextFireTime = matchTime + this.cooldown;

        if (target && target.healthSystem) {
            target.healthSystem.takeDamage(this.damage);
            const percentHealthLost = this.damage / target.healthSystem.maxHealth;
            const scoreAmount = this.damageToScoreCurve 
                ? this.evaluateCurve(this.damageToScoreCurve, percentHealthLost) 
                : this.damage;
            GameManager.getInstance().addScore(scoreAmount);
            return true;
        }
        return false;
    }

    evaluateCurve(curve, value) {
        // Simple linear interpolation for animation curve
        if (!curve || curve.length === 0) return value;
        for (let i = 0; i < curve.length - 1; i++) {
            if (value >= curve[i].x && value <= curve[i + 1].x) {
                const t = (value - curve[i].x) / (curve[i + 1].x - curve[i].x);
                return curve[i].y + t * (curve[i + 1].y - curve[i].y);
            }
        }
        return curve[curve.length - 1].y;
    }
}

// ========================== GameManager ==========================
class GameManager {
    static instance = null;

    constructor() {
        if (GameManager.instance) {
            return GameManager.instance;
        }
        GameManager.instance = this;

        this.MatchState = {
            WAITING_TO_START: 'waitingToStart',
            IN_PROGRESS: 'inProgress',
            PAUSED: 'paused',
            FINISHED: 'finished'
        };

        this.currentState = this.MatchState.WAITING_TO_START;
        this.matchDuration = 180; // 3 minutes
        this.currentMatchTime = 0;
        this.currentScore = 0;
        this.playerHealth = null;
        this.opponentHealth = null;
        this.weaponSpawnPoints = [];
        this.weaponPrefabs = [];
        this.damageToScoreCurve = [
            { x: 0, y: 0 },
            { x: 1, y: 1 }
        ];
    }

    static getInstance() {
        if (!GameManager.instance) {
            new GameManager();
        }
        return GameManager.instance;
    }

    update(deltaTime) {
        if (this.currentState === this.MatchState.IN_PROGRESS) {
            this.currentMatchTime += deltaTime;
        }
    }

    startMatch() {
        if (this.currentState === this.MatchState.IN_PROGRESS) return;
        this.currentState = this.MatchState.IN_PROGRESS;
        this.currentMatchTime = 0;
        this.currentScore = 0;
    }

    addScore(amount) {
        if (this.currentState !== this.MatchState.IN_PROGRESS) return;
        this.currentScore += amount;
    }

    registerPlayer(health) {
        this.playerHealth = health;
        health.onDeath = () => this.endMatch(false);
    }

    registerOpponent(health) {
        this.opponentHealth = health;
        health.onDeath = () => this.endMatch(true);
    }

    endMatch(playerWon) {
        this.currentState = this.MatchState.FINISHED;
        FairPlayManager.getInstance().reportMatchResult(playerWon, this.currentScore);
    }

    togglePause() {
        if (this.currentState === this.MatchState.FINISHED) return;
        const paused = this.currentState === this.MatchState.PAUSED;
        this.currentState = paused ? this.MatchState.IN_PROGRESS : this.MatchState.PAUSED;
        // Note: JavaScript doesn't have Time.timeScale, handled in game loop
    }
}

// ========================== DeterministicBotAI ==========================
class DeterministicBotAI {
    constructor(target, weapons = [], weaponTargets = []) {
        this.targetPlayer = target;
        this.weapons = weapons;
        this.weaponTargets = weaponTargets;
        this.currentTargetIndex = 0;
        this.weaponIndex = 0;
        this.nextFireTime = 0;
    }

    update(deltaTime, enemy) {
        const gameManager = GameManager.getInstance();
        if (!gameManager || !this.targetPlayer) return;
        if (gameManager.currentState !== gameManager.MatchState.IN_PROGRESS) return;

        const matchTime = gameManager.currentMatchTime;

        // Move towards weapon spawn points
        if (this.weaponTargets && this.weaponTargets.length > 0) {
            const nextWeapon = this.weaponTargets[this.currentTargetIndex % this.weaponTargets.length];
            const dx = nextWeapon.x - enemy.x;
            const dy = nextWeapon.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0.5) {
                enemy.x += (dx / dist) * deltaTime * 50;
                enemy.y += (dy / dist) * deltaTime * 50;
            } else {
                this.currentTargetIndex++;
            }
        }

        // Fire weapons at player
        if (this.weapons && this.weapons.length > 0 && matchTime >= this.nextFireTime) {
            const weapon = this.weapons[this.weaponIndex % this.weapons.length];
            if (weapon.fire(this.targetPlayer, matchTime)) {
                this.nextFireTime = matchTime + weapon.cooldown;
                this.weaponIndex++;
            }
        }
    }
}

// ========================== FairPlayManager ==========================
class FairPlayManager {
    static instance = null;

    constructor() {
        if (FairPlayManager.instance) {
            return FairPlayManager.instance;
        }
        FairPlayManager.instance = this;
        this.useSkillzSDK = false;
        this.playerSpawnPoints = [];
    }

    static getInstance() {
        if (!FairPlayManager.instance) {
            new FairPlayManager();
        }
        return FairPlayManager.instance;
    }

    getNextSpawnPoint() {
        if (!this.playerSpawnPoints || this.playerSpawnPoints.length === 0) return null;
        return this.playerSpawnPoints[Math.floor(Math.random() * this.playerSpawnPoints.length)];
    }

    reportMatchResult(playerWon, score) {
        console.log(`Match Result: PlayerWon=${playerWon}, Score=${score}`);
    }
}

// ========================== TransitionController ==========================
class TransitionController {
    static instance = null;

    constructor() {
        if (TransitionController.instance) {
            return TransitionController.instance;
        }
        TransitionController.instance = this;
        this.defaultDuration = 0.5;
        this.fadeOverlay = null;
        this.initializeOverlay();
    }

    static getInstance() {
        if (!TransitionController.instance) {
            new TransitionController();
        }
        return TransitionController.instance;
    }

    initializeOverlay() {
        this.fadeOverlay = document.createElement('div');
        this.fadeOverlay.style.position = 'fixed';
        this.fadeOverlay.style.top = '0';
        this.fadeOverlay.style.left = '0';
        this.fadeOverlay.style.width = '100%';
        this.fadeOverlay.style.height = '100%';
        this.fadeOverlay.style.backgroundColor = 'black';
        this.fadeOverlay.style.opacity = '0';
        this.fadeOverlay.style.pointerEvents = 'none';
        this.fadeOverlay.style.zIndex = '9999';
        this.fadeOverlay.style.transition = `opacity ${this.defaultDuration}s`;
        document.body.appendChild(this.fadeOverlay);
    }

    fadeOut(callback) {
        this.fadeOverlay.style.pointerEvents = 'auto';
        this.fadeOverlay.style.opacity = '1';
        setTimeout(() => {
            if (callback) callback();
        }, this.defaultDuration * 1000);
    }

    fadeIn(callback) {
        this.fadeOverlay.style.opacity = '0';
        setTimeout(() => {
            this.fadeOverlay.style.pointerEvents = 'none';
            if (callback) callback();
        }, this.defaultDuration * 1000);
    }
}

// ========================== Game Configuration ==========================
const config = {
    playerSpeed: 5,
    enemySpeed: 3,
    enemySpawnRate: 0.02,
    maxEnemies: 5,
    carWidth: 40,
    carHeight: 60,
    maxHealth: 100,
    enemyMaxHealth: 50,
    collisionDamage: 20
};

// Game Variables
let canvas, ctx;
let player;
let enemies = [];
let keys = {};
let touchX = null;
let gameLoopId = null;
let lastFrameTime = Date.now();
let hudController;

// ========================== HUDController ==========================
class HUDController {
    constructor() {
        this.healthBarFill = document.getElementById('health-bar-fill');
        this.timerText = document.getElementById('timer');
        this.scoreText = document.getElementById('score');
        this.pauseMenuPanel = null;
        this.playerHealth = null;
    }

    initialize(playerHealth) {
        this.playerHealth = playerHealth;
        if (this.playerHealth) {
            this.playerHealth.onHealthChanged = (percentage) => {
                this.updateHealthUI(percentage);
            };
        }
    }

    updateHealthUI(percentage) {
        if (this.healthBarFill) {
            this.healthBarFill.style.width = `${percentage * 100}%`;
        }
    }

    updateTimer(timeRemaining) {
        if (this.timerText) {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = Math.floor(timeRemaining % 60);
            this.timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateScore(score) {
        if (this.scoreText) {
            this.scoreText.textContent = Math.floor(score);
        }
    }

    togglePauseMenu(show) {
        if (this.pauseMenuPanel) {
            this.pauseMenuPanel.style.display = show ? 'flex' : 'none';
        }
    }
}

// ========================== Player Class ==========================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = config.carWidth;
        this.height = config.carHeight;
        this.speed = config.playerSpeed;
        this.color = '#00ff00';
        this.healthSystem = new HealthSystem(config.maxHealth);
        this.healthSystem.start();
        this.weapon = new WeaponBase(10, 1.0);
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

        // Draw health bar above car
        this.drawHealthBar();
    }

    drawHealthBar() {
        const barWidth = this.width;
        const barHeight = 4;
        const barX = this.x;
        const barY = this.y - 8;
        
        // Background
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPercentage = this.healthSystem.currentHealth / this.healthSystem.maxHealth;
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
    }

    update() {
        if (this.healthSystem.isDead) return;

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

        // Auto-fire weapon at nearest enemy
        const gameManager = GameManager.getInstance();
        if (enemies.length > 0) {
            const nearestEnemy = this.findNearestEnemy();
            if (nearestEnemy) {
                this.weapon.fire(nearestEnemy, gameManager.currentMatchTime);
            }
        }
    }

    findNearestEnemy() {
        let nearest = null;
        let minDist = Infinity;
        
        for (const enemy of enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }
        return nearest;
    }

    collidesWith(enemy) {
        return this.x < enemy.x + enemy.width &&
               this.x + this.width > enemy.x &&
               this.y < enemy.y + enemy.height &&
               this.y + this.height > enemy.y;
    }
}

// ========================== Enemy Class ==========================
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = config.carWidth;
        this.height = config.carHeight;
        this.speed = config.enemySpeed + Math.random() * 2;
        this.color = '#ff0000';
        this.passed = false;
        this.healthSystem = new HealthSystem(config.enemyMaxHealth);
        this.healthSystem.start();
        this.weapon = new WeaponBase(5, 2.0);
        this.ai = null;
    }

    draw() {
        if (this.healthSystem.isDead) return;

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

        // Draw health bar above car
        this.drawHealthBar();
    }

    drawHealthBar() {
        const barWidth = this.width;
        const barHeight = 4;
        const barX = this.x;
        const barY = this.y - 8;
        
        // Background
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPercentage = this.healthSystem.currentHealth / this.healthSystem.maxHealth;
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
    }

    update(deltaTime) {
        if (this.healthSystem.isDead) {
            return false;
        }

        // Use AI if available
        if (this.ai) {
            this.ai.update(deltaTime, this);
        } else {
            // Default movement
            this.y += this.speed;
        }

        // Score point when enemy passes player
        if (!this.passed && player && this.y > player.y + player.height) {
            this.passed = true;
            GameManager.getInstance().addScore(10);
        }

        // Fire weapon at player
        const gameManager = GameManager.getInstance();
        if (player && !player.healthSystem.isDead) {
            this.weapon.fire(player, gameManager.currentMatchTime);
        }

        return this.y < canvas.height + this.height;
    }
}

// ========================== Initialize Game ==========================
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Initialize game managers
    GameManager.getInstance();
    FairPlayManager.getInstance();
    TransitionController.getInstance();

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
        const gameManager = GameManager.getInstance();
        if (gameManager.currentState === gameManager.MatchState.IN_PROGRESS && 
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
        // Pause on Escape
        if (e.key === 'Escape') {
            gameManager.togglePause();
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

    // Initialize HUD controller
    hudController = new HUDController();
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
    const gameManager = GameManager.getInstance();
    const transitionController = TransitionController.getInstance();

    transitionController.fadeOut(() => {
        enemies = [];
        lastFrameTime = Date.now();
        
        // Initialize player in center bottom
        player = new Player(
            canvas.width / 2 - config.carWidth / 2,
            canvas.height - config.carHeight - 20
        );

        // Register player with GameManager
        gameManager.registerPlayer(player.healthSystem);

        // Initialize HUD with player health
        hudController.initialize(player.healthSystem);

        // Start the match
        gameManager.startMatch();

        showScreen('game-screen');
        
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
        }

        transitionController.fadeIn(() => {
            gameLoop();
        });
    });
}

function showMenu() {
    const gameManager = GameManager.getInstance();
    const transitionController = TransitionController.getInstance();

    transitionController.fadeOut(() => {
        gameManager.currentState = gameManager.MatchState.WAITING_TO_START;
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
            gameLoopId = null;
        }
        showScreen('menu-screen');
        transitionController.fadeIn();
    });
}

function gameOver(playerWon) {
    const gameManager = GameManager.getInstance();
    const transitionController = TransitionController.getInstance();

    transitionController.fadeOut(() => {
        gameManager.endMatch(playerWon);
        document.getElementById('final-score').textContent = Math.floor(gameManager.currentScore);
        showScreen('game-over-screen');
        
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
            gameLoopId = null;
        }
        transitionController.fadeIn();
    });
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function spawnEnemy() {
    if (enemies.length < config.maxEnemies && Math.random() < config.enemySpawnRate) {
        const x = Math.random() * (canvas.width - config.carWidth);
        const enemy = new Enemy(x, -config.carHeight);
        
        // Set up AI for some enemies
        if (Math.random() > 0.5) {
            const weaponTargets = [];
            for (let i = 0; i < 3; i++) {
                weaponTargets.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height
                });
            }
            enemy.ai = new DeterministicBotAI(player, [enemy.weapon], weaponTargets);
        }

        enemies.push(enemy);
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
    const gameManager = GameManager.getInstance();
    if (gameManager.currentState !== gameManager.MatchState.IN_PROGRESS) return;

    // Calculate delta time
    const now = Date.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // Update game manager
    gameManager.update(deltaTime);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw road
    drawRoad();

    // Update and draw player
    if (player) {
        player.update();
        player.draw();
    }

    // Spawn enemies
    spawnEnemy();

    // Update and draw enemies
    enemies = enemies.filter(enemy => {
        const stillAlive = enemy.update(deltaTime);
        if (stillAlive) {
            enemy.draw();
        }

        // Check collision with player
        if (player && !enemy.healthSystem.isDead && player.collidesWith(enemy)) {
            player.healthSystem.takeDamage(config.collisionDamage);
            enemy.healthSystem.takeDamage(enemy.healthSystem.maxHealth); // Destroy enemy on collision
            
            if (player.healthSystem.isDead) {
                gameOver(false);
                return false;
            }
        }

        return stillAlive && !enemy.healthSystem.isDead;
    });

    // Update HUD
    hudController.updateScore(gameManager.currentScore);
    const timeRemaining = gameManager.matchDuration - gameManager.currentMatchTime;
    hudController.updateTimer(timeRemaining);

    // Check if time is up
    if (timeRemaining <= 0) {
        gameOver(true);
        return;
    }

    gameLoopId = requestAnimationFrame(gameLoop);
}

// Initialize game when page loads
window.addEventListener('load', init);
