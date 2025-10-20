// Clean, single-version script.js
// Game configuration and state variables
// Clean, single-version script.js

// Game configuration and state variables
const GOAL_CANS = 40; // Total drops needed to collect for first mission (doubled)
let currentCans = 0; // Current number of drops collected
let gameActive = false; // Tracks if game is currently running
let spawnInterval; // Holds the interval for spawning items
let timerInterval; // Holds the interval for the timer
let timeLeft = 30; // Standard game time in seconds

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
let currentLevel = 1;
const GRID_SIZE = 9;

function setupDropQueue(level = 1) {
  let orangeCount = 6;
  let greenCount = 6;
  let yellowCount = 10;
  if (level >= 4 && level <= 6) {
    orangeCount += 6;
    greenCount += 6;
    yellowCount += 6;
  }
  let rainbowCount = 2;
  let blueCount = GOAL_CANS - (orangeCount + greenCount + yellowCount + rainbowCount);
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
  console.log('showWaterSplash called for cell:', cell);
  const ripple = document.createElement('div');
  ripple.className = 'water-ripple-effect';
  ripple.style.position = 'absolute';
  ripple.style.left = '50%';
  ripple.style.top = '50%';
  ripple.style.transform = 'translate(-50%, -50%)';
  ripple.style.pointerEvents = 'none';
  cell.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

function showRainbowConfettiShower() {
  console.log('showRainbowConfettiShower called');
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
      console.log('Drop clicked:', dropType.name);
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

      if (currentCans >= GOAL_CANS) {
        endGame();
      }

      randomCell.innerHTML = '';
    });

    setTimeout(() => {
      if (!dropRemoved) {
        dropRemoved = true;
        randomCell.innerHTML = '';
      }
    }, 1250);
  }
}

// Initializes and starts a new game
function startGame() {
  if (gameActive) return;
  gameActive = true;
  createGrid();
  setupDropQueue(currentLevel);
  timeLeft = 30;
  document.getElementById('timer').textContent = timeLeft;
  spawnInterval = setInterval(spawnWaterCan, 1000);
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
}

document.getElementById('start-game').addEventListener('click', function () {
  currentCans = 0;
  document.getElementById('current-cans').textContent = currentCans;
  const shower = document.getElementById('drop-shower');
  if (shower) shower.remove();
  currentLevel = 1;
  startGame();
});

document.getElementById('reset-game').addEventListener('click', function () {
  endGame();
  currentCans = 0;
  document.getElementById('current-cans').textContent = currentCans;
  timeLeft = 30;
  document.getElementById('timer').textContent = timeLeft;
  createGrid();
  const shower = document.getElementById('drop-shower');
  if (shower) shower.remove();
});
          showRainbowConfettiShower();
