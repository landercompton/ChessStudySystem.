// No changes needed to loadChessEngines - keep it simple
// The chess-engines.js and stockfish-wrapper.js will handle all the complexity// Chess Study JavaScript with Fixed Engine Integration
let board;
let currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
let moveHistory = [];
let currentMoveIndex = -1;
let analysisEnabled = true;
let engineConnected = false;
let currentEngine = null;

// Wait for local Chessground to load
function waitForChessground() {
    if (window.chessgroundLoaded && typeof window.Chessground === 'function') {
        console.log('Local Chessground 9.2.3 ready!');
        initializeChessboard();

        // Connect to engine after board is ready
        setTimeout(() => {
            connectToEngine();
        }, 500);
    } else {
        window.addEventListener('chessgroundReady', function () {
            console.log('Local Chessground 9.2.3 ready via event!');
            initializeChessboard();

            // Connect to engine after board is ready
            setTimeout(() => {
                connectToEngine();
            }, 500);
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    const boardElement = document.getElementById('chessboard');
    if (!boardElement) {
        console.error('Chessboard element not found');
        return;
    }

    waitForChessground();
    initializeUI();
});

function initializeChessboard() {
    console.log('🎯 Initializing chess study board...');

    const config = {
        fen: currentFen,
        orientation: 'white',
        turnColor: 'white',
        movable: {
            color: 'both',
            free: false,
            dests: new Map(),
            events: {
                after: onMoveComplete
            }
        },
        drawable: {
            enabled: true,
            visible: true,
            autoShapes: []
        },
        highlight: {
            lastMove: true,
            check: true
        },
        animation: {
            enabled: true,
            duration: 200
        },
        draggable: {
            enabled: true,
            showGhost: true
        },
        selectable: {
            enabled: true
        }
    };

    board = window.Chessground(document.getElementById('chessboard'), config);

    console.log('♕ Chess study board created successfully!');
    console.log('🎲 Board state:', board.state);

    updateLegalMoves();
    updatePositionInfo();
}

function initializeUI() {
    // Set up keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Initialize tooltips if Bootstrap is available
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[title]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
}

// Engine connection and management
async function connectToEngine() {
    try {
        // Create inline engine manager if needed
        if (!window.simpleEngineManager) {
            console.log('Creating inline engine manager...');

            // Create the engine classes inline
            window.LichessStockfishEngine = class {
                constructor() {
                    this.instance = null;
                    this.isReady = false;
                    this.messageHandlers = new Map();
                    this.currentEval = null;
                }

                async initialize() {
                    console.log('🔄 Initializing Lichess Stockfish...');

                    try {
                        // Import the module
                        const module = await import('/js/stockfish/sf171-79.js');
                        console.log('✅ Module loaded');

                        // The module.default is a function that returns a promise
                        this.instance = await module.default();
                        console.log('✅ Stockfish instance created');

                        // Set up the listen handler
                        if (this.instance.listen) {
                            this.instance.listen = (message) => {
                                this.handleMessage(message);
                            };
                            console.log('✅ Listen handler configured');
                        }

                        // Send initial UCI command
                        this.sendCommand('uci');

                        // Wait for initialization
                        await this.waitForReady();

                        console.log('✅ Lichess Stockfish initialized successfully');

                    } catch (error) {
                        console.error('❌ Failed to initialize Lichess Stockfish:', error);
                        throw error;
                    }
                }

                handleMessage(message) {
                    console.log('Engine:', message);

                    // Handle UCI initialization
                    if (message === 'uciok') {
                        this.isReady = true;
                        if (this.readyResolver) {
                            this.readyResolver();
                            this.readyResolver = null;
                        }
                    }

                    // Handle readyok
                    if (message === 'readyok') {
                        if (this.isReadyResolver) {
                            this.isReadyResolver();
                            this.isReadyResolver = null;
                        }
                    }

                    // Handle best move
                    if (message.startsWith('bestmove')) {
                        const parts = message.split(' ');
                        const bestMove = parts[1];
                        const ponderMove = parts[3];

                        if (this.messageHandlers.has('bestmove')) {
                            this.messageHandlers.get('bestmove')({ bestMove, ponderMove });
                        }
                    }

                    // Handle evaluation info
                    if (message.startsWith('info')) {
                        this.parseInfo(message);
                    }
                }

                parseInfo(message) {
                    const parts = message.split(' ');
                    const info = {};

                    for (let i = 1; i < parts.length; i++) {
                        switch (parts[i]) {
                            case 'depth':
                                info.depth = parseInt(parts[++i]);
                                break;
                            case 'score':
                                if (parts[i + 1] === 'cp') {
                                    info.score = parseInt(parts[i + 2]) / 100;
                                    i += 2;
                                } else if (parts[i + 1] === 'mate') {
                                    info.score = `M${parts[i + 2]}`;
                                    i += 2;
                                }
                                break;
                            case 'nodes':
                                info.nodes = parseInt(parts[++i]);
                                break;
                            case 'nps':
                                info.nps = parseInt(parts[++i]);
                                break;
                            case 'time':
                                info.time = parseInt(parts[++i]);
                                break;
                            case 'pv':
                                info.pv = parts.slice(i + 1).join(' ');
                                i = parts.length;
                                break;
                        }
                    }

                    this.currentEval = info;

                    if (this.messageHandlers.has('info')) {
                        this.messageHandlers.get('info')(info);
                    }
                }

                sendCommand(command) {
                    console.log('→', command);
                    if (this.instance && this.instance.uci) {
                        this.instance.uci(command);
                    } else {
                        console.error('Cannot send command - uci method not available');
                    }
                }

                async waitForReady() {
                    if (this.isReady) return;

                    return new Promise((resolve) => {
                        this.readyResolver = resolve;
                        // Timeout after 5 seconds
                        setTimeout(() => {
                            if (!this.isReady) {
                                console.warn('⚠️ Engine ready timeout, continuing anyway');
                                this.isReady = true;
                                resolve();
                            }
                        }, 5000);
                    });
                }

                async setPosition(fen = 'startpos', moves = []) {
                    let command = 'position ';
                    if (fen === 'startpos') {
                        command += 'startpos';
                    } else {
                        command += `fen ${fen}`;
                    }

                    if (moves.length > 0) {
                        command += ' moves ' + moves.join(' ');
                    }

                    this.sendCommand(command);
                }

                async analyze(options = {}) {
                    const {
                        depth = 20,
                        nodes = null,
                        moveTime = null,
                        infinite = false
                    } = options;

                    let command = 'go';

                    if (infinite) {
                        command += ' infinite';
                    } else {
                        if (depth) command += ` depth ${depth}`;
                        if (nodes) command += ` nodes ${nodes}`;
                        if (moveTime) command += ` movetime ${moveTime}`;
                    }

                    this.sendCommand(command);

                    return new Promise((resolve) => {
                        this.messageHandlers.set('bestmove', (result) => {
                            this.messageHandlers.delete('bestmove');
                            resolve(result);
                        });
                    });
                }

                async stop() {
                    this.sendCommand('stop');
                }

                onInfo(callback) {
                    this.messageHandlers.set('info', callback);
                }
            };

            window.simpleEngineManager = {
                async loadEngine() {
                    console.log('🔄 Loading Lichess Stockfish...');

                    try {
                        this.engine = new window.LichessStockfishEngine();
                        await this.engine.initialize();

                        console.log('✅ Engine loaded successfully');
                        return this.engine;
                    } catch (error) {
                        console.error('❌ Failed to load engine:', error);
                        throw error;
                    }
                },
                getEngine() {
                    return this.engine;
                }
            };
        }

        // Load the engine
        currentEngine = await window.simpleEngineManager.loadEngine();

        // Set up engine info handler
        currentEngine.onInfo((info) => {
            updateEngineAnalysis(info);
        });

        engineConnected = true;
        updateEngineStatus('connected', 'Connected');

        // Start analysis if enabled
        if (analysisEnabled) {
            requestEngineAnalysis();
        }
    } catch (error) {
        console.error('❌ Failed to connect to engine:', error);
        engineConnected = false;
        updateEngineStatus('disconnected', 'Failed to connect');
        showNotification('Failed to load chess engine: ' + error.message, 'error');
    }
}

// Engine selection handler
async function handleEngineChange(engineType) {
    // For now, we only support the inline Lichess Stockfish
    await connectToEngine();
}

function updateEngineStatus(status, text) {
    const statusIndicator = document.getElementById('engineStatus');
    const statusText = document.getElementById('engineStatusText');

    if (statusIndicator) {
        statusIndicator.className = `status-indicator status-${status}`;
    }

    if (statusText) {
        statusText.textContent = text;
    }
}


// Replace your updateEngineAnalysis function with this improved version
function updateEngineAnalysis(info) {
    const evalElement = document.getElementById('evaluation');
    const bestMoveElement = document.getElementById('best-move');
    const depthElement = document.getElementById('depth');
    const pvElement = document.getElementById('pv-line');

    // Determine whose turn it is from the current FEN
    const isWhiteToMove = currentFen.includes(' w ');

    if (evalElement && info.score !== undefined) {
        let evalText = '';
        let displayScore = info.score;

        if (typeof info.score === 'string' && info.score.startsWith('M')) {
            evalText = info.score; // Mate in X
        } else {
            // Engine always evaluates from White's perspective
            // If it's Black's turn, we need to show the evaluation correctly
            evalText = displayScore > 0 ? `+${displayScore.toFixed(2)}` : displayScore.toFixed(2);
        }

        evalElement.textContent = evalText;

        // Update evaluation badge color based on the score
        const evalValue = typeof displayScore === 'number' ? displayScore : 0;
        if (evalValue > 0.5) {
            evalElement.className = 'badge bg-success';
        } else if (evalValue < -0.5) {
            evalElement.className = 'badge bg-danger';
        } else {
            evalElement.className = 'badge bg-secondary';
        }

        // Update evaluation bar
        updateEvaluationBar(displayScore);
    }

    if (bestMoveElement && info.bestMove) {
        // Convert UCI notation to a more readable format if needed
        const bestMove = info.bestMove || '--';
        bestMoveElement.textContent = bestMove;

        // Highlight the best move on the board
        highlightBestMove(bestMove);
    }

    if (depthElement && info.depth) {
        depthElement.textContent = info.depth;
    }

    if (pvElement && info.pv) {
        const moves = info.pv.split(' ').slice(0, 6).join(' ');
        pvElement.textContent = moves;
    }

    console.log(`🎯 Analysis updated for ${isWhiteToMove ? 'White' : 'Black'} to move:`, {
        evaluation: evalText,
        bestMove: info.bestMove,
        depth: info.depth
    });
}

// Also update your requestEngineAnalysis function to ensure proper analysis
async function requestEngineAnalysis() {
    if (!engineConnected || !currentEngine) {
        console.log('❌ Engine not connected or available');
        return;
    }

    const isWhiteToMove = currentFen.includes(' w ');
    console.log(`🔄 Requesting analysis for ${isWhiteToMove ? 'White' : 'Black'} to move`);
    console.log('📋 Current FEN:', currentFen);

    updateEngineStatus('analyzing', 'Analyzing...');

    try {
        // Clear previous best move highlight
        board.setAutoShapes([]);

        // Set the current position
        await currentEngine.setPosition(currentFen);

        // Start analysis with longer time for better accuracy
        const analysis = await currentEngine.analyze({
            depth: 20,
            moveTime: 2000 // Analyze for 2 seconds for better results
        });

        updateEngineStatus('connected', 'Connected');

        console.log('✅ Analysis completed:', analysis);

    } catch (error) {
        console.error('❌ Analysis error:', error);
        updateEngineStatus('connected', 'Connected');
    }
}

// Update the highlightBestMove function to handle UCI notation properly
function highlightBestMove(move) {
    if (!board || !move || move.length < 4 || move === '--') {
        // Clear highlights if no valid move
        board.setAutoShapes([]);
        return;
    }

    const from = move.substring(0, 2);
    const to = move.substring(2, 4);

    // Validate square names
    const validSquare = /^[a-h][1-8]$/.test(from) && /^[a-h][1-8]$/.test(to);
    if (!validSquare) {
        console.warn('Invalid move format:', move);
        return;
    }

    console.log(`💡 Highlighting best move: ${from} → ${to}`);

    board.setAutoShapes([
        {
            orig: from,
            dest: to,
            brush: 'blue'
        }
    ]);
}

// Add this function to clear analysis display when needed
function clearEngineAnalysis() {
    const elements = {
        'evaluation': '+0.00',
        'best-move': '--',
        'depth': '--',
        'pv-line': '--'
    };

    Object.entries(elements).forEach(([id, defaultValue]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = defaultValue;
        }
    });

    const evalBarElement = document.getElementById('evalBar');
    if (evalBarElement) {
        evalBarElement.style.left = '50%';
    }

    const evaluationElement = document.getElementById('evaluation');
    if (evaluationElement) {
        evaluationElement.className = 'badge bg-secondary';
    }

    // Clear best move highlights
    if (board) {
        board.setAutoShapes([]);
    }
}


function updateEvaluationBar(score) {
    const indicator = document.querySelector('.evaluation-indicator');
    if (!indicator) return;

    let percentage = 50;

    if (typeof score === 'number') {
        // Convert score to percentage (cap at ±5.0)
        const cappedScore = Math.max(-5, Math.min(5, score));
        percentage = 50 + (cappedScore * 10);
    } else if (typeof score === 'string' && score.startsWith('M')) {
        // Mate score
        const mateIn = parseInt(score.substring(1));
        percentage = mateIn > 0 ? 95 : 5;
    }

    indicator.style.left = `${percentage}%`;
}

//async function onMoveComplete(orig, dest, metadata) {
//    console.log('Move made:', orig, dest);

//    const move = orig + dest;

//    // Add move to history
//    const newMove = {
//        move: move,
//        from: orig,
//        to: dest,
//        san: move, // TODO: Convert to SAN notation
//        fen: currentFen,
//        timestamp: new Date()
//    };

//    // If we're not at the end of history, truncate future moves
//    if (currentMoveIndex < moveHistory.length - 1) {
//        moveHistory = moveHistory.slice(0, currentMoveIndex + 1);
//    }

//    moveHistory.push(newMove);
//    currentMoveIndex = moveHistory.length - 1;

//    // Update UI
//    updateUI();

//    // Trigger engine analysis if enabled
//    if (analysisEnabled && engineConnected) {
//        requestEngineAnalysis();
//    }
//}

function onMoveComplete(orig, dest, metadata) {
    console.log('Move made:', orig, dest);

    const move = orig + dest;

    // Add move to history
    const newMove = {
        move: move,
        from: orig,
        to: dest,
        san: move, // TODO: Convert to SAN notation
        fen: currentFen,
        timestamp: new Date()
    };

    // If we're not at the end of history, truncate future moves
    if (currentMoveIndex < moveHistory.length - 1) {
        moveHistory = moveHistory.slice(0, currentMoveIndex + 1);
    }

    moveHistory.push(newMove);
    currentMoveIndex = moveHistory.length - 1;

    // Update the current FEN to the board's current position
    // This is crucial - get the FEN from the board after the move
    currentFen = board.getFen();

    // Send move to server for validation (if implemented)
    validateMoveOnServer(move).then(data => {
        if (data && data.success) {
            // If server validation is successful, use the server's FEN
            currentFen = data.fen;
        }

        updateUI();

        if (analysisEnabled) {
            console.log('Requesting engine analysis after move...');
            requestEngineAnalysis();
        }
    }).catch(error => {
        console.log('Server validation not implemented, continuing with client-side');
        // FEN is already updated above from board.getFen()

        updateUI();

        if (analysisEnabled) {
            console.log('Requesting engine analysis after move (client-side)...');
            requestEngineAnalysis();
        }
    });
}

async function validateMoveOnServer(move) {
    try {
        const response = await fetch('/Chess/MakeMove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]')?.value || ''
            },
            body: JSON.stringify({
                fen: currentFen,
                move: move
            })
        });

        if (!response.ok) throw new Error('Server validation failed');

        return await response.json();
    } catch (error) {
        // Server validation not implemented
        return null;
    }
}

// Board control functions
function resetBoard() {
    currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    moveHistory = [];
    currentMoveIndex = -1;

    board.set({
        fen: currentFen,
        lastMove: null
    });

    updateUI();

    if (analysisEnabled) {
        requestEngineAnalysis();
    }
}

function flipBoard() {
    board.toggleOrientation();
}

async function toggleAnalysis() {
    analysisEnabled = !analysisEnabled;
    const button = document.getElementById('analysisToggle');

    if (button) {
        button.innerHTML = `<i class="fas fa-brain"></i> Analysis: ${analysisEnabled ? 'ON' : 'OFF'}`;
        button.classList.toggle('btn-secondary', !analysisEnabled);
    }

    if (analysisEnabled && engineConnected) {
        requestEngineAnalysis();
    } else if (!analysisEnabled && currentEngine) {
        if (currentEngine.stop) {
            await currentEngine.stop();
        }
        board.setAutoShapes([]); // Clear best move highlight
    }
}

// UI Update functions
function updateUI() {
    updateMoveList();
    updatePositionInfo();
    updateLegalMoves();
}

function updateMoveList() {
    const moveListElement = document.getElementById('moves');
    if (!moveListElement) return;

    if (moveHistory.length === 0) {
        moveListElement.innerHTML = '<div class="text-muted text-center">No moves yet</div>';
        return;
    }

    let html = '';
    moveHistory.forEach((move, index) => {
        const moveNumber = Math.floor(index / 2) + 1;
        const isWhite = index % 2 === 0;

        if (isWhite) {
            html += `<div class="move-pair">`;
            html += `<span class="move-number">${moveNumber}.</span> `;
        }

        html += `<span class="move-item ${index === currentMoveIndex ? 'active' : ''}" 
                      onclick="goToMove(${index})">${move.san}</span> `;

        if (!isWhite || index === moveHistory.length - 1) {
            html += `</div>`;
        }
    });

    moveListElement.innerHTML = html;
}

function updatePositionInfo() {
    const parts = currentFen.split(' ');
    const toMove = parts[1] === 'w' ? 'White' : 'Black';

    const toMoveElement = document.getElementById('toMove');
    if (toMoveElement) {
        toMoveElement.textContent = toMove;
        toMoveElement.className = toMove === 'White' ? 'text-primary' : 'text-dark';
    }

    const fenElement = document.getElementById('currentFEN');
    if (fenElement) {
        fenElement.textContent = currentFen;
    }
}

function updateLegalMoves() {
    // This would normally calculate legal moves
    // For now, allow all moves in analysis mode
    const dests = new Map();
    const pieces = board.state.pieces;

    for (const [square, piece] of pieces) {
        if (piece) {
            // In free analysis mode, allow moving any piece
            const possibleDests = calculatePossibleSquares(square);
            dests.set(square, possibleDests);
        }
    }

    board.set({
        movable: {
            color: 'both',
            free: false,
            dests: dests
        }
    });
}

function calculatePossibleSquares(from) {
    // For free analysis, return all squares
    // In a real implementation, this would calculate legal moves
    const squares = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    files.forEach(file => {
        ranks.forEach(rank => {
            const square = file + rank;
            if (square !== from) {
                squares.push(square);
            }
        });
    });

    return squares;
}

// Navigation functions
function goToStart() {
    if (moveHistory.length === 0) return;

    currentMoveIndex = -1;
    currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    board.set({
        fen: currentFen,
        lastMove: null
    });

    updateUI();

    if (analysisEnabled) {
        requestEngineAnalysis();
    }
}

function goToPrevious() {
    if (currentMoveIndex > 0) {
        currentMoveIndex--;
        const move = moveHistory[currentMoveIndex];
        currentFen = move.fen;

        board.set({
            fen: currentFen,
            lastMove: [move.from, move.to]
        });

        updateUI();

        if (analysisEnabled) {
            requestEngineAnalysis();
        }
    } else {
        goToStart();
    }
}

function goToNext() {
    if (currentMoveIndex < moveHistory.length - 1) {
        currentMoveIndex++;
        const move = moveHistory[currentMoveIndex];
        currentFen = move.fen;

        board.set({
            fen: currentFen,
            lastMove: [move.from, move.to]
        });

        updateUI();

        if (analysisEnabled) {
            requestEngineAnalysis();
        }
    }
}

function goToEnd() {
    if (moveHistory.length > 0) {
        currentMoveIndex = moveHistory.length - 1;
        const move = moveHistory[currentMoveIndex];
        currentFen = move.fen;

        board.set({
            fen: currentFen,
            lastMove: [move.from, move.to]
        });

        updateUI();

        if (analysisEnabled) {
            requestEngineAnalysis();
        }
    }
}

function goToMove(index) {
    if (index >= 0 && index < moveHistory.length) {
        currentMoveIndex = index;
        const move = moveHistory[index];
        currentFen = move.fen;

        board.set({
            fen: currentFen,
            lastMove: [move.from, move.to]
        });

        updateUI();

        if (analysisEnabled) {
            requestEngineAnalysis();
        }
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // Arrow keys for navigation
    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            goToPrevious();
            break;
        case 'ArrowRight':
            e.preventDefault();
            goToNext();
            break;
        case 'ArrowUp':
            e.preventDefault();
            goToStart();
            break;
        case 'ArrowDown':
            e.preventDefault();
            goToEnd();
            break;
        case 'f':
            if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                flipBoard();
            }
            break;
        case 'a':
            if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                toggleAnalysis();
            }
            break;
    }
}

// FEN handling
function copyFEN() {
    navigator.clipboard.writeText(currentFen).then(() => {
        showNotification('FEN copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy FEN:', err);
        showNotification('Failed to copy FEN', 'error');
    });
}

function pasteFEN() {
    const fenModal = new bootstrap.Modal(document.getElementById('fenModal'));
    fenModal.show();
}

function applyFEN() {
    const fenInput = document.getElementById('fenInput');
    const newFen = fenInput.value.trim();

    if (newFen && isValidFEN(newFen)) {
        currentFen = newFen;
        moveHistory = [];
        currentMoveIndex = -1;

        board.set({
            fen: currentFen,
            lastMove: null
        });

        updateUI();

        if (analysisEnabled) {
            requestEngineAnalysis();
        }

        const fenModal = bootstrap.Modal.getInstance(document.getElementById('fenModal'));
        fenModal.hide();

        showNotification('Position loaded successfully!', 'success');
    } else {
        showNotification('Invalid FEN string!', 'error');
    }
}

function isValidFEN(fen) {
    // Basic FEN validation
    const parts = fen.split(' ');
    return parts.length === 6;
}

// Utility functions
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);

    // You can implement a proper notification system here
    // For now, just log to console

    // Example: Show a Bootstrap toast or alert
    if (typeof bootstrap !== 'undefined') {
        // Create and show a toast notification
        const toastHtml = `
            <div class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.innerHTML = toastHtml;
        document.body.appendChild(toastContainer);

        const toast = new bootstrap.Toast(toastContainer.querySelector('.toast'));
        toast.show();

        // Remove container after toast hides
        toastContainer.querySelector('.toast').addEventListener('hidden.bs.toast', () => {
            toastContainer.remove();
        });
    }
}