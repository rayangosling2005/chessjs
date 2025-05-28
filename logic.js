// script.js

// DOM элементы
const menu = document.getElementById("menu");
const startBtn = document.getElementById("start-btn");
const board = document.getElementById("board");
const info = document.getElementById("info");
const timer = document.getElementById("timer");
const playerDisplay = document.getElementById("player-display");
const turnIndicator = document.getElementById("turn-indicator");
const moveLog = document.getElementById("move-log");
const capturedPieces = document.getElementById("captured-pieces");
const checkStatus = document.getElementById("check-status");
const customTimeWrapper = document.getElementById("custom-time-wrapper");
const customTimeInput = document.getElementById("custom-time");

// Переменные состояния
let boardState = [];
let currentPlayer = "white";
let selectedPiece = null;
let captured = [];
let playerName = "";
let totalTime = 300;
let interval;

// Событие смены на свой таймер
const gameTimeSelect = document.getElementById("game-time");
gameTimeSelect.addEventListener("change", () => {
    customTimeWrapper.style.display = gameTimeSelect.value === "custom" ? "block" : "none";
});

// Событие запуска игры
startBtn.addEventListener("click", () => {
    const nameInput = document.getElementById("player-name");
    const colorSelect = document.getElementById("player-color");
    const boardColor = document.getElementById("board-color").value;

    playerName = nameInput.value || "Игрок";
    currentPlayer = "white";

    let selectedTime = gameTimeSelect.value;
    totalTime = selectedTime === "custom" ? parseInt(customTimeInput.value) * 60 : parseInt(selectedTime) * 60;

    if (!totalTime || totalTime <= 0) totalTime = 300;

    initBoard();
    updateTimer();
    interval = setInterval(updateTimer, 1000);

    playerDisplay.textContent = playerName;
    turnIndicator.textContent = "Белые";

    menu.style.display = "none";
    board.style.display = "grid";
    info.style.display = "block";

    document.body.className = boardColor;
});

// Создание доски
function initBoard() {
    board.innerHTML = "";
    boardState = [];

    const initial = [
        ["r", "n", "b", "q", "k", "b", "n", "r"],
        ["p", "p", "p", "p", "p", "p", "p", "p"],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["P", "P", "P", "P", "P", "P", "P", "P"],
        ["R", "N", "B", "Q", "K", "B", "N", "R"]
    ];

    for (let y = 0; y < 8; y++) {
        boardState[y] = [];
        for (let x = 0; x < 8; x++) {
            const square = document.createElement("div");
            square.classList.add("square");
            square.classList.add((x + y) % 2 === 0 ? "light" : "dark");
            square.dataset.x = x;
            square.dataset.y = y;

            const piece = initial[y][x];
            boardState[y][x] = piece;
            if (piece) {
                const span = document.createElement("span");
                span.textContent = getPieceUnicode(piece);
                span.classList.add("piece", piece === piece.toUpperCase() ? "white" : "black");
                square.appendChild(span);
            }
            board.appendChild(square);
        }
    }

    document.querySelectorAll(".square").forEach(sq =>
        sq.addEventListener("click", handleSquareClick)
    );
}

function getPieceUnicode(piece) {
    const map = {
        K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
        k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟"
    };
    return map[piece] || "";
}

function handleSquareClick(e) {
    const x = parseInt(e.currentTarget.dataset.x);
    const y = parseInt(e.currentTarget.dataset.y);
    const piece = boardState[y][x];

    if (selectedPiece) {
        const { x: fromX, y: fromY } = selectedPiece;
        if (isValidMove(fromX, fromY, x, y)) {
            const originalTarget = boardState[y][x];
            const originalBoard = boardState.map(row => [...row]);
            movePiece(fromX, fromY, x, y);
            if (isKingInCheck(currentPlayer)) {
                boardState = originalBoard;
                updateBoard();
                selectedPiece = null;
                return;
            }
            switchTurn();
        }
        clearHighlights();
        selectedPiece = null;
    } else if (piece && isPieceOwnedByCurrentPlayer(piece)) {
        selectedPiece = { x, y };
        highlightMoves(x, y);
    }
}

function isKingInCheck(playerColor) {
    const enemyColor = playerColor === "white" ? "black" : "white";
    let kingPos;

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const piece = boardState[y][x];
            if ((playerColor === "white" && piece === "K") ||
                (playerColor === "black" && piece === "k")) {
                kingPos = { x, y };
            }
        }
    }

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const piece = boardState[y][x];
            if (piece && isPieceOwnedByCurrentPlayer(piece) === false) {
                if (isValidMove(x, y, kingPos.x, kingPos.y)) {
                    return true;
                }
            }
        }
    }
    return false;
}
