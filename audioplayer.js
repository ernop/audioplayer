let activePlayer = null;
const globalPlaybackSpeedKey = 'globalPlaybackSpeed';
const defaultPlaybackSpeed = 1.0;

// Retrieve the global playback speed preference
let globalPlaybackSpeed = parseFloat(localStorage.getItem(globalPlaybackSpeedKey)) || defaultPlaybackSpeed;

document.addEventListener('DOMContentLoaded', (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    const audioSrc = urlParams.get('audioSrc');

    if (audioSrc) {
        const id = `audioPlayer_${audioSrc.substring(audioSrc.lastIndexOf('/') + 1)}`;
        const container = document.createElement('div');
        container.id = id;
        document.body.appendChild(container);

        const hasPlayed = localStorage.getItem(`${id}_hasPlayed`) === 'true';
        const hasFinished = localStorage.getItem(`${id}_hasFinished`) === 'true';
        const isMinimized = localStorage.getItem(`${id}_isMinimized`) === 'true';
        const savedVolume = localStorage.getItem(`${id}_volume`) || 1;
        const storedTime = localStorage.getItem(id) || 0;

        let history = [];
        let bookmarks = JSON.parse(localStorage.getItem(`${id}_bookmarks`)) || [];
        container.history = history;

        fetch('audioPlayer.html')
            .then(response => response.text())
            .then(html => {
                html = html.replace(/{{id}}/g, id)
                           .replace(/{{audioSrc}}/g, audioSrc)
                           .replace(/{{savedVolume}}/g, savedVolume)
                           .replace(/{{globalPlaybackSpeed}}/g, globalPlaybackSpeed.toFixed(2))
                           .replace(/{{hasPlayedAndNotFinishedAndNotMinimized}}/g, hasPlayed && !hasFinished && !isMinimized ? 'block' : 'none');

                container.innerHTML = html;

                const audio = getAudio(id);

                audio.volume = savedVolume;
                audio.playbackRate = globalPlaybackSpeed;
                audio.currentTime = storedTime;

                setInterval(() => {
                    localStorage.setItem(id, audio.currentTime);
                }, 1000);

                audio.addEventListener('play', () => {
                    localStorage.setItem(`${id}_hasPlayed`, 'true');
                    localStorage.setItem(`${id}_isMinimized`, 'false');
                    if (activePlayer && activePlayer !== audio) {
                        activePlayer.pause();
                    }
                    activePlayer = audio;
                    logEntry(log, history, `Started playing at ${formatTime(audio.currentTime)} using play button`, audio.currentTime, id);
                });

                audio.addEventListener('pause', () => {
                    logEntry(log, history, `Paused at ${formatTime(audio.currentTime)} using pause button`, audio.currentTime, id);
                });

                audio.addEventListener('ended', () => {
                    localStorage.setItem(`${id}_hasFinished`, 'true');
                    minimizePlayer(id);
                });

                const log = getLog(id);
                logEntry(log, history, `Page loaded`, 0, id);
                logEntry(log, history, `User loaded at ${formatTime(storedTime)}`, storedTime, id);
                renderBookmarks(id, bookmarks);
            })
            .catch(error => {
                console.error('Error loading audio player HTML:', error);
            });
    }
});

function getAudio(id) {
    return document.getElementById("theId");
}

function getLog(id) {
    return document.getElementById("theLog");
}

function logEntry(log, history, message, startTime, id, endTime = startTime) {
    const entry = document.createElement('div');
    entry.className = 'logEntry';
    entry.title = `Clicking this will jump to time ${formatTime(startTime)}`;
    entry.innerHTML = `${message} <span class="undoButton" onclick="undo('${id}', ${history.length})">X</span>`;
    log.insertBefore(entry, log.firstChild);
    log.scrollTop = 0;
    history.push({ startTime, endTime });
}

function seek(id, amount, label) {
    const audio = getAudio(id);
    const log = getLog(id);
    const container = document.getElementById(id);
    const history = container.history;
    const startTime = audio.currentTime;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + amount));
    logEntry(log, history, `Jumped from ${formatTime(startTime)} to ${formatTime(audio.currentTime)} using ${label} button`, startTime, id, audio.currentTime);
}

function seekHalf(id, direction) {
    const audio = getAudio(id);
    const log = getLog(id);
    const container = document.getElementById(id);
    const history = container.history;
    const startTime = audio.currentTime;
    audio.currentTime = direction === 'backward' ? Math.max(0, audio.currentTime / 2) : Math.min(audio.duration, audio.currentTime + (audio.duration - audio.currentTime) / 2);
    logEntry(log, history, `Jumped from ${formatTime(startTime)} to ${formatTime(audio.currentTime)} using Half ${direction} button`, startTime, id, audio.currentTime);
}

function changePlaybackSpeed(id, delta) {
    globalPlaybackSpeed = Math.max(0.5, Math.min(2.0, globalPlaybackSpeed + delta));
    localStorage.setItem(globalPlaybackSpeedKey, globalPlaybackSpeed);
    document.querySelectorAll('audio').forEach(audio => {
        audio.playbackRate = globalPlaybackSpeed;
    });
    document.querySelectorAll(`[id$="_playbackSpeed"]`).forEach(el => {
        el.textContent = `${globalPlaybackSpeed.toFixed(2)}x`;
    });
}

function togglePlayPause(id) {
    const audio = getAudio(id);
    audio.paused ? audio.play() : audio.pause();
}

function toggleMute(id) {
    const audio = getAudio(id);
    audio.muted = !audio.muted;
}

function setVolume(id, volume) {
    const audio = getAudio(id);
    audio.volume = volume;
    localStorage.setItem(`${id}_volume`, volume);
}

function addBookmark(id) {
    const audio = getAudio(id);
    const bookmarksList = document.getElementById(`${id}_bookmarksList`);
    let bookmarks = JSON.parse(localStorage.getItem(`${id}_bookmarks`)) || [];

    const currentTime = audio.currentTime;
    const bookmark = { time: currentTime, label: `Bookmark at ${formatTime(currentTime)}` };
    bookmarks.push(bookmark);
    localStorage.setItem(`${id}_bookmarks`, JSON.stringify(bookmarks));

    renderBookmarks(id, bookmarks);
}

function renderBookmarks(id, bookmarks) {
    const bookmarksList = document.getElementById(`${id}_bookmarksList`);
    bookmarksList.innerHTML = '';
    bookmarks.forEach((bookmark, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${bookmark.label} <button onclick="jumpToBookmark('${id}', ${bookmark.time})">Jump</button> <button onclick="deleteBookmark('${id}', ${index})">Delete</button>`;
        bookmarksList.appendChild(li);
    });
}

function jumpToBookmark(id, time) {
    const audio = getAudio(id);
    audio.currentTime = time;
}

function deleteBookmark(id, index) {
    let bookmarks = JSON.parse(localStorage.getItem(`${id}_bookmarks`)) || [];
    bookmarks.splice(index, 1);
    localStorage.setItem(`${id}_bookmarks`, JSON.stringify(bookmarks));
    renderBookmarks(id, bookmarks);
}

function undo(id, index) {
    const container = document.getElementById(id);
    const audio = getAudio(id);
    const log = getLog(id);
    const history = container.history;
    if (index >= 0 && index < history.length) {
        const entry = history[index];
        audio.currentTime = entry.startTime;
        container.history = history.slice(0, index);
        renderLog(log, container.history, id);
    }
}

function renderLog(log, history, id) {
    log.innerHTML = '';
    history.forEach((entry, index) => {
        const message = `Jumped from ${formatTime(entry.startTime)} to ${formatTime(entry.endTime)}`;
        const logEntry = document.createElement('div');
        logEntry.className = 'logEntry';
        logEntry.title = `Clicking this will jump to time ${formatTime(entry.startTime)}`;
        logEntry.innerHTML = `${message} <span class="undoButton" onclick="undo('${id}', ${index})">X</span>`;
        log.insertBefore(logEntry, log.firstChild);
    });
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function playAudio(id) {
    const audio = getAudio(id);
    audio.play();
}

function pauseAudio(id) {
    const audio = getAudio(id);
    audio.pause();
}

function maximizePlayer(id) {
    const container = document.getElementById(id);
    container.querySelector('.minimized').style.display = 'none';
    container.querySelector('.maximized').style.display = 'block';
    localStorage.setItem(`${id}_isMinimized`, 'false');
    playAudio(id);
}

function minimizePlayer(id) {
    const container = document.getElementById(id);
    container.querySelector('.minimized').style.display = 'block';
    container.querySelector('.maximized').style.display = 'none';
    localStorage.setItem(`${id}_isMinimized`, 'true');
    pauseAudio(id);
}
