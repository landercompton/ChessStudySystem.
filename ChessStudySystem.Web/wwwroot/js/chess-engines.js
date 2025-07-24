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

            // Create engine wrapper if StockfishWrapper is available
            if (window.StockfishWrapper) {
                const wrapper = new StockfishWrapper();
                await wrapper.initialize(stockfish);

                // Create engine interface
                const engine = new LichessStockfishEngine(wrapper);
            } else {
                // Fallback to direct usage
                console.warn('StockfishWrapper not found, using direct interface');
                const engine = new LichessStockfishEngine(stockfish);
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

        // Set up message handler
        this.wrapper.addMessageHandler((message) => {
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

    setupListenAPI() {
        // For modern Stockfish with listen API
        this.stockfish.listen((message) => {
            this.handleMessage(message);
        });

        // Create a custom postMessage method for sending commands
        this.postMessage = (command) => {
            // Some Stockfish builds might still have postMessage even with listen
            if (this.stockfish.postMessage) {
                this.stockfish.postMessage(command);
            } else if (this.stockfish.send) {
                this.stockfish.send(command);
            } else {
                // Try calling the stockfish instance directly
                this.stockfish(command);
            }
        };
    }

    setupMessageListenerAPI() {
        // For Stockfish with addMessageListener
        this.stockfish.addMessageListener((message) => {
            this.handleMessage(message);
        });

        this.postMessage = (command) => {
            this.stockfish.postMessage(command);
        };
    }

    setupPostMessageAPI() {
        // For traditional Stockfish with Worker-like API
        this.stockfish.onmessage = (event) => {
            this.handleMessage(event.data);
        };

        this.postMessage = (command) => {
            this.stockfish.postMessage(command);
        };
    }

    setupCmdAPI() {
        // For Stockfish with cmd API
        if (this.stockfish.addMessageListener) {
            this.stockfish.addMessageListener((message) => {
                this.handleMessage(message);
            });
        }

        this.postMessage = (command) => {
            this.stockfish.cmd(command);
        };
    }

    setupCallableAPI() {
        // For Stockfish that is directly callable
        // Set up a message listener if available
        if (this.stockfish.listen) {
            this.stockfish.listen((message) => {
                this.handleMessage(message);
            });
        } else if (this.stockfish.addMessageListener) {
            this.stockfish.addMessageListener((message) => {
                this.handleMessage(message);
            });
        }

        // The stockfish instance itself is callable
        this.postMessage = (command) => {
            this.stockfish(command);
        };
    }

    setupWorkerAPI() {
        // For Web Worker-based Stockfish
        this.stockfish.onmessage = (event) => {
            this.handleMessage(event.data);
        };

        this.postMessage = (command) => {
            this.stockfish.postMessage(command);
        };
    }

    setupEventListenerAPI() {
        // For Stockfish with addEventListener
        this.stockfish.addEventListener('message', (event) => {
            this.handleMessage(event.data);
        });

        this.postMessage = (command) => {
            if (this.stockfish.postMessage) {
                this.stockfish.postMessage(command);
            } else if (typeof this.stockfish === 'function') {
                this.stockfish(command);
            }
        };
    }

    handleMessage(message) {
        console.log('Engine:', message);

        // Handle UCI initialization
        if (message === 'uciok') {
            this.isReady = true;
            this.resolveReady();
        }

        // Handle readyok
        if (message === 'readyok') {
            this.resolveIsReady();
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

    async sendCommand(command) {
        console.log('→', command);
        this.wrapper.send(command);
    }

    async waitForReady() {
        if (this.isReady) return;

        return new Promise((resolve) => {
            this.resolveReady = resolve;
            setTimeout(() => {
                if (!this.isReady) {
                    console.warn('⚠️ Engine ready timeout, continuing anyway');
                    this.isReady = true;
                    resolve();
                }
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

        await this.sendCommand(command);

        return new Promise((resolve) => {
            this.messageHandlers.set('bestmove', (result) => {
                this.messageHandlers.delete('bestmove');
                resolve(result);
            });
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
        if (this.stockfish.terminate) {
            this.stockfish.terminate();
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