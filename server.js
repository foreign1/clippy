const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');
const readline = require('readline');

let PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e8 // 100 MB buffer limit for normal socket messages
});

// Middleware for parsing JSON requests
app.use(express.json());

// Ephemeral directory cleanup on startup
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsDir)) {
  try {
    fs.rmSync(uploadsDir, { recursive: true, force: true });
    console.log('Cleared existing ephemeral uploads directory.');
  } catch (err) {
    console.error('Error clearing uploads directory:', err);
  }
}
fs.mkdirSync(uploadsDir, { recursive: true });

// Environment limit detection (50MB Android/Termux vs 5GB PC)
const isMobile = process.platform === 'android' || process.env.TERMUX_VERSION !== undefined;
const defaultLimit = isMobile ? 50 : 5000;
let maxFileSizeMb = defaultLimit;

if (process.env.MAX_FILE_SIZE_MB) {
  const parsed = parseInt(process.env.MAX_FILE_SIZE_MB, 10);
  if (!isNaN(parsed)) {
    maxFileSizeMb = parsed;
  }
}

console.log(`Detected Environment: ${isMobile ? 'Mobile/Termux' : 'Computer'}`);
console.log(`Effective Maximum File Size Limit: ${maxFileSizeMb} MB`);

// Session and Connection State
const sessionHistory = [];
let connectedPeersCount = 0;

// Local IP Discovery
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// Serve Static Frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/config', async (req, res) => {
  const localIPs = getLocalIPs();
  const primaryIP = localIPs.length > 0 ? localIPs[0] : 'localhost';
  const primaryURL = `http://${primaryIP}:${PORT}/`;

  let qrCodeDataUrl = null;
  try {
    qrCodeDataUrl = await QRCode.toDataURL(primaryURL, {
      margin: 2,
      width: 256,
      color: {
        dark: '#0f0c22', // Match the card background
        light: '#f3f4f6' // Match main text color for high contrast
      }
    });
  } catch (err) {
    console.error('Failed to generate QR code:', err);
  }

  res.json({
    signature: 'lantern',
    maxFileSizeMb,
    isMobile,
    localIPs,
    port: PORT,
    primaryURL,
    qrCodeDataUrl
  });
});

// Chunk upload: Receives raw binary request bodies for high performance and low memory footprint
app.post('/api/upload-chunk', (req, res) => {
  const { uploadId, chunkIndex, filename } = req.query;
  if (!uploadId || chunkIndex === undefined || !filename) {
    return res.status(400).json({ error: 'Missing upload metadata' });
  }

  const tempDir = path.join(uploadsDir, `tmp-${uploadId}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const chunkPath = path.join(tempDir, `chunk-${chunkIndex}`);
  const writeStream = fs.createWriteStream(chunkPath);

  req.pipe(writeStream);

  req.on('end', () => {
    res.json({ success: true, message: `Chunk ${chunkIndex} received` });
  });

  req.on('error', (err) => {
    console.error(`Error writing chunk ${chunkIndex}:`, err);
    res.status(500).json({ error: 'Failed to write chunk' });
  });
});

// Helper stream append promise for chunk merge
function appendChunkStream(writeStream, chunkPath) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(chunkPath);
    readStream.pipe(writeStream, { end: false });
    readStream.on('end', resolve);
    readStream.on('error', reject);
  });
}

// Merge uploaded chunks
app.post('/api/merge-chunks', async (req, res) => {
  const { uploadId, filename, totalChunks } = req.body;
  if (!uploadId || !filename || totalChunks === undefined) {
    return res.status(400).json({ error: 'Missing merge parameters' });
  }

  const tempDir = path.join(uploadsDir, `tmp-${uploadId}`);
  if (!fs.existsSync(tempDir)) {
    return res.status(400).json({ error: 'Upload temporary files not found' });
  }

  // Sanitize filename to prevent directory traversal
  let cleanFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  let destPath = path.join(uploadsDir, cleanFilename);

  // Auto-rename to prevent collisions
  const ext = path.extname(cleanFilename);
  const base = path.basename(cleanFilename, ext);
  let counter = 1;
  while (fs.existsSync(destPath)) {
    cleanFilename = `${base}_${counter}${ext}`;
    destPath = path.join(uploadsDir, cleanFilename);
    counter++;
  }

  const writeStream = fs.createWriteStream(destPath);

  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `chunk-${i}`);
      if (!fs.existsSync(chunkPath)) {
        throw new Error(`Missing chunk ${i}`);
      }
      await appendChunkStream(writeStream, chunkPath);
    }
    writeStream.end();

    // Wait for file write to be flushed completely
    await new Promise((resolve) => writeStream.on('finish', resolve));

    // Clear the temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Identify file details
    const stats = fs.statSync(destPath);
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(cleanFilename);
    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(cleanFilename);
    const isAudio = /\.(mp3|wav|ogg|aac|flac)$/i.test(cleanFilename);

    res.json({
      success: true,
      filename: cleanFilename,
      url: `/download/${encodeURIComponent(cleanFilename)}`,
      isImage,
      isVideo,
      isAudio,
      size: stats.size
    });
  } catch (err) {
    console.error('Error merging chunks:', err);
    writeStream.end();
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
    res.status(500).json({ error: `Merge process failed: ${err.message}` });
  }
});

// Download/Stream route
app.get('/download/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  // Force download if parameter matches, otherwise serve for inline browser rendering/playback
  if (req.query.download === 'true') {
    res.download(filePath, req.params.filename);
  } else {
    res.sendFile(filePath);
  }
});

// Socket.io Real-time connection handler
io.on('connection', (socket) => {
  connectedPeersCount++;
  io.emit('peer-count-update', connectedPeersCount);

  // Sync entire chronological session history to late-joining user immediately
  socket.emit('session-sync', sessionHistory);

  socket.on('chat-message', (data) => {
    const msg = {
      type: 'text',
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender: data.sender,
      text: data.text,
      timestamp: Date.now()
    };
    sessionHistory.push(msg);
    io.emit('chat-message', msg);
  });

  socket.on('file-shared', (data) => {
    const fileMsg = {
      type: 'file',
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender: data.sender,
      filename: data.filename,
      size: data.size, // human readable string
      url: data.url,
      isImage: data.isImage,
      isVideo: data.isVideo,
      isAudio: data.isAudio,
      timestamp: Date.now()
    };
    sessionHistory.push(fileMsg);
    io.emit('file-shared', fileMsg);
  });

  socket.on('disconnect', () => {
    connectedPeersCount = Math.max(0, connectedPeersCount - 1);
    io.emit('peer-count-update', connectedPeersCount);
  });
});

// Helper to check if a port is in use and if it is a LANtern instance
function checkPort(port) {
  return new Promise((resolve) => {
    const testServer = http.createServer();
    testServer.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        getLanternInfo(port).then((lanternInfo) => {
          if (lanternInfo) {
            resolve({ inUse: true, isLantern: true, primaryURL: lanternInfo.primaryURL });
          } else {
            resolve({ inUse: true, isLantern: false });
          }
        });
      } else {
        resolve({ inUse: true, isLantern: false });
      }
    });
    testServer.once('listening', () => {
      testServer.close(() => {
        resolve({ inUse: false, isLantern: false });
      });
    });
    testServer.listen(port, '0.0.0.0');
  });
}

// Helper to query the port and check if LANtern signature is present
function getLanternInfo(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/config`, { timeout: 1000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && json.signature === 'lantern') {
            resolve({ primaryURL: json.primaryURL });
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => {
      resolve(null);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Prompt utility using readline
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Server startup with port fallback and LANtern collision checking
async function startServer() {
  let port = PORT;
  while (true) {
    const status = await checkPort(port);
    if (!status.inUse) {
      PORT = port;
      break;
    }

    if (status.isLantern) {
      const runningUrl = status.primaryURL || `http://localhost:${port}`;
      console.log(`\n⚠️  Another instance of LANtern is already running on ${runningUrl}`);
      const answer = await askQuestion('Would you still like to proceed to create another instance? (y/N): ');
      if (answer.toLowerCase() === 'y') {
        console.log(`Searching for the next available port...`);
        port++;
      } else {
        console.log('Exiting.');
        process.exit(0);
      }
    } else {
      // Entirely different process using the port, silently fallback to the next available port
      port++;
    }
  }

  server.listen(PORT, '0.0.0.0', () => {
    const localIPs = getLocalIPs();
    console.log('\n=================================================');
    console.log('   💡 LANtern - Local Wi-Fi Sharing Server 💡');
    console.log('=================================================');
    console.log(`Host localhost: http://localhost:${PORT}`);
    if (localIPs.length > 0) {
      console.log('Devices on the same network can connect to:');
      localIPs.forEach((ip) => {
        console.log(` http://${ip}:${PORT}`);
      });
    } else {
      console.log('No active network connections detected.');
      console.log('Connect this device to a local Wi-Fi or turn on Hotspot.');
    }
    console.log('=================================================\n');
  });
}

startServer();
