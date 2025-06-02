
(() => {
    const boardEl = document.getElementById('board');
    const statusEl = document.getElementById('status');
    const movesLogEl = document.getElementById('moves-log');

    let board, currentTurn, canCastle, enPassantTarget;
    let selectedCell = null;
    let legalMoves = [];
    let moveLog = [];
    let gameOver = false;
    let capturedPieces = {
        white: [],
        black: []
    };

    const figuresUnicode = {
        'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
        'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
        '': ''
    };

    const figureNames = {
        'K': 'Король', 'Q': 'Ферзь', 'R': 'Ладья', 'B': 'Слон', 'N': 'Конь', 'P': 'Пешка',
        'k': 'Король', 'q': 'Ферзь', 'r': 'Ладья', 'b': 'Слон', 'n': 'Конь', 'p': 'Пешка'
    };

    function figureColor(f) {
        if (!f) return null;
        return f === f.toUpperCase() ? 'white' : 'black';
    }

    function isValidCell(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    function isInCheck(board, color) {
        let kingPos = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece.toLowerCase() === 'k' && figureColor(piece) === color) {
                    kingPos = {r, c};
                    break;
                }
            }
            if (kingPos) break;
        }
        if (!kingPos) return false;

        return isSquareAttacked(board, kingPos.r, kingPos.c, color === 'white' ? 'black' : 'white');
    }

    function isSquareAttacked(board, r, c, byColor) {
        const pawnDir = byColor === 'white' ? -1 : 1;
        const enemyPawn = byColor === 'white' ? 'P' : 'p';
        for (const dc of [-1, 1]) {
            if (isValidCell(r + pawnDir, c + dc) && board[r + pawnDir][c + dc] === enemyPawn) {
                return true;
            }
        }

        const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        const enemyKnight = byColor === 'white' ? 'N' : 'n';
        for (const [dr, dc] of knightMoves) {
            const newR = r + dr;
            const newC = c + dc;
            if (isValidCell(newR, newC) && board[newR][newC] === enemyKnight) {
                return true;
            }
        }

        const straightDirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dr, dc] of straightDirs) {
            let newR = r + dr;
            let newC = c + dc;
            while (isValidCell(newR, newC)) {
                const piece = board[newR][newC];
                if (piece) {
                    if (figureColor(piece) === byColor &&
                        (piece.toLowerCase() === 'r' || piece.toLowerCase() === 'q')) {
                        return true;
                    }
                    break;
                }
                newR += dr;
                newC += dc;
            }
        }

        const diagDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
        for (const [dr, dc] of diagDirs) {
            let newR = r + dr;
            let newC = c + dc;
            while (isValidCell(newR, newC)) {
                const piece = board[newR][newC];
                if (piece) {
                    if (figureColor(piece) === byColor &&
                        (piece.toLowerCase() === 'b' || piece.toLowerCase() === 'q')) {
                        return true;
                    }
                    break;
                }
                newR += dr;
                newC += dc;
            }
        }

        const kingMoves = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        const enemyKing = byColor === 'white' ? 'K' : 'k';
        for (const [dr, dc] of kingMoves) {
            const newR = r + dr;
            const newC = c + dc;
            if (isValidCell(newR, newC) && board[newR][newC] === enemyKing) {
                return true;
            }
        }

        return false;
    }

    function generateLegalMoves(r, c) {
        const moves = [];
        const fig = board[r][c];
        if (!fig) return moves;
        const color = figureColor(fig);
        const enemy = color === 'white' ? 'black' : 'white';

        function addMoveIfLegal(newR, newC, promotion = null) {
            const move = {
                from: {r, c},
                to: {r: newR, c: newC}
            };
            if (promotion) move.promotion = promotion;

            const tempBoard = board.map(row => [...row]);

            if (fig.toLowerCase() === 'k' && Math.abs(newC - c) === 2) {
                const rookCol = newC > c ? 7 : 0;
                const rookNewCol = newC > c ? newC - 1 : newC + 1;
                tempBoard[newR][newC] = fig;
                tempBoard[r][c] = '';
                tempBoard[r][rookNewCol] = tempBoard[r][rookCol];
                tempBoard[r][rookCol] = '';
            } else {
                tempBoard[newR][newC] = promotion || fig;
                tempBoard[r][c] = '';
            }

            if (!isInCheck(tempBoard, color)) {
                moves.push(move);
            }
        }

        if (fig.toLowerCase() === 'p') {
            const dir = color === 'white' ? -1 : 1;
            const startRow = color === 'white' ? 6 : 1;
            const promotionRow = color === 'white' ? 0 : 7;

            if (isValidCell(r + dir, c) && !board[r + dir][c]) {
                if (r + dir === promotionRow) {
                    for (const piece of ['q','r','b','n']) {
                        addMoveIfLegal(r + dir, c, color === 'white' ? piece.toUpperCase() : piece);
                    }
                } else {
                    addMoveIfLegal(r + dir, c);
                    if (r === startRow && !board[r + dir * 2][c]) {
                        addMoveIfLegal(r + dir * 2, c);
                    }
                }
            }

            for (const dc of [-1, 1]) {
                if (isValidCell(r + dir, c + dc)) {
                    const target = board[r + dir][c + dc];
                    if (target && figureColor(target) === enemy) {
                        if (r + dir === promotionRow) {
                            for (const piece of ['q','r','b','n']) {
                                addMoveIfLegal(r + dir, c + dc, color === 'white' ? piece.toUpperCase() : piece);
                            }
                        } else {
                            addMoveIfLegal(r + dir, c + dc);
                        }
                    }
                    if (enPassantTarget &&
                        enPassantTarget.r === r + dir &&
                        enPassantTarget.c === c + dc) {
                        addMoveIfLegal(r + dir, c + dc);
                    }
                }
            }
        }
        else if (fig.toLowerCase() === 'n') {
            for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
                const newR = r + dr;
                const newC = c + dc;
                if (isValidCell(newR, newC)) {
                    const target = board[newR][newC];
                    if (!target || figureColor(target) === enemy) {
                        addMoveIfLegal(newR, newC);
                    }
                }
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

            for (const [dr, dc] of directions) {
                let newR = r + dr;
                let newC = c + dc;
                while (isValidCell(newR, newC)) {
                    const target = board[newR][newC];
                    if (!target) {
                        addMoveIfLegal(newR, newC);
                    } else {
                        if (figureColor(target) === enemy) {
                            addMoveIfLegal(newR, newC);
                        }
                        break;
                    }
                    newR += dr;
                    newC += dc;
                }
            }
        }
        else if (fig.toLowerCase() === 'k') {
            for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
                const newR = r + dr;
                const newC = c + dc;
                if (isValidCell(newR, newC)) {
                    const target = board[newR][newC];
                    if (!target || figureColor(target) === enemy) {
                        addMoveIfLegal(newR, newC);
                    }
                }
            }

            if (!isInCheck(board, color)) {
                if (canCastle[color].kingside) {
                    if (!board[r][5] && !board[r][6] &&
                        !isSquareAttacked(board, r, 5, enemy) &&
                        !isSquareAttacked(board, r, 6, enemy)) {
                        addMoveIfLegal(r, 6);
                    }
                }
                if (canCastle[color].queenside) {
                    if (!board[r][1] && !board[r][2] && !board[r][3] &&
                        !isSquareAttacked(board, r, 2, enemy) &&
                        !isSquareAttacked(board, r, 3, enemy)) {
                        addMoveIfLegal(r, 2);
                    }
                }
            }
        }

        return moves;
    }

    function formatMove(from, to, piece, isCapture, promotion) {
        const fromSquare = `${String.fromCharCode(97 + from.c)}${8 - from.r}`;
        const toSquare = `${String.fromCharCode(97 + to.c)}${8 - to.r}`;
        let moveStr = '';

        if (piece.toLowerCase() === 'k' && Math.abs(to.c - from.c) === 2) {
            // Рокировка
            return to.c > from.c ? 'O-O' : 'O-O-O';
        }

        if (piece.toLowerCase() !== 'p') {
            moveStr += figureNames[piece][0]; // Первая буква названия фигуры
        }

        if (isCapture) {
            if (piece.toLowerCase() === 'p') {
                moveStr += fromSquare[0];
            }
            moveStr += '×';
        }

        moveStr += toSquare;

        if (promotion) {
            moveStr += `=${figureNames[promotion][0]}`;
        }

        return moveStr;
    }

    function makeMove(move) {
        if (gameOver) return;

        const {from, to, promotion} = move;
        const fig = board[from.r][from.c];
        const targetFig = board[to.r][to.c];
        const color = figureColor(fig);
        const enemy = color === 'white' ? 'black' : 'white';
        //DSDIUOFSDUIF
        //asdasdasdasd
        // Добавляем взятую фигуру в список
        if (targetFig) {
            capturedPieces[figureColor(targetFig)].push(targetFig);
        }

        // Проверяем взятие на проходе
        if (fig.toLowerCase() === 'p' && enPassantTarget &&
            to.r === enPassantTarget.r && to.c === enPassantTarget.c) {
            const capturedPawn = board[from.r][to.c];
            capturedPieces[figureColor(capturedPawn)].push(capturedPawn);
            board[from.r][to.c] = '';
        }

        if (fig.toLowerCase() === 'k' && Math.abs(to.c - from.c) === 2) {
            const rookFromCol = to.c > from.c ? 7 : 0;
            const rookToCol = to.c > from.c ? to.c - 1 : to.c + 1;
            board[to.r][to.c] = fig;
            board[from.r][from.c] = '';
            board[to.r][rookToCol] = board[to.r][rookFromCol];
            board[to.r][rookFromCol] = '';
            canCastle[color].kingside = false;
            canCastle[color].queenside = false;
        } else {
            board[to.r][to.c] = promotion || fig;
            board[from.r][from.c] = '';

            if (fig.toLowerCase() === 'k') {
                canCastle[color].kingside = false;
                canCastle[color].queenside = false;
            } else if (fig.toLowerCase() === 'r') {
                if (from.c === 0) canCastle[color].queenside = false;
                if (from.c === 7) canCastle[color].kingside = false;
            }
        }

        enPassantTarget = null;
        if (fig.toLowerCase() === 'p' && Math.abs(to.r - from.r) === 2) {
            enPassantTarget = {
                r: (from.r + to.r) / 2,
                c: from.c
            };
        }

        const moveStr = formatMove(from, to, fig, targetFig !== '' || (enPassantTarget && to.r === enPassantTarget.r && to.c === enPassantTarget.c), promotion);
        moveLog.push(moveStr);

        if (isInCheck(board, enemy)) {
            if (!hasAnyLegalMoves(enemy)) {
                updateStatus(`Мат! ${color === 'white' ? 'Белые' : 'Черные'} победили!`);
                gameOver = true;
            } else {
                updateStatus(`Шах ${enemy === 'white' ? 'белому' : 'черному'} королю!`);
            }
        } else if (!hasAnyLegalMoves(enemy)) {
            updateStatus('Пат! Ничья.');
            gameOver = true;
        } else {
            updateStatus(`Ход ${enemy === 'white' ? 'белых' : 'черных'}`);
        }

        currentTurn = enemy;
        selectedCell = null;
        legalMoves = [];
        updateMovesLog();
        updateCapturedPieces();
        renderBoard();
    }

    function hasAnyLegalMoves(color) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] && figureColor(board[r][c]) === color) {
                    const moves = generateLegalMoves(r, c);
                    if (moves.length > 0) return true;
                }
            }
        }
        return false;
    }

    function updateStatus(text) {
        statusEl.textContent = text;
    }

    function updateCapturedPieces() {
        const whiteCaptured = document.getElementById('captured-white-pieces');
        const blackCaptured = document.getElementById('captured-black-pieces');

        whiteCaptured.innerHTML = capturedPieces.white
            .map(fig => `<span class="white-fig">${figuresUnicode[fig]}</span>`)
            .join('');
        blackCaptured.innerHTML = capturedPieces.black
            .map(fig => `<span class="black-fig">${figuresUnicode[fig]}</span>`)
            .join('');
    }

    function updateMovesLog() {
        movesLogEl.innerHTML = '';

        for (let i = 0; i < moveLog.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = moveLog[i];
            const blackMove = moveLog[i + 1];

            const movePair = document.createElement('div');
            movePair.className = 'move-pair';

            movePair.innerHTML = `
                <div class="move-number">${moveNumber}.</div>
                <div class="move-content">
                    <div class="move-white">${whiteMove}</div>
                    <div class="move-black">${blackMove || ''}</div>
                </div>
            `;

            movesLogEl.appendChild(movePair);
        }

        movesLogEl.scrollTop = movesLogEl.scrollHeight;
    }

    function renderBoard() {
        boardEl.innerHTML = '';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
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
                if (legalMoves.some(move => move.to.r === r && move.to.c === c)) {
                    cell.classList.add('legal-move');
                }

                cell.addEventListener('click', () => onCellClick(r, c));
                boardEl.appendChild(cell);
            }
        }
    }

    function onCellClick(r, c) {
        if (gameOver) return;

        const fig = board[r][c];
        const color = figureColor(fig);

        if (selectedCell) {
            const move = legalMoves.find(move => move.to.r === r && move.to.c === c);
            if (move) {
                makeMove(move);
                return;
            }
        }

        if (color === currentTurn) {
            selectedCell = {r, c};
            legalMoves = generateLegalMoves(r, c);
        } else {
            selectedCell = null;
            legalMoves = [];
        }

        renderBoard();
    }

    function initGame() {
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
        capturedPieces = {
            white: [],
            black: []
        };
        updateStatus('Ход белых');
        updateMovesLog();
        updateCapturedPieces();
        renderBoard();
    }

    initGame();
})();