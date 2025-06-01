(() => {
    const boardEl = document.getElementById('board');
    const statusEl = document.getElementById('status');
    const movesLogEl = document.getElementById('moves-log');

    let board, currentTurn, canCastle, enPassantTarget;
    let selectedCell = null;
    let legalMoves = [];
    let moveLog = [];
    let gameOver = false;

    const figuresUnicode = {
        'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
        'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
        '': ''
    };

    function figureColor(f) {
        if (!f) return null;
        return f === f.toUpperCase() ? 'white' : 'black';
    }

    function isValidCell(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    // Проверка шаха
    function isInCheck(board, color) {
        let kingPos = null;
        for (let r=0; r<8; r++) {
            for (let c=0; c<8; c++) {
                if (board[r][c].toLowerCase() === 'k' && figureColor(board[r][c]) === color) {
                    kingPos = {r,c};
                    break;
                }
            }
            if (kingPos) break;
        }
        if (!kingPos) return false;
        return isSquareAttacked(kingPos.r, kingPos.c, color === 'white' ? 'black' : 'white');
    }

    // Проверка атаки клетки (для шаха и рокировки)
    function isSquareAttacked(r,c, byColor) {
        const enemy = byColor;

        // Пешки
        const pawnDir = enemy === 'white' ? -1 : 1;
        const enemyPawn = enemy === 'white' ? 'P' : 'p';
        if (isValidCell(r + pawnDir, c - 1) && board[r + pawnDir][c - 1] === enemyPawn) return true;
        if (isValidCell(r + pawnDir, c + 1) && board[r + pawnDir][c + 1] === enemyPawn) return true;

        // Конь
        const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr,dc] of knightMoves) {
            const rr = r + dr, cc = c + dc;
            if (isValidCell(rr,cc)) {
                const f = board[rr][cc];
                if (f && figureColor(f) === enemy && f.toLowerCase() === 'n') return true;
            }
        }

        // Ладья/ферзь по прямым линиям
        const straightDirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dr,dc] of straightDirs) {
            let rr = r + dr, cc = c + dc;
            while (isValidCell(rr,cc)) {
                let f = board[rr][cc];
                if (f) {
                    if (figureColor(f) === enemy) {
                        if (f.toLowerCase() === 'r' || f.toLowerCase() === 'q') return true;
                        break;
                    } else break;
                }
                rr += dr; cc += dc;
            }
        }

        // Слон/ферзь по диагоналям
        const diagDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
        for (const [dr,dc] of diagDirs) {
            let rr = r + dr, cc = c + dc;
            while (isValidCell(rr,cc)) {
                let f = board[rr][cc];
                if (f) {
                    if (figureColor(f) === enemy) {
                        if (f.toLowerCase() === 'b' || f.toLowerCase() === 'q') return true;
                        break;
                    } else break;
                }
                rr += dr; cc += dc;
            }
        }

        // Король
        for (let dr = -1; dr <=1; dr++) {
            for (let dc = -1; dc <=1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const rr = r + dr;
                const cc = c + dc;
                if (isValidCell(rr,cc)) {
                    const f = board[rr][cc];
                    if (f && figureColor(f) === enemy && f.toLowerCase() === 'k') return true;
                }
            }
        }

        return false;
    }

    // Генерация легальных ходов для фигуры в позиции r,c
    function generateLegalMoves(r, c) {
        const moves = [];
        const fig = board[r][c];
        if (!fig) return moves;
        const color = figureColor(fig);
        const enemy = color === 'white' ? 'black' : 'white';

        function addMove(rr, cc, promotion = null) {
            const move = {from:{r,c}, to:{r:rr,c:cc}};
            if (promotion) move.promotion = promotion;
            if (isLegalMove(move)) moves.push(move);
        }

        // Проверка легальности хода (не ставит ли шах)
        function isLegalMove(move) {
            const tempBoard = board.map(row => row.slice());
            // Делать ход на временной доске
            const p = tempBoard[move.from.r][move.from.c];
            tempBoard[move.to.r][move.to.c] = move.promotion ? move.promotion : p;
            tempBoard[move.from.r][move.from.c] = '';

            // Особые случаи: рокировка и взятие на проходе не нуждаются в усложненной проверке

            return !isInCheck(tempBoard, color);
        }

        // Логика ходов для пешек, фигур и короля с рокировкой, взятиями на проходе и превращениями
        if (fig.toLowerCase() === 'p') {
            const dir = color === 'white' ? -1 : 1;
            const startRow = color === 'white' ? 6 : 1;
            const promotionRow = color === 'white' ? 0 : 7;

            // Вперед 1
            if (isValidCell(r+dir, c) && board[r+dir][c] === '') {
                if (r+dir === promotionRow) {
                    ['q','r','b','n'].forEach(promo => addMove(r+dir, c, color === 'white' ? promo.toUpperCase() : promo));
                } else {
                    addMove(r+dir, c);
                }
                // Вперед 2 с начальной позиции
                if (r === startRow && board[r+dir*2][c] === '') {
                    addMove(r+dir*2, c);
                }
            }

            // Взятия по диагонали
            for (const dc of [-1,1]) {
                const rr = r + dir;
                const cc = c + dc;
                if (!isValidCell(rr,cc)) continue;
                const target = board[rr][cc];
                if (target && figureColor(target) === enemy) {
                    if (rr === promotionRow) {
                        ['q','r','b','n'].forEach(promo => addMove(rr, cc, color === 'white' ? promo.toUpperCase() : promo));
                    } else {
                        addMove(rr, cc);
                    }
                }
                // Взятие на проходе
                if (enPassantTarget && enPassantTarget.r === rr && enPassantTarget.c === cc) {
                    addMove(rr, cc);
                }
            }
        }
        else if (fig.toLowerCase() === 'n') {
            const knightJumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
            for (const [dr,dc] of knightJumps) {
                const rr = r+dr;
                const cc = c+dc;
                if (!isValidCell(rr,cc)) continue;
                const target = board[rr][cc];
                if (!target || figureColor(target) === enemy) addMove(rr,cc);
            }
        }
        else if (fig.toLowerCase() === 'b' || fig.toLowerCase() === 'r' || fig.toLowerCase() === 'q') {
            const directions = [];
            if (fig.toLowerCase() === 'b' || fig.toLowerCase() === 'q') {
                directions.push(...[[-1,-1],[-1,1],[1,-1],[1,1]]);
            }
            if (fig.toLowerCase() === 'r' || fig.toLowerCase() === 'q') {
                directions.push(...[[-1,0],[1,0],[0,-1],[0,1]]);
            }
            for (const [dr,dc] of directions) {
                let rr = r+dr;
                let cc = c+dc;
                while (isValidCell(rr,cc)) {
                    const target = board[rr][cc];
                    if (!target) {
                        addMove(rr,cc);
                    } else {
                        if (figureColor(target) === enemy) addMove(rr,cc);
                        break;
                    }
                    rr += dr;
                    cc += dc;
                }
            }
        }
        else if (fig.toLowerCase() === 'k') {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const rr = r + dr;
                    const cc = c + dc;
                    if (!isValidCell(rr, cc)) continue;
                    const target = board[rr][cc];
                    if (!target || figureColor(target) === enemy) addMove(rr, cc);
                }
            }
            // Рокировка
            if (!isInCheck(board, color)) {
                if (canCastle[color].kingside) {
                    if (
                        board[r][5] === '' && board[r][6] === '' &&
                        !isSquareAttacked(r,5, enemy) && !isSquareAttacked(r,6, enemy)
                    ) {
                        addMove(r, 6); // рокировка короткая
                    }
                }
                if (canCastle[color].queenside) {
                    if (
                        board[r][1] === '' && board[r][2] === '' && board[r][3] === '' &&
                        !isSquareAttacked(r,2, enemy) && !isSquareAttacked(r,3, enemy)
                    ) {
                        addMove(r, 2); // рокировка длинная
                    }
                }
            }
        }
        return moves;
    }

    // Выполнить ход
    function makeMove(move) {
        if (gameOver) return;
        const {from, to, promotion} = move;
        const fig = board[from.r][from.c];
        const color = figureColor(fig);
        const enemy = color === 'white' ? 'black' : 'white';

        // Рокировка
        if (fig.toLowerCase() === 'k' && Math.abs(to.c - from.c) === 2) {
            if (to.c === 6) {
                // Короткая рокировка
                board[to.r][to.c] = fig;
                board[from.r][from.c] = '';
                board[to.r][5] = board[to.r][7];
                board[to.r][7] = '';
            } else if (to.c === 2) {
                // Длинная рокировка
                board[to.r][to.c] = fig;
                board[from.r][from.c] = '';
                board[to.r][3] = board[to.r][0];
                board[to.r][0] = '';
            }
            canCastle[color].kingside = false;
            canCastle[color].queenside = false;
            enPassantTarget = null;
        }
        else {
            // Взятие на проходе
            if (fig.toLowerCase() === 'p' && enPassantTarget && to.r === enPassantTarget.r && to.c === enPassantTarget.c) {
                board[from.r][from.c] = '';
                board[to.r][to.c] = fig;
                if (color === 'white') board[to.r + 1][to.c] = '';
                else board[to.r - 1][to.c] = '';
            }
            else {
                // Простой ход или взятие
                board[to.r][to.c] = promotion ? promotion : fig;
                board[from.r][from.c] = '';
            }
            // Обновляем возможность рокировки
            if (fig.toLowerCase() === 'k') {
                canCastle[color].kingside = false;
                canCastle[color].queenside = false;
            }
            if (fig.toLowerCase() === 'r') {
                if (from.c === 0) canCastle[color].queenside = false;
                if (from.c === 7) canCastle[color].kingside = false;
            }
            // Обновляем взятие на проходе
            if (fig.toLowerCase() === 'p' && Math.abs(to.r - from.r) === 2) {
                enPassantTarget = {r: (from.r + to.r) / 2, c: from.c};
            } else {
                enPassantTarget = null;
            }
        }

        // Лог хода
        const moveStr = `${fig.toUpperCase()}${String.fromCharCode(from.c + 97)}${8-from.r}-${String.fromCharCode(to.c + 97)}${8-to.r}`;
        moveLog.push(moveStr);

        // Проверка конца игры
        if (isInCheck(board, enemy)) {
            // Проверяем, есть ли ходы у соперника
            if (!hasAnyLegalMoves(enemy)) {
                updateStatus(`${color} выиграл! Мат.`);
                gameOver = true;
            } else {
                updateStatus(`${enemy} в шахе!`);
            }
        } else {
            if (!hasAnyLegalMoves(enemy)) {
                updateStatus('Пат! Ничья.');
                gameOver = true;
            } else {
                updateStatus(`${enemy} ходит.`);
            }
        }

        switchTurn();
        selectedCell = null;
        legalMoves = [];
        updateMovesLog();
        renderBoard();
    }

    // Проверка, есть ли хотя бы один легальный ход для цвета
    function hasAnyLegalMoves(color) {
        for (let r=0; r<8; r++) {
            for (let c=0; c<8; c++) {
                if (figureColor(board[r][c]) === color) {
                    const moves = generateLegalMoves(r,c);
                    if (moves.length > 0) return true;
                }
            }
        }
        return false;
    }

    // Переключить ход
    function switchTurn() {
        currentTurn = currentTurn === 'white' ? 'black' : 'white';
    }

    // Обновить статус игры
    function updateStatus(text) {
        statusEl.textContent = text;
    }

    // Обновить лог ходов
    function updateMovesLog() {
        movesLogEl.innerHTML = '';
        for (const move of moveLog) {
            const div = document.createElement('div');
            div.textContent = move;
            movesLogEl.appendChild(div);
        }
    }

    // Отрисовка доски
    function renderBoard() {
        boardEl.innerHTML = '';
        for (let r=0; r<8; r++) {
            for (let c=0; c<8; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.classList.add((r + c) % 2 === 0 ? 'light' : 'dark');

                const fig = board[r][c];
                if (fig) {
                    const span = document.createElement('span');
                    span.textContent = figuresUnicode[fig];
                    span.classList.add(figureColor(fig) === 'white' ? 'white-fig' : 'black-fig');
                    cell.appendChild(span);
                }

                if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
                    cell.classList.add('selected');
                }
                if (legalMoves.some(mv => mv.to.r === r && mv.to.c === c)) {
                    cell.classList.add('legal-move');
                }

                cell.addEventListener('click', () => onCellClick(r,c));
                boardEl.appendChild(cell);
            }
        }
    }

    // Обработка клика по клетке
    function onCellClick(r,c) {
        if (gameOver) return;
        const fig = board[r][c];
        const color = figureColor(fig);

        if (selectedCell) {
            // Если клик на легальный ход — сделать ход
            if (legalMoves.some(mv => mv.to.r === r && mv.to.c === c)) {
                const move = legalMoves.find(mv => mv.to.r === r && mv.to.c === c);
                makeMove(move);
                return;
            }
            // Если кликнули на другую свою фигуру — сменить выделение
            if (color === currentTurn) {
                selectedCell = {r,c};
                legalMoves = generateLegalMoves(r,c);
                renderBoard();
            } else {
                // Снять выделение
                selectedCell = null;
                legalMoves = [];
                renderBoard();
            }
        } else {
            // Если еще не выбрана фигура, выбрать, если она текущего игрока
            if (color === currentTurn) {
                selectedCell = {r,c};
                legalMoves = generateLegalMoves(r,c);
                renderBoard();
            }
        }
    }

    // Инициализация игры
    function initGame() {
        board = [
            ['r','n','b','q','k','b','n','r'],
            ['p','p','p','p','p','p','p','p'],
            ['','','','','','','',''],
            ['','','','','','','',''],
            ['','','','','','','',''],
            ['','','','','','','',''],
            ['P','P','P','P','P','P','P','P'],
            ['R','N','B','Q','K','B','N','R'],
        ];
        currentTurn = 'white';
        canCastle = {
            white: {kingside: true, queenside: true},
            black: {kingside: true, queenside: true}
        };
        enPassantTarget = null;
        selectedCell = null;
        legalMoves = [];
        moveLog = [];
        gameOver = false;
        updateStatus(`${currentTurn} ходит.`);
        updateMovesLog();
        renderBoard();
    }

    // Запускаем игру
    initGame();

})();
