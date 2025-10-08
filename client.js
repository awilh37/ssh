// --- NEW ---
// We wrap the entire script in this event listener.
// This ensures that the code doesn't run until the entire HTML page
// is loaded and ready. This prevents errors where the script can't
// find an element like 'console-log-output' because it hasn't been
// created yet.
document.addEventListener('DOMContentLoaded', () => {

    // --- On-Screen Console Logger ---
    // This section will capture console messages and display them on the webpage.

    // Get the div where we will show the logs
    const logOutput = document.getElementById('console-log-output');

    /**
     * A function to add messages to our on-screen console.
     * @param {any[]} args - The content to log.
     * @param {'info' | 'error' | 'warn'} level - The log level for styling.
     */
    function logToUI(args, level = 'info') {
        if (!logOutput) return; // Failsafe if the element doesn't exist

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

        // Auto-scroll to the bottom
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    // Override the original console functions to also send logs to our UI logger
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
    // --- END of On-Screen Console Logger ---


    // This script runs in the user's browser.
    console.log("Client script loaded.");

    // --- NEW CHECK ---
    // Let's verify that the xterm.js library loaded correctly before we try to use it.
    if (typeof Terminal === 'undefined') {
        const errorMsg = "FATAL ERROR: The 'Terminal' object from xterm.js is not defined. The library may have failed to load. Check for network issues or ad-blockers.";
        console.error(errorMsg);
        // We stop the script here because nothing else will work.
        return;
    }
    // --- END OF NEW CHECK ---

    // Create a new terminal instance using xterm.js
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

    // Attach the terminal to the DOM element
    term.open(document.getElementById('terminal-container'));

    // --- UPDATED ---
    // This now points to your live Render server URL.
    // The 'wss://' part means it's a secure WebSocket connection.
    const wsUrl = `wss://ssh-vvmw.onrender.com/ssh`;


    term.write(`Attempting to connect to the server at ${wsUrl}...\r\n`);
    console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);

    try {
        const ws = new WebSocket(wsUrl);

        // --- WebSocket Event Handlers ---

        ws.onopen = () => {
            console.log('WebSocket connection opened successfully.');
            term.write('Connection established. Welcome!\r\n');
        };

        // This is the most important part: handling messages from the server.
        ws.onmessage = (event) => {
            // The data from the server (SSH output) is written directly to the terminal.
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
            console.error('A WebSocket error occurred. This is the most likely source of the problem.');
            console.error("This usually means the server URL is wrong, the server is down, or something is blocking the connection.");
            term.write('\r\n\r\n[An error occurred with the connection. See console log below for details.]\r\n');
        };


        // --- xterm.js Event Handler ---

        // When the user types something in the terminal...
        term.onData(data => {
            // ...send that data over the WebSocket to the server.
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
}); // --- We close the event listener here, at the end of the file.

