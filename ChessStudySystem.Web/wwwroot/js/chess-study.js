// Chess Study JavaScript with Fixed Engine Integration
let chessGame = new Chess();
let board;
let currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
let moveHistory = [];
let currentMoveIndex = -1;
let analysisEnabled = true;
let engineConnected = false;
let currentEngine = null;
let enginePlayMode = false;
let engineColor = 'black'; // 'white' or 'black'
let engineThinking = false;
let engineStrength = 20; // Depth for engine moves

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

// In chess-study.js, update the makeEngineMove function:

// Function to handle engine moves
async function makeEngineMove() {
    if (!engineConnected || !currentEngine || engineThinking) return;

    engineThinking = true;
    updateEngineStatus('analyzing', 'Engine thinking...');

    console.log('🤖 Engine making move for position:', currentFen);

    try {
        // Set position
        await currentEngine.setPosition(currentFen);

        // Get best move using the existing analyze method
        const engineMove = await currentEngine.analyze({
            depth: engineStrength,
            moveTime: 3000 // 3 seconds for better analysis
        });

        console.log('🎯 Engine suggests move:', engineMove);

        if (engineMove && engineMove.length >= 4) {
            const from = engineMove.substring(0, 2);
            const to = engineMove.substring(2, 4);
            const promotion = engineMove.length > 4 ? engineMove[4] : undefined;

            console.log('🎮 Making engine move:', from, '->', to);

            // Make the move in chess.js
            const move = chessGame.move({
                from: from,
                to: to,
                promotion: promotion
            });

            if (move) {
                // Update the board visually
                board.move(from, to);

                // Update FEN and history
                currentFen = chessGame.fen();

                const newMove = {
                    move: engineMove,
                    from: from,
                    to: to,
                    san: move.san,
                    fen: currentFen,
                    timestamp: new Date()
                };

                if (currentMoveIndex < moveHistory.length - 1) {
                    moveHistory = moveHistory.slice(0, currentMoveIndex + 1);
                }

                moveHistory.push(newMove);
                currentMoveIndex = moveHistory.length - 1;

                // Update board state with legal moves for the player
                board.set({
                    fen: currentFen,
                    lastMove: [from, to],
                    movable: {
                        dests: getLegalMoves()
                    }
                });

                updateUI();

                // Continue analysis if enabled (but not in play mode)
                if (analysisEnabled && !enginePlayMode) {
                    setTimeout(() => requestEngineAnalysis(), 500);
                }
            } else {
                console.error('❌ Invalid engine move:', engineMove);
            }
        } else {
            console.error('❌ No valid move from engine');
        }
    } catch (error) {
        console.error('❌ Engine move error:', error);
    } finally {
        engineThinking = false;
        updateEngineStatus('connected', 'Connected');
    }
}
// Also add some debug logging to the existing analyze method to see what's happening:
// In chess-engines.js, update the analyze method to add logging:

async function analyze(options = {}) {
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

    console.log('🎲 Starting analysis with command:', command);

    await this.sendCommand(command);

    return new Promise((resolve) => {
        const bestmoveHandler = (result) => {
            console.log('🎯 Bestmove received in analyze:', result);
            this.messageHandlers.delete('bestmove');
            resolve(result);
        };

        this.messageHandlers.set('bestmove', bestmoveHandler);

        // Add timeout to prevent hanging
        setTimeout(() => {
            if (this.messageHandlers.has('bestmove')) {
                console.log('⏱️ Analysis timeout, no bestmove received');
                this.messageHandlers.delete('bestmove');
                resolve(null);
            }
        }, (moveTime || 5000) + 2000); // Give extra time for response
    });
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
// Update the initializeBoard function to sync with chess.js:
function initializeBoard() {
    console.log('🎯 Initializing chess study board...');

    // Initialize chess.js with starting position
    chessGame = new Chess();
    currentFen = chessGame.fen();

    // Get legal moves for the current position
    const moves = getLegalMoves();

    board = Chessground(document.getElementById('chessboard'), {
        fen: currentFen,
        movable: {
            free: false,
            dests: moves,
            events: {
                after: onMoveComplete
            }
        },
        draggable: {
            enabled: true
        },
        highlight: {
            lastMove: true,
            check: true
        },
        animation: {
            enabled: true,
            duration: 200
        }
    });

    console.log('♕ Chess study board created successfully!');
    console.log('🎲 Board state:', board.state);

    updateLegalMoves();
    updatePositionInfo();
}
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

// FIXED: Use the existing ChessEngineManager
async function connectToEngine() {
    try {
        console.log('🔗 Connecting to chess engine...');
        updateEngineStatus('connecting', 'Connecting...');

        // Use the existing ChessEngineManager
        if (!window.chessEngineManager) {
            throw new Error('ChessEngineManager not available');
        }

        // Load the Lichess Stockfish engine
        currentEngine = await window.chessEngineManager.loadEngine('lichess-stockfish');

        // FIXED: Add debug info and multiple polling approaches
        console.log('🔧 Setting up engine message handler...');

        // Debug: Check what the engine object looks like
        setTimeout(() => {
            console.log('🔍 Engine debug:');
            console.log('  - currentEngine:', currentEngine);
            console.log('  - currentEngine.currentEval:', currentEngine.currentEval);
            console.log('  - currentEngine.wrapper:', currentEngine.wrapper);
            if (currentEngine.wrapper) {
                console.log('  - wrapper.messageHandlers:', currentEngine.wrapper.messageHandlers);
            }
        }, 2000);

        // Method 1: Poll for currentEval changes
        let lastAnalysisTime = 0;
        const checkForAnalysis = () => {
            if (currentEngine && currentEngine.currentEval &&
                currentEngine.currentEval.time &&
                currentEngine.currentEval.time > lastAnalysisTime) {

                console.log('🔍 Found new analysis data:', currentEngine.currentEval);
                lastAnalysisTime = currentEngine.currentEval.time;
                updateEngineAnalysis(currentEngine.currentEval);
            }
        };

        // Poll every 100ms
        setInterval(checkForAnalysis, 100);

        // Method 2: Try to intercept wrapper messages
        if (currentEngine.wrapper) {
            currentEngine.wrapper.addMessageHandler((message) => {
                console.log('🔍 Wrapper message received:', message);

                // If it's an info message, parse it manually
                if (typeof message === 'string' && message.startsWith('info')) {
                    console.log('🔍 Manual parsing of info message');
                    const parsedInfo = parseEngineInfo(message);
                    if (parsedInfo.depth && parsedInfo.score !== undefined) {
                        console.log('🔍 Manually parsed info:', parsedInfo);
                        updateEngineAnalysis(parsedInfo);
                    }
                }
            });
        }

        engineConnected = true;
        updateEngineStatus('connected', 'Connected');
        console.log('✅ Engine connected successfully');

        // TEMPORARY: Test the UI by manually calling updateEngineAnalysis
        console.log('🧪 Testing UI update with fake data...');
        setTimeout(() => {
            updateEngineAnalysis({
                depth: 15,
                score: 0.25,
                pv: ['g1f3', 'g8f6', 'e2e4'],
                nodes: 50000
            });
        }, 1000);

        // Start initial analysis if enabled
        if (analysisEnabled) {
            setTimeout(() => requestEngineAnalysis(), 500);
        }

    } catch (error) {
        console.error('❌ Failed to connect to engine:', error);
        engineConnected = false;
        updateEngineStatus('disconnected', 'Failed to connect');
        showNotification('Failed to load chess engine: ' + error.message, 'error');
    }
}

// FIXED: Manual engine info parser as backup
function parseEngineInfo(message) {
    const parts = message.split(' ');
    const info = {};

    for (let i = 1; i < parts.length; i++) {
        switch (parts[i]) {
            case 'depth':
                info.depth = parseInt(parts[++i]);
                break;
            case 'score':
                if (parts[i + 1] === 'cp') {
                    info.score = parseInt(parts[i + 2]) / 100; // Convert centipawns to pawns
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
                info.pv = parts.slice(i + 1);
                i = parts.length; // Skip to end
                break;
        }
    }

    return info;
}

// Handle engine messages directly
function handleEngineMessage(message) {
    if (typeof message !== 'string') return;

    const line = message.trim();
    console.log('🔍 Processing engine message:', line);

    // Handle info messages (analysis data)
    if (line.startsWith('info') && line.includes('depth') && line.includes('score')) {
        const info = parseInfoMessage(line);
        console.log('📊 Parsed analysis info:', info);
        updateEngineAnalysis(info);
    }

    // Handle bestmove
    if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const bestMove = parts[1];
        console.log('🎯 Best move received:', bestMove);

        // Update the best move display
        const bestMoveElement = document.getElementById('best-move');
        if (bestMoveElement && bestMove !== 'none') {
            bestMoveElement.textContent = bestMove;
            highlightBestMove(bestMove);
        }
    }
}

// FIXED: Parse UCI info messages properly
function parseInfoMessage(message) {
    const parts = message.split(' ');
    const info = {};

    for (let i = 1; i < parts.length; i++) {
        switch (parts[i]) {
            case 'depth':
                info.depth = parseInt(parts[++i]);
                break;
            case 'score':
                if (parts[i + 1] === 'cp') {
                    info.score = parseInt(parts[i + 2]) / 100; // Convert centipawns to pawns
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
                info.pv = parts.slice(i + 1);
                i = parts.length; // Skip to end
                break;
        }
    }

    return info;
}

// Improve the analysis request to use appropriate depth:
function requestEngineAnalysis() {
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

        // Set the current position in the engine
        currentEngine.setPosition(currentFen).then(() => {
            // Start deeper analysis for better suggestions
            currentEngine.analyze({
                depth: 22,  // Increased depth for better analysis
                moveTime: 5000  // 5 seconds for thorough analysis
            });
        });

        updateEngineStatus('connected', 'Connected');

    } catch (error) {
        console.error('❌ Analysis error:', error);
        updateEngineStatus('connected', 'Connected');
    }
}
// Debug version of updateEngineAnalysis
function updateEngineAnalysis(info) {
    console.log('🎯 updateEngineAnalysis called with:', info);

    const evalElement = document.getElementById('evaluation');
    const bestMoveElement = document.getElementById('best-move');
    const depthElement = document.getElementById('depth');
    const pvElement = document.getElementById('pv-line');

    console.log('🎯 DOM elements found:');
    console.log('  - evalElement:', !!evalElement);
    console.log('  - bestMoveElement:', !!bestMoveElement);
    console.log('  - depthElement:', !!depthElement);
    console.log('  - pvElement:', !!pvElement);

    // Determine whose turn it is from the current FEN
    const isWhiteToMove = currentFen.includes(' w ');
    console.log('🎯 isWhiteToMove:', isWhiteToMove);

    // Update evaluation
    if (evalElement && info.score !== undefined && info.score !== null) {
        console.log('🎯 Processing score:', info.score, typeof info.score);

        let evalText = '';
        let displayScore = info.score;

        if (typeof info.score === 'string' && info.score.startsWith('M')) {
            evalText = info.score;
            displayScore = info.score.includes('-') ? -10 : 10;
            console.log('🎯 String mate score processed:', evalText);
        } else if (typeof info.score === 'number') {
            displayScore = info.score;
            evalText = displayScore > 0 ? `+${displayScore.toFixed(2)}` : displayScore.toFixed(2);
            console.log('🎯 Number score processed:', evalText);
        } else {
            console.log('🎯 Unknown score format:', info.score);
            evalText = String(info.score);
            displayScore = 0;
        }

        console.log('🎯 Setting evaluation text:', evalText);
        evalElement.textContent = evalText;

        // Update evaluation badge color
        const evalValue = typeof displayScore === 'number' ? displayScore : 0;
        let badgeClass = 'badge bg-secondary';
        if (evalValue > 0.5) {
            badgeClass = 'badge bg-success';
        } else if (evalValue < -0.5) {
            badgeClass = 'badge bg-danger';
        }

        console.log('🎯 Setting badge class:', badgeClass);
        evalElement.className = badgeClass;

        // Update evaluation bar
        updateEvaluationBar(displayScore);
    }

    // Update best move
    if (bestMoveElement && info.pv && info.pv.length > 0) {
        const bestMove = info.pv[0];
        console.log('🎯 Setting best move:', bestMove);
        bestMoveElement.textContent = bestMove;
        highlightBestMove(bestMove);
    }

    // Update depth
    if (depthElement && info.depth) {
        console.log('🎯 Setting depth:', info.depth);
        depthElement.textContent = info.depth;
    }

    // Update principal variation
    if (pvElement && info.pv) {
        const pvText = info.pv.slice(0, 6).join(' ');
        console.log('🎯 Setting PV:', pvText);
        pvElement.textContent = pvText;
    }

    console.log('🎯 Analysis update completed');
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

// Update onMoveComplete to trigger engine moves:
function onMoveComplete(orig, dest, metadata) {
    console.log('Move made:', orig, dest);

    // Create the move object
    const move = {
        from: orig,
        to: dest,
        promotion: metadata?.promotion || undefined
    };

    // Try to make the move in chess.js
    const result = chessGame.move(move);

    if (!result) {
        console.error('Invalid move!', move);
        board.set({ fen: currentFen });
        return;
    }

    // Get the new FEN from chess.js
    currentFen = chessGame.fen();
    console.log('📋 Updated FEN after move:', currentFen);

    // Add move to history
    const newMove = {
        move: orig + dest + (metadata?.promotion || ''),
        from: orig,
        to: dest,
        san: result.san,
        fen: currentFen,
        timestamp: new Date()
    };

    if (currentMoveIndex < moveHistory.length - 1) {
        moveHistory = moveHistory.slice(0, currentMoveIndex + 1);
    }

    moveHistory.push(newMove);
    currentMoveIndex = moveHistory.length - 1;

    updateUI();

    // Check if it's engine's turn
    const isWhiteTurn = currentFen.includes(' w ');
    if (enginePlayMode && !engineThinking) {
        if ((engineColor === 'white' && isWhiteTurn) ||
            (engineColor === 'black' && !isWhiteTurn)) {
            setTimeout(() => makeEngineMove(), 500);
        }
    }

    // Continue analysis if not in play mode
    if (analysisEnabled && engineConnected && !enginePlayMode) {
        console.log('🔄 Requesting analysis after move...');
        setTimeout(() => requestEngineAnalysis(), 300);
    }
}

// Add function to toggle play mode:
function togglePlayMode() {
    enginePlayMode = !enginePlayMode;

    if (enginePlayMode) {
        // Disable analysis mode when playing
        if (analysisEnabled) {
            toggleAnalysis();
        }

        // Show play mode controls
        showPlayModeDialog();
    } else {
        updatePlayModeButton();
    }
}

// FIXED: Calculate FEN after move (better version)
function calculateFenAfterMove(fen, from, to) {
    const parts = fen.split(' ');

    // Parse the board position (first part of FEN)
    const rows = parts[0].split('/');
    const board = [];

    // Convert FEN rows to 2D array
    for (let i = 0; i < 8; i++) {
        board[i] = [];
        let col = 0;
        for (let char of rows[i]) {
            if (char >= '1' && char <= '8') {
                // Empty squares
                const count = parseInt(char);
                for (let j = 0; j < count; j++) {
                    board[i][col++] = '';
                }
            } else {
                // Piece
                board[i][col++] = char;
            }
        }
    }

    // Convert square notation to array indices
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);

    // Move the piece
    const piece = board[fromRow][fromCol];
    board[fromRow][fromCol] = '';
    board[toRow][toCol] = piece;

    // Convert back to FEN
    const newRows = [];
    for (let i = 0; i < 8; i++) {
        let rowStr = '';
        let emptyCount = 0;

        for (let j = 0; j < 8; j++) {
            if (board[i][j] === '') {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    rowStr += emptyCount;
                    emptyCount = 0;
                }
                rowStr += board[i][j];
            }
        }
        if (emptyCount > 0) {
            rowStr += emptyCount;
        }
        newRows.push(rowStr);
    }

    // Update FEN parts
    parts[0] = newRows.join('/');
    parts[1] = parts[1] === 'w' ? 'b' : 'w'; // Flip turn

    // Increment halfmove clock
    if (parts[4]) {
        parts[4] = String(parseInt(parts[4]) + 1);
    }

    // Increment fullmove number if it's now White's turn
    if (parts[1] === 'w' && parts[5]) {
        parts[5] = String(parseInt(parts[5]) + 1);
    }

    return parts.join(' ');
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

function resetBoard() {
    chessGame.reset();
    currentFen = chessGame.fen();
    moveHistory = [];
    currentMoveIndex = -1;

    board.set({
        fen: currentFen,
        lastMove: null,
        movable: {
            dests: getLegalMoves()
        }
    });

    updateUI();

    if (analysisEnabled && engineConnected) {
        setTimeout(() => requestEngineAnalysis(), 300);
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
        clearEngineAnalysis();
    }
}

// Clear analysis display
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

    const evalBarElement = document.querySelector('.evaluation-indicator');
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
    chessGame.reset(); // Reset chess.js to starting position
    currentFen = chessGame.fen();

    board.set({
        fen: currentFen,
        lastMove: null,
        movable: {
            dests: getLegalMoves()
        }
    });

    updateUI();

    if (analysisEnabled && engineConnected) {
        requestEngineAnalysis();
    }
}

function goToPrevious() {
    if (currentMoveIndex <= -1) return;

    currentMoveIndex--;

    if (currentMoveIndex === -1) {
        currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        board.set({
            fen: currentFen,
            lastMove: null
        });
    } else {
        const move = moveHistory[currentMoveIndex];
        currentFen = move.fen;
        board.set({
            fen: currentFen,
            lastMove: [move.from, move.to]
        });
    }

    updateUI();

    if (analysisEnabled && engineConnected) {
        requestEngineAnalysis();
    }
}

function goToNext() {
    if (currentMoveIndex >= moveHistory.length - 1) return;

    currentMoveIndex++;
    const move = moveHistory[currentMoveIndex];
    currentFen = move.fen;

    board.set({
        fen: currentFen,
        lastMove: [move.from, move.to]
    });

    updateUI();

    if (analysisEnabled && engineConnected) {
        requestEngineAnalysis();
    }
}

function goToEnd() {
    if (moveHistory.length === 0) return;

    currentMoveIndex = moveHistory.length - 1;
    const move = moveHistory[currentMoveIndex];
    currentFen = move.fen;

    board.set({
        fen: currentFen,
        lastMove: [move.from, move.to]
    });

    updateUI();

    if (analysisEnabled && engineConnected) {
        requestEngineAnalysis();
    }
}

// Update the navigation functions to properly reconstruct positions:
function goToMove(index) {
    if (index < -1 || index >= moveHistory.length) return;

    // Reset to start position
    chessGame.reset();

    // Replay moves up to the selected index
    for (let i = 0; i <= index; i++) {
        const move = moveHistory[i];
        chessGame.move({
            from: move.from,
            to: move.to
        });
    }

    currentMoveIndex = index;
    currentFen = chessGame.fen();

    if (index === -1) {
        board.set({
            fen: currentFen,
            lastMove: null,
            movable: {
                dests: getLegalMoves()
            }
        });
    } else {
        const move = moveHistory[index];
        board.set({
            fen: currentFen,
            lastMove: [move.from, move.to],
            movable: {
                dests: getLegalMoves()
            }
        });
    }

    updateUI();

    if (analysisEnabled && engineConnected) {
        requestEngineAnalysis();
    }
}

// FEN functions
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
    document.getElementById('fenInput').value = currentFen;
    fenModal.show();
}

// Update applyFEN to sync with chess.js:
function applyFEN() {
    const fenInput = document.getElementById('fenInput').value.trim();

    if (!fenInput) {
        showNotification('Please enter a FEN string', 'error');
        return;
    }

    try {
        // Validate FEN with chess.js
        const testGame = new Chess(fenInput);
        if (!testGame) {
            throw new Error('Invalid FEN');
        }

        // Update both chess.js and board
        chessGame = testGame;
        currentFen = fenInput;

        board.set({
            fen: currentFen,
            movable: {
                dests: getLegalMoves()
            }
        });

        // Reset move history when setting new position
        moveHistory = [];
        currentMoveIndex = -1;

        updateUI();

        const fenModal = bootstrap.Modal.getInstance(document.getElementById('fenModal'));
        fenModal.hide();

        showNotification('Position loaded successfully!', 'success');

        if (analysisEnabled && engineConnected) {
            requestEngineAnalysis();
        }
    } catch (error) {
        console.error('Failed to apply FEN:', error);
        showNotification('Invalid FEN position', 'error');
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return; // Don't handle shortcuts when typing in inputs
    }

    switch (event.key) {
        case 'ArrowLeft':
            event.preventDefault();
            goToPrevious();
            break;
        case 'ArrowRight':
            event.preventDefault();
            goToNext();
            break;
        case 'Home':
            event.preventDefault();
            goToStart();
            break;
        case 'End':
            event.preventDefault();
            goToEnd();
            break;
        case 'f':
            event.preventDefault();
            flipBoard();
            break;
        case 'r':
            event.preventDefault();
            resetBoard();
            break;
        case 'a':
            event.preventDefault();
            toggleAnalysis();
            break;
    }
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 250px;';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 3000);
}

// Update getLegalMoves to use chess.js:
function getLegalMoves() {
    const dests = new Map();
    const moves = chessGame.moves({ verbose: true });

    moves.forEach(move => {
        if (!dests.has(move.from)) {
            dests.set(move.from, []);
        }
        dests.get(move.from).push(move.to);
    });

    return dests;
}

// Add function to show play mode dialog:
function showPlayModeDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'modal fade';
    dialog.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Play Against Engine</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Choose your color:</label>
                        <div class="btn-group w-100" role="group">
                            <input type="radio" class="btn-check" name="colorChoice" id="playWhite" checked>
                            <label class="btn btn-outline-primary" for="playWhite">
                                <i class="fas fa-chess-king"></i> Play as White
                            </label>
                            <input type="radio" class="btn-check" name="colorChoice" id="playBlack">
                            <label class="btn btn-outline-primary" for="playBlack">
                                <i class="fas fa-chess-king text-dark"></i> Play as Black
                            </label>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Engine Strength: <span id="strengthValue">20</span></label>
                        <input type="range" class="form-range" id="engineStrengthSlider" 
                               min="1" max="25" value="20" step="1">
                        <small class="text-muted">Lower = Easier, Higher = Stronger</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="startEngineGame()">Start Game</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);
    const modal = new bootstrap.Modal(dialog);

    // Update strength display
    dialog.querySelector('#engineStrengthSlider').addEventListener('input', (e) => {
        dialog.querySelector('#strengthValue').textContent = e.target.value;
    });

    dialog.addEventListener('hidden.bs.modal', () => {
        dialog.remove();
        if (!document.querySelector('.modal.show')) {
            enginePlayMode = false;
            updatePlayModeButton();
        }
    });

    modal.show();
}

// Add function to start engine game:
// Update the startEngineGame function to ensure engine moves first when playing White:

function startEngineGame() {
    const playAsWhite = document.getElementById('playWhite').checked;
    engineColor = playAsWhite ? 'black' : 'white';
    engineStrength = parseInt(document.getElementById('engineStrengthSlider').value);

    console.log('🎮 Starting game - Player:', playAsWhite ? 'White' : 'Black', 'Engine:', engineColor);

    // Reset board for new game
    resetBoard();

    // Set board orientation
    board.set({
        orientation: playAsWhite ? 'white' : 'black'
    });

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.querySelector('.modal.show'));
    modal.hide();

    updatePlayModeButton();

    // If engine plays white, make first move
    if (engineColor === 'white') {
        console.log('🤖 Engine plays White, making first move...');
        // Small delay to let UI settle
        setTimeout(() => {
            makeEngineMove();
        }, 1000);
    }
}

// Also update the check in onMoveComplete to ensure it's checking correctly:
// In the onMoveComplete function, update the engine turn check:

// Check if it's engine's turn
const isWhiteTurn = currentFen.includes(' w ');
console.log('🎮 After move - White to move:', isWhiteTurn, 'Engine color:', engineColor);

if (enginePlayMode && !engineThinking) {
    if ((engineColor === 'white' && isWhiteTurn) ||
        (engineColor === 'black' && !isWhiteTurn)) {
        console.log('🤖 It\'s engine\'s turn!');
        setTimeout(() => makeEngineMove(), 500);
    }
}
// Add function to update play mode button:
function updatePlayModeButton() {
    const button = document.getElementById('playModeToggle');
    if (button) {
        if (enginePlayMode) {
            button.innerHTML = `<i class="fas fa-stop"></i> Stop Playing`;
            button.classList.remove('btn-primary');
            button.classList.add('btn-danger');
        } else {
            button.innerHTML = `<i class="fas fa-play"></i> Play vs Engine`;
            button.classList.remove('btn-danger');
            button.classList.add('btn-primary');
        }
    }
}
