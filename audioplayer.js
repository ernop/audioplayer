let activePlayer = null;
let globalId = "";
let audioElement = document.getElementById('theId');
let progressBar = document.querySelector('.progress');
let playbackIndicator = document.getElementById('playback-indicator');
let bookmarkContainer = document.getElementById('bookmark-container');
let currentTimeDisplay = document.getElementById('current-time');

audioElement.addEventListener('timeupdate', updateProgress);

document.addEventListener('DOMContentLoaded', (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    const audioSrc = urlParams.get('audioSource');
    const id = `audioPlayer_${audioSrc.substring(audioSrc.lastIndexOf('/') + 1)}`;
    const container = document.getElementById('container');
    container.id = id;
    globalId = id;

    document.body.appendChild(container);

    const hasPlayed = localStorage.getItem(`${globalId}_hasPlayed`) === 'true';
    const hasFinished = localStorage.getItem(`${globalId}_hasFinished`) === 'true';
    const savedVolume = localStorage.getItem(`${globalId}_volume`) || 1;
    const storedTime = localStorage.getItem(`${globalId}_storedTime`) || 0;
    const playbackRate = parseFloat(localStorage.getItem(`${globalId}_playbackRate`)) || 1;

    let history = [];
    let bookmarks = JSON.parse(localStorage.getItem(`${globalId}_bookmarks`)) || [];
    container.history = history;

    document.getElementById('playbackRate').textContent = playbackRate.toFixed(2) + 'x';

    const audio = getAudio();
    audio.addEventListener('loadedmetadata', () => {
        document.getElementById('duration').textContent = formatTime(audio.duration);
        createTimeHatches(audio.duration);
    });
    var sourceElement = document.createElement('source');
    sourceElement.src = audioSrc;
    sourceElement.type = "audio/mpeg";
    audio.appendChild(sourceElement);
    audio.volume = savedVolume;
    audio.playbackRate = playbackRate;
    audio.currentTime = storedTime;
    audio.load();

    setInterval(() => {
        localStorage.setItem(`${globalId}_storedTime`, audio.currentTime);
    }, 1000);

    audio.addEventListener('play', () => {
        localStorage.setItem(`${globalId}_hasPlayed`, 'true');
        if (activePlayer && activePlayer !== audio) {
            activePlayer.pause();
        }
        activePlayer = audio;
        logEntry(log, history, `Started playing at ${formatTime(audio.currentTime)} using play button`, audio.currentTime);
    });

    audio.addEventListener('pause', () => {
        logEntry(log, history, `Paused at ${formatTime(audio.currentTime)} using pause button`, audio.currentTime);
    });

    audio.addEventListener('ended', () => {
        localStorage.setItem(`${globalId}_hasFinished`, 'true');
    });

    const log = getLog();
    logEntry(log, history, `Page loaded`, 0);
    logEntry(log, history, `User loaded at ${formatTime(storedTime)}`, storedTime);
    renderBookmarks(bookmarks);

    // Update the playback indicator position
    const playbackIndicator = document.getElementById('playback-indicator');
    const progressBar = document.getElementById('progressBar');
    const currentTimeDisplay = document.getElementById('current-time');
    const endTimeDisplay = document.getElementById('end-time');
    audio.addEventListener('timeupdate', () => {
        const progressHeight = progressBar.clientHeight;
        const currentTime = audio.currentTime;
        const duration = audio.duration;
        const progressValue = (currentTime / duration) * progressHeight;
        playbackIndicator.style.top = `${progressValue}px`;
        currentTimeDisplay.textContent = formatTime(currentTime);
        progress.style.height = `${progressValue}px`;
    });
    audio.addEventListener('loadedmetadata', () => {
        endTimeDisplay.textContent = formatTime(audio.duration);
    });
});

function getAudio() {
    return document.getElementById("theId");
}

function getLog() {
    return document.getElementById("theLog");
}

function updateProgress() {
    const audio = getAudio();
    const progressBar = document.getElementById('progressBar');
    const currentTimeDisplay = document.getElementById('currentTime');
    const durationDisplay = document.getElementById('duration');
    const playbackIndicator = document.getElementById('playback-indicator');

    const progress = (audio.currentTime / audio.duration) * 100;
    progressBar.value = progress;
    currentTimeDisplay.textContent = formatTime(audio.currentTime);
    durationDisplay.textContent = formatTime(audio.duration);

    // Update the position of the green arrow
    playbackIndicator.style.top = `${progress}%`;
}

function seekToPosition(value) {
    const audio = getAudio();
    const seekTime = audio.duration * (value / 100);
    audio.currentTime = seekTime;
}

function logEntry(log, history, message, startTime, endTime = startTime) {
    const entry = document.createElement('div');
    entry.className = 'logEntry';
    entry.title = `Clicking this will jump to time ${formatTime(startTime)}`;
    entry.innerHTML = `${message} <span class="undoButton" onclick="undo('${history.length})">X</span>`;
    log.insertBefore(entry, log.firstChild);
    log.scrollTop = 0;
    history.push({ startTime, endTime });
}

function seek(amount, label) {
    const audio = getAudio(globalId);
    const log = getLog(globalId);
    const container = document.getElementById(globalId);
    const history = container.history;
    const startTime = audio.currentTime;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + amount));
    logEntry(log, history, `Jumped from ${formatTime(startTime)} to ${formatTime(audio.currentTime)} using ${label} button`, startTime, audio.currentTime);
}

function seekHalf(direction) {
    const audio = getAudio();
    const log = getLog();
    const container = document.getElementById(globalId);
    const history = container.history;
    const startTime = audio.currentTime;
    audio.currentTime = direction === 'backward' ? Math.max(0, audio.currentTime / 2) : Math.min(audio.duration, audio.currentTime + (audio.duration - audio.currentTime) / 2);
    logEntry(log, history, `Jumped from ${formatTime(startTime)} to ${formatTime(audio.currentTime)} using Half ${direction} button`, startTime, audio.currentTime);
}

function changePlaybackRate(delta) {
    const audio = getAudio();
    const newPlaybackRate = Math.max(0.25, Math.min(2.0, audio.playbackRate + delta));
    setPlaybackRate(newPlaybackRate);
}

function changePlaybackRateTo(rate) {
    setPlaybackRate(rate);
}

function setPlaybackRate(rate) {
    const audio = getAudio();
    audio.playbackRate = rate;
    localStorage.setItem(`${globalId}_playbackRate`, rate);
    document.getElementById('playbackRateDisplay').textContent = `${rate.toFixed(2)}x`;
}

function restartAudio(id) {
    const audio = getAudio();
    const log = getLog();
    const container = document.getElementById(globalId);
    const history = container.history;
    const startTime = audio.currentTime;
    audio.currentTime = 0;
    audio.play();
    logEntry(log, history, `Jumped from ${formatTime(startTime)} to 0 using Restart button`, startTime, id, 0);
}

function togglePlayPause() {
    const audio = getAudio();
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (audio.paused) {
        audio.play();
        playPauseBtn.textContent = 'Pause';
    } else {
        audio.pause();
        playPauseBtn.textContent = 'Play';
    }
}


function setVolume(volume) {
    const audio = getAudio();
    audio.volume = volume;
    localStorage.setItem(`${globalId}_volume`, volume);
    document.getElementById('volumeDisplay').textContent = `${Math.round(volume * 100)}%`;
}

function toggleMute() {
    const audio = getAudio();
    const muteBtn = document.querySelector('button[title="Mute/Unmute"]');
    audio.muted = !audio.muted;
    muteBtn.textContent = audio.muted ? 'Unmute' : 'Mute';
}

function addBookmark() {
    const audio = getAudio();
    const bookmarksList = document.getElementById(`bookmarksList`);
    let bookmarks = JSON.parse(localStorage.getItem(`${globalId}_bookmarks`)) || [];

    const currentTime = audio.currentTime;
    const bookmark = { time: currentTime, label: `Bookmark at ${formatTime(currentTime)}` };
    bookmarks.push(bookmark);
    localStorage.setItem(`${globalId}_bookmarks`, JSON.stringify(bookmarks));

    renderBookmarks(bookmarks);
}

function renderBookmarks(bookmarks) {
    const bookmarksList = document.getElementById('bookmarksList');
    const audio = getAudio();
    bookmarksList.innerHTML = '';

    bookmarks.forEach((bookmark, index) => {
        const li = document.createElement('li');
        li.className = 'bookmark-item';
        li.style.top = `${(bookmark.time / audio.duration) * 100}%`;
        li.innerHTML = `${bookmark.label} <button onclick="jumpToBookmark(${bookmark.time})">Jump</button> <button onclick="deleteBookmark(${index})">Delete</button>`;
        bookmarksList.appendChild(li);
    });
}

function jumpToBookmark(time) {
    const audio = getAudio();
    audio.currentTime = time;
}

function deleteBookmark(index) {
    let bookmarks = JSON.parse(localStorage.getItem(`${globalId}_bookmarks`)) || [];
    bookmarks.splice(index, 1);
    localStorage.setItem(`${globalId}_bookmarks`, JSON.stringify(bookmarks));
    renderBookmarks(bookmarks);
}

function undo(index) {
    const container = document.getElementById(globalId);
    const audio = getAudio();
    const log = getLog();
    const history = container.history;
    if (index >= 0 && index < history.length) {
        const entry = history[index];
        audio.currentTime = entry.startTime;
        container.history = history.slice(0, index);
        renderLog(log, container.history);
    }
}

function renderLog(log, history) {
    log.innerHTML = '';
    history.forEach((entry, index) => {
        const message = `Jumped from ${formatTime(entry.startTime)} to ${formatTime(entry.endTime)}`;
        const logEntry = document.createElement('div');
        logEntry.className = 'logEntry';
        logEntry.title = `Clicking this will jump to time ${formatTime(entry.startTime)}`;
        logEntry.innerHTML = `${message} <span class="undoButton" onclick="undo('${index})">X</span>`;
        log.insertBefore(logEntry, log.firstChild);
    });
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function playAudio() {
    const audio = getAudio();
    audio.play();
}

function pauseAudio() {
    const audio = getAudio();
    audio.pause();
}

function createTimeHatches(duration) {
    const timeHatchesContainer = document.getElementById('time-hatches');
    const progressBarHeight = document.getElementById('progressBar').clientHeight;
    const totalMinutes = Math.ceil(duration / 60);

    for (let i = 0; i <= totalMinutes; i++) {
        const hatch = document.createElement('div');
        hatch.className = 'time-hatch';
        hatch.style.top = `${(i / totalMinutes) * progressBarHeight}px`;
        timeHatchesContainer.appendChild(hatch);
    }
}
