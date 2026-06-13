// LANtern Client Logic

// Configuration & Global Variables
let currentNickname = '';
let maxFileSizeBytes = 0; // Configured dynamically
let currentUploadController = null; // For canceling uploads

// DOM Elements
const chatFeed = document.getElementById('chat-feed');
const messagesList = document.getElementById('messages-list');
const messageInput = document.getElementById('message-input');
const actionForm = document.getElementById('action-form');
const fileInput = document.getElementById('file-input');
const attachBtn = document.getElementById('attach-btn');
const connectionStatus = document.getElementById('connection-status');
const nicknameBtn = document.getElementById('nickname-btn');
const currentNicknameSpan = document.getElementById('current-nickname');
const peerCountSpan = document.getElementById('peer-count');
const maxLimitBadge = document.getElementById('max-limit-badge');
const dragLimitSpan = document.getElementById('drag-limit');
const shareLinkInput = document.getElementById('share-link-input');
const copyLinkBtn = document.getElementById('copy-link-btn');
const qrcodeContainer = document.getElementById('qrcode-container');
const qrcodeImg = document.getElementById('qrcode-img');

// Progress Overlay & Modal
const uploadProgressCard = document.getElementById('upload-progress-card');
const progressFilename = document.getElementById('progress-filename');
const progressPct = document.getElementById('progress-pct');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressBytes = document.getElementById('progress-bytes');
const cancelUploadBtn = document.getElementById('cancel-upload-btn');

const nicknameModal = document.getElementById('nickname-modal');
const nicknameForm = document.getElementById('nickname-form');
const modalNicknameInput = document.getElementById('modal-nickname-input');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const dragOverlay = document.getElementById('drag-overlay');

// 1. Initialize Nickname
function initNickname() {
  const savedName = localStorage.getItem('lantern-nickname');
  if (savedName) {
    currentNickname = savedName;
  } else {
    // Generate friendly random username
    const randId = Math.floor(100 + Math.random() * 900);
    currentNickname = `Peer-${randId}`;
    localStorage.setItem('lantern-nickname', currentNickname);
  }
  currentNicknameSpan.textContent = currentNickname;
}

// 2. Setup Socket.io
const socket = io();

socket.on('connect', () => {
  updateStatus(true);
  fetchConfig();
});

socket.on('disconnect', () => {
  updateStatus(false);
});

socket.on('peer-count-update', (count) => {
  peerCountSpan.textContent = `${count} connection${count !== 1 ? 's' : ''}`;
});

socket.on('session-sync', (history) => {
  messagesList.innerHTML = '';
  history.forEach(item => renderItem(item));
  setTimeout(scrollToBottom, 50);
});

socket.on('chat-message', (msg) => {
  renderItem(msg);
  scrollToBottomConditional();
  if (msg.sender !== currentNickname) {
    playNotificationSound();
  }
});

socket.on('file-shared', (fileMsg) => {
  renderItem(fileMsg);
  scrollToBottomConditional();
  if (fileMsg.sender !== currentNickname) {
    playNotificationSound();
  }
});

// 3. UI Helpers
function updateStatus(isConnected) {
  const indicator = connectionStatus.querySelector('.pulse-indicator');
  const text = connectionStatus.querySelector('.status-text');

  if (isConnected) {
    indicator.className = 'pulse-indicator connected';
    text.textContent = 'Connected';
  } else {
    indicator.className = 'pulse-indicator disconnected';
    text.textContent = 'Offline';
  }
}

async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();

    // Enforce size limit
    const limitMb = config.maxFileSizeMb;
    maxFileSizeBytes = limitMb * 1024 * 1024;
    maxLimitBadge.textContent = `Limit: ${limitMb} MB`;
    dragLimitSpan.textContent = `${limitMb} MB`;

    // Populate share link box
    setupShareLink(config.localIPs, config.port);

    // Populate QR Code
    if (config.qrCodeDataUrl) {
      qrcodeImg.src = config.qrCodeDataUrl;
      qrcodeContainer.classList.remove('hidden');
    } else {
      qrcodeContainer.classList.add('hidden');
    }
  } catch (err) {
    console.error('Error fetching server config:', err);
  }
}

// Play notification sound using native Web Audio API (100% offline, zero assets required)
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;

    // First note: D5 pitch (587.33 Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);

    // Second note: A5 pitch (880.00 Hz) with 80ms stagger
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.08);
    gain2.gain.setValueAtTime(0.04, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    // Play synthesized tones
    osc1.start(now);
    osc1.stop(now + 0.35);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.warn('Audio Context block/failed:', err);
  }
}

function setupShareLink(ips, port) {
  const currentOrigin = window.location.origin;
  const isLocalHost = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1');

  if (isLocalHost && ips && ips.length > 0) {
    // Display the first local LAN IP address
    shareLinkInput.value = `http://${ips[0]}:${port}`;
  } else {
    // Display the URL from which the page was loaded
    shareLinkInput.value = currentOrigin;
  }
}

// Formatting Helper
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Scroll feed helpers
function scrollToBottom() {
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

function scrollToBottomConditional() {
  const offset = chatFeed.scrollHeight - chatFeed.scrollTop - chatFeed.clientHeight;
  // If the user is within 200px of bottom, auto scroll
  if (offset < 200) {
    scrollToBottom();
  }
}

// 4. Render feed item (Text or File Card)
function renderItem(item) {
  const isOwn = item.sender === currentNickname;
  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${isOwn ? 'own' : 'peer'}`;

  const senderDiv = document.createElement('div');
  senderDiv.className = 'message-sender';
  senderDiv.textContent = item.sender;
  wrapper.appendChild(senderDiv);

  if (item.type === 'text') {
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = item.text;
    wrapper.appendChild(bubble);
  } else if (item.type === 'file') {
    const card = document.createElement('div');
    card.className = 'file-card';

    const row = document.createElement('div');
    row.className = 'file-meta-row';

    const iconBox = document.createElement('div');
    iconBox.className = 'file-icon-box';
    // Choose appropriate SVG icon
    iconBox.innerHTML = getFileIcon(item);

    const info = document.createElement('div');
    info.className = 'file-info';

    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = item.filename;
    name.title = item.filename;

    const size = document.createElement('div');
    size.className = 'file-size';
    size.textContent = item.size;

    info.appendChild(name);
    info.appendChild(size);
    row.appendChild(iconBox);
    row.appendChild(info);
    card.appendChild(row);

    // Media previews (if appropriate)
    if (item.isImage) {
      const preview = document.createElement('div');
      preview.className = 'file-preview-box';
      const img = document.createElement('img');
      img.className = 'file-preview-img';
      img.src = item.url;
      img.alt = item.filename;
      // Open in a new tab when clicked
      img.addEventListener('click', () => window.open(item.url, '_blank'));
      preview.appendChild(img);
      card.appendChild(preview);
    } else if (item.isVideo) {
      const preview = document.createElement('div');
      preview.className = 'file-preview-box';
      const video = document.createElement('video');
      video.className = 'file-preview-video';
      video.src = item.url;
      video.controls = true;
      video.preload = 'metadata';
      preview.appendChild(video);
      card.appendChild(preview);
    } else if (item.isAudio) {
      const preview = document.createElement('div');
      preview.className = 'file-preview-box';
      const audio = document.createElement('audio');
      audio.className = 'file-preview-audio';
      audio.src = item.url;
      audio.controls = true;
      audio.preload = 'metadata';
      preview.appendChild(audio);
      card.appendChild(preview);
    }

    // Download Button
    const dlBtn = document.createElement('a');
    dlBtn.className = 'file-download-btn';
    dlBtn.href = `${item.url}?download=true`;
    dlBtn.innerHTML = `
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      Download
    `;
    card.appendChild(dlBtn);
    wrapper.appendChild(card);
  }

  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = formatTime(item.timestamp);
  wrapper.appendChild(timeDiv);

  messagesList.appendChild(wrapper);
}

function getFileIcon(item) {
  if (item.isImage) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>`;
  } else if (item.isVideo) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /><path stroke-linecap="round" stroke-linejoin="round" d="M14.25 9v6m-4.5 0V9m4.5 3h-4.5" /></svg>`;
  } else if (item.isAudio) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.184 8.39c.1.082.156.221.156.366v1.17c0 .318-.258.575-.575.575h-.75a.575.575 0 01-.575-.575V8.25c0-.318.258-.575.575-.575h.75c.18 0 .34.083.45.215M15.75 8.25v1.75c0 .318-.258.575-.575.575h-.75a.575.575 0 01-.575-.575v-1.75c0-.318.258-.575.575-.575h.75c.318 0 .575.258.575.575zM12 18.75a6 6 0 006-6v-1.5m-12 0v1.5a6 6 0 006 6z" /></svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>`;
}

// 5. Form Submissions & Event Listeners

// Copy Share URL
copyLinkBtn.addEventListener('click', () => {
  shareLinkInput.select();
  shareLinkInput.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(shareLinkInput.value).then(() => {
    // Show visual feedback on button
    const originalHTML = copyLinkBtn.innerHTML;
    copyLinkBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    `;
    setTimeout(() => {
      copyLinkBtn.innerHTML = originalHTML;
    }, 2000);
  });
});

// Message Send Form
actionForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit('chat-message', {
    sender: currentNickname,
    text: text
  });

  messageInput.value = '';
  messageInput.focus();
});

// Trigger File Picker
attachBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFileSelect(e.target.files[0]);
    fileInput.value = ''; // Reset file picker value
  }
});

// 6. Drag and Drop triggers
window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragOverlay.classList.add('active');
});

dragOverlay.addEventListener('dragover', (e) => {
  e.preventDefault();
});

dragOverlay.addEventListener('dragleave', (e) => {
  e.preventDefault();
  // Dragleave triggers on children too, only disable if leaving target overlay
  if (e.target === dragOverlay) {
    dragOverlay.classList.remove('active');
  }
});

dragOverlay.addEventListener('drop', (e) => {
  e.preventDefault();
  dragOverlay.classList.remove('active');

  if (e.dataTransfer.files.length > 0) {
    handleFileSelect(e.dataTransfer.files[0]);
  }
});

// 7. Nickname Modal Management
nicknameBtn.addEventListener('click', () => {
  modalNicknameInput.value = currentNickname;
  nicknameModal.classList.remove('hidden');
  modalNicknameInput.focus();
});

modalCancelBtn.addEventListener('click', () => {
  nicknameModal.classList.add('hidden');
});

nicknameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const rawName = modalNicknameInput.value.trim();
  if (rawName) {
    currentNickname = rawName;
    localStorage.setItem('lantern-nickname', currentNickname);
    currentNicknameSpan.textContent = currentNickname;
    nicknameModal.classList.add('hidden');
  }
});

// 8. Chunked Upload Operations
async function handleFileSelect(file) {
  // Check file size limits
  if (maxFileSizeBytes > 0 && file.size > maxFileSizeBytes) {
    alert(`File is too large! Maximum limit is ${formatBytes(maxFileSizeBytes)}.\nYour file: ${formatBytes(file.size)}.`);
    return;
  }

  // Cancel any active upload
  if (currentUploadController) {
    currentUploadController.abort();
  }

  currentUploadController = new AbortController();
  const signal = currentUploadController.signal;

  try {
    showUploadProgress(file.name);
    await uploadFileInChunks(file, signal);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Upload aborted by user.');
    } else {
      console.error('Upload failed:', err);
      alert(`Upload failed: ${err.message}`);
    }
    hideUploadProgress();
  }
}

function showUploadProgress(filename) {
  progressFilename.textContent = filename;
  progressPct.textContent = '0%';
  progressBarFill.style.width = '0%';
  progressBytes.textContent = `0 / 0 MB`;
  uploadProgressCard.classList.remove('hidden');
}

function hideUploadProgress() {
  uploadProgressCard.classList.add('hidden');
  currentUploadController = null;
}

cancelUploadBtn.addEventListener('click', () => {
  if (currentUploadController) {
    currentUploadController.abort();
    hideUploadProgress();
  }
});

async function uploadFileInChunks(file, signal) {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB Chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substr(2, 9));

  let bytesUploaded = 0;

  for (let i = 0; i < totalChunks; i++) {
    // Check if cancellation requested
    if (signal.aborted) throw new DOMException('Upload aborted', 'AbortError');

    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const url = `/api/upload-chunk?uploadId=${uploadId}&chunkIndex=${i}&filename=${encodeURIComponent(file.name)}`;

    const response = await fetch(url, {
      method: 'POST',
      body: chunk,
      signal: signal
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status} on chunk ${i}`);
    }

    bytesUploaded += (end - start);

    // Update Progress UI
    const percent = Math.round((bytesUploaded / file.size) * 100);
    progressPct.textContent = `${percent}%`;
    progressBarFill.style.width = `${percent}%`;
    progressBytes.textContent = `${formatBytes(bytesUploaded)} / ${formatBytes(file.size)}`;
  }

  // Request chunk merge on server
  progressFilename.textContent = "Merging file on host...";
  const mergeResponse = await fetch('/api/merge-chunks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uploadId,
      filename: file.name,
      totalChunks
    }),
    signal: signal
  });

  if (!mergeResponse.ok) {
    const errData = await mergeResponse.json();
    throw new Error(errData.error || 'Failed to merge chunks');
  }

  const mergeData = await mergeResponse.json();

  // Broadcast file sharing over socket
  socket.emit('file-shared', {
    sender: currentNickname,
    filename: mergeData.filename,
    size: formatBytes(mergeData.size),
    url: mergeData.url,
    isImage: mergeData.isImage,
    isVideo: mergeData.isVideo,
    isAudio: mergeData.isAudio
  });

  hideUploadProgress();
}

// 9. Initial Load Setup
initNickname();
