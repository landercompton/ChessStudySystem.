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
        console.log('Instance type:', typeof this.instance);

        // If instance is a function, it might need to be called
        if (typeof this.instance === 'function') {
            console.log('🔄 Instance is a function, calling it...');
            try {
                this.instance = this.instance();
                if (this.instance instanceof Promise) {
                    this.instance = await this.instance;
                }
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
            addMessageListener: typeof this.instance.addMessageListener === 'function',
            addEventListener: typeof this.instance.addEventListener === 'function',
            onmessage: 'onmessage' in this.instance,
            cmd: typeof this.instance.cmd === 'function',
            send: typeof this.instance.send === 'function',
            write: typeof this.instance.write === 'function',
            print: typeof this.instance.print === 'function'
        };

        console.log('🔍 Available APIs:', apis);

        // Special handling for Lichess Stockfish which might use print for output
        if (apis.print && !apis.listen && !apis.onmessage) {
            console.log('🔍 Detected print-based API (Lichess style)');
            this.setupPrintAPI();
        } else if (apis.worker || (apis.postMessage && apis.onmessage)) {
            this.setupWorkerAPI();
        } else if (apis.listen) {
            this.setupListenAPI();
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
            // Final fallback - assume it's callable
            console.log('⚠️ No standard API found, trying callable approach');
            this.setupCallableAPI();
        }

        // Send initial UCI command
        this.send('uci');

        // Mark as ready after a short delay
        setTimeout(() => {
            this.ready = true;
            this.onReady();
        }, 100);
    }

    setupPrintAPI() {
        console.log('✅ Using print API (Lichess Stockfish style)');

        // Override the print function to capture output
        const originalPrint = this.instance.print || console.log;
        this.instance.print = (message) => {
            // Call original print if it exists
            if (originalPrint !== console.log) {
                originalPrint.call(this.instance, message);
            }
            // Handle the message
            this.handleMessage(message);
        };

        // For sending commands, try various methods
        this.sendCommand = (cmd) => {
            if (typeof this.instance === 'function') {
                // The instance itself might be callable
                this.instance(cmd);
            } else if (this.instance.postMessage) {
                this.instance.postMessage(cmd);
            } else if (this.instance.cmd) {
                this.instance.cmd(cmd);
            } else {
                console.warn('No clear send method found, trying direct call');
                try {
                    this.instance(cmd);
                } catch (e) {
                    console.error('Failed to send command:', e);
                }
            }
        };
    }

    setupCallableAPI() {
        console.log('✅ Using callable API');
        this.sendCommand = (cmd) => {
            try {
                if (typeof this.instance === 'function') {
                    this.instance(cmd);
                } else {
                    console.error('Instance is not callable');
                }
            } catch (e) {
                console.error('Error calling instance:', e);
            }
        };

        // Try to intercept console for output
        this.interceptConsole();
    }

    setupWorkerAPI() {
        console.log('✅ Using Worker API');
        this.instance.onmessage = (event) => {
            this.handleMessage(event.data);
        };
        this.sendCommand = (cmd) => this.instance.postMessage(cmd);
    }

    setupListenAPI() {
        console.log('✅ Using listen API');
        this.instance.listen((message) => {
            this.handleMessage(message);
        });
        this.sendCommand = (cmd) => {
            if (this.instance.postMessage) {
                this.instance.postMessage(cmd);
            } else if (this.instance.send) {
                this.instance.send(cmd);
            } else if (typeof this.instance === 'function') {
                this.instance(cmd);
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
        console.log('Engine:', message);

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
window.StockfishWrapper = StockfishWrapper;// Stockfish Universal Wrapper - handles different Stockfish.js implementations
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
        console.log('Instance type:', typeof this.instance);

        // If instance is a function, it might need to be called
        if (typeof this.instance === 'function') {
            console.log('🔄 Instance is a function, calling it...');
            try {
                this.instance = this.instance();
                if (this.instance instanceof Promise) {
                    this.instance = await this.instance;
                }
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
            addMessageListener: typeof this.instance.addMessageListener === 'function',
            addEventListener: typeof this.instance.addEventListener === 'function',
            onmessage: 'onmessage' in this.instance,
            cmd: typeof this.instance.cmd === 'function',
            send: typeof this.instance.send === 'function',
            write: typeof this.instance.write === 'function'
        };

        console.log('🔍 Available APIs:', apis);

        // Setup based on detected API
        if (apis.worker || (apis.postMessage && apis.onmessage)) {
            this.setupWorkerAPI();
        } else if (apis.listen) {
            this.setupListenAPI();
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
            throw new Error('No compatible Stockfish API found');
        }

        // Send initial UCI command
        this.send('uci');

        // Mark as ready after a short delay
        setTimeout(() => {
            this.ready = true;
            this.onReady();
        }, 100);
    }

    setupWorkerAPI() {
        console.log('✅ Using Worker API');
        this.instance.onmessage = (event) => {
            this.handleMessage(event.data);
        };
        this.sendCommand = (cmd) => this.instance.postMessage(cmd);
    }

    setupListenAPI() {
        console.log('✅ Using listen API');
        this.instance.listen((message) => {
            this.handleMessage(message);
        });
        this.sendCommand = (cmd) => {
            if (this.instance.postMessage) {
                this.instance.postMessage(cmd);
            } else if (this.instance.send) {
                this.instance.send(cmd);
            } else if (typeof this.instance === 'function') {
                this.instance(cmd);
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

    interceptConsole() {
        const originalLog = console.log;
        console.log = (...args) => {
            originalLog.apply(console, args);
            // Check if this looks like engine output
            const message = args.join(' ');
            if (message.includes('bestmove') || message.includes('info') || message.includes('id')) {
                this.handleMessage(message);
            }
        };
    }

    handleMessage(message) {
        console.log('Engine:', message);

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