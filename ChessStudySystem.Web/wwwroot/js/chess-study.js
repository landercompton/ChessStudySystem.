// Chess Study JavaScript - Local Chessground 9.2.3
let board;
let currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
let moveHistory = [];
let currentMoveIndex = -1;
let analysisEnabled = true;
let engineConnected = false;

// Wait for local Chessground to load
function waitForChessground() {
    if (window.chessgroundLoaded && typeof window.Chessground === 'function') {
        console.log('Local Chessground 9.2.3 ready!');
        initializeChessboard();
    } else {
        window.addEventListener('chessgroundReady', function () {
            console.log('Local Chessground 9.2.3 ready via event!');
            initializeChessboard();
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
            visible: true
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

    // Simulate engine connection after a delay
    setTimeout(() => {
        simulateEngineConnection();
    }, 1000);
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

    // Send move to server for validation (if implemented)
    validateMoveOnServer(move).then(data => {
        if (data && data.success) {
            currentFen = data.fen;
            updateUI();

            if (analysisEnabled) {
                requestEngineAnalysis();
            }
        }
    }).catch(error => {
        console.log('Server validation not implemented, continuing with client-side');
        updateUI();

        if (analysisEnabled) {
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

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.log('Server validation failed:', error);
    }
    return null;
}

function updateUI() {
    updateMoveHistory();
    updatePositionInfo();
    updateLegalMoves();
    updateMoveNavigation();
}

function updateLegalMoves() {
    // TODO: Implement proper legal move generation
    // For now, allow all moves
    const dests = new Map();

    board.set({
        movable: {
            ...board.state.movable,
            dests: dests
        }
    });
}

function updateMoveHistory() {
    const movesDiv = document.getElementById('moves');
    const moveCountDiv = document.getElementById('moveCount');

    if (!movesDiv) return;

    moveCountDiv.textContent = moveHistory.length;

    if (moveHistory.length === 0) {
        movesDiv.innerHTML = '<div class="text-muted text-center">No moves yet</div>';
        return;
    }

    movesDiv.innerHTML = '';

    moveHistory.forEach((moveData, index) => {
        const moveElement = document.createElement('div');
        moveElement.className = `move-item ${index === currentMoveIndex ? 'active' : ''}`;

        const moveNumber = Math.floor(index / 2) + 1;
        const isWhiteMove = index % 2 === 0;
        const prefix = isWhiteMove ? `${moveNumber}.` : '';

        moveElement.innerHTML = `${prefix} ${moveData.san}`;
        moveElement.onclick = () => goToMove(index);

        movesDiv.appendChild(moveElement);
    });

    // Scroll to active move
    const activeMove = movesDiv.querySelector('.move-item.active');
    if (activeMove) {
        activeMove.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function updatePositionInfo() {
    // Update position information
    const toMoveElement = document.getElementById('toMove');
    const currentFENElement = document.getElementById('currentFEN');
    const materialElement = document.getElementById('material');

    if (toMoveElement) {
        const isWhiteToMove = currentFen.includes(' w ');
        toMoveElement.textContent = isWhiteToMove ? 'White' : 'Black';
        toMoveElement.className = isWhiteToMove ? 'text-primary' : 'text-dark';
    }

    if (currentFENElement) {
        currentFENElement.textContent = currentFen;
    }

    if (materialElement) {
        // TODO: Calculate material balance
        materialElement.textContent = 'Equal';
    }
}

function updateMoveNavigation() {
    // Enable/disable navigation buttons based on position in history
    const prevButton = document.querySelector('[onclick="goToPreviousMove()"]');
    const nextButton = document.querySelector('[onclick="goToNextMove()"]');
    const endButton = document.querySelector('[onclick="goToEnd()"]');

    if (prevButton) {
        prevButton.disabled = currentMoveIndex <= -1;
    }

    if (nextButton) {
        nextButton.disabled = currentMoveIndex >= moveHistory.length - 1;
    }

    if (endButton) {
        endButton.disabled = currentMoveIndex >= moveHistory.length - 1;
    }
}

// Board control functions
function resetBoard() {
    currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    moveHistory = [];
    currentMoveIndex = -1;

    if (board) {
        board.set({
            fen: currentFen,
            lastMove: null
        });

        updateUI();

        if (analysisEnabled) {
            requestEngineAnalysis();
        }
    }
}

function flipBoard() {
    if (board) {
        board.toggleOrientation();
    }
}

function toggleAnalysis() {
    analysisEnabled = !analysisEnabled;
    const button = document.getElementById('analysisToggle');

    if (button) {
        button.innerHTML = `<i class="fas fa-brain"></i> Analysis: ${analysisEnabled ? 'ON' : 'OFF'}`;
        button.className = analysisEnabled ? 'btn-chess' : 'btn-chess btn-secondary';
    }

    if (analysisEnabled) {
        requestEngineAnalysis();
    } else {
        clearEngineAnalysis();
    }
}

// Move navigation
function goToPreviousMove() {
    if (currentMoveIndex > -1) {
        currentMoveIndex--;

        if (currentMoveIndex === -1) {
            currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            board.set({
                fen: currentFen,
                lastMove: null
            });
        } else {
            const moveData = moveHistory[currentMoveIndex];
            currentFen = moveData.fen;
            board.set({
                fen: currentFen,
                lastMove: [moveData.from, moveData.to]
            });
        }

        updateUI();

        if (analysisEnabled) {
            requestEngineAnalysis();
        }
    }
}

function goToNextMove() {
    if (currentMoveIndex < moveHistory.length - 1) {
        currentMoveIndex++;
        const moveData = moveHistory[currentMoveIndex];

        // TODO: Apply the move properly to get the resulting FEN
        currentFen = moveData.fen;

        board.set({
            fen: currentFen,
            lastMove: [moveData.from, moveData.to]
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
        const moveData = moveHistory[currentMoveIndex];
        currentFen = moveData.fen;

        board.set({
            fen: currentFen,
            lastMove: [moveData.from, moveData.to]
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
        const moveData = moveHistory[index];
        currentFen = moveData.fen;

        board.set({
            fen: currentFen,
            lastMove: [moveData.from, moveData.to]
        });

        updateUI();

        if (analysisEnabled) {
            requestEngineAnalysis();
        }
    }
}

// FEN operations
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

// Engine simulation
function simulateEngineConnection() {
    engineConnected = true;
    updateEngineStatus('connected', 'Connected');

    if (analysisEnabled) {
        requestEngineAnalysis();
    }
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

function requestEngineAnalysis() {
    if (!engineConnected) return;

    updateEngineStatus('analyzing', 'Analyzing...');

    // Simulate engine analysis
    setTimeout(() => {
        const mockAnalysis = generateMockAnalysis();
        updateEngineAnalysis(mockAnalysis);
        updateEngineStatus('connected', 'Connected');
    }, 500 + Math.random() * 1000);
}

function generateMockAnalysis() {
    const evaluations = ['+0.15', '-0.23', '+0.45', '-0.12', '+0.67', '=0.00', '+1.23', '-0.89'];
    const moves = ['e4', 'Nf3', 'd4', 'Bc4', 'O-O', 'Qd2', 'Rfe1', 'a3'];
    const depths = [12, 15, 18, 20, 22];
    const pvLines = [
        'e4 e5 Nf3 Nc6 Bc4',
        'Nf3 d5 d4 Nf6 c4',
        'd4 d5 c4 e6 Nc3',
        'O-O Nf6 Re1 e6 c3'
    ];

    return {
        evaluation: evaluations[Math.floor(Math.random() * evaluations.length)],
        bestMove: moves[Math.floor(Math.random() * moves.length)],
        depth: depths[Math.floor(Math.random() * depths.length)],
        pvLine: pvLines[Math.floor(Math.random() * pvLines.length)]
    };
}

function updateEngineAnalysis(analysis) {
    const evaluationElement = document.getElementById('evaluation');
    const bestMoveElement = document.getElementById('best-move');
    const depthElement = document.getElementById('depth');
    const pvLineElement = document.getElementById('pv-line');
    const evalBarElement = document.getElementById('evalBar');

    if (evaluationElement) {
        evaluationElement.textContent = analysis.evaluation;

        // Update evaluation badge color
        const evalValue = parseFloat(analysis.evaluation.replace(/[+=]/g, ''));
        if (evalValue > 0.5) {
            evaluationElement.className = 'badge bg-success';
        } else if (evalValue < -0.5) {
            evaluationElement.className = 'badge bg-danger';
        } else {
            evaluationElement.className = 'badge bg-secondary';
        }
    }

    if (bestMoveElement) {
        bestMoveElement.textContent = analysis.bestMove;
    }

    if (depthElement) {
        depthElement.textContent = analysis.depth;
    }

    if (pvLineElement) {
        pvLineElement.textContent = analysis.pvLine;
    }

    if (evalBarElement) {
        // Convert evaluation to bar position (0-100%)
        const evalValue = parseFloat(analysis.evaluation.replace(/[+=]/g, ''));
        const isPositive = analysis.evaluation.includes('+');
        let barPosition = 50; // Center position

        if (isPositive) {
            barPosition = Math.min(90, 50 + (evalValue * 20));
        } else {
            barPosition = Math.max(10, 50 - (evalValue * 20));
        }

        evalBarElement.style.left = barPosition + '%';
    }
}

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
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

function handleKeyboardShortcuts(event) {
    // Only trigger if not typing in an input
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    switch (event.key.toLowerCase()) {
        case 'r':
            if (event.ctrlKey) {
                event.preventDefault();
                resetBoard();
            }
            break;
        case 'f':
            if (event.ctrlKey) {
                event.preventDefault();
                flipBoard();
            }
            break;
        case 'arrowleft':
            event.preventDefault();
            goToPreviousMove();
            break;
        case 'arrowright':
            event.preventDefault();
            goToNextMove();
            break;
        case 'arrowup':
            event.preventDefault();
            // Go to start
            currentMoveIndex = -1;
            currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            board.set({
                fen: currentFen,
                lastMove: null
            });
            updateUI();
            break;
        case 'arrowdown':
            event.preventDefault();
            goToEnd();
            break;
        case 'a':
            if (event.ctrlKey) {
                event.preventDefault();
                toggleAnalysis();
            }
            break;
        case 'c':
            if (event.ctrlKey) {
                event.preventDefault();
                copyFEN();
            }
            break;
        case 'v':
            if (event.ctrlKey) {
                event.preventDefault();
                pasteFEN();
            }
            break;
    }
}

// Initialize everything when the script loads
console.log('Chess Study System initialized - Local Chessground 9.2.3');