// Clean Chess Study with Lichess API
class ChessStudy {
    constructor() {
        this.chess = new Chess();
        this.board = null;
        this.moveHistory = [];
        this.currentMoveIndex = -1;
        this.isAnalyzing = false;

        this.init();
    }

    init() {
        console.log('🎯 Initializing Chess Study...');
        this.initializeBoard();
        this.setupEventListeners();
        this.updateUI();
        console.log('✅ Chess Study initialized');
    }

    initializeBoard() {
        const boardElement = document.getElementById('chessboard');
        if (!boardElement) {
            console.error('❌ Chessboard element not found');
            return;
        }

        this.board = Chessground(boardElement, {
            fen: this.chess.fen(),
            orientation: 'white',
            movable: {
                free: false,
                color: 'both',
                dests: this.getLegalMoves(),
                events: {
                    after: (orig, dest, metadata) => this.onMove(orig, dest, metadata)
                }
            },
            draggable: {
                enabled: true,
                showGhost: true
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

        console.log('♛ Chessboard created successfully');
    }

    setupEventListeners() {
        // Analyze button
        document.getElementById('analyzeBtn').addEventListener('click', () => {
            this.analyzePosition();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.goToPreviousMove();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.goToNextMove();
                    break;
                case 'a':
                    e.preventDefault();
                    this.analyzePosition();
                    break;
            }
        });
    }

    getLegalMoves() {
        const dests = new Map();
        const moves = this.chess.moves({ verbose: true });

        moves.forEach(move => {
            if (!dests.has(move.from)) {
                dests.set(move.from, []);
            }
            dests.get(move.from).push(move.to);
        });

        return dests;
    }

    onMove(orig, dest, metadata) {
        console.log('📝 Move attempted:', orig, '->', dest);

        // Try to make the move
        const move = this.chess.move({
            from: orig,
            to: dest,
            promotion: metadata?.promotion || 'q'
        });

        if (!move) {
            console.log('❌ Invalid move');
            this.board.set({ fen: this.chess.fen() });
            return;
        }

        console.log('✅ Move made:', move.san);

        // Add to history
        this.addMoveToHistory(move);

        // Update UI
        this.updateBoard();
        this.updateUI();

        // Auto-analyze after move (optional)
        setTimeout(() => this.analyzePosition(), 500);
    }

    addMoveToHistory(move) {
        // If we're not at the end of history, truncate future moves
        if (this.currentMoveIndex < this.moveHistory.length - 1) {
            this.moveHistory = this.moveHistory.slice(0, this.currentMoveIndex + 1);
        }

        this.moveHistory.push({
            move: move,
            fen: this.chess.fen(),
            san: move.san
        });

        this.currentMoveIndex = this.moveHistory.length - 1;
    }

    updateBoard() {
        this.board.set({
            fen: this.chess.fen(),
            movable: {
                dests: this.getLegalMoves()
            }
        });
    }

    updateUI() {
        this.updateMoveHistory();
        this.updatePositionInfo();
    }

    updateMoveHistory() {
        const historyElement = document.getElementById('moveHistory');
        if (!historyElement) return;

        if (this.moveHistory.length === 0) {
            historyElement.innerHTML = '<div class="text-muted text-center">No moves yet</div>';
            return;
        }

        let html = '';
        this.moveHistory.forEach((historyMove, index) => {
            const moveNumber = Math.floor(index / 2) + 1;
            const isWhite = index % 2 === 0;

            if (isWhite) {
                html += `<span class="text-muted">${moveNumber}.</span> `;
            }

            html += `<span class="move-item ${index === this.currentMoveIndex ? 'active' : ''}" 
                          onclick="chessStudy.goToMove(${index})">
                        ${historyMove.san}
                     </span> `;
        });

        historyElement.innerHTML = html;
    }

    updatePositionInfo() {
        // Update to-move indicator
        const toMoveElement = document.getElementById('toMove');
        if (toMoveElement) {
            const toMove = this.chess.turn() === 'w' ? 'White' : 'Black';
            toMoveElement.textContent = toMove;
            toMoveElement.className = `badge ${toMove === 'White' ? 'bg-light text-dark' : 'bg-dark'}`;
        }

        // Update FEN
        const fenElement = document.getElementById('currentFen');
        if (fenElement) {
            fenElement.textContent = this.chess.fen();
        }
    }

    goToMove(index) {
        if (index < -1 || index >= this.moveHistory.length) return;

        // Reset to start position
        this.chess.reset();

        // Replay moves up to the selected index
        for (let i = 0; i <= index; i++) {
            const historyMove = this.moveHistory[i];
            this.chess.move(historyMove.move);
        }

        this.currentMoveIndex = index;
        this.updateBoard();
        this.updateUI();
    }

    goToPreviousMove() {
        if (this.currentMoveIndex > -1) {
            this.goToMove(this.currentMoveIndex - 1);
        }
    }

    goToNextMove() {
        if (this.currentMoveIndex < this.moveHistory.length - 1) {
            this.goToMove(this.currentMoveIndex + 1);
        }
    }

    // Lichess API Analysis
    async analyzePosition() {
        if (this.isAnalyzing) {
            console.log('⏳ Analysis already in progress...');
            return;
        }

        this.isAnalyzing = true;
        this.updateAnalysisStatus('Analyzing...');

        const fen = this.chess.fen();
        console.log('🔍 Analyzing position:', fen);

        try {
            const analysis = await this.getLichessAnalysis(fen);
            console.log('📊 Analysis result:', analysis);

            this.displayAnalysis(analysis);
            this.updateAnalysisStatus('Analysis complete');

        } catch (error) {
            console.error('❌ Analysis failed:', error);
            this.updateAnalysisStatus('Analysis failed');
            this.clearAnalysisDisplay();
        } finally {
            this.isAnalyzing = false;
        }
    }

    async getLichessAnalysis(fen) {
        const response = await fetch('https://lichess.org/api/cloud-eval', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fen })
        });

        if (!response.ok) {
            throw new Error(`Lichess API error: ${response.status}`);
        }

        return await response.json();
    }

    displayAnalysis(analysis) {
        // Display evaluation
        if (analysis.cp !== undefined) {
            const evaluation = analysis.cp / 100; // Convert centipawns to pawns
            this.displayEvaluation(evaluation);
        } else if (analysis.mate !== undefined) {
            this.displayEvaluation(`M${analysis.mate}`);
        }

        // Display best move
        if (analysis.pv && analysis.pv.length > 0) {
            const bestMove = analysis.pv[0];
            document.getElementById('bestMove').textContent = bestMove;
            this.highlightBestMove(bestMove);
        }

        // Display depth
        if (analysis.depth) {
            document.getElementById('depth').textContent = analysis.depth;
        }

        // Display principal variation
        if (analysis.pv && analysis.pv.length > 1) {
            const pvText = analysis.pv.slice(0, 6).join(' ');
            document.getElementById('principalVariation').textContent = pvText;
        }
    }

    displayEvaluation(evaluation) {
        const evalElement = document.getElementById('evaluation');
        if (!evalElement) return;

        let displayText, numericValue, badgeClass;

        if (typeof evaluation === 'string' && evaluation.startsWith('M')) {
            // Mate score
            displayText = evaluation;
            numericValue = evaluation.includes('-') ? -10 : 10;
            badgeClass = evaluation.includes('-') ? 'bg-danger' : 'bg-success';
        } else {
            // Numeric evaluation
            numericValue = parseFloat(evaluation);
            displayText = numericValue > 0 ? `+${numericValue.toFixed(2)}` : numericValue.toFixed(2);

            if (numericValue > 1.0) {
                badgeClass = 'bg-success';
            } else if (numericValue < -1.0) {
                badgeClass = 'bg-danger';
            } else {
                badgeClass = 'bg-secondary';
            }
        }

        evalElement.textContent = displayText;
        evalElement.className = `badge ${badgeClass}`;

        // Update evaluation bar
        this.updateEvaluationBar(numericValue);
    }

    updateEvaluationBar(score) {
        const indicator = document.getElementById('evalBar');
        if (!indicator) return;

        let percentage = 50; // Default center

        if (typeof score === 'number') {
            // Convert score to percentage (cap at ±5.0)
            const cappedScore = Math.max(-5, Math.min(5, score));
            percentage = 50 + (cappedScore * 10);
        } else if (typeof score === 'string' && score.startsWith('M')) {
            // Mate score
            percentage = score.includes('-') ? 5 : 95;
        }

        indicator.style.left = `${percentage}%`;
    }

    highlightBestMove(moveUci) {
        if (!moveUci || moveUci.length < 4) {
            this.board.setAutoShapes([]);
            return;
        }

        const from = moveUci.substring(0, 2);
        const to = moveUci.substring(2, 4);

        this.board.setAutoShapes([{
            orig: from,
            dest: to,
            brush: 'blue'
        }]);

        console.log('💡 Highlighted best move:', from, '→', to);
    }

    updateAnalysisStatus(status) {
        const statusElement = document.getElementById('analysisStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }

        // Update button
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            if (this.isAnalyzing) {
                analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
                analyzeBtn.disabled = true;
            } else {
                analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Position';
                analyzeBtn.disabled = false;
            }
        }
    }

    clearAnalysisDisplay() {
        document.getElementById('evaluation').textContent = '--';
        document.getElementById('bestMove').textContent = '--';
        document.getElementById('depth').textContent = '--';
        document.getElementById('principalVariation').textContent = '--';
        this.board.setAutoShapes([]);

        // Reset evaluation bar to center
        const indicator = document.getElementById('evalBar');
        if (indicator) {
            indicator.style.left = '50%';
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chessStudy = new ChessStudy();
});