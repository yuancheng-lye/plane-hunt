/**
 * 炸飞机 - Game Logic
 * ============================================================
 * Modules:
 *   1. Plane Templates & Generation
 *   2. Board State Management
 *   3. Single Player Mode
 *   4. Two Player — Desktop (two boards)
 *   5. Two Player — Mobile (one shared board)
 *   6. Dice Logic
 *   7. Board & Legend Rendering
 *   8. Sound Effects
 *   9. Result Modal & Confetti
 *  10. Screen Navigation
 * ============================================================
 */

'use strict';

// ============================================================
// 1. PLANE TEMPLATES & GENERATION
// ============================================================

/**
 * Fighter jet — 5×3, 8 cells
 * Narrow body, mid wings, forked tail stabilizers.
 *
 *   . H .    nose
 *   . B .    fuselage
 *   B B B    main wings
 *   . B .    fuselage
 *   B . B    tail stabilizers (forked)
 */
const PLANE_FIGHTER = {
  name:  '战斗机',
  cells: [[0,1],[1,1],[2,0],[2,1],[2,2],[3,1],[4,0],[4,2]],
  head:  [0, 1],
  rows: 5,
  cols: 3
};

/**
 * Airliner — 5×5, 11 cells
 * Wide main wings, narrower tail stabilizers, classic silhouette.
 *
 *   . . H . .    nose
 *   . . B . .    fuselage
 *   B B B B B    main wings (5 wide)
 *   . . B . .    fuselage
 *   . B B B .    tail stabilizers (3 wide)
 */
const PLANE_AIRLINER = {
  name:  '客机',
  cells: [[0,2],[1,2],[2,0],[2,1],[2,2],[2,3],[2,4],[3,2],[4,1],[4,2],[4,3]],
  head:  [0, 2],
  rows: 5,
  cols: 5
};

/**
 * Delta / stealth bomber — 4×5, 10 cells
 * Short body, swept delta wings expand toward the tail, single tail tip.
 *
 *   . . H . .    nose
 *   . B B B .    swept inner wings
 *   B B B B B    full-span delta wings
 *   . . B . .    tail
 */
const PLANE_DELTA = {
  name:  '隐身机',
  cells: [[0,2],[1,1],[1,2],[1,3],[2,0],[2,1],[2,2],[2,3],[2,4],[3,2]],
  head:  [0, 2],
  rows: 4,
  cols: 5
};

/**
 * Twin-wing bomber — 6×3, 10 cells
 * Long narrow fuselage with two full sets of wings (front + rear).
 *
 *   . H .    nose
 *   . B .    fuselage
 *   B B B    front wings
 *   . B .    fuselage
 *   B B B    rear wings
 *   . B .    tail
 */
const PLANE_BOMBER = {
  name:  '轰炸机',
  cells: [[0,1],[1,1],[2,0],[2,1],[2,2],[3,1],[4,0],[4,1],[4,2],[5,1]],
  head:  [0, 1],
  rows: 6,
  cols: 3
};

/**
 * Concorde / supersonic — 5×3, 8 cells
 * Long fuselage, wings mounted far back, forked tail.
 *
 *   . H .    nose
 *   . B .    fuselage
 *   . B .    fuselage
 *   B B B    rear delta wings
 *   B . B    twin tail fins
 */
const PLANE_CONCORDE = {
  name:  '超音速客机',
  cells: [[0,1],[1,1],[2,1],[3,0],[3,1],[3,2],[4,0],[4,2]],
  head:  [0, 1],
  rows: 5,
  cols: 3
};

/**
 * Heavy transport — 3×7, 9 cells
 * Extremely wide wing span, very short body — like a flying wing cargo plane.
 *
 *   . . . H . . .    nose
 *   B B B B B B B    full-span wings (7 wide)
 *   . . . B . . .    tail
 */
const PLANE_TRANSPORT = {
  name:  '运输机',
  cells: [[0,3],[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[2,3]],
  head:  [0, 3],
  rows: 3,
  cols: 7
};

/**
 * Canard fighter — 5×5, 10 cells
 * Small canard wings near nose + large rear main wings.
 *
 *   . . H . .    nose
 *   . B . B .    canard wings (two stubs)
 *   . . B . .    fuselage
 *   B B B B B    main wings
 *   . . B . .    tail
 */
const PLANE_CANARD = {
  name:  '鸭翼战机',
  cells: [[0,2],[1,1],[1,3],[2,2],[3,0],[3,1],[3,2],[3,3],[3,4],[4,2]],
  head:  [0, 2],
  rows: 5,
  cols: 5
};

/**
 * Twin-boom fighter — 5×5, 11 cells
 * Wide main wings with twin tail booms extending rearward (P-38 style).
 *
 *   . . H . .    nose
 *   . . B . .    fuselage
 *   B B B B B    main wings
 *   . B . B .    twin tail booms
 *   . B . B .    tail boom tips
 */
const PLANE_TWINTAIL = {
  name:  '双尾战机',
  cells: [[0,2],[1,2],[2,0],[2,1],[2,2],[2,3],[2,4],[3,1],[3,3],[4,1],[4,3]],
  head:  [0, 2],
  rows: 5,
  cols: 5
};

/** Rotate a plane template 90° clockwise; normalize to origin. */
function rotateCW(tmpl) {
  const maxRow  = tmpl.rows - 1;
  const raw     = tmpl.cells.map(([r, c]) => [c, maxRow - r]);
  const rawHead = [tmpl.head[1], maxRow - tmpl.head[0]];
  const minR    = Math.min(...raw.map(([r]) => r));
  const minC    = Math.min(...raw.map(([, c]) => c));
  const cells   = raw.map(([r, c]) => [r - minR, c - minC]);
  const head    = [rawHead[0] - minR, rawHead[1] - minC];
  const rows    = Math.max(...cells.map(([r]) => r)) + 1;
  const cols    = Math.max(...cells.map(([, c]) => c)) + 1;
  return { cells, head, rows, cols };
}

const DIRECTIONS = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

/** Pre-compute all 4 rotations for a base template, carrying the name. */
function buildRotations(base) {
  return {
    name:  base.name,
    UP:    base,
    RIGHT: rotateCW(base),
    DOWN:  rotateCW(rotateCW(base)),
    LEFT:  rotateCW(rotateCW(rotateCW(base)))
  };
}

/** All template sets — one entry per plane type, each with 4 rotations. */
const ALL_TEMPLATES = [
  PLANE_FIGHTER, PLANE_AIRLINER, PLANE_DELTA, PLANE_BOMBER,
  PLANE_CONCORDE, PLANE_TRANSPORT, PLANE_CANARD, PLANE_TWINTAIL
].map(buildRotations);

/** Track last used template index to avoid repeating the same shape consecutively. */
let _lastTmplIdx = -1;

/** Generate a randomly-placed plane on the 10×10 grid. */
function generatePlane() {
  let idx;
  do { idx = Math.floor(Math.random() * ALL_TEMPLATES.length); }
  while (idx === _lastTmplIdx && ALL_TEMPLATES.length > 1);
  _lastTmplIdx = idx;
  const tmplSet = ALL_TEMPLATES[idx];
  const dir     = DIRECTIONS[Math.floor(Math.random() * 4)];
  const tmpl    = tmplSet[dir];
  const anchorR = Math.floor(Math.random() * (10 - tmpl.rows + 1));
  const anchorC = Math.floor(Math.random() * (10 - tmpl.cols + 1));
  return {
    cells:    tmpl.cells.map(([r, c]) => [anchorR + r, anchorC + c]),
    head:     [anchorR + tmpl.head[0], anchorC + tmpl.head[1]],
    direction: dir,
    tmplSet
  };
}

// ============================================================
// 2. BOARD STATE MANAGEMENT
// ============================================================

const S = {
  EMPTY:         'empty',
  MISS:          'miss',
  HIT:           'hit',
  HEAD_HIT:      'headhit',
  REVEALED:      'revealed',
  REVEALED_HEAD: 'revealed-head'
};

function createBoardState() {
  return Array.from({ length: 10 }, () => Array(10).fill(S.EMPTY));
}

/** Attack a cell. Mutates board. Returns 'headhit'|'hit'|'miss'|null. */
function attackCell(board, plane, r, c) {
  if (board[r][c] !== S.EMPTY) return null;
  const isHead = plane.head[0] === r && plane.head[1] === c;
  const isBody = plane.cells.some(([pr, pc]) => pr === r && pc === c);
  if (isHead)      { board[r][c] = S.HEAD_HIT; return 'headhit'; }
  else if (isBody) { board[r][c] = S.HIT;      return 'hit'; }
  else             { board[r][c] = S.MISS;     return 'miss'; }
}

function isPlaneDestroyed(board, plane) {
  return plane.cells.every(([r, c]) =>
    board[r][c] === S.HIT || board[r][c] === S.HEAD_HIT
  );
}

function revealPlane(board, plane) {
  plane.cells.forEach(([r, c]) => {
    if (board[r][c] === S.EMPTY) {
      board[r][c] = (plane.head[0] === r && plane.head[1] === c)
        ? S.REVEALED_HEAD : S.REVEALED;
    }
  });
}

// ============================================================
// 3. SINGLE PLAYER MODE
// ============================================================

const MAX_ATTEMPTS = 15;
let sp = null;

function startSinglePlayer() {
  gameMode = 'single';
  sp = {
    plane:        generatePlane(),
    board:        createBoardState(),
    attemptsLeft: MAX_ATTEMPTS,
    gameOver:     false,
    won:          false
  };
  showScreen('screen-single');
  renderBoard('board-single', sp.board, handleSingleClick);
  renderLegendGrid('lg-grid-single', 15, sp.plane.tmplSet);
  refreshSingleInfo(null);
}

function handleSingleClick(row, col) {
  if (!sp || sp.gameOver) return;
  if (sp.board[row][col] !== S.EMPTY) return;

  sp.attemptsLeft--;
  const result = attackCell(sp.board, sp.plane, row, col);

  let icon, text;
  if (result === 'headhit') {
    sp.won = sp.gameOver = true;
    icon = '💥'; text = '命中机头！直接获胜！';
  } else if (result === 'hit') {
    if (isPlaneDestroyed(sp.board, sp.plane)) {
      sp.won = sp.gameOver = true;
      icon = '🏆'; text = '整架飞机被摧毁！获胜！';
    } else {
      icon = '💣'; text = `炸到了！还有 ${sp.attemptsLeft} 次机会`;
    }
  } else {
    icon = '〇'; text = `未命中，还剩 ${sp.attemptsLeft} 次机会`;
  }

  if (!sp.gameOver && sp.attemptsLeft === 0) {
    sp.gameOver = true; sp.won = false;
    icon = '💔'; text = '机会耗尽！飞机成功逃跑……';
  }

  updateBoardCell('board-single', row, col, sp.board[row][col]);
  animateCell('board-single', row, col, result);
  playSound(result);

  if (sp.gameOver) {
    revealPlane(sp.board, sp.plane);
    updateRevealedCells('board-single', sp.board);
  }
  refreshSingleInfo({ icon, text });

  if (sp.gameOver) {
    const title = sp.won ? '任务完成！' : '任务失败！';
    const msg   = sp.won
      ? (result === 'headhit' ? '一发命中机头，神射手！' : '炸弹全铺开，飞机无处遁形！')
      : '飞机藏得太深，下次再来！';
    const dirNames   = { UP:'朝上', RIGHT:'朝右', DOWN:'朝下', LEFT:'朝左' };
    const used       = MAX_ATTEMPTS - sp.attemptsLeft;
    const hits       = sp.board.flat().filter(s => s === S.HIT || s === S.HEAD_HIT).length;
    const misses     = used - hits;
    const statsHtml  = `
      <div class="stat-row"><span class="stat-label">飞机机型</span><span class="stat-val">${sp.plane.tmplSet.name}</span></div>
      <div class="stat-row"><span class="stat-label">飞机朝向</span><span class="stat-val">${dirNames[sp.plane.direction]}</span></div>
      <div class="stat-row"><span class="stat-label">共投炸弹</span><span class="stat-val">${used} 次</span></div>
      <div class="stat-row"><span class="stat-label">命中机身</span><span class="stat-val">${hits} 格</span></div>
      <div class="stat-row"><span class="stat-label">落空次数</span><span class="stat-val">${misses} 次</span></div>
    `;
    setTimeout(() => showResultModal(sp.won ? 'win' : 'lose', title, msg, statsHtml), 1200);
  }
}

function refreshSingleInfo(msg) {
  const n  = sp.attemptsLeft;
  const el = document.getElementById('attempts-left');
  el.textContent = n;
  el.className   = 'info-value' + (n <= 5 ? ' danger' : n <= 10 ? ' warn' : '');

  const fill = document.getElementById('attempts-fill');
  fill.style.width      = (n / MAX_ATTEMPTS * 100) + '%';
  fill.style.background = n <= 5 ? 'var(--danger)' : n <= 10 ? 'var(--warning)' : 'var(--success)';

  if (msg) {
    document.getElementById('single-message').innerHTML =
      `<span class="msg-icon">${msg.icon}</span><span class="msg-text">${msg.text}</span>`;
  }
}

function restartSingle() {
  sp = {
    plane:        generatePlane(),
    board:        createBoardState(),
    attemptsLeft: MAX_ATTEMPTS,
    gameOver:     false,
    won:          false
  };
  renderBoard('board-single', sp.board, handleSingleClick);
  renderLegendGrid('lg-grid-single', 15, sp.plane.tmplSet);
  refreshSingleInfo(null);
  document.getElementById('single-message').innerHTML =
    '<span class="msg-icon">🎯</span><span class="msg-text">点击格子开始搜索飞机</span>';
}

// ============================================================
// 4. TWO PLAYER — DESKTOP (two boards, each player hides a plane)
// ============================================================

let tp  = null;  // desktop two-player state
let tpm = null;  // mobile two-player state

/** Returns true when the viewport is "mobile-width". */
function isMobile() {
  return window.innerWidth <= 640;
}

function startTwoPlayer() {
  gameMode = 'two';
  tp = tpm = null;

  if (isMobile()) {
    // One shared board, one plane
    tpm = {
      plane:           generatePlane(),
      board:           createBoardState(),
      owner:           Array.from({length:10}, () => Array(10).fill(-1)),
      currentAttacker: null,
      hits:            [0, 0],
      gameOver:        false,
      winner:          null
    };
  } else {
    // Each player defends their own plane
    tp = {
      players: [
        { name: '玩家 1', plane: generatePlane(), board: createBoardState() },
        { name: '玩家 2', plane: generatePlane(), board: createBoardState() }
      ],
      currentAttacker: null,
      gameOver:        false,
      winner:          null
    };
  }

  showScreen('screen-two');
  document.getElementById('dice-section').style.display  = 'flex';
  document.getElementById('battle-section').style.display = 'none';
  document.getElementById('battle-mobile').style.display  = 'none';
  resetDiceUI();
}

/** Desktop: P{defenderIdx+1}'s board is attacked. */
function handleTwoPlayerAttack(defenderIdx, row, col) {
  if (!tp || tp.gameOver) return;
  if (tp.currentAttacker === defenderIdx) return;

  const defender = tp.players[defenderIdx];
  if (defender.board[row][col] !== S.EMPTY) return;

  const result  = attackCell(defender.board, defender.plane, row, col);
  const boardId = `board-p${defenderIdx + 1}`;

  updateBoardCell(boardId, row, col, defender.board[row][col]);
  animateCell(boardId, row, col, result);
  playSound(result);

  const won = result === 'headhit' || isPlaneDestroyed(defender.board, defender.plane);

  if (won) {
    tp.gameOver = true;
    tp.winner   = tp.currentAttacker;
    revealPlane(defender.board, defender.plane);
    updateRevealedCells(boardId, defender.board);

    const attackerName = tp.players[tp.currentAttacker].name;
    const winMsg = result === 'headhit' ? '命中机头，一击制胜！' : '炸毁整架飞机，完美歼灭！';
    const dirNames   = { UP:'朝上', RIGHT:'朝右', DOWN:'朝下', LEFT:'朝左' };
    const defPlane   = defender.plane;
    const boardFlat  = defender.board.flat();
    const hits       = boardFlat.filter(s => s === S.HIT || s === S.HEAD_HIT).length;
    const misses     = boardFlat.filter(s => s === S.MISS).length;
    const statsHtml  = `
      <div class="stat-row"><span class="stat-label">被攻防区</span><span class="stat-val">${tp.players[defenderIdx].name}</span></div>
      <div class="stat-row"><span class="stat-label">飞机机型</span><span class="stat-val">${defPlane.tmplSet.name}</span></div>
      <div class="stat-row"><span class="stat-label">飞机朝向</span><span class="stat-val">${dirNames[defPlane.direction]}</span></div>
      <div class="stat-row"><span class="stat-label">命中格数</span><span class="stat-val">${hits} 格</span></div>
      <div class="stat-row"><span class="stat-label">落空次数</span><span class="stat-val">${misses} 次</span></div>
    `;
    setTimeout(() => showResultModal('win', `${attackerName} 获胜！`, winMsg, statsHtml), 1200);
  } else {
    setTimeout(() => {
      tp.currentAttacker = 1 - tp.currentAttacker;
      renderBattleBoards();
      updateTurnUI();
    }, 700);
  }
}

function renderBattleBoards() {
  const attacker = tp.currentAttacker;
  renderBoard('board-p1', tp.players[0].board,
    attacker === 1 ? (r, c) => handleTwoPlayerAttack(0, r, c) : null);
  renderBoard('board-p2', tp.players[1].board,
    attacker === 0 ? (r, c) => handleTwoPlayerAttack(1, r, c) : null);

  const a1 = document.getElementById('area-p1');
  const a2 = document.getElementById('area-p2');
  if (attacker === 0) {
    a1.className = 'player-board-area inactive';
    a2.className = 'player-board-area active-target';
    document.getElementById('hint-p1').textContent = '';
    document.getElementById('hint-p2').textContent = '← 点击攻击';
  } else {
    a1.className = 'player-board-area active-target';
    a2.className = 'player-board-area inactive';
    document.getElementById('hint-p1').textContent = '← 点击攻击';
    document.getElementById('hint-p2').textContent = '';
  }
}

function updateTurnUI() {
  const attacker     = tp.currentAttacker;
  const attackerName = tp.players[attacker].name;
  const defenderName = tp.players[1 - attacker].name;
  const indicator    = document.getElementById('turn-indicator');
  indicator.className = `turn-indicator ${attacker === 1 ? 'p2-turn' : ''}`;
  document.getElementById('turn-text').textContent =
    `${attackerName} 正在攻击 ${defenderName} 的防区`;
}

function restartTwo() { startTwoPlayer(); }

// ============================================================
// 5. TWO PLAYER — MOBILE (one shared board, one plane)
// ============================================================

function handleMobileTwoPlayerClick(row, col) {
  if (!tpm || tpm.gameOver) return;
  if (tpm.board[row][col] !== S.EMPTY) return;

  const attacker = tpm.currentAttacker;
  const result   = attackCell(tpm.board, tpm.plane, row, col);
  tpm.owner[row][col] = attacker;

  updateBoardCell('board-mobile', row, col, tpm.board[row][col], attacker);
  animateCell('board-mobile', row, col, result);
  playSound(result);

  if (result === 'hit' || result === 'headhit') tpm.hits[attacker]++;
  updateMobileScoreboard();

  const won = result === 'headhit' || isPlaneDestroyed(tpm.board, tpm.plane);

  if (won) {
    tpm.gameOver = true;
    tpm.winner   = attacker;
    revealPlane(tpm.board, tpm.plane);
    updateRevealedCells('board-mobile', tpm.board);

    const winnerName = `玩家 ${attacker + 1}`;
    const winMsg = result === 'headhit' ? '命中机头，一击制胜！' : '炸毁整架飞机，完美歼灭！';
    const dirNames  = { UP:'朝上', RIGHT:'朝右', DOWN:'朝下', LEFT:'朝左' };
    const statsHtml = `
      <div class="stat-row"><span class="stat-label">飞机机型</span><span class="stat-val">${tpm.plane.tmplSet.name}</span></div>
      <div class="stat-row"><span class="stat-label">飞机朝向</span><span class="stat-val">${dirNames[tpm.plane.direction]}</span></div>
      <div class="stat-row"><span class="stat-label">玩家 1 命中</span><span class="stat-val">${tpm.hits[0]} 格</span></div>
      <div class="stat-row"><span class="stat-label">玩家 2 命中</span><span class="stat-val">${tpm.hits[1]} 格</span></div>
    `;
    setTimeout(() => showResultModal('win', `${winnerName} 获胜！`, winMsg, statsHtml), 1200);
  } else {
    // Switch turn
    tpm.currentAttacker = 1 - attacker;
    updateMobileTurnUI();
    // Re-render so click handler points to new attacker context
    renderBoard('board-mobile', tpm.board, handleMobileTwoPlayerClick, tpm.owner);
  }
}

function updateMobileTurnUI() {
  const attacker  = tpm.currentAttacker;
  const indicator = document.getElementById('turn-ind-mobile');
  indicator.className = `turn-indicator ${attacker === 1 ? 'p2-turn' : ''}`;
  document.getElementById('turn-text-mobile').textContent = `玩家 ${attacker + 1} 出击`;

  document.getElementById('mscore-p1').className =
    'mscore-item' + (attacker === 0 ? ' active' : '');
  document.getElementById('mscore-p2').className =
    'mscore-item' + (attacker === 1 ? ' active' : '');
}

function updateMobileScoreboard() {
  document.getElementById('mhits-p1').textContent = tpm.hits[0];
  document.getElementById('mhits-p2').textContent = tpm.hits[1];
}

// ============================================================
// 6. DICE LOGIC
// ============================================================

let diceAnimInterval = null;

function rollDice() {
  const btn = document.getElementById('roll-btn');
  btn.disabled  = true;
  btn.textContent = '🎲 掷骰中…';
  document.getElementById('dice-result-msg').textContent = '';
  document.getElementById('dice-label-1').textContent = '';
  document.getElementById('dice-label-2').textContent = '';

  let count = 0;
  diceAnimInterval = setInterval(() => {
    setDiceFace('dice-1', randDice(), 'rolling');
    setDiceFace('dice-2', randDice(), 'rolling');
    if (++count >= 24) { clearInterval(diceAnimInterval); finalizeDice(); }
  }, 70);
}

function finalizeDice() {
  let d1, d2;
  do { d1 = randDice(); d2 = randDice(); } while (d1 === d2);

  setDiceFace('dice-1', d1, 'final');
  setDiceFace('dice-2', d2, 'final');

  const winner      = d1 > d2 ? 0 : 1;
  const loser       = 1 - winner;
  const winnerVal   = d1 > d2 ? d1 : d2;
  const loserVal    = d1 > d2 ? d2 : d1;
  const winnerLabel = `玩家 ${winner + 1}`;

  // Set first attacker
  if (isMobile() && tpm) { tpm.currentAttacker = winner; }
  else if (tp)            { tp.currentAttacker  = winner; }

  setTimeout(() => {
    document.getElementById(`dice-${winner + 1}`).classList.add('winner-dice');
    document.getElementById(`dice-label-${winner + 1}`).textContent = `${winnerVal} 点 — 先手！`;
    document.getElementById(`dice-label-${loser  + 1}`).textContent = `${loserVal} 点`;
    document.getElementById('dice-result-msg').textContent =
      `${winnerLabel} 投出 ${winnerVal} 点，率先出击！`;
    playSound('win');
  }, 100);

  setTimeout(startBattle, 2400);
}

function startBattle() {
  document.getElementById('dice-section').style.display = 'none';

  if (isMobile() && tpm) {
    // ── Mobile: one shared board ──
    document.getElementById('battle-mobile').style.display = 'flex';
    renderBoard('board-mobile', tpm.board, handleMobileTwoPlayerClick, tpm.owner);
    updateMobileTurnUI();
    updateMobileScoreboard();
    renderLegendGrid('lg-grid-mobile', 12, tpm.plane.tmplSet);
  } else {
    // ── Desktop: two boards ──
    document.getElementById('battle-section').style.display = 'flex';
    renderBattleBoards();
    updateTurnUI();
    renderLegendGrid('lg-grid-two', 11);
  }
}


function resetDiceUI() {
  setDiceFace('dice-1', null, '');
  setDiceFace('dice-2', null, '');
  document.getElementById('dice-label-1').textContent = '';
  document.getElementById('dice-label-2').textContent = '';
  document.getElementById('dice-result-msg').textContent = '';
  const btn = document.getElementById('roll-btn');
  btn.disabled    = false;
  btn.textContent = '🎲 掷骰子';
}

function setDiceFace(id, value, cls) {
  const el = document.getElementById(id);
  el.textContent = value ? DICE_FACES[value - 1] : '?';
  el.className   = `dice-face ${cls}`;
}

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const randDice   = () => Math.floor(Math.random() * 6) + 1;

// ============================================================
// 7. BOARD & LEGEND RENDERING
// ============================================================

const COL_LABELS   = ['A','B','C','D','E','F','G','H','I','J'];
const CELL_SYMBOLS = {
  [S.EMPTY]: '', [S.MISS]: '○', [S.HIT]: '✕',
  [S.HEAD_HIT]: '★', [S.REVEALED]: '·', [S.REVEALED_HEAD]: '◆'
};

function renderBoard(containerId, boardState, onCellClick, ownerBoard) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  container.className = `board-grid ${onCellClick ? '' : 'readonly'}`;

  // Header row
  const hdr = makeRow();
  hdr.appendChild(makeLabel(''));
  COL_LABELS.forEach(l => hdr.appendChild(makeLabel(l)));
  container.appendChild(hdr);

  for (let r = 0; r < 10; r++) {
    const row = makeRow();
    row.appendChild(makeLabel(r + 1));
    for (let c = 0; c < 10; c++) {
      const cell = makeCell(r, c, boardState[r][c]);
      if (ownerBoard && ownerBoard[r][c] >= 0) cell.dataset.player = ownerBoard[r][c];
      if (onCellClick) cell.addEventListener('click', () => onCellClick(r, c));
      row.appendChild(cell);
    }
    container.appendChild(row);
  }
}

function makeRow()  { const el = document.createElement('div'); el.className = 'board-row'; return el; }
function makeLabel(t) {
  const el = document.createElement('div');
  el.className   = 'board-label';
  el.textContent = t;
  return el;
}
function makeCell(r, c, state) {
  const el = document.createElement('div');
  el.className   = 'cell';
  el.dataset.row = r; el.dataset.col = c; el.dataset.state = state;
  el.textContent = CELL_SYMBOLS[state] ?? '';
  return el;
}

function updateBoardCell(containerId, row, col, state, player) {
  const cell = document.querySelector(`#${containerId} [data-row="${row}"][data-col="${col}"]`);
  if (!cell) return;
  cell.dataset.state = state;
  cell.textContent   = CELL_SYMBOLS[state] ?? '';
  if (player !== undefined) cell.dataset.player = player;
}
function updateRevealedCells(containerId, boardState) {
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) {
      const s = boardState[r][c];
      if (s === S.REVEALED || s === S.REVEALED_HEAD) updateBoardCell(containerId, r, c, s);
    }
}
function animateCell(containerId, row, col, result) {
  const cell = document.querySelector(`#${containerId} [data-row="${row}"][data-col="${col}"]`);
  if (!cell) return;
  const cls = result === 'headhit' ? 'anim-headhit' : result === 'hit' ? 'anim-hit' : 'anim-miss';
  cell.classList.add(cls);
  setTimeout(() => cell.classList.remove(cls), 800);
}

// ── Legend Grid ──

/**
 * Render a random-direction mini plane into a legend grid element.
 * @param {string} gridId  - DOM id of the .lg-grid element
 * @param {number} cellPx  - pixel size for each mini cell
 */
function renderLegendGrid(gridId, cellPx, tmplSet) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  // Use provided tmplSet (actual plane shape) or pick random — direction is always random
  const set  = tmplSet || ALL_TEMPLATES[Math.floor(Math.random() * ALL_TEMPLATES.length)];
  const dir  = DIRECTIONS[Math.floor(Math.random() * 4)];
  const tmpl = set[dir];

  // Update plane name label (id: lg-grid-X → lg-name-X)
  const nameEl = document.getElementById(gridId.replace('lg-grid-', 'lg-name-'));
  if (nameEl) nameEl.textContent = set.name;

  grid.style.gridTemplateColumns = `repeat(${tmpl.cols}, ${cellPx}px)`;
  grid.style.gridTemplateRows    = `repeat(${tmpl.rows}, ${cellPx}px)`;
  grid.innerHTML = '';

  const headKey  = `${tmpl.head[0]},${tmpl.head[1]}`;
  const cellKeys = new Set(tmpl.cells.map(([r, c]) => `${r},${c}`));

  for (let r = 0; r < tmpl.rows; r++) {
    for (let c = 0; c < tmpl.cols; c++) {
      const key = `${r},${c}`;
      const el  = document.createElement('div');
      if (key === headKey) {
        el.className   = 'lg h';
        el.textContent = '★';
      } else if (cellKeys.has(key)) {
        el.className = 'lg b';
      } else {
        el.className = 'lg e';
      }
      grid.appendChild(el);
    }
  }

  // Pop animation
  grid.classList.remove('legend-pop');
  void grid.offsetWidth; // force reflow so animation restarts
  grid.classList.add('legend-pop');
}

// ============================================================
// 8. SOUND EFFECTS (Web Audio API)
// ============================================================

let audioCtx     = null;
let soundEnabled = true;

function getAudioCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
}

function tone(freq, dur, type = 'sine', gainVal = 0.25) {
  try {
    const ctx  = getAudioCtx(); if (!ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.type = type;
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch (_) {}
}

function playSound(type) {
  if (!soundEnabled) return;
  switch (type) {
    case 'miss':
      tone(220, 0.25, 'sine', 0.2); break;
    case 'hit':
      tone(380, 0.1, 'square', 0.3);
      setTimeout(() => tone(260, 0.15, 'square', 0.25), 90);
      setTimeout(() => tone(180, 0.25, 'sawtooth', 0.2), 180);
      break;
    case 'headhit':
      tone(880, 0.08, 'square', 0.35);
      setTimeout(() => tone(1100, 0.08, 'square', 0.3), 90);
      setTimeout(() => tone(1320, 0.12, 'square', 0.3), 180);
      setTimeout(() => tone(880, 0.3, 'sine', 0.2), 280);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => tone(f, 0.28, 'sine', 0.25), i * 130));
      break;
    default: break;
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  document.getElementById('sound-toggle').textContent = soundEnabled ? '🔊' : '🔇';
}

// ============================================================
// 9. RESULT MODAL & CONFETTI
// ============================================================

function showResultModal(type, title, msg, statsHtml) {
  document.getElementById('result-icon').textContent  = type === 'win' ? '🏆' : '💔';
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-msg').textContent   = msg;
  const statsEl = document.getElementById('result-stats');
  if (statsHtml) {
    statsEl.innerHTML     = statsHtml;
    statsEl.style.display = 'block';
  } else {
    statsEl.style.display = 'none';
  }
  document.getElementById('overlay-result').style.display = 'flex';
  if (type === 'win') { playSound('win'); launchConfetti(); }
}

function playAgain() {
  document.getElementById('overlay-result').style.display = 'none';
  if (gameMode === 'single') restartSingle();
  else if (gameMode === 'ai') restartAI();
  else                       restartTwo();
}

function launchConfetti() {
  const COLORS = ['#3b82f6','#f97066','#10b981','#f59e0b','#8b5cf6','#06b6d4'];
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left              = `${Math.random() * 100}%`;
      el.style.backgroundColor   = COLORS[Math.floor(Math.random() * COLORS.length)];
      el.style.animationDuration = `${1 + Math.random() * 2}s`;
      el.style.animationDelay    = `${Math.random() * 0.3}s`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }, i * 40);
  }
}

// ============================================================
// 10. AI ENGINE — Smart plane hunter
// ============================================================

const AI = {
  board: null,
  plane: null,
  knowledge: null,
  hitCells: null,
  adjacentPQ: null,

  reset(board, plane) {
    this.board = board;
    this.plane = plane;
    this.knowledge = Array.from({ length: 10 }, () => Array(10).fill(0));
    this.hitCells = [];
    this.adjacentPQ = [];
    this._recalcKnowledge();
  },

  _inBounds(r, c) { return r >= 0 && r < 10 && c >= 0 && c < 10; },

  _neighbors(r, c) {
    return [[-1,0],[1,0],[0,-1],[0,1]]
      .map(([dr, dc]) => [r + dr, c + dc])
      .filter(([nr, nc]) => this._inBounds(nr, nc));
  },

  _recalcKnowledge() {
    const b = this.board;
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        if (b[r][c] !== S.EMPTY) this.knowledge[r][c] = -1;
        else this.knowledge[r][c] = 0;

    for (let ar = 0; ar < 10; ar++) {
      for (let ac = 0; ac < 10; ac++) {
        for (const tmplSet of ALL_TEMPLATES) {
          for (const dir of DIRECTIONS) {
            const tmpl = tmplSet[dir];
            if (ar + tmpl.rows > 10 || ac + tmpl.cols > 10) continue;
            const cells = tmpl.cells.map(([dr, dc]) => [ar + dr, ac + dc]);
            const head  = [ar + tmpl.head[0], ac + tmpl.head[1]];
            if (cells.some(([cr, cc]) => b[cr][cc] === S.MISS)) continue;
            if (b[head[0]][head[1]] === S.MISS) continue;
            let fit = 1;
            for (const [hr, hc] of this.hitCells) {
              if (!cells.some(([cr, cc]) => cr === hr && cc === hc)) { fit = 0; break; }
            }
            if (fit === 0) continue;
            for (const [cr, cc] of cells) {
              if (b[cr][cc] === S.EMPTY) this.knowledge[cr][cc] += 1;
            }
          }
        }
      }
    }

    const maxK = Math.max(...this.knowledge.flat().filter(v => v >= 0), 1);
    const adjMap = new Map();
    for (const [hr, hc] of this.hitCells) {
      const liveNeighbors = this._neighbors(hr, hc)
        .filter(([nr, nc]) => b[nr][nc] === S.EMPTY);
      for (const [nr, nc] of liveNeighbors) {
        const key = `${nr},${nc}`;
        adjMap.set(key, (adjMap.get(key) || 0) + maxK * 3);
      }
    }
    for (const [key, bonus] of adjMap) {
      const [r, c] = key.split(',').map(Number);
      if (this.knowledge[r][c] >= 0) this.knowledge[r][c] += bonus;
    }
  },

  _addHit(r, c) {
    this.hitCells.push([r, c]);
    for (const [nr, nc] of this._neighbors(r, c)) {
      if (this.board[nr][nc] === S.EMPTY) {
        this.adjacentPQ.push([nr, nc]);
      }
    }
    this._recalcKnowledge();
  },

  _addMiss(r, c) {
    this.adjacentPQ = this.adjacentPQ.filter(([qr, qc]) => qr !== r || qc !== c);
    this._recalcKnowledge();
  },

  _bestFromKnowledge() {
    let best = -1, candidates = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (this.knowledge[r][c] < 0) continue;
        if (this.knowledge[r][c] > best) {
          best = this.knowledge[r][c];
          candidates = [[r, c]];
        } else if (this.knowledge[r][c] === best) {
          candidates.push([r, c]);
        }
      }
    }
    return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
  },

  _huntMode() {
    return this.hitCells.length === 0 || this.adjacentPQ.length === 0;
  },

  pickTarget() {
    if (this._huntMode()) return this._bestFromKnowledge();

    const unique = [];
    const seen = new Set();
    for (const [r, c] of this.adjacentPQ) {
      const k = `${r},${c}`;
      if (!seen.has(k) && this.board[r][c] === S.EMPTY) {
        seen.add(k);
        unique.push([r, c]);
      }
    }
    this.adjacentPQ = unique;

    if (unique.length === 0) return this._bestFromKnowledge();

    unique.sort((a, b) => (this.knowledge[b[0]][b[1]] || 0) - (this.knowledge[a[0]][a[1]] || 0));

    const topScore = this.knowledge[unique[0][0]][unique[0][1]] || 0;
    const topCandidates = unique.filter(([r, c]) => (this.knowledge[r][c] || 0) >= topScore * 0.8);
    return topCandidates[Math.floor(Math.random() * topCandidates.length)];
  },

  onResult(r, c, result) {
    if (result === 'hit' || result === 'headhit') this._addHit(r, c);
    else if (result === 'miss') this._addMiss(r, c);
  }
};

// ============================================================
// 11. AI VS PLAYER GAME FLOW
// ============================================================

let aiGame = null;

function startAI() {
  gameMode = 'ai';
  const enemyPlane = generatePlane();
  const playerPlane = generatePlane();
  aiGame = {
    enemy: { plane: enemyPlane, board: createBoardState() },
    player: { plane: playerPlane, board: createBoardState() },
    turn: 'player',
    gameOver: false,
    winner: null
  };
  AI.reset(aiGame.player.board, aiGame.player.plane);

  showScreen('screen-ai');
  renderBoard('board-ai-enemy', aiGame.enemy.board, handleAIPlayerClick);
  renderBoard('board-ai-player', aiGame.player.board, null);
  renderLegendGrid('lg-grid-ai', 12, enemyPlane.tmplSet);
  updateAITurnUI();
  setAIMessage('🎯', '点击 AI 防区开始轰炸');
}

function handleAIPlayerClick(row, col) {
  if (!aiGame || aiGame.gameOver || aiGame.turn !== 'player') return;
  const enemy = aiGame.enemy;
  if (enemy.board[row][col] !== S.EMPTY) return;

  const result = attackCell(enemy.board, enemy.plane, row, col);
  updateBoardCell('board-ai-enemy', row, col, enemy.board[row][col]);
  animateCell('board-ai-enemy', row, col, result);
  playSound(result);

  const won = result === 'headhit' || isPlaneDestroyed(enemy.board, enemy.plane);

  if (won) {
    aiGame.gameOver = true;
    aiGame.winner = 'player';
    revealPlane(enemy.board, enemy.plane);
    updateRevealedCells('board-ai-enemy', enemy.board);
    setAIMessage('🏆', '你赢了！AI 的飞机被你摧毁！');
    setTimeout(() => {
      const dirNames = { UP:'朝上', RIGHT:'朝右', DOWN:'朝下', LEFT:'朝左' };
      const boardFlat = enemy.board.flat();
      const hits = boardFlat.filter(s => s === S.HIT || s === S.HEAD_HIT).length;
      const misses = boardFlat.filter(s => s === S.MISS).length;
      const statsHtml = `
        <div class="stat-row"><span class="stat-label">AI 飞机机型</span><span class="stat-val">${enemy.plane.tmplSet.name}</span></div>
        <div class="stat-row"><span class="stat-label">AI 飞机朝向</span><span class="stat-val">${dirNames[enemy.plane.direction]}</span></div>
        <div class="stat-row"><span class="stat-label">你命中格数</span><span class="stat-val">${hits} 格</span></div>
        <div class="stat-row"><span class="stat-label">你落空次数</span><span class="stat-val">${misses} 次</span></div>
      `;
      showResultModal('win', '你赢了！', result === 'headhit' ? '命中机头，一击制胜！' : '炸毁整架飞机，完美歼灭！', statsHtml);
    }, 1200);
    return;
  }

  if (result === 'hit') setAIMessage('💣', '命中机身！AI 正在思考...');
  else setAIMessage('〇', '未命中，AI 正在思考...');

  aiGame.turn = 'ai';
  updateAITurnUI();
  renderBoard('board-ai-enemy', aiGame.enemy.board, null);
  document.getElementById('ai-area-enemy').className = 'player-board-area inactive';

  setTimeout(aiTurn, 800 + Math.random() * 600);
}

function aiTurn() {
  if (!aiGame || aiGame.gameOver) return;

  const target = AI.pickTarget();
  if (!target) return;

  const [row, col] = target;
  const player = aiGame.player;
  const result = attackCell(player.board, player.plane, row, col);

  AI.onResult(row, col, result);

  updateBoardCell('board-ai-player', row, col, player.board[row][col]);
  animateCell('board-ai-player', row, col, result);
  playSound(result);

  const won = result === 'headhit' || isPlaneDestroyed(player.board, player.plane);

  if (won) {
    aiGame.gameOver = true;
    aiGame.winner = 'ai';
    revealPlane(player.board, player.plane);
    updateRevealedCells('board-ai-player', player.board);
    setAIMessage('🤖', 'AI 赢了！你的飞机被 AI 摧毁！');
    setTimeout(() => {
      const dirNames = { UP:'朝上', RIGHT:'朝右', DOWN:'朝下', LEFT:'朝左' };
      const boardFlat = player.board.flat();
      const hits = boardFlat.filter(s => s === S.HIT || s === S.HEAD_HIT).length;
      const misses = boardFlat.filter(s => s === S.MISS).length;
      const statsHtml = `
        <div class="stat-row"><span class="stat-label">你的飞机机型</span><span class="stat-val">${player.plane.tmplSet.name}</span></div>
        <div class="stat-row"><span class="stat-label">你的飞机朝向</span><span class="stat-val">${dirNames[player.plane.direction]}</span></div>
        <div class="stat-row"><span class="stat-label">AI 命中格数</span><span class="stat-val">${hits} 格</span></div>
        <div class="stat-row"><span class="stat-label">AI 落空次数</span><span class="stat-val">${misses} 次</span></div>
      `;
      showResultModal('lose', 'AI 获胜！', result === 'headhit' ? 'AI 命中机头，一击制胜！' : 'AI 炸毁整架飞机！', statsHtml);
    }, 1200);
    return;
  }

  const dirNames = { UP:'朝上', RIGHT:'朝右', DOWN:'朝下', LEFT:'朝左' };
  const colL = COL_LABELS[col];
  if (result === 'hit') setAIMessage('💣', `AI 轰炸 ${colL}${row+1}，命中机身！你的回合`);
  else setAIMessage('〇', `AI 轰炸 ${colL}${row+1}，未命中。你的回合`);

  aiGame.turn = 'player';
  updateAITurnUI();
  renderBoard('board-ai-enemy', aiGame.enemy.board, handleAIPlayerClick);
  document.getElementById('ai-area-enemy').className = 'player-board-area active-target';
}

function updateAITurnUI() {
  const ind = document.getElementById('ai-turn-ind');
  const icon = document.getElementById('ai-turn-icon');
  const text = document.getElementById('ai-turn-text');
  const hintE = document.getElementById('ai-hint-enemy');
  const hintP = document.getElementById('ai-hint-player');

  if (aiGame.turn === 'player') {
    ind.className = 'turn-indicator';
    icon.textContent = '🎯';
    text.textContent = '你的回合 — 攻击 AI 防区';
    hintE.textContent = '← 点击攻击';
    hintP.textContent = '';
  } else {
    ind.className = 'turn-indicator p2-turn';
    icon.textContent = '🤖';
    text.textContent = 'AI 正在思考...';
    hintE.textContent = '';
    hintP.textContent = 'AI 轰炸中...';
  }
}

function setAIMessage(icon, text) {
  document.getElementById('ai-message').innerHTML =
    `<span class="msg-icon">${icon}</span><span class="msg-text">${text}</span>`;
}

function restartAI() { startAI(); }

// ============================================================
// 12. SCREEN NAVIGATION
// ============================================================

let gameMode = null;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function goHome() {
  document.getElementById('overlay-result').style.display = 'none';
  if (diceAnimInterval) { clearInterval(diceAnimInterval); diceAnimInterval = null; }
  showScreen('screen-home');
  gameMode = tp = tpm = sp = aiGame = null;
}

document.addEventListener('DOMContentLoaded', () => showScreen('screen-home'));

// Resume AudioContext on first user gesture (browser autoplay policy)
document.addEventListener('click', () => {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}, { once: true });
