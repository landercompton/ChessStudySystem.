// Stockfish Universal Wrapper - handles different Stockfish.js implementations
class StockfishWrapper {
    constructor() {
        this.messageHandlers = [];
        this.instance = null;
        this.ready = false;
        this.messageBuffer = [];
    }

    async initialize(pathOrInstance) {
        console.log('🔄 Initializing Stockfish wrapper...');

        if (typeof pathOrInstance === 'string') {
            // Load from path
            this.instance = await this.loadFromPath(pathOrInstance);
        } else {
            // Use provided instance
            this.instance = pathOrInstance;
        }

        // Auto-detect and setup the appropriate API
        await this.detectAndSetupAPI();

        // Process any buffered messages
        this.processMessageBuffer();

        return this;
    }

    async loadFromPath(path) {
        console.log(`📁 Loading Stockfish from: ${path}`);

        // First, check if it's a regular script that sets a global
        const globalName = 'Stockfish';
        const existingGlobal = window[globalName];

        // Try to load as a module first
        try {
            const module = await import(path);
            console.log('📦 Loaded as ES module');

            // Try various ways to get the Stockfish constructor/instance
            if (module.default && typeof module.default === 'function') {
                return module.default();
            } else if (module.Stockfish && typeof module.Stockfish === 'function') {
                return new module.Stockfish();
            } else if (module.default) {
                return module.default;
            } else if (module.Stockfish) {
                return module.Stockfish;
            }
        } catch (moduleError) {
            console.log('⚠️ Module loading failed, trying script tag approach...');
        }

        // Try loading as a regular script
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = path;

            script.onload = () => {
                // Check if a new global was created
                const newGlobal = window[globalName];
                if (newGlobal && newGlobal !== existingGlobal) {
                    console.log('✅ Loaded via script tag, found global Stockfish');
                    if (typeof newGlobal === 'function') {
                        resolve(new newGlobal());
                    } else {
                        resolve(newGlobal);
                    }
                } else {
                    reject(new Error('Script loaded but no Stockfish global found'));
                }
            };

            script.onerror = () => reject(new Error('Failed to load script'));
            document.head.appendChild(script);
        });
    }

    async detectAndSetupAPI() {
        console.log('🔍 Detecting Stockfish API...');
        console.log('🔍 Instance type:', typeof this.instance);
        console.log('🔍 Instance:', this.instance);
        console.log('🔍 Instance methods:', Object.getOwnPropertyNames(this.instance));

        // If instance is a function, it might need to be called
        if (typeof this.instance === 'function') {
            console.log('🔄 Instance is a function, calling it...');
            try {
                this.instance = this.instance();
                if (this.instance instanceof Promise) {
                    this.instance = await this.instance;
                }
                console.log('🔍 After calling: Instance type:', typeof this.instance);
                console.log('🔍 After calling: Instance methods:', Object.getOwnPropertyNames(this.instance));
            } catch (e) {
                console.log('⚠️ Failed to call instance as function:', e);
            }
        }

        // Wait for any async initialization
        if (this.instance && this.instance.ready) {
            console.log('⏳ Waiting for instance.ready...');
            await this.instance.ready;
        }

        // Check all possible API patterns
        const apis = {
            worker: this.instance instanceof Worker,
            postMessage: typeof this.instance.postMessage === 'function',
            listen: typeof this.instance.listen === 'function',
            uci: typeof this.instance.uci === 'function',
            print: typeof this.instance.print === 'function',
            addMessageListener: typeof this.instance.addMessageListener === 'function',
            addEventListener: typeof this.instance.addEventListener === 'function',
            onmessage: 'onmessage' in this.instance,
            cmd: typeof this.instance.cmd === 'function',
            send: typeof this.instance.send === 'function',
            write: typeof this.instance.write === 'function'
        };

        console.log('🔍 Available APIs:', apis);

        // FIXED: Detect Lichess Stockfish API specifically
        if (apis.listen && apis.uci) {
            console.log('🎯 Detected Lichess Stockfish API (listen + uci)');
            this.setupLichessStockfishAPI();
        } else if (apis.listen) {
            this.setupListenAPI();
        } else if (apis.worker || (apis.postMessage && apis.onmessage)) {
            this.setupWorkerAPI();
        } else if (apis.addMessageListener) {
            this.setupMessageListenerAPI();
        } else if (apis.addEventListener) {
            this.setupEventListenerAPI();
        } else if (apis.cmd) {
            this.setupCmdAPI();
        } else if (apis.send) {
            this.setupSendAPI();
        } else if (apis.write) {
            this.setupWriteAPI();
        } else if (apis.postMessage) {
            this.setupPostMessageOnlyAPI();
        } else {
            console.warn('⚠️ No recognized API pattern found, using fallback');
            this.setupFallbackAPI();
        }

        this.ready = true;
        this.onReady();
    }

    // NEW: Specific setup for Lichess Stockfish
    setupLichessStockfishAPI() {
        console.log('✅ Using Lichess Stockfish API (listen + uci)');

        // Set up the listen callback to receive messages from the engine
        this.instance.listen((message) => {
            console.log('🔍 Lichess Stockfish message:', message);
            this.handleMessage(message);
        });

        // Use the uci method to send commands
        this.sendCommand = (cmd) => {
            console.log('📤 Sending UCI command via instance.uci():', cmd);
            try {
                this.instance.uci(cmd);
            } catch (error) {
                console.error('❌ Error sending UCI command:', error);
                throw error;
            }
        };
    }

    setupWorkerAPI() {
        console.log('✅ Using Worker API');
        this.instance.onmessage = (event) => {
            this.handleMessage(event.data);
        };
        this.sendCommand = (cmd) => this.instance.postMessage(cmd);
    }

    setupListenAPI() {
        console.log('✅ Using listen API (generic)');

        // Set up the listen callback to receive messages
        this.instance.listen((message) => {
            this.handleMessage(message);
        });

        // For generic listen API, try different send methods
        this.sendCommand = (cmd) => {
            console.log('📤 Sending command via generic listen API:', cmd);
            try {
                if (typeof this.instance === 'function') {
                    this.instance(cmd);
                } else if (this.instance.postMessage) {
                    this.instance.postMessage(cmd);
                } else if (this.instance.send) {
                    this.instance.send(cmd);
                } else {
                    console.error('❌ No send method available for listen API');
                }
            } catch (error) {
                console.error('❌ Error sending command:', error);
            }
        };
    }

    setupMessageListenerAPI() {
        console.log('✅ Using addMessageListener API');
        this.instance.addMessageListener((message) => {
            this.handleMessage(message);
        });
        this.sendCommand = (cmd) => {
            if (this.instance.postMessage) {
                this.instance.postMessage(cmd);
            } else if (this.instance.cmd) {
                this.instance.cmd(cmd);
            }
        };
    }

    setupEventListenerAPI() {
        console.log('✅ Using addEventListener API');
        this.instance.addEventListener('message', (event) => {
            this.handleMessage(event.data || event);
        });
        this.sendCommand = (cmd) => this.instance.postMessage(cmd);
    }

    setupCmdAPI() {
        console.log('✅ Using cmd API');
        if (this.instance.addMessageListener) {
            this.instance.addMessageListener((message) => {
                this.handleMessage(message);
            });
        }
        this.sendCommand = (cmd) => this.instance.cmd(cmd);
    }

    setupSendAPI() {
        console.log('✅ Using send API');
        if (this.instance.listen) {
            this.instance.listen((message) => {
                this.handleMessage(message);
            });
        }
        this.sendCommand = (cmd) => this.instance.send(cmd);
    }

    setupWriteAPI() {
        console.log('✅ Using write API');
        if (this.instance.onmessage) {
            const originalOnMessage = this.instance.onmessage;
            this.instance.onmessage = (msg) => {
                this.handleMessage(msg);
                if (originalOnMessage) originalOnMessage(msg);
            };
        }
        this.sendCommand = (cmd) => this.instance.write(cmd);
    }

    setupPostMessageOnlyAPI() {
        console.log('✅ Using postMessage-only API');
        // Some implementations only have postMessage without message receiving
        // We'll set up a basic command sending
        this.sendCommand = (cmd) => this.instance.postMessage(cmd);

        // Try to intercept console output as a fallback
        this.interceptConsole();
    }

    setupFallbackAPI() {
        console.log('✅ Using fallback API');
        console.log('🔍 Fallback: Instance methods:', Object.getOwnPropertyNames(this.instance));
        console.log('🔍 Fallback: Instance prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.instance)));

        // Last resort - try to send commands directly
        this.sendCommand = (cmd) => {
            console.log('→ Fallback send:', cmd);

            // Try different methods in order of preference
            if (typeof this.instance === 'function') {
                console.log('📤 Trying instance as function');
                try {
                    this.instance(cmd);
                    return;
                } catch (e) {
                    console.log('❌ Instance call failed:', e.message);
                }
            }

            if (this.instance.postMessage) {
                console.log('📤 Trying postMessage');
                try {
                    this.instance.postMessage(cmd);
                    return;
                } catch (e) {
                    console.log('❌ postMessage failed:', e.message);
                }
            }

            if (this.instance.send) {
                console.log('📤 Trying send');
                try {
                    this.instance.send(cmd);
                    return;
                } catch (e) {
                    console.log('❌ send failed:', e.message);
                }
            }

            if (this.instance.write) {
                console.log('📤 Trying write');
                try {
                    this.instance.write(cmd);
                    return;
                } catch (e) {
                    console.log('❌ write failed:', e.message);
                }
            }

            console.error('❌ No working send method found in fallback');
        };

        this.interceptConsole();
    }

    interceptConsole() {
        const originalLog = console.log;
        console.log = (...args) => {
            originalLog.apply(console, args);
            // Check if this looks like engine output
            const message = args.join(' ');
            if (message.includes('Stockfish') ||
                message.includes('bestmove') ||
                message.includes('info') ||
                message.includes('id') ||
                message.includes('uciok')) {
                this.handleMessage(message);
            }
        };
    }

    handleMessage(message) {
        console.log('🔍 Wrapper received message:', message);

        // Store messages until ready
        if (!this.ready) {
            this.messageBuffer.push(message);
            return;
        }

        // Call all registered handlers
        this.messageHandlers.forEach(handler => handler(message));
    }

    processMessageBuffer() {
        if (this.messageBuffer.length > 0) {
            console.log(`Processing ${this.messageBuffer.length} buffered messages`);
            this.messageBuffer.forEach(msg => {
                this.messageHandlers.forEach(handler => handler(msg));
            });
            this.messageBuffer = [];
        }
    }

    send(command) {
        console.log('→', command);
        if (this.sendCommand) {
            this.sendCommand(command);
        } else {
            console.error('No send command method available');
        }
    }

    addMessageHandler(handler) {
        this.messageHandlers.push(handler);
    }

    onReady() {
        console.log('✅ Stockfish wrapper ready');
    }
}

// Export for use
window.StockfishWrapper = StockfishWrapper;