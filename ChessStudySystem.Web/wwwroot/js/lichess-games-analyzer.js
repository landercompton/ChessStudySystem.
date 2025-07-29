// Complete Lichess Games Analyzer
class LichessGamesAnalyzer {
    constructor() {
        this.games = [];
        this.openings = new Map();
        this.isLoading = false;
    }

    // Main method to fetch and analyze all games
    async analyzeUserGames(username) {
        if (this.isLoading) {
            console.log('⏳ Analysis already in progress...');
            return;
        }

        this.isLoading = true;
        this.updateStatus('Fetching games from Lichess...');

        try {
            console.log(`🎯 Fetching games for user: ${username}`);

            // Fetch games in batches
            const allGames = await this.fetchAllGames(username);
            console.log(`📊 Fetched ${allGames.length} games total`);

            // Analyze openings
            this.analyzeOpenings(allGames);

            // Display results
            this.displayResults();

            this.updateStatus(`Analysis complete! Analyzed ${allGames.length} games.`);

        } catch (error) {
            console.error('❌ Error analyzing games:', error);
            this.updateStatus('Error fetching games. Please check the username.');
        } finally {
            this.isLoading = false;
        }
    }

    // Fetch all games for a user (handles pagination)
    async fetchAllGames(username, maxGames = 1000) {
        const games = [];
        let page = 1;
        const gamesPerPage = 100; // Lichess API limit

        while (games.length < maxGames) {
            console.log(`📥 Fetching page ${page}...`);

            const response = await fetch(
                `https://lichess.org/api/games/user/${username}?max=${gamesPerPage}&pgnInJson=true&opening=true&accuracy=true&page=${page}`,
                {
                    headers: {
                        'Accept': 'application/x-ndjson' // Lichess returns newline-delimited JSON
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const text = await response.text();
            if (!text.trim()) break; // No more games

            // Parse NDJSON (each line is a separate JSON object)
            const pageGames = text.trim().split('\n').map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    console.warn('Failed to parse game line:', line);
                    return null;
                }
            }).filter(game => game !== null);

            if (pageGames.length === 0) break;

            games.push(...pageGames);
            console.log(`📊 Total games so far: ${games.length}`);

            this.updateStatus(`Fetched ${games.length} games...`);

            page++;

            // Rate limiting - wait between requests
            await this.sleep(100);
        }

        return games.slice(0, maxGames);
    }

    // Analyze games by opening
    analyzeOpenings(games) {
        console.log('🔍 Analyzing openings...');
        this.openings.clear();

        games.forEach(game => {
            const opening = this.extractOpening(game);
            const result = this.getGameResult(game);

            if (!this.openings.has(opening.name)) {
                this.openings.set(opening.name, {
                    name: opening.name,
                    eco: opening.eco,
                    games: [],
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    winRate: 0,
                    avgAccuracy: 0
                });
            }

            const openingStats = this.openings.get(opening.name);
            openingStats.games.push(game);

            // Count results
            if (result === 'win') openingStats.wins++;
            else if (result === 'draw') openingStats.draws++;
            else if (result === 'loss') openingStats.losses++;

            // Calculate win rate
            const totalGames = openingStats.games.length;
            openingStats.winRate = (openingStats.wins / totalGames) * 100;

            // Calculate average accuracy if available
            const accuracy = this.getPlayerAccuracy(game);
            if (accuracy) {
                const currentTotal = openingStats.avgAccuracy * (totalGames - 1);
                openingStats.avgAccuracy = (currentTotal + accuracy) / totalGames;
            }
        });

        console.log(`📈 Analyzed ${this.openings.size} different openings`);
    }

    // Extract opening information from game
    extractOpening(game) {
        if (game.opening) {
            return {
                name: game.opening.name || 'Unknown Opening',
                eco: game.opening.eco || '---'
            };
        }

        // Fallback: analyze first few moves
        return this.identifyOpeningFromMoves(game.moves);
    }

    // Simple opening identification from moves
    identifyOpeningFromMoves(moves) {
        if (!moves || moves.length < 2) {
            return { name: 'Unknown Opening', eco: '---' };
        }

        const firstMoves = moves.split(' ').slice(0, 4).join(' ');

        // Common opening patterns
        const openingPatterns = {
            'e4 e5': { name: "King's Pawn Game", eco: 'C20' },
            'e4 e5 Nf3 Nc6': { name: "Italian Game / Ruy Lopez", eco: 'C50' },
            'd4 d5': { name: "Queen's Pawn Game", eco: 'D02' },
            'd4 Nf6': { name: "Indian Defense", eco: 'A40' },
            'Nf3 d5': { name: "Reti Opening", eco: 'A04' },
            'c4': { name: "English Opening", eco: 'A10' },
            'e4 c5': { name: "Sicilian Defense", eco: 'B20' },
            'e4 e6': { name: "French Defense", eco: 'C00' },
            'e4 c6': { name: "Caro-Kann Defense", eco: 'B10' }
        };

        for (const [pattern, opening] of Object.entries(openingPatterns)) {
            if (firstMoves.startsWith(pattern)) {
                return opening;
            }
        }

        return { name: 'Other Opening', eco: '---' };
    }

    // Get game result from player's perspective
    getGameResult(game) {
        const username = this.getCurrentUsername();
        const isWhite = game.players.white.user?.name === username;

        if (game.status === 'draw') return 'draw';

        const winner = game.winner;
        if (!winner) return 'draw';

        if ((winner === 'white' && isWhite) || (winner === 'black' && !isWhite)) {
            return 'win';
        }

        return 'loss';
    }

    // Get player's accuracy from the game
    getPlayerAccuracy(game) {
        const username = this.getCurrentUsername();
        const isWhite = game.players.white.user?.name === username;

        if (isWhite && game.players.white.analysis?.accuracy) {
            return game.players.white.analysis.accuracy;
        } else if (!isWhite && game.players.black.analysis?.accuracy) {
            return game.players.black.analysis.accuracy;
        }

        return null;
    }

    // Display the analysis results
    displayResults() {
        const container = document.getElementById('openingAnalysis');
        if (!container) {
            console.error('Opening analysis container not found');
            return;
        }

        // Sort openings by win rate (descending)
        const sortedOpenings = Array.from(this.openings.values())
            .filter(opening => opening.games.length >= 3) // Only openings with 3+ games
            .sort((a, b) => b.winRate - a.winRate);

        const html = `
            <div class="opening-analysis-results">
                <h4><i class="fas fa-chart-bar"></i> Opening Analysis Results</h4>
                <p class="text-muted">Showing openings with 3 or more games</p>
                
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead class="table-dark">
                            <tr>
                                <th>Opening</th>
                                <th>ECO</th>
                                <th>Games</th>
                                <th>Win Rate</th>
                                <th>W-D-L</th>
                                <th>Avg Accuracy</th>
                                <th>Performance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedOpenings.map(opening => this.createOpeningRow(opening)).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="mt-4">
                    <h5>📊 Quick Stats</h5>
                    <div class="row">
                        <div class="col-md-3">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h6>Best Opening</h6>
                                    <strong class="text-success">${sortedOpenings[0]?.name || 'N/A'}</strong>
                                    <small class="d-block">${sortedOpenings[0]?.winRate.toFixed(1) || 0}% win rate</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h6>Most Played</h6>
                                    <strong class="text-primary">${this.getMostPlayedOpening()?.name || 'N/A'}</strong>
                                    <small class="d-block">${this.getMostPlayedOpening()?.games.length || 0} games</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h6>Total Openings</h6>
                                    <strong class="text-info">${sortedOpenings.length}</strong>
                                    <small class="d-block">with 3+ games</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card text-center">
                                <div class="card-body">
                                    <h6>Overall Win Rate</h6>
                                    <strong class="text-warning">${this.calculateOverallWinRate().toFixed(1)}%</strong>
                                    <small class="d-block">across all openings</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // Create a table row for an opening
    createOpeningRow(opening) {
        const performanceColor = opening.winRate >= 60 ? 'success' :
            opening.winRate >= 40 ? 'warning' : 'danger';

        const accuracyDisplay = opening.avgAccuracy > 0 ?
            `${opening.avgAccuracy.toFixed(1)}%` : 'N/A';

        return `
            <tr>
                <td><strong>${opening.name}</strong></td>
                <td><span class="badge bg-secondary">${opening.eco}</span></td>
                <td>${opening.games.length}</td>
                <td><span class="badge bg-${performanceColor}">${opening.winRate.toFixed(1)}%</span></td>
                <td>
                    <small>
                        <span class="text-success">${opening.wins}</span>-
                        <span class="text-secondary">${opening.draws}</span>-
                        <span class="text-danger">${opening.losses}</span>
                    </small>
                </td>
                <td>${accuracyDisplay}</td>
                <td>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-${performanceColor}" 
                             style="width: ${opening.winRate}%"></div>
                    </div>
                </td>
            </tr>
        `;
    }

    // Helper methods
    getMostPlayedOpening() {
        return Array.from(this.openings.values())
            .sort((a, b) => b.games.length - a.games.length)[0];
    }

    calculateOverallWinRate() {
        let totalWins = 0;
        let totalGames = 0;

        this.openings.forEach(opening => {
            totalWins += opening.wins;
            totalGames += opening.games.length;
        });

        return totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
    }

    getCurrentUsername() {
        // This should be set when starting the analysis
        return this.username || 'unknown';
    }

    updateStatus(message) {
        const statusElement = document.getElementById('analysisStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
        console.log(`📊 ${message}`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// UI Integration
function setupGamesAnalysis() {
    const analyzer = new LichessGamesAnalyzer();

    // Add UI elements to your existing page
    const analysisContainer = document.getElementById('gamesAnalysisContainer');
    if (analysisContainer) {
        analysisContainer.innerHTML = `
            <div class="card mt-3">
                <div class="card-header">
                    <h5><i class="fas fa-chart-line"></i> Lichess Games Analysis</h5>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label for="lichessUsername" class="form-label">Lichess Username:</label>
                        <div class="input-group">
                            <input type="text" class="form-control" id="lichessUsername" 
                                   placeholder="Enter your Lichess username" />
                            <button class="btn btn-success" id="analyzeGamesBtn">
                                <i class="fas fa-chart-bar"></i> Analyze Games
                            </button>
                        </div>
                    </div>
                    <div id="analysisStatus" class="text-muted mb-3">Enter your username to start analysis</div>
                    <div id="openingAnalysis"></div>
                </div>
            </div>
        `;

        // Add event listener
        document.getElementById('analyzeGamesBtn').addEventListener('click', async () => {
            const username = document.getElementById('lichessUsername').value.trim();
            if (!username) {
                alert('Please enter a Lichess username');
                return;
            }

            analyzer.username = username;
            await analyzer.analyzeUserGames(username);
        });
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    setupGamesAnalysis();
});