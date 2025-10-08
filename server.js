/*
 * --------------------------------------------------------------------------
 * CRITICAL WARNING: This code is for educational purposes only.
 * It contains severe security vulnerabilities and is NOT secure.
 * DO NOT USE THIS IN A PRODUCTION ENVIRONMENT.
 * --------------------------------------------------------------------------
 */

const express = require('express');
const expressWs = require('express-ws');
const { Client } = require('ssh2');
const path = require('path');

const app = express();
// This attaches WebSocket capabilities to the Express app.
expressWs(app);

// --- VULNERABILITY ---
// This server has no authentication. Anyone can connect.
// A real application would require robust user login (MFA, SSO).

// Serve the static frontend files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- NEW CODE ADDED ---
// This is a "health check" route. When you visit your Render URL,
// you will see this message instead of "Not Found". This confirms
// that your server is running correctly.
app.get('/', (req, res) => {
    res.status(200).send('Web SSH Server is running. Connect via WebSocket at /ssh');
});
// --- END OF NEW CODE ---


// Set up the WebSocket endpoint at '/ssh'
app.ws('/ssh', (ws, req) => {
    console.log('Client connected via WebSocket');

    const ssh = new Client();

    // --- IMPORTANT SECURITY UPDATE ---
    // Instead of writing your password here, we now safely read it from
    // Environment Variables that you will set up in your Render dashboard.
    // This keeps your secrets out of the code!
    if (!process.env.SSH_HOST || !process.env.SSH_USER || !process.env.SSH_PASS) {
        console.error("--> FATAL: Missing SSH credentials in environment variables.");
        ws.send("\r\n[Server Error: SSH credentials not configured.]\r\n");
        ws.close();
        return;
    }

    const sshConfig = {
        host: process.env.SSH_HOST,
        port: 22,
        username: process.env.SSH_USER,
        password: process.env.SSH_PASS
    };
    // --------------------------------------------------------------------------

    ssh.on('ready', () => {
        console.log('SSH connection ready');
        ws.send('SSH connection established.\r\n');

        ssh.shell((err, stream) => {
            if (err) {
                console.error('SSH shell error:', err);
                return ws.close();
            }

            // This is the core logic: piping data between the two connections.

            // 1. When the user types in the browser (WebSocket message)...
            ws.on('message', (data) => {
                // ...write that data to the SSH stream.
                stream.write(data);
            });

            // 2. When the SSH server sends output back...
            stream.on('data', (data) => {
                // ...send that data to the browser via WebSocket.
                ws.send(data.toString('utf8'));
            });

            // Handle stderr separately
            stream.stderr.on('data', (data) => {
                console.error('SSH STDERR:', data.toString('utf8'));
                ws.send(data.toString('utf8'));
            });

            // When the SSH session ends, close the connection
            stream.on('close', () => {
                ssh.end();
            });
        });
    }).on('error', (err) => {
        // --- INADEQUATE LOGGING ---
        // A real app would log this structured data to a secure logging service
        // for auditing and alerting.
        console.error('SSH connection error:', err);
        ws.send(`\r\n[SSH Connection Error: ${err.message}]\r\n`);
        ws.close();
    }).on('close', () => {
        console.log('SSH connection closed');
        if (ws.readyState === 1) { // 1 = OPEN
            ws.send('\r\n[SSH connection closed.]\r\n');
            ws.close();
        }
    });

    // When the browser closes the tab, ensure the SSH connection is terminated.
    ws.on('close', () => {
        console.log('Client disconnected WebSocket');
        ssh.end();
    });

    // Attempt to connect to the target SSH server
    try {
        console.log(`Attempting SSH connection to ${sshConfig.host}:${sshConfig.port}...`);
        ssh.connect(sshConfig);
    } catch (err) {
        console.error("Error in ssh.connect:", err);
        ws.send(`\r\n[Failed to initiate SSH connection: ${err.message}]\r\n`);
        ws.close();
    }
});

const PORT = process.env.PORT || 3000; // Render provides the PORT variable
app.listen(PORT, '0.0.0.0', () => {
    // --- INSECURE TRANSPORT ---
    // The server is running on HTTP, not HTTPS. All traffic is unencrypted.
    console.log(`Web SSH server listening on port ${PORT}`);
    console.log('WARNING: This server is NOT secure. Do not expose to the internet.');
});

