// This script runs in the user's browser.

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

try {
    const ws = new WebSocket(wsUrl);

    // --- WebSocket Event Handlers ---

    ws.onopen = () => {
        console.log('WebSocket connection opened.');
        term.write('Connection established. Welcome!\r\n');
    };

    // This is the most important part: handling messages from the server.
    ws.onmessage = (event) => {
        // The data from the server (SSH output) is written directly to the terminal.
        term.write(event.data);
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed.');
        term.write('\r\n\r\n[Connection to server closed.]\r\n');
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        term.write('\r\n\r\n[An error occurred with the connection.]\r\n');
    };


    // --- xterm.js Event Handler ---

    // When the user types something in the terminal...
    term.onData(data => {
        // ...send that data over the WebSocket to the server.
        ws.send(data);
    });

} catch (e) {
    term.write(`\r\n[Error initializing WebSocket: ${e.message}]`);
    console.error("Failed to create WebSocket", e);
}

