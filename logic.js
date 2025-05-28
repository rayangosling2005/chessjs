// Шахматные фигуры в Unicode
const piecesUnicode = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

let board = [];
let currentPlayer = 'w'; // 'w' - белые, 'b' - черные
let selectedCell = null;
let possibleMoves = [];
let gameOver = false;

let whiteTime = 300; // 5 минут в секундах
let blackTime = 300;
let whiteTimerInterval;
let blackTimerInterval;

const boardElem = document.getElementById('board');
const currentPlayerElem = document.getElementById('current-player');
const whiteTimerElem = document.getElementById('white-timer');
const blackTimerElem = document.getElementById('black-timer');
const logElem = document.getElementById('log');
const resetBtn = document.getElementById('reset-btn');

// Инициализация доски (стандартная расстановка)
function initBoard() {
  board = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
  currentPlayer = 'w';
  selectedCell = null;
  possibleMoves = [];
  gameOver = false;
  whiteTime = 300;
  blackTime = 300;
  clearInterval(whiteTimerInterval);
  clearInterval(blackTimerInterval);
  renderBoard();
  updateCurrentPlayerDisplay();
  updateTimersDisplay();
  clearLog();
  log('Игра началась. Белые ходят.');
}

function renderBoard() {
  boardElem.innerHTML = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      if ((row + col) % 2 === 0) {
        cell.classList.add('white-cell');
      } else {
        cell.classList.add('black-cell');
      }
      cell.dataset.row = row;
      cell.dataset.col = col;
      const piece = board[row][col];
      if (piece) {
        cell.textContent = piecesUnicode[piece];
      }
      cell.onclick = onCellClick;
      boardElem.appendChild(cell);
    }
  }
  highlightSelectedAndMoves();
}

function highlightSelectedAndMoves() {
  // Убрать выделение
  document.querySelectorAll('.cell').forEach(cell => {
    cell.style.outline = '';
    cell.style.backgroundColor = '';
  });
  if (selectedCell) {
    // Выделить выбранную фигуру
    let sel = getCellElement(selectedCell[0], selectedCell[1]);
    if (sel) {
      sel.style.outline = '3px solid orange';
    }
    // Выделить возможные ходы
    possibleMoves.forEach(([r,c]) => {
      let m = getCellElement(r,c);
      if (m) {
        m.style.backgroundColor = 'lightgreen';
      }
    });
  }
}

function getCellElement(row, col) {
  return boardElem.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
}

function onCellClick(e) {
  if (gameOver) return;
  const row = +e.currentTarget.dataset.row;
  const col = +e.currentTarget.dataset.col;
  const piece = board[row][col];
  if (selectedCell) {
    // Если кликнули на возможный ход - сделать ход
    if (possibleMoves.some(m => m[0] === row && m[1] === col)) {
      makeMove(selectedCell, [row,col]);
      selectedCell = null;
      possibleMoves = [];
      renderBoard();
      checkGameStatus();
      if (!gameOver) {
        switchPlayer();
      }
    } else {
      // Выбрать новую фигуру, если там есть фигура текущего игрока
      if (piece && isOwnPiece(piece, currentPlayer)) {
        selectedCell = [row, col];
        possibleMoves = getValidMoves(row, col);
        renderBoard();
      } else {
        // Сброс выбора
        selectedCell = null;
        possibleMoves = [];
        renderBoard();
      }
    }
  } else {
    // Выбрать фигуру для хода
    if (piece && isOwnPiece(piece, currentPlayer)) {
      selectedCell = [row, col];
      possibleMoves = getValidMoves(row, col);
      renderBoard();
    }
  }
  highlightSelectedAndMoves();
}

function isOwnPiece(piece, player) {
  if (player === 'w') return piece === piece.toUpperCase();
  else return piece === piece.toLowerCase();
}

function getValidMoves(row, col) {
  // Возвращает все легальные ходы для фигуры в board[row][col]
  const piece = board[row][col];
  if (!piece) return [];

  let moves = [];

  switch(piece.toLowerCase()) {
    case 'p': moves = getPawnMoves(row,col,piece); break;
    case 'r': moves = getRookMoves(row,col,piece); break;
    case 'n': moves = getKnightMoves(row,col,piece); break;
    case 'b': moves = getBishopMoves(row,col,piece); break;
    case 'q': moves = getQueenMoves(row,col,piece); break;
    case 'k': moves = getKingMoves(row,col,piece); break;
  }

  // Фильтруем ходы, при которых будет шах (нельзя ходить под шах)
  moves = moves.filter(move => {
    const [r,c] = move;
    const backupFrom = board[row][col];
    const backupTo = board[r][c];
    board[r][c] = backupFrom;
    board[row][col] = '';
    const kingPos = findKing(currentPlayer);
    const inCheck = isSquareAttacked(kingPos[0], kingPos[1], oppositePlayer(currentPlayer));
    // Откатим
    board[row][col] = backupFrom;
    board[r][c] = backupTo;
    return !inCheck;
  });

  return moves;
}

function getPawnMoves(row, col, piece) {
  let moves = [];
  const dir = piece === piece.toUpperCase() ? -1 : 1; // белые идут вверх, черные вниз
  const startRow = piece === piece.toUpperCase() ? 6 : 1;
  // Вперед
  if (isEmpty(row + dir, col)) {
    moves.push([row + dir, col]);
    // Двойной ход с начальной позиции
    if (row === startRow && isEmpty(row + 2*dir, col)) {
      moves.push([row + 2*dir, col]);
    }
  }
  // Взятия
  if (isEnemy(row + dir, col -1, piece)) moves.push([row + dir, col -1]);
  if (isEnemy(row + dir, col +1, piece)) moves.push([row + dir, col +1]);

  // TODO: реализовать взятие на проходе (en passant)

  return moves.filter(validPos);
}

function getRookMoves(row,col,piece) {
  return getLinearMoves(row,col,piece, [[1,0],[-1,0],[0,1],[0,-1]]);
}

function getBishopMoves(row,col,piece) {
  return getLinearMoves(row,col,piece, [[1,1],[1,-1],[-1,1],[-1,-1]]);
}

function getQueenMoves(row,col,piece) {
  return getLinearMoves(row,col,piece, [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
}

function getLinearMoves(row,col,piece,directions) {
  let moves = [];
  for (let [dr,dc] of directions) {
    let r = row + dr;
    let c = col + dc;
    while(validPos(r,c)) {
      if (isEmpty(r,c)) {
        moves.push([r,c]);
      } else if (isEnemy(r,c,piece)) {
        moves.push([r,c]);
        break;
      } else {
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return moves;
}

function getKnightMoves(row,col,piece) {
  const jumps = [
    [-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]
  ];
  let moves = [];
  for (let [dr,dc] of jumps) {
    const r = row + dr;
    const c = col + dc;
    if (validPos(r,c) && !isOwnPiece(board[r][c], currentPlayer)) {
      moves.push([r,c]);
    }
  }
  return moves;
}

function getKingMoves(row,col,piece) {
  const movesOffsets = [
    [-1,-1],[-1,0],[-1,1],
    [0,-1],        [0,1],
    [1,-1], [1,0], [1,1]
  ];
  let moves = [];
  for (let [dr,dc] of movesOffsets) {
    const r = row + dr;
    const c = col + dc;
    if (validPos(r,c) && !isOwnPiece(board[r][c], currentPlayer)) {
      moves.push([r,c]);
    }
  }


  return moves;
}

function validPos(row,col) {
  return row >=0 && row < 8 && col >=0 && col < 8;
}

function isEmpty(row,col) {
  return validPos(row,col) && board[row][col] === '';
}

function isEnemy(row,col,piece) {
  if (!validPos(row,col)) return false;
  const target = board[row][col];
  if (target === '') return false;
  return (isUpperCase(piece) && isLowerCase(target)) || (isLowerCase(piece) && isUpperCase(target));
}

function isUpperCase(str) {
  return str === str.toUpperCase();
}

function isLowerCase(str) {
  return str === str.toLowerCase();
}

function oppositePlayer(player) {
  return player === 'w' ? 'b' : 'w';
}

function makeMove(from, to) {
  if (gameOver) return;
  const [fr,fc] = from;
  const [tr,tc] = to;
  const movingPiece = board[fr][fc];
  const targetPiece = board[tr][tc];
  board[tr][tc] = movingPiece;
  board[fr][fc] = '';

  // Добавить ход в лог
  const moveNotation = notation(from, to, movingPiece, targetPiece);
  log(`${currentPlayer === 'w' ? 'Белые' : 'Чёрные'}: ${moveNotation}`);

  // Продвинуть пешку при достижении конца (превращение пешки)
  if ((movingPiece === 'P' && tr === 0) || (movingPiece === 'p' && tr === 7)) {
    board[tr][tc] = currentPlayer === 'w' ? 'Q' : 'q';
    log(`Пешка превратилась в ферзя.`);
  }
}

function notation(from, to, piece, capture) {
  // Простая нотация (без шаха и мата)
  const cols = 'abcdefgh';
  let moveStr = '';
  moveStr += piece.toUpperCase() !== 'P' ? piece.toUpperCase() : '';
  if (capture) moveStr += 'x';
  moveStr += cols[to[1]] + (8 - to[0]);
  return moveStr;
}

function findKing(player) {
  const kingChar = player === 'w' ? 'K' : 'k';
  for(let r=0;r<8;r++) {
    for(let c=0;c<8;c++) {
      if (board[r][c] === kingChar) return [r,c];
    }
  }
  return null;
}

function isSquareAttacked(row,col, attacker) {
  // Проверяем, может ли сторона attacker атаковать клетку row,col
  // Мы проходим по всем фигурам attacker и смотрим, есть ли ход на эту клетку
  for(let r=0;r<8;r++) {
    for(let c=0;c<8;c++) {
      const p = board[r][c];
      if (!p) continue;
      if ((attacker === 'w' && isUpperCase(p)) || (attacker === 'b' && isLowerCase(p))) {
        let moves = getPseudoMoves(r,c,p);
        if (moves.some(m => m[0]===row && m[1]===col)) return true;
      }
    }
  }
  return false;
}

function getPseudoMoves(row,col,piece) {
  // Как getValidMoves, но без фильтра шаха (используется для проверки атак)
  switch(piece.toLowerCase()) {
    case 'p': return getPawnAttacks(row,col,piece);
    case 'r': return getLinearMoves(row,col,piece, [[1,0],[-1,0],[0,1],[0,-1]]);
    case 'n': return getKnightMoves(row,col,piece);
    case 'b': return getLinearMoves(row,col,piece, [[1,1],[1,-1],[-1,1],[-1,-1]]);
    case 'q': return getLinearMoves(row,col,piece, [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
    case 'k': return getKingMoves(row,col,piece);
  }
  return [];
}

function getPawnAttacks(row,col,piece) {
  const dir = piece === piece.toUpperCase() ? -1 : 1;
  let attacks = [];
  if (validPos(row + dir, col -1)) attacks.push([row+dir,col-1]);
  if (validPos(row + dir, col +1)) attacks.push([row+dir,col+1]);
  return attacks;
}

function checkGameStatus() {
  // Проверить мат, пат, шах, окончание игры
  const kingPos = findKing(currentPlayer);
  if (!kingPos) {
    log(`${currentPlayer === 'w' ? 'Белые' : 'Чёрные'} проиграли (король взят)!`);
    gameOver = true;
    stopTimers();
    return;
  }
  const inCheck = isSquareAttacked(kingPos[0], kingPos[1], oppositePlayer(currentPlayer));
  // Есть ли у текущего игрока хоть один легальный ход?
  let hasMoves = false;
  outer:
  for(let r=0;r<8;r++) {
    for(let c=0;c<8;c++) {
      if (board[r][c] && isOwnPiece(board[r][c], currentPlayer)) {
        if (getValidMoves(r,c).length > 0) {
          hasMoves = true;
          break outer;
        }
      }
    }
  }
  if (!hasMoves) {
    if (inCheck) {
      log(`Мат! ${currentPlayer === 'w' ? 'Чёрные' : 'Белые'} победили.`);
    } else {
      log(`Пат! Ничья.`);
    }
    gameOver = true;
    stopTimers();
    return;
  }
  if (inCheck) {
    log('Шах!');
  }
}

function switchPlayer() {
  currentPlayer = oppositePlayer(currentPlayer);
  updateCurrentPlayerDisplay();
  restartTimersForCurrentPlayer();
}

function updateCurrentPlayerDisplay() {
  currentPlayerElem.textContent = currentPlayer === 'w' ? 'Белые' : 'Чёрные';
}

function log(msg) {
  const li = document.createElement('li');
  li.textContent = msg;
  logElem.appendChild(li);
  logElem.scrollTop = logElem.scrollHeight;
}

function clearLog() {
  logElem.innerHTML = '';
}

function updateTimersDisplay() {
  whiteTimerElem.textContent = formatTime(whiteTime);
  blackTimerElem.textContent = formatTime(blackTime);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2,'0');
  const s = (sec % 60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

function startTimers() {
  clearInterval(whiteTimerInterval);
  clearInterval(blackTimerInterval);
  whiteTimerInterval = setInterval(() => {
    if (currentPlayer === 'w' && !gameOver) {
      whiteTime--;
      updateTimersDisplay();
      if (whiteTime <= 0) {
        gameOver = true;
        log('Время белых вышло. Черные победили.');
        stopTimers();
      }
    }
  }, 1000);
  blackTimerInterval = setInterval(() => {
    if (currentPlayer === 'b' && !gameOver) {
      blackTime--;
      updateTimersDisplay();
      if (blackTime <= 0) {
        gameOver = true;
        log('Время черных вышло. Белые победили.');
        stopTimers();
      }
    }
  }, 1000);
}

function stopTimers() {
  clearInterval(whiteTimerInterval);
  clearInterval(blackTimerInterval);
}

function restartTimersForCurrentPlayer() {
  // Таймеры уменьшают время только для игрока, у которого ход
}

function resetGame() {
  stopTimers();
  initBoard();
  startTimers();
}

// Автостарт игры при загрузке
window.onload = function() {
  initBoard();
  startTimers();
};

resetBtn.onclick = resetGame;
