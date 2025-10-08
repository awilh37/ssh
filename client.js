// --- On-Screen Console Logger ---
const logOutput = document.getElementById('console-log-output');
function logToUI(args, level = 'info') {
    if (!logOutput) return;
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry-${level}`;
    const timestamp = new Date().toLocaleTimeString();
    const message = args.map(arg => typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
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

// --- Application Initialization Function ---
// This code now only runs AFTER a successful login.
function initializeApp() {
    console.log("Terminal library is ready. Initializing application...");
    if (typeof Terminal === 'undefined') {
        console.error("FATAL ERROR: The 'Terminal' object is still not defined. The xterm.min.js file may be corrupted or missing.");
        return;
    }
    const term = new Terminal({
        cursorBlink: true,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 14,
        rows: 40,
        theme: { background: '#000000', foreground: '#00ff00', cursor: '#00ff00' }
    });

    // UI FIX: The terminal now attaches to the inner #terminal div, not the container.
    term.open(document.getElementById('terminal'));
    const wsUrl = `wss://ssh-vvmw.onrender.com/ssh`;

    term.write(`Attempting to connect to the server at ${wsUrl}...\r\n`);
    console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);

    try {
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
            console.log('WebSocket connection opened successfully.');
            term.write('Connection established. Welcome!\r\n');
        };
        ws.onmessage = (event) => term.write(event.data);
        ws.onclose = (event) => {
            console.warn('WebSocket connection closed.');
            const reason = event.wasClean ? `cleanly, code=${event.code} reason=${event.reason}` : 'unexpectedly.';
            term.write(`\r\n\r\n[Connection to server closed ${reason}]`);
        };
        ws.onerror = (error) => {
            console.error('A WebSocket error occurred. This usually means the server URL is wrong, the server is down, or something is blocking the connection.');
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

// --- NEW: Login Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginOverlay = document.getElementById('login-overlay');
    const appContainer = document.getElementById('app-container');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Stop the form from reloading the page

        // !!! IMPORTANT SECURITY WARNING !!!
        // This is a hard-coded password in the frontend code.
        // This is VERY INSECURE because anyone can view the source of the
        // webpage and see the password. This is only for our educational example.
        // In a real application, you would send this to the server to be
        // checked securely, and never store it in the client-side code.
        const correctUsername = "awilh";
        const correctPassword = "125012";

        if (usernameInput.value === correctUsername && passwordInput.value === correctPassword) {
            console.log("Login successful!");
            loginError.textContent = '';
            
            // Hide the login screen and show the main app
            loginOverlay.classList.add('hidden');
            appContainer.classList.remove('hidden');

            // Now that we are logged in, we can start checking if the terminal library is ready
            const readyCheckInterval = setInterval(() => {
                if (typeof Terminal !== 'undefined') {
                    clearInterval(readyCheckInterval);
                    initializeApp();
                }
            }, 100);

        } else {
            console.error("Login failed: Incorrect username or password.");
            loginError.textContent = 'Incorrect username or password.';
        }
    });
});

