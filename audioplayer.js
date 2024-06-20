let activePlayer = null;
let globalId = "";

document.addEventListener('DOMContentLoaded', (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    const audioSrc = urlParams.get('audioSrc');
    const id = `audioPlayer_${audioSrc.substring(audioSrc.lastIndexOf('/') + 1)}`;
    const container = document.getElementById('container');
    container.id = id;
    globalId=id;

    document.body.appendChild(container);

    const hasPlayed = localStorage.getItem(`${globalId}_hasPlayed`) === 'true';
    const hasFinished = localStorage.getItem(`${globalId}_hasFinished`) === 'true';
    const savedVolume = localStorage.getItem(`${globalId}_volume`) || 1;
    const storedTime = localStorage.getItem(`${globalId}_storedTime`) || 0;
    const playbackRate = parseFloat(localStorage.getItem(`${globalId}_playbackRate`)) || 1;

    let history = [];
    let bookmarks = JSON.parse(localStorage.getItem(`${globalId}_bookmarks`)) || [];
    container.history = history;


    document.getElementById('playbackRate').textContent = playbackRate.toFixed(2)+'x';

    const audio = getAudio();
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
 });

function getAudio() {
    return document.getElementById("theId");
}

function getLog() {
    return document.getElementById("theLog");
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
    logEntry(log, history, `Jumped from ${formatTime(startTime)} to ${formatTime(audio.currentTime)} using Half ${direction} button`, startTime,  audio.currentTime);
}

function changePlaybackRateTo(x){
    const audio = getAudio();
    const log = getLog();
    const container = document.getElementById(globalId);
    var newPlaybackRate = 1.0;
    localStorage.setItem(`${globalId}_playbackRate`, newPlaybackRate);
    audio.playbackRate = newPlaybackRate;
    document.querySelectorAll(`[id$="playbackRate"]`).forEach(el => {
        el.textContent = `${newPlaybackRate.toFixed(2)}x`;
    });
}

function changePlaybackRate(delta) {
    const audio = getAudio();
    const log = getLog();
    const container = document.getElementById(globalId);
    var newPlaybackRate = Math.max(0.0, Math.min(5.0, audio.playbackRate + delta));
    localStorage.setItem(`${globalId}_playbackRate`, newPlaybackRate);
    audio.playbackRate = newPlaybackRate;
    document.querySelectorAll(`[id$="playbackRate"]`).forEach(el => {
        el.textContent = `${newPlaybackRate.toFixed(2)}x`;
    });
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
    audio.paused ? audio.play() : audio.pause();
}

function toggleMute() {
    const audio = getAudio();
    audio.muted = !audio.muted;
}

function setVolume(volume) {
    const audio = getAudio();
    audio.volume = volume;
    localStorage.setItem(`${globalId}_volume`, volume);
}

function addBookmark() {
    const audio = getAudio();
    const bookmarksList = document.getElementById(`bookmarksList`);
    let bookmarks = JSON.parse(localStorage.getItem(`${globalId}_bookmarks`)) || [];

    const currentTime = audio.currentTime;
    const bookmark = { time: currentTime, label: `Bookmark at ${formatTime(currentTime)}` };
    bookmarks.push(bookmark);
    localStorage.setItem(`${globalId}_bookmarks`, JSON.stringify(bookmarks));

    renderBookmarks( bookmarks);
}

function renderBookmarks(bookmarks) {
    const bookmarksList = document.getElementById(`bookmarksList`);
    bookmarksList.innerHTML = '';
    bookmarks.forEach((bookmark, index) => {
        const li = document.createElement('li');
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
        logEntry.innerHTML = `${message} <span class="undoButton" onclick="undo('{index})">X</span>`;
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
