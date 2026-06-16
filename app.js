// ===== MK IPTV LITE PRO v2.0 - LITE ENGINE =====

// CONFIG: CHANGE THIS TO YOUR DEFAULT M3U
const DEFAULT_PLAYLIST_URL = 'https://iptv-org.github.io/iptv/index.m3u'; 
const DEFAULT_PLAYLIST_NAME = 'IPTV ORG';
const ITEMS_PER_PAGE = 100; // LITE: Only render 100 channels at once
const CORS_PROXY = 'https://corsproxy.io/?'; // Change if needed

let player;
let mpegtsPlayer;
let currentChannel = null;
let playlists = {};
let currentPlaylist = 'default';
let watchHistory = [];
let currentPage = 1;
let totalPages = 1;
let allChannels = []; // Full list
let filteredChannels = []; // After search
let useProxy = false;
let channelChunkSize = 500; // LITE: Load channels in chunks of 500

// Init
window.onload = () => {
  initPlayer();
  loadData();
  autoLoadDefaultPlaylist(); // Auto-load on start
};

function initPlayer() {
  player = videojs('videoPlayer', {
    fluid: true,
    responsive: true,
    playbackRates: [0.5, 1, 1.5, 2],
    html5: {
      hls: {
        enableLowInitialPlaylist: true,
        smoothQualityChange: true,
        overrideNative: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60
      }
    }
  });

  player.on('loadedmetadata', () => {
    updateAudioTracks();
    updateVideoQuality();
    document.getElementById('playerOverlay').classList.add('hidden');
    startBufferMonitor();
  });

  player.on('error', (e) => {
    console.error('Player error:', e);
    if (!useProxy) {
      showNotification('Stream blocked. Enabling CORS Proxy...', 'info');
      toggleProxy();
      setTimeout(() => playChannel(currentChannel.id), 1000);
    } else {
      showNotification('Stream failed. Try VLC Mode or External Player.', 'error');
    }
  });
}

function loadData() {
  const saved = localStorage.getItem('mkiptv_lite_data');
  if (saved) {
    const data = JSON.parse(saved);
    playlists = data.playlists || {};
    watchHistory = data.history || [];
    useProxy = data.useProxy || false;
    updateProxyUI();
  }
  renderPlaylists();
  renderRecent();
  updateStats();
}

function saveData() {
  localStorage.setItem('mkiptv_lite_data', JSON.stringify({
    playlists,
    history: watchHistory.slice(0, 20),
    useProxy
  }));
}

// ===== DEFAULT PLAYLIST AUTO-LOAD =====
async function autoLoadDefaultPlaylist() {
  if (playlists['default'] && playlists['default'].channels.length > 0) {
    console.log('Default playlist already loaded');
    renderChannelsPaginated();
    return;
  }
  
  showNotification('Loading default playlist...', 'info');
  try {
    const response = await fetch(DEFAULT_PLAYLIST_URL);
    const text = await response.text();
    await parseM3ULite(text, DEFAULT_PLAYLIST_NAME, 'default');
    showNotification(`Loaded ${allChannels.length} channels`, 'success');
  } catch (err) {
    console.error('Default playlist failed:', err);
    showNotification('Default playlist failed. Add your own M3U.', 'error');
    document.querySelector('.loading-state').innerHTML = `
      <i class="fa-solid fa-satellite-dish"></i>
      <p>No channels loaded</p>
      <button class="btn-primary" onclick="showAddPlaylist()">Add M3U Playlist</button>
    `;
  }
}

// ===== LITE M3U PARSER - CHUNKED =====
async function parseM3ULite(content, name, id = null) {
  const lines = content.split('\n');
  const channels = [];
  let currentCh = {};
  let processed = 0;
  
  showNotification('Parsing playlist... Please wait', 'info');
  
  // Process in chunks to avoid crash
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      const titleMatch = line.match(/,(.+)$/);
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/);
      const idMatch = line.match(/tvg-id="([^"]+)"/);
      
      currentCh = {
        name: titleMatch? titleMatch[1].trim() : 'Unknown',
        logo: logoMatch? logoMatch[1] : '',
        group: groupMatch? groupMatch[1] : 'General',
        tvgId: idMatch? idMatch[1] : '',
        id: 'ch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      };
    } else if (line &&!line.startsWith('#') && currentCh.name) {
      currentCh.url = line;
      channels.push({...currentCh});
      currentCh = {};
      processed++;
      
      // LITE: Yield to browser every 500 channels
      if (processed % channelChunkSize === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
        document.querySelector('.loading-state p').textContent = `Loaded ${processed} channels...`;
      }
    }
  }
  
  const plId = id || 'pl_' + Date.now();
  playlists = {...playlists, [plId]: { name, channels, color: '#3b82f6' } };
  currentPlaylist = plId;
  allChannels = channels;
  filteredChannels = channels;
  totalPages = Math.ceil(channels.length / ITEMS_PER_PAGE);
  currentPage = 1;
  
  saveData();
  renderPlaylists();
  renderChannelsPaginated();
  updateStats();
}

// ===== PAGINATED RENDER - LITE MODE =====
function renderChannelsPaginated() {
  const list = document.getElementById('channelsList');
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageChannels = filteredChannels.slice(start, end);
  
  if (pageChannels.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-satellite-dish"></i>
        <p>No channels found</p>
      </div>
    `;
    document.getElementById('pagination').style.display = 'none';
    return;
  }
  
  // LITE: Use DocumentFragment for fast render
  const fragment = document.createDocumentFragment();
  
  pageChannels.forEach(ch => {
    const div = document.createElement('div');
    div.className = `channel-item ${currentChannel?.id === ch.id? 'active' : ''}`;
    div.onclick = () => playChannel(ch.id);
    div.innerHTML = `
      <img src="${ch.logo || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23334155" width="40" height="40"/%3E%3Ctext x="50%25" y="50%25" font-size="16" fill="%2394a3b8" text-anchor="middle" dy=".3em"%3ETV%3C/text%3E%3C/svg%3E'}" 
           loading="lazy" alt="">
      <div class="channel-item-info">
        <div class="channel-item-name">${escapeHtml(ch.name)}</div>
        <div class="channel-item-group">${escapeHtml(ch.group)}</div>
      </div>
    `;
    fragment.appendChild(div);
  });
  
  list.innerHTML = '';
  list.appendChild(fragment);
  
  // Update pagination
  document.getElementById('currentPage').textContent = currentPage;
  document.getElementById('totalPages').textContent = totalPages;
  document.getElementById('pagination').style.display = totalPages > 1? 'flex' : 'none';
  document.getElementById('totalChannels').textContent = allChannels.length.toLocaleString();
}

function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    renderChannelsPaginated();
    document.getElementById('channelsList').scrollTop = 0;
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderChannelsPaginated();
    document.getElementById('channelsList').scrollTop = 0;
  }
}

// ===== DEBOUNCED SEARCH - LITE =====
let searchTimeout;
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const query = document.getElementById('searchChannel').value.toLowerCase();
    
    if (!query) {
      filteredChannels = allChannels;
    } else {
      // LITE: Search in chunks
      filteredChannels = allChannels.filter(ch => 
        ch.name.toLowerCase().includes(query) || 
        ch.group.toLowerCase().includes(query)
      );
    }
    
    totalPages = Math.ceil(filteredChannels.length / ITEMS_PER_PAGE);
    currentPage = 1;
    renderChannelsPaginated();
  }, 300);
}

// ===== PLAY CHANNEL WITH LITE MODE =====
function playChannel(id) {
  const channel = allChannels.find(c => c.id === id);
  if (!channel) return;

  currentChannel = channel;
  const mode = document.getElementById('playerMode').value;

  // Show pre-roll ad 20% of the time
  if (Math.random() < 0.2) showPrerollAd();

  document.getElementById('playerOverlay').classList.remove('hidden');
  document.querySelector('.overlay-content h3').textContent = 'Loading...';
  document.querySelector('.overlay-content p').textContent = channel.name;

  if (mode === 'external') {
    openInVLCExternal();
    return;
  }

  if (mode === 'vlc-like') {
    playVLCMode(channel);
  } else {
    playBrowserMode(channel);
  }

  // Update UI
  document.getElementById('channelName').textContent = channel.name;
  document.getElementById('channelLogo').src = channel.logo || '';
  document.getElementById('channelInfo').style.display = 'flex';
  document.getElementById('channelStatus').innerHTML = '<i class="fa-solid fa-circle"></i> Connecting...';

  // Highlight active
  document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));

  // Add to history
  addToHistory(channel);
  document.getElementById('vlcBtn').style.display = 'inline-flex';
}

function playBrowserMode(channel) {
  // Destroy mpegts if exists
  if (mpegtsPlayer) {
    mpegtsPlayer.destroy();
    mpegtsPlayer = null;
  }
  document.getElementById('vlcCanvas').style.display = 'none';
  document.getElementById('videoPlayer').style.display = 'block';

  let url = channel.url;
  if (useProxy &&!url.includes('corsproxy.io')) {
    url = CORS_PROXY + encodeURIComponent(url);
    document.getElementById('proxyInfo').textContent = 'ON';
  } else {
    document.getElementById('proxyInfo').textContent = 'OFF';
  }

  player.src({ src: url, type: 'application/x-mpegURL' });
  player.play().catch(err => {
    console.error('Play failed:', err);
    document.getElementById('channelStatus').innerHTML = '<i class="fa-solid fa-circle" style="color:var(--danger)"></i> Error';
  });
}

// ===== VLC-LIKE MODE - THE TRICK =====
function playVLCMode(channel) {
  player.pause();
  document.getElementById('videoPlayer').style.display = 'none';
  document.getElementById('vlcCanvas').style.display = 'block';

  if (mpegtsPlayer) {
    mpegtsPlayer.destroy();
  }

  let url = channel.url;
  if (useProxy &&!url.includes('corsproxy.io')) {
    url = CORS_PROXY + encodeURIComponent(url);
  }

  // VLC trick: Use mpegts.js with low-latency mode + large buffer
  if (mpegts.getFeatureList().mseLivePlayback) {
    mpegtsPlayer = mpegts.createPlayer({
      type: 'mse',
      isLive: true,
      url: url,
      config: {
        enableWorker: true,
        lowLatencyMode: true,
        liveBufferLatencyChasing: true,
        autoCleanupSourceBuffer: true,
        stashInitialSize: 128,
        enableStashBuffer: true
      }
    }, {
      enableWorker: true,
      lazyLoadMaxDuration: 3 * 60,
      seekType: 'range'
    });

    mpegtsPlayer.attachMediaElement(document.getElementById('vlcCanvas'));
    mpegtsPlayer.load();
    mpegtsPlayer.play();

    mpegtsPlayer.on(mpegts.Events.ERROR, (err) => {
      console.error('VLC Mode error:', err);
      showNotification('VLC Mode failed. Trying Browser mode...', 'error');
      document.getElementById('playerMode').value = 'browser';
      playBrowserMode(channel);
    });

    mpegtsPlayer.on(mpegts.Events.LOADING_COMPLETE, () => {
      document.getElementById('playerOverlay').classList.add('hidden');
      document.getElementById('channelStatus').innerHTML = '<i class="fa-solid fa-circle" style="color:var(--success)"></i> VLC Mode';
    });
  } else {
    showNotification('VLC Mode not supported. Using Browser mode.', 'info');
    playBrowserMode(channel);
  }
}

// ===== EXTERNAL VLC - 1 TAP REDIRECT =====
function openInVLCExternal() {
  if (!currentChannel) {
    showNotification('Select a channel first', 'error');
    return;
  }

  const streamUrl = currentChannel.url;

  // Android Intent
  const androidIntent = `intent://${streamUrl.replace(/^https?:\/\//, '')}#Intent;package=org.videolan.vlc;type=video/*;scheme=http;end`;

  // iOS VLC URL Scheme
  const iosVlc = `vlc://${streamUrl}`;

  // Desktop VLC
  const desktopVlc = `vlc://${streamUrl}`;

  // Try Android first
  if (/Android/i.test(navigator.userAgent)) {
    window.location.href = androidIntent;
  }
  // iOS
  else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.location.href = iosVlc;
    setTimeout(() => {
      if (document.hasFocus()) {
        copyAndNotify(streamUrl);
      }
    }, 2500);
  }
  // Desktop
  else {
    window.location.href = desktopVlc;
    setTimeout(() => {
      if (document.hasFocus()) {
        copyAndNotify(streamUrl);
      }
    }, 1500);
  }

  showNotification('Opening in VLC...', 'success');
}

function copyAndNotify(url) {
  navigator.clipboard.writeText(url).then(() => {
    showNotification('VLC not found. URL copied! Paste in VLC → Media → Open Network Stream', 'info');
  });
}

// ===== AUDIO TRACK SWITCHING =====
function updateAudioTracks() {
  const tracks = player.audioTracks();
  const select = document.getElementById('audioTrack');
  select.innerHTML = '<option value="-1">Default</option>';

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const label = track.label || track.language || `Track ${i + 1}`;
    select.innerHTML += `<option value="${i}">${label}</option>`;
  }
  audioTracks = tracks;
}

function changeAudioTrack() {
  const index = parseInt(document.getElementById('audioTrack').value);
  for (let i = 0; i < audioTracks.length; i++) {
    audioTracks[i].enabled = (i === index);
  }
  if (index >= 0) {
    showNotification(`Audio: ${audioTracks[index].label || 'Track ' + (index + 1)}`, 'info');
  }
}

function updateVideoQuality() {
  const levels = player.qualityLevels();
  let currentLevel = 'Auto';
  for (let i = 0; i < levels.length; i++) {
    if (levels[i].enabled) {
      currentLevel = levels[i].height? levels[i].height + 'p' : 'Auto';
      break;
    }
  }
  document.getElementById('videoQuality').textContent = currentLevel;
}

// ===== BUFFER MONITOR - LITE =====
function startBufferMonitor() {
  setInterval(() => {
    if (player &&!player.paused()) {
      const buffered = player.buffered();
      if (buffered.length > 0) {
        const end = buffered.end(buffered.length - 1);
        const current = player.currentTime();
        const buffer = end - current;

        let health = 'Good';
        let color = 'var(--success)';
        if (buffer < 2) {
          health = 'Low';
          color = 'var(--danger)';
        } else if (buffer < 5) {
          health = 'Medium';
          color = 'var(--warning)';
        }

        document.getElementById('bufferHealth').textContent = health;
        document.getElementById('bufferHealth').style.color = color;
        document.getElementById('channelStatus').innerHTML = '<i class="fa-solid fa-circle" style="color:var(--success)"></i> Live';
      }
    }
  }, 2000);
}

// ===== CORS PROXY TOGGLE =====
function toggleProxy() {
  useProxy =!useProxy;
  updateProxyUI();
  saveData();
  showNotification(`CORS Proxy ${useProxy? 'ENABLED' : 'DISABLED'}`, 'info');

  if (currentChannel) {
    showNotification('Reloading stream...', 'info');
    setTimeout(() => playChannel(currentChannel.id), 500);
  }
}

function updateProxyUI() {
  document.getElementById('proxyStatus').textContent = useProxy? 'ON' : 'OFF';
  document.getElementById('proxyBtn').classList.toggle('active', useProxy);
  document.getElementById('proxyInfo').textContent = useProxy? 'ON' : 'OFF';
}

// ===== PLAYLIST MANAGEMENT =====
function showAddPlaylist() {
  document.getElementById('addPlaylistModal').classList.add('active');
}

function addPlaylistByUrl() {
  const name = document.getElementById('playlistName').value || 'Playlist';
  const url = document.getElementById('playlistUrl').value;

  if (!url) return alert('Enter M3U URL');
  if (Object.keys(playlists).length >= 3) {
    return alert('Free plan: 3 playlists max. Delete one first.');
  }

  document.querySelector('.modal-body.btn-primary').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';

  fetch(useProxy? CORS_PROXY + encodeURIComponent(url) : url)
   .then(res => res.text())
   .then(data => parseM3ULite(data, name))
   .then(() => {
      closeModal('addPlaylistModal');
      showNotification('Playlist added!', 'success');
      document.getElementById('playlistName').value = '';
      document.getElementById('playlistUrl').value = '';
    })
   .catch(err => {
      console.error(err);
      alert('Failed to load playlist. Try enabling CORS Proxy or check URL.');
    })
   .finally(() => {
      document.querySelector('.modal-body.btn-primary').innerHTML = '<i class="fa-solid fa-plus"></i> Add Playlist';
    });
}

function renderPlaylists() {
  const tabs = document.getElementById('playlistTabs');
  tabs.innerHTML = Object.keys(playlists).map(id => `
    <button class="playlist-tab ${id === currentPlaylist? 'active' : ''}" onclick="switchPlaylist('${id}')">
      <i class="fa-solid fa-list"></i> ${playlists[id].name} (${playlists[id].channels.length})
    </button>
  `).join('');
}

function switchPlaylist(id) {
  currentPlaylist = id;
  allChannels = playlists[id]?.channels || [];
  filteredChannels = allChannels;
  totalPages = Math.ceil(allChannels.length / ITEMS_PER_PAGE);
  currentPage = 1;
  renderPlaylists();
  renderChannelsPaginated();
}

// ===== HISTORY =====
function addToHistory(channel) {
  watchHistory = watchHistory.filter(c => c.id!== channel.id);
  watchHistory.unshift({...channel, timestamp: Date.now() });
  watchHistory = watchHistory.slice(0, 20);
  saveData();
  renderRecent();
}

function renderRecent() {
  const container = document.getElementById('recentChannels');
  if (watchHistory.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No recent channels</p>';
    return;
  }

  container.innerHTML = watchHistory.slice(0, 8).map(ch => `
    <div class="recent-item" onclick="playChannelFromHistory('${ch.id}')">
      <img src="${ch.logo || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23334155" width="40" height="40"/%3E%3C/svg%3E'}"
           loading="lazy" alt="">
      <div>
        <div style="font-weight:600;font-size:14px">${escapeHtml(ch.name)}</div>
        <div style="font-size:12px;color:var(--text-muted)">${new Date(ch.timestamp).toLocaleTimeString()}</div>
      </div>
    </div>
  `).join('');
}

function playChannelFromHistory(id) {
  for (let plId in playlists) {
    const channel = playlists[plId].channels.find(c => c.id === id);
    if (channel) {
      currentPlaylist = plId;
      allChannels = playlists[plId].channels;
      filteredChannels = allChannels;
      playChannel(id);
      switchPlaylist(plId);
      break;
    }
  }
}

// ===== PRE-ROLL AD =====
function showPrerollAd() {
  const ad = document.getElementById('adPreroll');
  ad.style.display = 'block';
  let countdown = 5;
  document.getElementById('adCountdown').textContent = countdown;

  const interval = setInterval(() => {
    countdown--;
    document.getElementById('adCountdown').textContent = countdown;
    if (countdown <= 0) {
      clearInterval(interval);
      skipAd();
    }
  }, 1000);
}

function skipAd() {
  document.getElementById('adPreroll').style.display = 'none';
}

// ===== UI HELPERS =====
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function showNotification(msg, type = 'success') {
  const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;top:80px;right:20px;background:${colors[type]};color:#fff;
    padding:15px 25px;border-radius:8px;font-weight:600;z-index:9999;
    box-shadow:0 10px 30px rgba(0,0,0,0.3);animation:slideIn 0.3s;
  `;
  toast.innerHTML = `<i class="fa-solid fa-${type === 'error'? 'x' : 'check'}"></i> ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateStats() {
  let totalChannels = 0;
  Object.values(playlists).forEach(pl => totalChannels += pl.channels.length);
  document.getElementById('totalChannels').textContent = totalChannels.toLocaleString();
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  if (e.key === ' ' || e.key === 'k') {
    e.preventDefault();
    if (player.paused()) player.play();
    else player.pause();
  }
  if (e.key === 'f') {
    if (player.isFullscreen()) player.exitFullscreen();
    else player.requestFullscreen();
  }
  if (e.key === 'm') {
    player.muted(!player.muted());
  }
  if (e.key === 'ArrowUp') {
    player.volume(Math.min(1, player.volume() + 0.1));
  }
  if (e.key === 'ArrowDown') {
    player.volume(Math.max(0, player.volume() - 0.1));
  }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn 
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);
