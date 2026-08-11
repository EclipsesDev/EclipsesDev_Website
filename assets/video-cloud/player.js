const lightbox = document.getElementById("video-lightbox");
const player = document.getElementById("video-player");
const overlay = document.getElementById("video-overlay");
const playerShell = document.querySelector(".video-player-shell");
const playIcon = document.getElementById("video-play-icon");
const seekFeedback = document.getElementById("video-seek-feedback");
const seekFeedbackIcon = document.getElementById("video-seek-feedback-icon");
const closeButton = document.getElementById("video-close");
const prevButton = document.getElementById("video-prev");
const nextButton = document.getElementById("video-next");
const progressBar = document.getElementById("video-progress-bar");
const progressContainer = document.getElementById("video-progress");
const controls = document.getElementById("video-controls");
const muteButton = document.getElementById("video-mute");
const muteIcon = document.getElementById("video-mute-icon");
const timeLabel = document.getElementById("video-time");
const fullscreenButton = document.getElementById("video-fullscreen");
const fullscreenIcon = document.getElementById("video-fullscreen-icon");

const PLAYER_ICONS = {
  play: "/assets/img/Play.png",
  pause: "/assets/img/Pause.png",
  forward: "/assets/img/forward.png",
  rewind: "/assets/img/rewind.png",
  muted: "/assets/img/Mute.png",
  unmuted: "/assets/svg/unmute.svg",
  maximize: "/assets/svg/maximize.svg",
  minimize: "/assets/svg/minimize.svg"
};

const PLAYER_IDLE_DELAY_MS = 2000;
const SURFACE_DOUBLE_CLICK_DELAY_MS = 250;
const DOUBLE_CLICK_SEEK_SECONDS = 5;
let idleTimer = null;
let fullscreenIconRafId = null;
let isNativeVideoFullscreenActive = false;
let surfaceClickTimer = null;
let isProgressDragging = false;
let seekFeedbackTimer = null;
let activeProgressPointerId = null;

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainderSeconds}`;
}

function setIcon(img, src, alt) {
  if (!img) return;
  const nextUrl = new URL(src, window.location.origin).href;
  const currentUrl = img.currentSrc || img.src || "";
  if (currentUrl !== nextUrl) {
    img.src = src;
  }
  if (img.alt !== alt) {
    img.alt = alt;
  }
}

function preloadIcon(src) {
  const image = new Image();
  image.src = src;
}

function preloadPlayerIcons() {
  Object.values(PLAYER_ICONS).forEach(preloadIcon);
}

function updatePlayIcon() {
  if (player.paused) {
    setIcon(playIcon, PLAYER_ICONS.play, "Play");
  } else {
    setIcon(playIcon, PLAYER_ICONS.pause, "Pause");
  }
}

function updateMuteIcon() {
  if (player.muted) {
    setIcon(muteIcon, PLAYER_ICONS.muted, "Muted");
  } else {
    setIcon(muteIcon, PLAYER_ICONS.unmuted, "Unmuted");
  }
}

function updateFullscreenIcon() {
  if (isFullscreenActive()) {
    setIcon(fullscreenIcon, PLAYER_ICONS.minimize, "Exit fullscreen");
  } else {
    setIcon(fullscreenIcon, PLAYER_ICONS.maximize, "Enter fullscreen");
  }
}

function applyFullscreenLayoutState() {
  lightbox.classList.toggle("is-fullscreen-active", isFullscreenActive());
}

function scheduleFullscreenIconUpdate() {
  if (fullscreenIconRafId !== null) return;
  fullscreenIconRafId = window.requestAnimationFrame(() => {
    fullscreenIconRafId = null;
    updateFullscreenIcon();
    applyFullscreenLayoutState();
  });
}

function setIdleState(isIdle) {
  playerShell.classList.toggle("is-idle", isIdle);
}

function clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function resetIdleTimer() {
  if (!playerShell.classList.contains("is-playing")) {
    setIdleState(false);
    return;
  }

  setIdleState(false);
  clearIdleTimer();
  idleTimer = setTimeout(() => {
    if (playerShell.classList.contains("is-playing")) {
      setIdleState(true);
    }
  }, PLAYER_IDLE_DELAY_MS);
}

function isFullscreenActive() {
  return !!document.fullscreenElement || isNativeVideoFullscreenActive;
}

async function requestPlayerFullscreen() {
  if (lightbox.requestFullscreen) {
    try {
      await lightbox.requestFullscreen();
      return;
    } catch (lightboxError) {
      if (player.requestFullscreen) {
        await player.requestFullscreen();
        return;
      }
      throw lightboxError;
    }
  }

  if (lightbox.webkitRequestFullscreen) {
    lightbox.webkitRequestFullscreen();
    return;
  }

  if (player.requestFullscreen) {
    await player.requestFullscreen();
    return;
  }

  if (player.webkitEnterFullscreen) {
    player.webkitEnterFullscreen();
  }
}

async function exitFullscreenIfNeeded() {
  if (!document.fullscreenElement && !isNativeVideoFullscreenActive) return;

  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch (e) {
      console.error("Exit fullscreen failed:", e);
    }
  }

  if (isNativeVideoFullscreenActive && player.webkitExitFullscreen) {
    try {
      player.webkitExitFullscreen();
    } catch (e) {
      console.error("Native fullscreen exit failed:", e);
    }
  }
}

function openVideoPlayer(url, options = {}) {
  const poster = typeof options.poster === "string" ? options.poster : "";
  player.poster = poster;
  player.src = url;
  lightbox.style.display = "flex";
  applyFullscreenLayoutState();
  player.pause();
  setIdleState(false);
  clearIdleTimer();
  updatePlayIcon();
  
  const vid = options.videoId || options.id || null;
  if (vid) {
    try {
      const newUrl = `/projects/video-cloud/${vid}`;
      window.history.pushState({ videoId: vid }, "", newUrl);
    } catch (e) {}
  }
}

window.openVideoPlayer = openVideoPlayer;

function togglePlayback() {
  if (player.paused) {
    const maybePromise = player.play();
    maybePromise?.catch(() => {});
  } else {
    player.pause();
  }
}

function updatePlaybackProgress() {
  const duration = player.duration;
  const percent = duration > 0 ? (player.currentTime / duration) * 100 : 0;
  progressBar.style.width = `${percent}%`;
  timeLabel.textContent = `${formatTime(player.currentTime)} / ${formatTime(duration)}`;
}

function seekBy(seconds) {
  const duration = player.duration;
  if (!Number.isFinite(duration) || duration <= 0) return;
  const nextTime = Math.min(Math.max(player.currentTime + seconds, 0), duration);
  player.currentTime = nextTime;
  updatePlaybackProgress();
}

function showSeekFeedback(direction) {
  if (!seekFeedback || !seekFeedbackIcon) return;
  const isForward = direction === "forward";
  setIcon(seekFeedbackIcon, isForward ? PLAYER_ICONS.forward : PLAYER_ICONS.rewind, isForward ? "Forward 5 seconds" : "Rewind 5 seconds");
  seekFeedback.classList.remove("seek-forward", "seek-backward", "is-visible");
  seekFeedback.classList.add(isForward ? "seek-forward" : "seek-backward");
  void seekFeedback.offsetWidth;
  seekFeedback.classList.add("is-visible");

  if (seekFeedbackTimer) {
    clearTimeout(seekFeedbackTimer);
  }
  seekFeedbackTimer = setTimeout(() => {
    seekFeedback.classList.remove("is-visible");
  }, 420);
}

function seekFromProgressClientX(clientX) {
  const duration = player.duration;
  if (!Number.isFinite(duration) || duration <= 0) return;
  const rect = progressContainer.getBoundingClientRect();
  if (rect.width <= 0) return;
  const clampedRatio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  player.currentTime = clampedRatio * duration;
  updatePlaybackProgress();
}

function setProgressDraggingState(isDragging) {
  isProgressDragging = isDragging;
  progressContainer.classList.toggle("is-dragging", isDragging);
}

function seekFromSurfaceSide(surface, clientX) {
  const rect = surface.getBoundingClientRect();
  const midpoint = rect.left + rect.width / 2;
  const isForward = clientX >= midpoint;
  const seekAmount = isForward ? DOUBLE_CLICK_SEEK_SECONDS : -DOUBLE_CLICK_SEEK_SECONDS;
  seekBy(seekAmount);
  showSeekFeedback(isForward ? "forward" : "backward");
  resetIdleTimer();
}

function handleSurfaceClick(event) {
  event.preventDefault();

  if (surfaceClickTimer) {
    clearTimeout(surfaceClickTimer);
    surfaceClickTimer = null;
    seekFromSurfaceSide(event.currentTarget, event.clientX);
    return;
  }

  surfaceClickTimer = setTimeout(() => {
    surfaceClickTimer = null;
  }, SURFACE_DOUBLE_CLICK_DELAY_MS);
}

for (const surface of [overlay, player]) {
  surface.addEventListener("click", handleSurfaceClick);
}

const playToggleButton = document.getElementById("video-play-toggle");
if (playToggleButton) {
  playToggleButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    togglePlayback();
  });
}

if (prevButton) {
  prevButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof window.videoCloudPrev === "function") window.videoCloudPrev();
  });
}

if (nextButton) {
  nextButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof window.videoCloudNext === "function") window.videoCloudNext();
  });
}

if (window.PointerEvent) {
  const onProgressPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    activeProgressPointerId = event.pointerId;
    setProgressDraggingState(true);
    progressContainer.setPointerCapture?.(event.pointerId);
    seekFromProgressClientX(event.clientX);
    resetIdleTimer();
  };

  const onProgressPointerMove = (event) => {
    if (!isProgressDragging) return;
    if (activeProgressPointerId !== null && event.pointerId !== activeProgressPointerId) return;
    event.preventDefault();
    seekFromProgressClientX(event.clientX);
  };

  const stopProgressDrag = (event) => {
    if (!isProgressDragging) return;
    if (activeProgressPointerId !== null && event.pointerId !== activeProgressPointerId) return;
    setProgressDraggingState(false);
    progressContainer.releasePointerCapture?.(activeProgressPointerId);
    activeProgressPointerId = null;
  };

  progressContainer.addEventListener("pointerdown", onProgressPointerDown);
  progressContainer.addEventListener("pointermove", onProgressPointerMove);
  document.addEventListener("pointermove", onProgressPointerMove);
  progressContainer.addEventListener("pointerup", stopProgressDrag);
  document.addEventListener("pointerup", stopProgressDrag);
  progressContainer.addEventListener("pointercancel", stopProgressDrag);
  document.addEventListener("pointercancel", stopProgressDrag);
  progressContainer.addEventListener("lostpointercapture", () => {
    setProgressDraggingState(false);
    activeProgressPointerId = null;
  });
} else {
  let isTouchScrubbing = false;

  progressContainer.addEventListener("touchstart", (event) => {
    isTouchScrubbing = true;
    setProgressDraggingState(true);
    seekFromProgressClientX(event.touches[0].clientX);
  }, { passive: true });

  progressContainer.addEventListener("touchmove", (event) => {
    if (!isTouchScrubbing) return;
    seekFromProgressClientX(event.touches[0].clientX);
  }, { passive: true });

  const stopTouchScrub = () => {
    isTouchScrubbing = false;
    setProgressDraggingState(false);
  };

  progressContainer.addEventListener("touchend", stopTouchScrub);
  progressContainer.addEventListener("touchcancel", stopTouchScrub);

  progressContainer.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    setProgressDraggingState(true);
    seekFromProgressClientX(event.clientX);
  });

  document.addEventListener("mousemove", (event) => {
    if (!isProgressDragging) return;
    seekFromProgressClientX(event.clientX);
  });

  document.addEventListener("mouseup", () => {
    if (!isProgressDragging) return;
    setProgressDraggingState(false);
  });
}

player.addEventListener("play", () => {
  playerShell.classList.add("is-playing");
  updatePlayIcon();
  resetIdleTimer();
});

player.addEventListener("pause", () => {
  playerShell.classList.remove("is-playing");
  setIdleState(false);
  clearIdleTimer();
  updatePlayIcon();
});

player.addEventListener("timeupdate", () => {
  updatePlaybackProgress();
});

// Mute button behavior (volume-aware) is wired up further below, alongside
// the vertical volume slider, so it can remember the last audible volume.

fullscreenButton.addEventListener("click", async () => {
  if (!isFullscreenActive()) {
    try {
      await requestPlayerFullscreen();
    } catch (e) {
      console.error("Fullscreen failed:", e);
    }
  } else {
    exitFullscreenIfNeeded();
  }
});

function bindActivityEvents(element) {
  if (!element) return;
  element.addEventListener("pointermove", resetIdleTimer);
  element.addEventListener("pointerdown", resetIdleTimer);
  element.addEventListener("touchstart", resetIdleTimer, { passive: true });
  element.addEventListener("mousemove", resetIdleTimer);
}

bindActivityEvents(lightbox);
bindActivityEvents(player);
bindActivityEvents(overlay);
bindActivityEvents(controls);

function closeVideoPlayer() {
  if (surfaceClickTimer) {
    clearTimeout(surfaceClickTimer);
    surfaceClickTimer = null;
  }
  if (seekFeedbackTimer) {
    clearTimeout(seekFeedbackTimer);
    seekFeedbackTimer = null;
  }
  seekFeedback?.classList.remove("is-visible");
  setProgressDraggingState(false);
  activeProgressPointerId = null;
  exitFullscreenIfNeeded();
  player.pause();
  if (player.src.startsWith("blob:")) {
    URL.revokeObjectURL(player.src);
  }
  player.removeAttribute("poster");
  player.src = "";
  lightbox.style.display = "none";
  applyFullscreenLayoutState();
  progressBar.style.width = "0%";
  timeLabel.textContent = "0:00 / 0:00";
  setIdleState(false);
  clearIdleTimer();
  updatePlayIcon();
  // restore base URL when closing the player
  try {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'projects' && parts[1] === 'video-cloud') {
      window.history.replaceState({}, '', '/projects/video-cloud/');
    }
  } catch (e) {}
}

closeButton.addEventListener("click", closeVideoPlayer);
// expose to other scripts
window.closeVideoPlayer = closeVideoPlayer;

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeVideoPlayer();
});

document.addEventListener("fullscreenchange", scheduleFullscreenIconUpdate);
document.addEventListener("webkitfullscreenchange", scheduleFullscreenIconUpdate);
document.addEventListener("mozfullscreenchange", scheduleFullscreenIconUpdate);
player.addEventListener("webkitbeginfullscreen", () => {
  isNativeVideoFullscreenActive = true;
  scheduleFullscreenIconUpdate();
});

player.addEventListener("webkitendfullscreen", () => {
  isNativeVideoFullscreenActive = false;
  scheduleFullscreenIconUpdate();
});

updatePlayIcon();
updateMuteIcon();
updateFullscreenIcon();
applyFullscreenLayoutState();
preloadPlayerIcons();

const VOLUME_SETTINGS_KEY = "eclipsesdev_video_volume_v1";
const volumeContainer = document.getElementById("video-mute-container");
const volumeSlider = document.getElementById("video-volume-slider");
const volumeFill = document.getElementById("video-volume-fill");

function loadVolumeSettings() {
  try {
    const raw = localStorage.getItem(VOLUME_SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function saveVolumeSettings(volume, muted) {
  try {
    localStorage.setItem(VOLUME_SETTINGS_KEY, JSON.stringify({ volume, muted }));
  } catch (e) {}
}

if (volumeSlider && volumeFill && volumeContainer) {
  let lastAudibleVolume = 1;
  let isVolumeDragging = false;
  let activeVolumePointerId = null;

  const savedSettings = loadVolumeSettings();
  if (savedSettings && Number.isFinite(savedSettings.volume)) {
    player.volume = Math.min(1, Math.max(0, savedSettings.volume));
    player.muted = !!savedSettings.muted;
    if (player.volume > 0) lastAudibleVolume = player.volume;
  }

  function updateVolumeUi() {
    const percent = player.muted ? 0 : Math.round(player.volume * 100);
    volumeFill.style.height = `${percent}%`;
    volumeSlider.setAttribute("aria-valuenow", String(percent));
    updateMuteIcon();
  }

  function setVolume(nextVolume, { persist = true } = {}) {
    const clamped = Math.min(1, Math.max(0, nextVolume));
    player.volume = clamped;
    if (clamped > 0) {
      lastAudibleVolume = clamped;
      if (player.muted) player.muted = false;
    } else {
      player.muted = true;
    }
    updateVolumeUi();
    if (persist) saveVolumeSettings(player.volume, player.muted);
  }

  function volumeFromClientY(clientY) {
    const rect = volumeSlider.getBoundingClientRect();
    if (rect.height <= 0) return player.volume;
    const ratio = (rect.bottom - clientY) / rect.height;
    return Math.min(1, Math.max(0, ratio));
  }

  function setVolumeDraggingState(isDragging) {
    isVolumeDragging = isDragging;
    volumeSlider.classList.toggle("is-dragging", isDragging);
  }

  const onVolumePointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    activeVolumePointerId = event.pointerId;
    setVolumeDraggingState(true);
    volumeSlider.setPointerCapture?.(event.pointerId);
    setVolume(volumeFromClientY(event.clientY));
  };

  const onVolumePointerMove = (event) => {
    if (!isVolumeDragging) return;
    if (activeVolumePointerId !== null && event.pointerId !== activeVolumePointerId) return;
    event.preventDefault();
    setVolume(volumeFromClientY(event.clientY));
  };

  const stopVolumeDrag = (event) => {
    if (!isVolumeDragging) return;
    if (activeVolumePointerId !== null && event.pointerId !== activeVolumePointerId) return;
    setVolumeDraggingState(false);
    volumeSlider.releasePointerCapture?.(activeVolumePointerId);
    activeVolumePointerId = null;
  };

  volumeSlider.addEventListener("pointerdown", onVolumePointerDown);
  volumeSlider.addEventListener("pointermove", onVolumePointerMove);
  document.addEventListener("pointermove", onVolumePointerMove);
  volumeSlider.addEventListener("pointerup", stopVolumeDrag);
  document.addEventListener("pointerup", stopVolumeDrag);
  volumeSlider.addEventListener("pointercancel", stopVolumeDrag);
  document.addEventListener("pointercancel", stopVolumeDrag);

  volumeSlider.addEventListener("keydown", (event) => {
    const STEP = 0.05;
    switch (event.key) {
      case "ArrowUp":
      case "ArrowRight":
        event.preventDefault();
        setVolume(player.volume + STEP);
        break;
      case "ArrowDown":
      case "ArrowLeft":
        event.preventDefault();
        setVolume(player.volume - STEP);
        break;
      case "Home":
        event.preventDefault();
        setVolume(0);
        break;
      case "End":
        event.preventDefault();
        setVolume(1);
        break;
      default:
        break;
    }
  });

  volumeContainer.addEventListener("wheel", (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    setVolume(player.volume + delta);
  }, { passive: false });

  player.addEventListener("volumechange", updateVolumeUi);

  let touchToggleTimeout = null;
  const toggleVolumePopup = (event) => {
    event.stopPropagation();
    volumeContainer.classList.toggle("volume-open");
    clearTimeout(touchToggleTimeout);
    if (volumeContainer.classList.contains("volume-open")) {
      touchToggleTimeout = setTimeout(() => volumeContainer.classList.remove("volume-open"), 3000);
    }
  };
  muteButton.addEventListener("touchend", toggleVolumePopup, { passive: true });

  updateVolumeUi();

  // Mute button toggles muted state while remembering the last audible volume.
  muteButton.addEventListener("click", () => {
    if (player.muted || player.volume === 0) {
      setVolume(lastAudibleVolume > 0 ? lastAudibleVolume : 1);
    } else {
      player.muted = true;
      updateVolumeUi();
      saveVolumeSettings(player.volume, true);
    }
  });
} else {
  // Fallback if the slider markup isn't present.
  muteButton.addEventListener("click", () => {
    player.muted = !player.muted;
    updateMuteIcon();
  });
}