// --- On-Screen Console Logger ---
// This section will capture console messages and display them on the webpage.
const logOutput = document.getElementById('console-log-output');

function logToUI(args, level = 'info') {
    if (!logOutput) return;

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry-${level}`;

    const timestamp = new Date().toLocaleTimeString();
    const message = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
            return JSON.stringify(arg, null, 2);
        }
        return String(arg);
    }).join(' ');

    logEntry.textContent = `[${timestamp}] ${message}`;
    logOutput.appendChild(logEntry);
    logOutput.scrollTop = logOutput.scrollHeight;
}

const originalConsoleLog = console.log;
console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    logToUI(args, 'info');
};

const originalConsoleError = console.error;
console.error = function(...args) {
    originalConsoleError.apply(console, args);
    logToUI(args, 'error');
};

const originalConsoleWarn = console.warn;
console.warn = function(...args) {
    originalConsoleWarn.apply(console, args);
    logToUI(args, 'warn');
};

console.log("Client script loaded. Waiting for Terminal library...");

// --- NEW: Application Initialization Function ---
// All of our main code is now inside this function.
function initializeApp() {
    console.log("Terminal library is ready. Initializing application...");

    // We still do a final check, just in case.
    if (typeof Terminal === 'undefined') {
        const errorMsg = "FATAL ERROR: The 'Terminal' object is still not defined. The xterm.min.js file may be corrupted or missing.";
        console.error(errorMsg);
        return;
    }

    const term = new Terminal({
        cursorBlink: true,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 14,
        rows: 40,
        theme: {
            background: '#000000',
            foreground: '#00ff00',
            cursor: '#00ff00',
        }
    });

    term.open(document.getElementById('terminal-container'));
    const wsUrl = `wss://ssh-vvmw.onrender.com/ssh`;

    term.write(`Attempting to connect to the server at ${wsUrl}...\r\n`);
    console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);

    try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connection opened successfully.');
            term.write('Connection established. Welcome!\r\n');
        };

        ws.onmessage = (event) => {
            term.write(event.data);
        };

        ws.onclose = (event) => {
            console.warn('WebSocket connection closed.');
            if (event.wasClean) {
                term.write(`\r\n\r\n[Connection to server closed cleanly, code=${event.code} reason=${event.reason}]`);
            } else {
                console.error('Connection died unexpectedly.');
                term.write('\r\n\r\n[Connection to server was lost.]\r\n');
            }
        };

        ws.onerror = (error) => {
            console.error('A WebSocket error occurred.');
            console.error("This usually means the server URL is wrong, the server is down, or something is blocking the connection.");
            term.write('\r\n\r\n[An error occurred with the connection. See console log for details.]\r\n');
        };

        term.onData(data => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            } else {
                console.warn("Could not send data, WebSocket is not open.");
            }
        });

    } catch (e) {
        console.error(`Error initializing WebSocket: ${e.message}`);
        term.write(`\r\n[Fatal Error: Could not create WebSocket. Check for typos in the URL.]`);
    }
}

// --- NEW: Polling function to check if xterm.js is loaded ---
// This will check every 100 milliseconds to see if the `Terminal` object exists.
// Once it exists, we know the library is ready and we can start our app.
const readyCheckInterval = setInterval(() => {
    // `Terminal` is the main object created by xterm.js
    if (typeof Terminal !== 'undefined') {
        // Stop the polling
        clearInterval(readyCheckInterval);
        // Run the main application logic
        initializeApp();
    }
}, 100);

