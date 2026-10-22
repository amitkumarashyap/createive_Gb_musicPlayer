// Global State
let ytPlayer = null;
let isPlayerReady = false;
let pendingVideoId = null;
let currentSongData = null;

// Search results cache for next/prev
let currentSearchResults = [];
let currentSearchIndex = -1;

// Playlist state from localStorage
let playlist = JSON.parse(localStorage.getItem('my_yt_playlist') || '[]');
let currentPlayingSource = null; // 'search' ya 'playlist'
let currentPlaylistIndex = -1;

// Volume State
let currentVolume = 100;
let isMuted = false;

// DOM Elements
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsList = document.getElementById('results-list');
const statusMessage = document.getElementById('status-message');
const playerSection = document.getElementById('player-section');
const currentSongTitle = document.getElementById('current-song-title');
const currentSongChannel = document.getElementById('current-song-channel');
const addCurrentToPlaylistBtn = document.getElementById('add-current-to-playlist-btn');

// iPod Controller Buttons
const ctrlPlayPause = document.getElementById('ctrl-play-pause');
const ctrlNext = document.getElementById('ctrl-next');
const ctrlPrev = document.getElementById('ctrl-prev');
const ctrlVolUp = document.getElementById('ctrl-vol-up');
const ctrlVolDown = document.getElementById('ctrl-vol-down');
const ctrlCenter = document.getElementById('ctrl-center');
const centerIcon = document.getElementById('center-icon');
const volLevelBadge = document.getElementById('vol-level-badge');

// Tabs & Views
const tabSearch = document.getElementById('tab-search');
const tabPlaylist = document.getElementById('tab-playlist');
const searchView = document.getElementById('search-view');
const playlistView = document.getElementById('playlist-view');
const playlistItemsList = document.getElementById('playlist-items-list');
const emptyPlaylistMsg = document.getElementById('empty-playlist-msg');
const resultsCount = document.getElementById('results-count');
const playlistCount = document.getElementById('playlist-count');

// Fold / Unfold
const toggleSearchBtn = document.getElementById('toggle-search-btn');
const resultsCollapsible = document.getElementById('results-collapsible');
const togglePlaylistBtn = document.getElementById('toggle-playlist-btn');
const playlistCollapsible = document.getElementById('playlist-collapsible');
const clearPlaylistBtn = document.getElementById('clear-playlist-btn');

// 1. YouTube IFrame API Ready
window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player('youtube-player', {
    height: '100%',
    width: '100%',
    playerVars: {
      playsinline: 1,
      rel: 0,
      modestbranding: 1
    },
    events: {
      onReady: () => {
        isPlayerReady = true;
        currentVolume = ytPlayer.getVolume() || 100;
        updateVolumeDisplay();

        if (pendingVideoId) {
          ytPlayer.loadVideoById(pendingVideoId);
          pendingVideoId = null;
        }
      },
      onStateChange: (event) => {
        // Update Play/Pause button text depending on player state
        if (event.data === YT.PlayerState.PLAYING) {
          ctrlPlayPause.textContent = '❚❚';
        } else if (event.data === YT.PlayerState.PAUSED) {
          ctrlPlayPause.textContent = '▶';
        } else if (event.data === YT.PlayerState.ENDED) {
          ctrlPlayPause.textContent = '▶';
          playNextTrack();
        }
      }
    }
  });
};

function decodeHtmlEntities(text) {
  const txt = document.createElement('textarea');
  txt.innerHTML = text;
  return txt.value;
}

// 2. Search Submissions
searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;

  searchInput.blur();
  searchBtn.disabled = true;
  searchBtn.textContent = 'Searching...';
  resultsList.innerHTML = '';
  statusMessage.classList.remove('hidden');
  statusMessage.textContent = `"${query}" dhoondha ja raha hai... 🎵`;

  switchTab('search');
  setFoldState(resultsCollapsible, toggleSearchBtn, false);

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Search fail ho gaya.');

    const items = data.items || [];
    currentSearchResults = items;
    resultsCount.textContent = items.length;

    if (items.length === 0) {
      statusMessage.textContent = 'Koi gaana nahi mila. Kuch aur search karke dekhein!';
      return;
    }

    statusMessage.classList.add('hidden');
    renderSearchResults(items);
  } catch (err) {
    statusMessage.classList.remove('hidden');
    statusMessage.textContent = `⚠️ Error: ${err.message}`;
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search';
  }
});

// 3. Render Search Results
function renderSearchResults(items) {
  resultsList.innerHTML = '';

  items.forEach((item, index) => {
    const cleanTitle = decodeHtmlEntities(item.title);
    const cleanChannel = decodeHtmlEntities(item.channelTitle);

    const card = document.createElement('article');
    card.className = 'result-card';
    card.dataset.videoid = item.videoId;

    card.innerHTML = `
      <div class="card-clickable">
        <div class="thumb-wrapper">
          <img src="${item.thumbnail}" alt="${cleanTitle}" loading="lazy" />
        </div>
        <div class="card-info">
          <h3 class="card-title">${cleanTitle}</h3>
          <p class="card-channel">${cleanChannel}</p>
        </div>
      </div>
      <button class="card-action-btn" title="Add to Playlist">➕</button>
    `;

    card.querySelector('.card-clickable').addEventListener('click', () => {
      currentPlayingSource = 'search';
      currentSearchIndex = index;
      playVideo(item.videoId, cleanTitle, cleanChannel);
      highlightCard(card);
    });

    card.querySelector('.card-action-btn').addEventListener('click', (ev) => {
      ev.stopPropagation();
      addToPlaylist({
        videoId: item.videoId,
        title: cleanTitle,
        channelTitle: cleanChannel,
        thumbnail: item.thumbnail
      });
    });

    resultsList.appendChild(card);
  });
}

// 4. Video Play Function
function playVideo(videoId, title, channel) {
  playerSection.classList.remove('hidden');
  currentSongTitle.textContent = title;
  currentSongChannel.textContent = channel;
  currentSongData = { videoId, title, channelTitle: channel };

  if (isPlayerReady && ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
    ytPlayer.loadVideoById(videoId);
    ctrlPlayPause.textContent = '❚❚';
  } else {
    pendingVideoId = videoId;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function highlightCard(cardElement) {
  document.querySelectorAll('.result-card').forEach((el) => el.classList.remove('active-card'));
  if (cardElement) cardElement.classList.add('active-card');
}

// =====================================================
// 5. IPOD CLICK WHEEL CONTROLS (Play/Pause, Next, Prev, Volume)
// =====================================================

// PLAY / PAUSE
ctrlPlayPause.addEventListener('click', () => {
  if (!isPlayerReady || !ytPlayer) return;

  const playerState = ytPlayer.getPlayerState();
  if (playerState === YT.PlayerState.PLAYING) {
    ytPlayer.pauseVideo();
    ctrlPlayPause.textContent = '▶';
  } else {
    ytPlayer.playVideo();
    ctrlPlayPause.textContent = '❚❚';
  }
});

// NEXT TRACK
function playNextTrack() {
  if (currentPlayingSource === 'playlist' && playlist.length > 0) {
    currentPlaylistIndex = (currentPlaylistIndex + 1) % playlist.length;
    const nextSong = playlist[currentPlaylistIndex];
    playVideo(nextSong.videoId, nextSong.title, nextSong.channelTitle);
    renderPlaylist();
  } else if (currentSearchResults.length > 0) {
    currentSearchIndex = (currentSearchIndex + 1) % currentSearchResults.length;
    const nextSong = currentSearchResults[currentSearchIndex];
    playVideo(nextSong.videoId, decodeHtmlEntities(nextSong.title), decodeHtmlEntities(nextSong.channelTitle));
  }
}
ctrlNext.addEventListener('click', playNextTrack);

// PREVIOUS TRACK
function playPrevTrack() {
  if (currentPlayingSource === 'playlist' && playlist.length > 0) {
    currentPlaylistIndex = (currentPlaylistIndex - 1 + playlist.length) % playlist.length;
    const prevSong = playlist[currentPlaylistIndex];
    playVideo(prevSong.videoId, prevSong.title, prevSong.channelTitle);
    renderPlaylist();
  } else if (currentSearchResults.length > 0) {
    currentSearchIndex = (currentSearchIndex - 1 + currentSearchResults.length) % currentSearchResults.length;
    const prevSong = currentSearchResults[currentSearchIndex];
    playVideo(prevSong.videoId, decodeHtmlEntities(prevSong.title), decodeHtmlEntities(prevSong.channelTitle));
  }
}
ctrlPrev.addEventListener('click', playPrevTrack);

// VOLUME UP (+10)
ctrlVolUp.addEventListener('click', () => {
  if (!isPlayerReady || !ytPlayer) return;
  if (isMuted) {
    ytPlayer.unMute();
    isMuted = false;
  }
  currentVolume = Math.min(100, currentVolume + 10);
  ytPlayer.setVolume(currentVolume);
  updateVolumeDisplay();
});

// VOLUME DOWN (-10)
ctrlVolDown.addEventListener('click', () => {
  if (!isPlayerReady || !ytPlayer) return;
  currentVolume = Math.max(0, currentVolume - 10);
  ytPlayer.setVolume(currentVolume);
  updateVolumeDisplay();
});

// CENTER BUTTON (Mute / Unmute Toggle)
ctrlCenter.addEventListener('click', () => {
  if (!isPlayerReady || !ytPlayer) return;
  if (ytPlayer.isMuted()) {
    ytPlayer.unMute();
    isMuted = false;
    centerIcon.textContent = 'GB';
  } else {
    ytPlayer.mute();
    isMuted = true;
    centerIcon.textContent = '🔇';
  }
  updateVolumeDisplay();
});

function updateVolumeDisplay() {
  if (isMuted) {
    volLevelBadge.textContent = 'Muted';
  } else {
    volLevelBadge.textContent = `Vol: ${currentVolume}%`;
  }
}

// 6. Playlist Management (localStorage)
function savePlaylist() {
  localStorage.setItem('my_yt_playlist', JSON.stringify(playlist));
  playlistCount.textContent = playlist.length;
}

function addToPlaylist(song) {
  const exists = playlist.some((item) => item.videoId === song.videoId);
  if (exists) {
    alert('Yeh gaana pehle se aapki Playlist mein hai!');
    return;
  }
  playlist.push(song);
  savePlaylist();
  renderPlaylist();
  alert(`"${song.title.slice(0, 30)}..." playlist mein add ho gaya!`);
}

function removeFromPlaylist(index) {
  playlist.splice(index, 1);
  savePlaylist();
  renderPlaylist();
}

function renderPlaylist() {
  playlistItemsList.innerHTML = '';
  playlistCount.textContent = playlist.length;

  if (playlist.length === 0) {
    emptyPlaylistMsg.classList.remove('hidden');
    return;
  }
  emptyPlaylistMsg.classList.add('hidden');

  playlist.forEach((item, index) => {
    const card = document.createElement('article');
    card.className = 'result-card';
    card.dataset.videoid = item.videoId;

    card.innerHTML = `
      <div class="card-clickable">
        <div class="thumb-wrapper">
          <img src="${item.thumbnail}" alt="${item.title}" loading="lazy" />
        </div>
        <div class="card-info">
          <h3 class="card-title">${item.title}</h3>
          <p class="card-channel">${item.channelTitle}</p>
        </div>
      </div>
      <button class="card-action-btn remove-btn" title="Remove from Playlist">🗑️</button>
    `;

    card.querySelector('.card-clickable').addEventListener('click', () => {
      currentPlayingSource = 'playlist';
      currentPlaylistIndex = index;
      playVideo(item.videoId, item.title, item.channelTitle);
      highlightCard(card);
    });

    card.querySelector('.remove-btn').addEventListener('click', (ev) => {
      ev.stopPropagation();
      removeFromPlaylist(index);
    });

    playlistItemsList.appendChild(card);
  });
}

// Add currently playing video to playlist button
addCurrentToPlaylistBtn.addEventListener('click', () => {
  if (!currentSongData) return;
  addToPlaylist({
    videoId: currentSongData.videoId,
    title: currentSongData.title,
    channelTitle: currentSongData.channelTitle,
    thumbnail: `https://i.ytimg.com/vi/${currentSongData.videoId}/mqdefault.jpg`
  });
});

// Clear Playlist
clearPlaylistBtn.addEventListener('click', () => {
  if (playlist.length === 0) return;
  if (confirm('Kya aap poori playlist delete karna chahte hain?')) {
    playlist = [];
    savePlaylist();
    renderPlaylist();
  }
});

// 7. Fold / Unfold (Toggle) Logic
function setFoldState(container, button, isFolded) {
  if (isFolded) {
    container.classList.add('folded');
    button.textContent = 'Unfold ▼';
  } else {
    container.classList.remove('folded');
    button.textContent = 'Fold ▲';
  }
}

toggleSearchBtn.addEventListener('click', () => {
  const isFolded = resultsCollapsible.classList.contains('folded');
  setFoldState(resultsCollapsible, toggleSearchBtn, !isFolded);
});

togglePlaylistBtn.addEventListener('click', () => {
  const isFolded = playlistCollapsible.classList.contains('folded');
  setFoldState(playlistCollapsible, togglePlaylistBtn, !isFolded);
});

// 8. Tabs Switching
function switchTab(target) {
  if (target === 'search') {
    tabSearch.classList.add('active');
    tabPlaylist.classList.remove('active');
    searchView.classList.remove('hidden');
    playlistView.classList.add('hidden');
  } else {
    tabPlaylist.classList.add('active');
    tabSearch.classList.remove('active');
    playlistView.classList.remove('hidden');
    searchView.classList.add('hidden');
    renderPlaylist();
  }
}

tabSearch.addEventListener('click', () => switchTab('search'));
tabPlaylist.addEventListener('click', () => switchTab('playlist'));

// Initial render
renderPlaylist();