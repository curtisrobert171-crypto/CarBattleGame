# GitHub Copilot Instructions for CarBattleGame

## Project Overview
CarBattleGame is a mobile-friendly HTML5 Canvas car battle game built with vanilla JavaScript. Players dodge enemy cars while surviving as long as possible, with support for both desktop (keyboard) and mobile (touch) controls.

## Technology Stack
- **HTML5 Canvas** for game rendering
- **Vanilla JavaScript** (ES6+) for game logic
- **CSS3** for responsive styling
- No frameworks or build tools

## Code Style & Conventions

### JavaScript
- Use ES6+ features including:
  - Classes for game entities (Player, Enemy)
  - const/let instead of var
  - Arrow functions for callbacks
  - Template literals for string interpolation
- Use camelCase for variables and functions
- Use PascalCase for classes
- Use SCREAMING_SNAKE_CASE for constants
- Keep functions focused and single-purpose
- Add comments only for complex logic, not obvious code

### Naming Conventions
- Canvas context: `ctx`
- Game loop ID: `gameLoopId`
- Configuration objects: `config`
- Event handlers: `handle[Event]` (e.g., `handleTouch`)
- Game state prefix with noun: `gameState`, `touchX`
- Boolean variables: Use `is` or `has` prefix (e.g., `isDead`, `passed`)

### Code Organization
1. Constants and enums at the top
2. Configuration objects
3. Global game variables
4. Class definitions
5. Initialization functions
6. Game loop and update functions
7. Event listeners at the end

## Architecture Patterns

### Game State Management
- Use enum pattern for game states (MENU, PLAYING, GAME_OVER)
- Single `gameState` variable to track current state
- State transitions handled through dedicated functions (`startGame()`, `showMenu()`, `gameOver()`)

### Game Loop
- Use `requestAnimationFrame` for smooth animations
- Store loop ID for proper cleanup: `gameLoopId = requestAnimationFrame(gameLoop)`
- Always cancel previous animation frame before starting new loop
- Check game state at loop start: `if (gameState !== GameState.PLAYING) return;`

### Class Structure
Classes should follow this pattern:
```javascript
class Entity {
    constructor(x, y) {
        // Position and dimensions
        this.x = x;
        this.y = y;
        this.width = config.entityWidth;
        this.height = config.entityHeight;
        // Other properties
    }

    draw() {
        // Canvas drawing code
    }

    update() {
        // Update logic
        // Return boolean for whether entity should remain (optional)
    }
}
```

### Canvas Best Practices
- Clear canvas at start of each frame: `ctx.clearRect(0, 0, canvas.width, canvas.height)`
- Use `ctx.fillStyle` before `ctx.fillRect()`
- Group related drawing operations
- Draw background/road first, then entities, then UI
- Keep coordinates relative to canvas dimensions for responsiveness

## Mobile-First Approach

### Touch Controls
- Always prevent default on touch events: `e.preventDefault()`
- Use `{ passive: false }` option for touch listeners
- Store touch position in global variable for use in game loop
- Clear touch state on touchend: `touchX = null`
- Support both direct touch on canvas and on-screen buttons

### Responsive Design
- Use `resizeCanvas()` on window resize
- Calculate canvas size based on container minus HUD and controls
- Hide/show touch controls based on screen width (768px breakpoint)
- Use `window.innerWidth` for runtime checks
- Support both portrait and landscape orientations

## Game Development Patterns

### Collision Detection
- Use AABB (Axis-Aligned Bounding Box) collision detection
- Implement as method on entity: `entity.collidesWith(other)`
- Check collision after entity updates in game loop

### Entity Management
- Use arrays to manage multiple entities: `enemies = []`
- Filter arrays to remove off-screen or collided entities
- Use `Array.filter()` to combine update and cleanup

### Scoring System
- Award points when enemies pass player: `if (!this.passed && this.y > player.y + player.height)`
- Use boolean flags to prevent duplicate scoring: `this.passed = false`
- Update HUD immediately after score changes

### Lives/Health System
- Decrement lives on collision
- Remove enemy immediately after collision (return false in filter)
- Check for game over: `if (lives <= 0) gameOver()`

## Event Handling

### Keyboard
- Use object to track key states: `keys = {}`
- Set true on keydown, false on keyup
- Prevent default for game keys during gameplay
- Support multiple key bindings (Arrow keys AND WASD)

### Canvas Sizing
- Always handle window resize
- Recalculate canvas dimensions on resize
- Account for mobile controls height when visible

## Performance Considerations
- Limit maximum number of on-screen entities: `config.maxEnemies`
- Use spawn rate throttling: `Math.random() < config.enemySpawnRate`
- Cancel animation frame on game state change
- Use `Date.now()` for animation timing (e.g., road lines)

## UI/UX Patterns
- Use screen system with `.active` class toggle
- Single screen visible at a time
- Smooth transitions with CSS
- HUD positioned absolutely over game canvas
- Update HUD through dedicated function: `updateHUD()`

## Testing Approach
Since this is a client-side game with no build process:
- Test in browser by opening `index.html`
- Test on desktop (keyboard controls)
- Test on mobile (touch controls)
- Test responsive behavior at different screen sizes
- Test game state transitions (menu → playing → game over)

## Common Pitfalls to Avoid
- Don't forget to cancel animation frames to prevent memory leaks
- Don't mix direct touch coordinates with canvas coordinates (use `getBoundingClientRect()`)
- Don't forget passive: false for touch events that need preventDefault
- Don't update canvas size without checking mobile controls visibility
- Don't create multiple game loops - always clean up previous
- Always validate canvas and context exist before drawing
- Keep player within canvas bounds: `Math.max(0, Math.min(canvas.width - this.width, this.x))`

## When Adding New Features
1. Add configuration to `config` object if needed
2. Create class for new entity types
3. Follow existing draw/update pattern
4. Update game loop if needed
5. Add touch support if interactive
6. Test on both desktop and mobile
7. Ensure responsive at all screen sizes

## Accessibility Considerations
- Support both keyboard and touch controls
- Use semantic HTML elements where possible
- Maintain readable font sizes on mobile
- Provide clear visual feedback for interactive elements
- Use high contrast colors for game elements

## File Structure
```
/
├── index.html          # Game container and UI structure
├── game.js             # All game logic and classes
├── styles.css          # Responsive styling
└── README.md           # Documentation
```

Keep the simple three-file structure. Don't introduce build tools or module bundlers unless absolutely necessary.
