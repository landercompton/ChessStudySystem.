// Chess Engine Manager with Improved Lichess Stockfish Support
class ChessEngineManager {
    constructor() {
        this.engines = new Map();
        this.activeEngine = null;
        console.log('✅ Engine manager initialized');
    }

    async loadEngine(engineType) {
        console.log('🔄 Loading engine:', engineType);

        try {
            switch (engineType) {
                case 'lichess-stockfish':
                    return await this.loadLichessStockfish();
                case 'stockfish-nnue':
                    return await this.loadStockfishNNUE();
                default:
                    throw new Error(`Unknown engine type: ${engineType}`);
            }
        } catch (error) {
            console.error(`❌ Failed to load ${engineType}:`, error);
            this.onEngineError(error);
            throw error;
        }
    }

    async loadLichessStockfish() {
        console.log('🔄 Loading Lichess Stockfish ES Module...');

        try {
            // Try different module paths
            const modulePaths = [
                '/js/stockfish/sf171-79.js',
                '/js/stockfish/sf16-7.js',
                '/js/stockfish/stockfish.js',
                // Also try without leading slash
                'js/stockfish/sf171-79.js',
                'js/stockfish/sf16-7.js',
                'js/stockfish/stockfish.js'
            ];

            let module = null;
            let loadedPath = null;

            for (const path of modulePaths) {
                try {
                    console.log(`🔄 Trying to import module from: ${path}`);
                    // Check if file exists first
                    const response = await fetch(path, { method: 'HEAD' });
                    if (!response.ok) {
                        console.log(`📁 File not found: ${path}`);
                        continue;
                    }

                    module = await import(path);
                    loadedPath = path;
                    console.log(`✅ Successfully imported from: ${path}`);
                    break;
                } catch (err) {
                    console.log(`❌ Failed to import from ${path}:`, err.message);
                }
            }

            if (!module) {
                console.error('❌ No Stockfish module files found. Please ensure Stockfish files are in /wwwroot/js/stockfish/');
                throw new Error('Failed to load any Stockfish module. Check that sf171-79.js or similar files exist in /wwwroot/js/stockfish/');
            }

            console.log('✅ ES Module imported successfully');
            console.log('🔍 Module exports:', Object.keys(module));
            console.log('🔍 Module type:', typeof module);
            console.log('🔍 Module.default type:', typeof module.default);

            let stockfish = null;

            // Try different ways to instantiate Stockfish
            if (typeof module.default === 'function') {
                try {
                    // For Lichess Stockfish, the default export is a function that returns the engine
                    stockfish = await module.default();
                    console.log('✅ Created Stockfish using await module.default()');
                } catch (e) {
                    console.log('⚠️ Failed with await, trying without await');
                    stockfish = module.default();
                    console.log('✅ Created Stockfish using module.default()');
                }
            } else if (typeof module.Stockfish === 'function') {
                try {
                    stockfish = new module.Stockfish();
                    console.log('✅ Created Stockfish using new module.Stockfish()');
                } catch (e) {
                    stockfish = module.Stockfish();
                    console.log('✅ Created Stockfish using module.Stockfish()');
                }
            } else if (module.default && typeof module.default === 'object') {
                // Module.default might already be an instance
                stockfish = module.default;
                console.log('✅ Using module.default as Stockfish instance');
            } else if (typeof module === 'function') {
                // The module itself might be the constructor
                try {
                    stockfish = new module();
                    console.log('✅ Created Stockfish using new module()');
                } catch (e) {
                    stockfish = module();
                    console.log('✅ Created Stockfish using module()');
                }
            } else {
                // Last resort - look for any function in the module
                for (const key of Object.keys(module)) {
                    if (typeof module[key] === 'function' && key.toLowerCase().includes('stockfish')) {
                        try {
                            stockfish = new module[key]();
                            console.log(`✅ Created Stockfish using new module.${key}()`);
                            break;
                        } catch (e) {
                            stockfish = module[key]();
                            console.log(`✅ Created Stockfish using module.${key}()`);
                            break;
                        }
                    }
                }
            }

            if (!stockfish) {
                console.error('❌ Could not create Stockfish instance. Module structure:', module);
                throw new Error('Failed to instantiate Stockfish from module');
            }

            console.log('🔍 Stockfish instance type:', typeof stockfish);
            console.log('🔍 Stockfish instance:', stockfish);
            console.log('🔍 Stockfish instance methods:', Object.getOwnPropertyNames(stockfish));
            console.log('🔍 Stockfish instance prototype:', stockfish.__proto__);

            // FIXED: Declare engine variable outside the if/else blocks
            let engine;

            // Create engine wrapper if StockfishWrapper is available
            if (window.StockfishWrapper) {
                const wrapper = new StockfishWrapper();
                await wrapper.initialize(stockfish);

                // Create engine interface
                engine = new LichessStockfishEngine(wrapper);
            } else {
                // Fallback to direct usage
                console.warn('StockfishWrapper not found, using direct interface');
                engine = new LichessStockfishEngine(stockfish);
            }

            // Initialize the engine
            await engine.initialize();

            // Store engine
            this.engines.set('lichess-stockfish', engine);
            this.activeEngine = engine;

            // Set up error handler
            engine.onError = (error) => {
                console.error('❌ Lichess Stockfish error:', error);
                this.onEngineError(error);
            };

            console.log('✅ Lichess Stockfish loaded successfully');
            return engine;

        } catch (error) {
            console.error('❌ Failed to load Lichess Stockfish:', error);
            throw error;
        }
    }

    async loadStockfishNNUE() {
        // Placeholder for alternative engine
        console.log('📢 Stockfish NNUE not implemented yet');
        throw new Error('Stockfish NNUE not implemented');
    }

    getActiveEngine() {
        return this.activeEngine;
    }

    onEngineError(error) {
        console.error('📢 ERROR:', error.message);
    }
}

// Lichess Stockfish Engine Wrapper
class LichessStockfishEngine {
    constructor(wrapper) {
        this.wrapper = wrapper;
        this.isReady = false;
        this.messageHandlers = new Map();
        this.currentEval = null;
        this.onError = null;

        // Set up message handler - FIX THE TYPO HERE
        this.wrapper.addMessageHandler((message) => {  // was addMessageHandle (missing 'r')
            this.handleMessage(message);
        });
    }

    async initialize() {
        console.log('🔄 Initializing Lichess Stockfish engine interface...');

        try {
            // Engine is already initialized via wrapper
            this.isReady = true;
            console.log('✅ Lichess Stockfish engine interface ready');

        } catch (error) {
            console.error('❌ Failed to initialize engine interface:', error);
            if (this.onError) this.onError(error);
            throw error;
        }
    }





    handleMessage(message) {
        console.log('🔍 Engine message:', message);

        if (typeof message === 'string') {
            const line = message.trim();

            if (line.startsWith('info')) {
                this.parseInfo(line);
                const infoHandler = this.messageHandlers.get('info');
                if (infoHandler) infoHandler(this.currentEval);
            } else if (line.startsWith('bestmove')) {
                const bestmoveHandler = this.messageHandlers.get('bestmove');
                if (bestmoveHandler) {
                    const match = line.match(/bestmove (\S+)/);
                    bestmoveHandler(match ? match[1] : null);
                }
            } else if (line === 'readyok') {
                if (this.resolveIsReady) {
                    this.resolveIsReady();
                    this.resolveIsReady = null;
                }
            } else if (line === 'uciok') {
                console.log('✅ UCI protocol confirmed');
            }
        }
    }

    // In chess-engines.js, replace the parseInfo method with this:

    // In chess-engines.js, replace these two methods in the LichessStockfishEngine class:

    parseInfo(line) {
        // Parse the score and convert to proper format
        let score = null;
        if (line.includes('score cp')) {
            const match = line.match(/score cp (-?\d+)/);
            if (match) {
                // Convert centipawns to pawns
                score = parseInt(match[1]) / 100;
            }
        } else if (line.includes('score mate')) {
            const match = line.match(/score mate (-?\d+)/);
            if (match) {
                score = `M${match[1]}`;
            }
        }

        // Store the evaluation
        this.currentEval = {
            depth: this.extractValue(line, 'depth'),
            score: score,  // Now this is either a number or "M#" string
            nodes: this.extractValue(line, 'nodes'),
            nps: this.extractValue(line, 'nps'),
            time: this.extractValue(line, 'time'),
            pv: this.extractPV(line)
        };

        console.log('📊 Parsed evaluation:', this.currentEval);
    }

    // You can remove the parseScore method entirely since we're handling it directly in parseInfo

    extractValue(line, key) {
        const regex = new RegExp(`${key}\\s+(\\d+)`);
        const match = line.match(regex);
        return match ? parseInt(match[1]) : null;
    }

    parseScore(line) {
        if (line.includes('score cp')) {
            const match = line.match(/score cp (-?\d+)/);
            return match ? { type: 'centipawn', value: parseInt(match[1]) } : null;
        } else if (line.includes('score mate')) {
            const match = line.match(/score mate (-?\d+)/);
            return match ? { type: 'mate', value: parseInt(match[1]) } : null;
        }
        return null;
    }

    extractPV(line) {
        const match = line.match(/pv\s+(.+)/);
        return match ? match[1].split(' ') : [];
    }

    async sendCommand(command) {
        console.log('→ Sending command:', command);
        if (this.wrapper && this.wrapper.send) {
            this.wrapper.send(command);
        } else {
            console.error('❌ No send method available');
        }

        // Add a small delay to ensure command is processed
        return new Promise(resolve => {
            setTimeout(resolve, 50);
        });
    }



    async uci() {
        await this.sendCommand('uci');
        return new Promise((resolve) => {
            const handler = (message) => {
                if (message === 'uciok') {
                    this.messageHandlers.delete('uciok');
                    resolve();
                }
            };
            this.messageHandlers.set('uciok', handler);

            // Timeout after 5 seconds
            setTimeout(() => {
                this.messageHandlers.delete('uciok');
                resolve();
            }, 5000);
        });
    }

    async isready() {
        await this.sendCommand('isready');
        return new Promise((resolve) => {
            this.resolveIsReady = resolve;
            setTimeout(resolve, 1000); // Timeout after 1 second
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

        await this.sendCommand(command);
    }

    // In chess-engines.js, find the analyze method in the LichessStockfishEngine class
    // and replace it with this updated version:

    // This should be inside the LichessStockfishEngine class definition
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

    async stop() {
        await this.sendCommand('stop');
    }

    async setOption(name, value) {
        await this.sendCommand(`setoption name ${name} value ${value}`);
    }

    onInfo(callback) {
        this.messageHandlers.set('info', callback);
    }

    destroy() {
        if (this.wrapper && this.wrapper.instance && this.wrapper.instance.terminate) {
            this.wrapper.instance.terminate();
        }
        this.messageHandlers.clear();
    }
}

// Initialize engine manager
window.chessEngineManager = new ChessEngineManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChessEngineManager, LichessStockfishEngine };
}

console.log('✅ Improved Lichess Stockfish engine manager loaded!');