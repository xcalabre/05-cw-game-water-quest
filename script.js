// Clean, single-version script.js
// Game configuration and state variables
const GOAL_CANS = 40; // Total drops needed to collect for first mission (doubled)
let currentCans = 0; // Current number of drops collected
let gameActive = false; // Tracks if game is currently running
let spawnInterval; // Holds the interval for spawning items
let timerInterval; // Holds the interval for the timer
let timeLeft = 30; // Standard game time in seconds
let gamesCompleted = 0; // Track completed games for difficulty progression
let currentDifficulty = 1; // Current difficulty level
let milestone25Celebrated = false; // Track if we've celebrated 25 points
let hasPlayedOnce = false; // Track if user has played at least one game
let lastDifficultyPopup = 0; // Track last difficulty level when popup was shown

// Audio files
const audioGameWon = new Audio('audio/Game-won.mp3');
const audioNewLevel = new Audio('audio/Game-new-level.mp3');

// Array of water crisis facts for popup rotation
const waterFacts = [
  "785 million people lack access to clean water. Together, we can change that.",
  "Every 2 minutes, a child dies from a water-related disease.",
  "Women and children spend 200 million hours every day collecting water.",
  "1 in 10 people worldwide lack access to safe water.",
  "Diseases from unsafe water kill more people every year than all forms of violence, including war.",
  "Access to clean water gives communities more time to grow food, earn income, and go to school.",
  "Every $1 invested in clean water can yield $4–$12 in economic returns.",
  "Clean water helps keep kids in school, especially girls.",
  "In Africa alone, people spend 40 billion hours every year walking for water."
];

// Check if first visit and show How to Play
function checkFirstVisit() {
  // Always show How to Play on page load (game open)
  setTimeout(() => showHowToPlay(), 500);
}

// Show How to Play popup
function showHowToPlay() {
  const popup = document.createElement('div');
  popup.className = 'howto-popup';
  popup.innerHTML = `
    <div class="popup-content howto-content">
      <h2>🎮 How to Play Water Quest</h2>
      <div class="howto-instructions">
        <div class="howto-item">
          <div class="howto-icon">💧</div>
          <div class="howto-text">
            <strong>Blue Drops (+2 points)</strong>
            <p>Click to collect and see a beautiful water ripple effect!</p>
          </div>
        </div>
        <div class="howto-item">
          <div class="howto-icon">🌈</div>
          <div class="howto-text">
            <strong>Rainbow Drops (+5 points)</strong>
            <p>Rare and valuable! Triggers a rainbow confetti shower!</p>
          </div>
        </div>
        <div class="howto-item">
          <div class="howto-icon">🍊</div>
          <div class="howto-text">
            <strong>Orange Drops (-3 points)</strong>
            <p>Contaminated water! Avoid these - they shake the board!</p>
          </div>
        </div>
        <div class="howto-item">
          <div class="howto-icon">🟢</div>
          <div class="howto-text">
            <strong>Green Drops (+1 point)</strong>
            <p>Filtered water - every drop counts!</p>
          </div>
        </div>
        <div class="howto-item">
          <div class="howto-icon">🟡</div>
          <div class="howto-text">
            <strong>Yellow Drops (0 points)</strong>
            <p>Neutral drops - practice your clicking!</p>
          </div>
        </div>
        <div class="howto-item">
          <div class="howto-icon">⭐</div>
          <div class="howto-text">
            <strong>Reach 25+ Drops</strong>
            <p>Unlock a special celebration milestone!</p>
          </div>
        </div>
        <div class="howto-item">
          <div class="howto-icon">🎯</div>
          <div class="howto-text">
            <strong>Goal: 40 Drops in 30 Seconds</strong>
            <p>Difficulty increases every 3 completed games!</p>
          </div>
        </div>
      </div>
      <button class="popup-btn popup-btn-primary" onclick="this.closest('.howto-popup').remove()">Start Playing!</button>
    </div>
  `;
  document.body.appendChild(popup);
}

// Initialize first visit check
checkFirstVisit();

// Creates the 3x3 game grid where items will appear
function createGrid() {
  const grid = document.querySelector('.game-grid');
  grid.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.style.position = 'relative'; // ensure effects position correctly
    grid.appendChild(cell);
  }
}

// Ensure the grid and stats are initialized when the page loads
createGrid();
document.getElementById('current-cans').textContent = 0;
document.getElementById('timer').textContent = 30;

// Drop types and their properties
const DROP_TYPES = [
  { name: 'blue', src: 'img/drop-small.png', points: 2, count: null },
  { name: 'orange', src: 'img/drop-small - orange.png', points: -3, count: 3 },
  { name: 'green', src: 'img/drop-small - green.png', points: 1, count: 3 },
  { name: 'yellow', src: 'img/drop-small - yellow.png', points: 0, count: 5 },
  { name: 'rainbow', src: 'img/rainbow drop.png', points: 5, count: 1 }
];

let dropQueue = [];
let dropsSpawned = 0;
const GRID_SIZE = 9;

function setupDropQueue(level = 1) {
  // Calculate how many drops we need for 30 seconds
  // At 800ms spawn rate = ~37 drops, at 400ms = ~75 drops
  // We'll create enough for worst case (fastest difficulty) with buffer
  const totalDropsNeeded = 100; // Enough for all difficulty levels
  
  // Base proportions for drop types
  let orangeCount = 12;  // Increased
  let greenCount = 12;   // Increased
  let yellowCount = 20;  // Increased
  if (level >= 4 && level <= 6) {
    orangeCount += 8;
    greenCount += 8;
    yellowCount += 8;
  }
  let rainbowCount = 4;  // Increased
  let blueCount = totalDropsNeeded - (orangeCount + greenCount + yellowCount + rainbowCount);
  
  dropQueue = [];
  dropQueue = dropQueue.concat(Array(orangeCount).fill('orange'));
  dropQueue = dropQueue.concat(Array(greenCount).fill('green'));
  dropQueue = dropQueue.concat(Array(yellowCount).fill('yellow'));
  dropQueue = dropQueue.concat(Array(rainbowCount).fill('rainbow'));
  dropQueue = dropQueue.concat(Array(blueCount).fill('blue'));
  
  // Shuffle dropQueue
  for (let i = dropQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dropQueue[i], dropQueue[j]] = [dropQueue[j], dropQueue[i]];
  }
  dropsSpawned = 0;
}

function getDropType(name) {
  return DROP_TYPES.find(d => d.name === name);
}

function getRandomConfettiColor() {
  const colors = ['#FFC907', '#2E9DF7', '#4FCB53', '#FF902A', '#F5402C', '#8BD1CB', '#F16061'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomRainbowColor() {
  const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Effects
function showConfettiExplosion(cell) {
  for (let i = 0; i < 20; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.position = 'absolute';
    confetti.style.left = '50%';
    confetti.style.top = '50%';
    confetti.style.transform = 'translate(-50%, -50%)';
    confetti.style.width = '10px';
    confetti.style.height = '10px';
    confetti.style.borderRadius = '50%';
    confetti.style.background = getRandomConfettiColor();
    confetti.style.zIndex = '10';
    confetti.style.opacity = '0.85';
    confetti.style.pointerEvents = 'none';
    confetti.style.animation = `confettiExplode 0.8s ${Math.random() * 0.3}s ease-out forwards`;
    cell.appendChild(confetti);
    setTimeout(() => confetti.remove(), 900);
  }
}

function shakeBoard() {
  const container = document.querySelector('.container');
  if (!container) return;
  container.classList.add('shake-board');
  setTimeout(() => container.classList.remove('shake-board'), 500);
}

function showOrangeSplash(cell) {
  const splash = document.createElement('div');
  splash.className = 'orange-splash-effect';
  splash.style.position = 'absolute';
  splash.style.left = '50%';
  splash.style.top = '50%';
  splash.style.transform = 'translate(-50%, -50%)';
  cell.appendChild(splash);
  setTimeout(() => splash.remove(), 500);
}

function showWaterSplash(cell) {
  // Create multiple ripple rings for enhanced effect
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const ripple = document.createElement('div');
      ripple.className = 'water-ripple-effect';
      ripple.style.position = 'absolute';
      ripple.style.left = '50%';
      ripple.style.top = '50%';
      ripple.style.transform = 'translate(-50%, -50%)';
      ripple.style.pointerEvents = 'none';
      ripple.style.animationDelay = `${i * 0.1}s`;
      cell.appendChild(ripple);
      setTimeout(() => ripple.remove(), 800);
    }, i * 100);
  }
}

function showRainbowConfettiShower() {
  let oldShower = document.getElementById('rainbow-confetti-shower');
  if (oldShower) oldShower.remove();
  const shower = document.createElement('div');
  shower.id = 'rainbow-confetti-shower';
  shower.style.position = 'fixed';
  shower.style.left = '0';
  shower.style.top = '0';
  shower.style.width = '100vw';
  shower.style.height = '100vh';
  shower.style.pointerEvents = 'none';
  shower.style.zIndex = '2000';
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'rainbow-confetti';
    confetti.style.position = 'absolute';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.top = '-40px';
    confetti.style.width = '16px';
    confetti.style.height = '16px';
    confetti.style.borderRadius = '50%';
    confetti.style.background = getRandomRainbowColor();
    confetti.style.opacity = '0.9';
    confetti.style.pointerEvents = 'none';
    confetti.style.animation = `rainbowConfettiAnim 1.2s ${Math.random()}s linear forwards`;
    shower.appendChild(confetti);
  }
  document.body.appendChild(shower);
  setTimeout(() => shower.remove(), 1400);
}

// Celebration effect when score reaches 25+
function showMilestoneCelebration() {
  const celebration = document.createElement('div');
  celebration.className = 'milestone-celebration';
  celebration.innerHTML = '<div class="milestone-text">Amazing! 25+ Drops!</div>';
  document.body.appendChild(celebration);
  
  // Add confetti burst
  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'milestone-confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.background = getRandomRainbowColor();
    confetti.style.animationDelay = `${Math.random() * 0.3}s`;
    celebration.appendChild(confetti);
  }
  
  // Reduced duration from 3000ms to 1500ms (half)
  setTimeout(() => celebration.remove(), 1500);
}

// Show charity:water mission popup
function showMissionPopup() {
  // Select a random water fact
  const randomFact = waterFacts[Math.floor(Math.random() * waterFacts.length)];
  
  const popup = document.createElement('div');
  popup.className = 'mission-popup';
  popup.innerHTML = `
    <div class="popup-content">
      <h2>💧 Clean Water Changes Everything</h2>
      <p>You just helped spread awareness about the global water crisis!</p>
      <p>${randomFact}</p>
      <div class="popup-buttons">
        <a href="https://www.charitywater.org/donate" target="_blank" class="popup-btn popup-btn-primary">Donate Now</a>
        <a href="https://www.charitywater.org/global-water-crisis" target="_blank" class="popup-btn">Learn More</a>
        <button class="popup-btn popup-btn-close" onclick="this.closest('.mission-popup').remove()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
}

// Spawns a new item in a random grid cell
function spawnWaterCan() {
  if (!gameActive) return;
  const cells = document.querySelectorAll('.grid-cell');
  const emptyCells = Array.from(cells).filter(cell => cell.innerHTML.trim() === '');
  if (emptyCells.length === 0) return;

  if (dropsSpawned >= dropQueue.length) return;
  const dropTypeName = dropQueue[dropsSpawned];
  const dropType = getDropType(dropTypeName);
  dropsSpawned++;

  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  randomCell.innerHTML = `
    <div class="water-can-wrapper">
      <img src="${dropType.src}" alt="${dropType.name} drop" class="drop-small drop-${dropType.name}" style="width:70px;height:70px;animation:popUp 0.5s cubic-bezier(0.17,0.67,0.34,2);" />
    </div>
  `;

  const drop = randomCell.querySelector('.drop-small');
  let dropRemoved = false;
  if (drop) {
    drop.addEventListener('click', function () {
      if (!gameActive || dropRemoved) return;
      dropRemoved = true;
      currentCans += dropType.points;
      if (currentCans < 0) currentCans = 0;
      document.getElementById('current-cans').textContent = currentCans;
      
      // Check for milestone celebration (25+ drops)
      if (currentCans >= 25 && !milestone25Celebrated) {
        milestone25Celebrated = true;
        setTimeout(() => showMilestoneCelebration(), 300);
      }
      
      if (dropType.name === 'rainbow') {
        showRainbowConfettiShower();
      } else if (dropType.name === 'blue') {
        showWaterSplash(randomCell);
      } else if (dropType.name === 'orange') {
        shakeBoard();
        showOrangeSplash(randomCell);
      } else {
        const splash = document.createElement('div');
        splash.className = 'splash-effect';
        splash.style.position = 'absolute';
        splash.style.left = '50%';
        splash.style.top = '50%';
        splash.style.transform = 'translate(-50%, -50%)';
        randomCell.appendChild(splash);
        setTimeout(() => splash.remove(), 500);
      }

      randomCell.innerHTML = '';
    });

    // Increased timeout for drops to stay longer (2500ms instead of 1250ms)
    setTimeout(() => {
      if (!dropRemoved) {
        dropRemoved = true;
        randomCell.innerHTML = '';
      }
    }, 2500);
  }
}

// Calculate spawn rate based on difficulty
function getSpawnRate() {
  // Start at 800ms, decrease by 100ms per difficulty level (min 400ms)
  return Math.max(400, 800 - (currentDifficulty - 1) * 100);
}

// Initializes and starts a new game
function startGame() {
  if (gameActive) return;
  gameActive = true;
  milestone25Celebrated = false;
  
  // Clear the grid and recreate it
  createGrid();
  
  // Reset and setup drop queue
  dropsSpawned = 0; // Reset drop counter
  setupDropQueue(currentDifficulty);
  
  // Reset timer
  timeLeft = 30;
  document.getElementById('timer').textContent = timeLeft;
  
  // Use dynamic spawn rate based on difficulty
  const spawnRate = getSpawnRate();
  spawnInterval = setInterval(spawnWaterCan, spawnRate);
  
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  gameActive = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  
  // Play game won sound
  audioGameWon.currentTime = 0; // Reset to start
  audioGameWon.play().catch(err => console.error('Audio play failed:', err));
  
  // Clear any remaining drops from the grid
  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach(cell => {
    cell.innerHTML = '';
  });
  
  // Increment games completed and check for difficulty increase
  gamesCompleted++;
  let difficultyChanged = false;
  if (gamesCompleted % 3 === 0) {
    currentDifficulty++;
    difficultyChanged = true;
    
    // Play new level sound immediately after game won sound (1.5 second delay)
    setTimeout(() => {
      audioNewLevel.currentTime = 0; // Reset to start
      audioNewLevel.play().catch(err => console.error('Audio play failed:', err));
    }, 1500);
    
    // Show difficulty increase notification
    const notif = document.createElement('div');
    notif.className = 'difficulty-notification';
    notif.textContent = `Level Up! Difficulty: ${currentDifficulty}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }
  
  // Show mission popup only after first game OR when difficulty increases
  const shouldShowPopup = (!hasPlayedOnce) || (difficultyChanged && currentDifficulty !== lastDifficultyPopup);
  if (shouldShowPopup) {
    hasPlayedOnce = true;
    lastDifficultyPopup = currentDifficulty;
    setTimeout(() => showMissionPopup(), 1000);
  }
  
  // Update button text to "Play Again" after first game
  if (hasPlayedOnce) {
    document.getElementById('start-game').textContent = 'Play Again';
  }
}

document.getElementById('start-game').addEventListener('click', function () {
  // Clear any existing intervals first
  if (spawnInterval) clearInterval(spawnInterval);
  if (timerInterval) clearInterval(timerInterval);
  
  // Reset game state completely
  gameActive = false;
  currentCans = 0;
  dropsSpawned = 0; // Reset drop counter
  document.getElementById('current-cans').textContent = currentCans;
  
  // Remove popups/effects
  const shower = document.getElementById('drop-shower');
  if (shower) shower.remove();
  const popup = document.querySelector('.mission-popup');
  if (popup) popup.remove();
  
  // Clear the grid before starting
  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach(cell => {
    cell.innerHTML = '';
  });
  
  startGame();
});

document.getElementById('reset-game').addEventListener('click', function () {
  endGame();
  currentCans = 0;
  document.getElementById('current-cans').textContent = currentCans;
  timeLeft = 30;
  document.getElementById('timer').textContent = timeLeft;
  dropsSpawned = 0; // Reset drop counter
  createGrid();
  const shower = document.getElementById('drop-shower');
  if (shower) shower.remove();
  const popup = document.querySelector('.mission-popup');
  if (popup) popup.remove();
  // Reset difficulty on manual reset
  gamesCompleted = 0;
  currentDifficulty = 1;
  
  // Reset to "Play Now" when game is fully reset
  hasPlayedOnce = false;
  lastDifficultyPopup = 0;
  document.getElementById('start-game').textContent = 'Play Now';
  
  // Show How to Play popup when Reset is clicked
  setTimeout(() => showHowToPlay(), 500);
});

// How to Play link handler
document.getElementById('howto-link').addEventListener('click', function (e) {
  e.preventDefault();
  showHowToPlay();
});
          showRainbowConfettiShower();
