function showError(message) {
  const errorText = document.getElementById("login-error");
  if (!errorText) {
    return;
  }
  errorText.textContent = message;
}

function formatRemainingSeconds(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (hours <= 0) {
    return `${restMinutes}m`;
  }

  return `${hours}h ${restMinutes}m`;
}

function renderSessionInfo(session) {
  const sessionInfo = document.getElementById("session-info");
  if (!sessionInfo || !session?.authenticated) {
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const remaining = Number(session.expiresAt || 0) - now;
  const remainingText = remaining > 0 ? ` (${formatRemainingSeconds(remaining)} left)` : "";
  const username = session.username || "user";

  sessionInfo.textContent = `Signed in as ${username}${remainingText}`;
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  if (!usernameInput || !passwordInput) {
    return;
  }

  showError("");

  try {
    const loginResult = await VideoCloudAuth.login(
      usernameInput.value.trim(),
      passwordInput.value
    );

    if (!loginResult?.authenticated) {
      showError("Invalid username or password.");
      return;
    }

    window.location.href = VideoCloudAuth.getReturnTarget();
  } catch (error) {
    if (error?.status === 401) {
      showError("Invalid username or password.");
      return;
    }

    showError("Login service unreachable. Check your Worker route.");
  }
}

async function initLoginPage() {
  const session = await VideoCloudAuth.getSession();
  if (session.authenticated) {
    window.location.href = VideoCloudAuth.getReturnTarget();
    return;
  }

  const form = document.getElementById("login-form");
  form?.addEventListener("submit", handleLoginSubmit);
}

async function initPanelPage() {
  const session = await VideoCloudAuth.getSession();
  if (!session.authenticated) {
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const returnParam = encodeURIComponent(currentPath);
    window.location.href = `/projects/video-cloud/login?return=${returnParam}`;
    return;
  }

  const logoutButton = document.getElementById("logout-btn");
  logoutButton?.addEventListener("click", VideoCloudAuth.logout);

  renderSessionInfo(session);
}

async function playVideo(videoId) {
  const isAuthed = await VideoCloudAuth.isAuthenticated();
  if (!isAuthed) {
    await VideoCloudAuth.requireAuth();
    return;
  }

  const res = await fetch(`/video-api/storage/video?id=${videoId}`, {
    method: "GET",
    credentials: "include"
  });

  if (!res.ok) {
    const errorText = await res.text();
    alert("Failed to load video: " + res.status + " " + errorText);
    return;
  }

  const blob = await res.blob();
  const videoURL = URL.createObjectURL(blob);

  let lightbox = document.getElementById("video-lightbox");
  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.id = "video-lightbox";
    lightbox.style.position = "fixed";
    lightbox.style.top = 0;
    lightbox.style.left = 0;
    lightbox.style.width = "100%";
    lightbox.style.height = "100%";
    lightbox.style.background = "rgba(0,0,0,0.8)";
    lightbox.style.display = "flex";
    lightbox.style.justifyContent = "center";
    lightbox.style.alignItems = "center";
    lightbox.style.zIndex = 1000;

    document.body.appendChild(lightbox);
  }

  lightbox.innerHTML = "";

  const videoEl = document.createElement("video");
  videoEl.src = videoURL;
  videoEl.controls = true;
  videoEl.autoplay = true;
  videoEl.style.maxWidth = "80%";
  videoEl.style.maxHeight = "80%";
  videoEl.style.borderRadius = "12px";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "20px";
  closeBtn.style.right = "20px";
  closeBtn.style.fontSize = "32px";
  closeBtn.style.background = "red";
  closeBtn.style.color = "white";
  closeBtn.style.border = "none";
  closeBtn.style.borderRadius = "50%";
  closeBtn.style.width = "48px";
  closeBtn.style.height = "48px";
  closeBtn.style.cursor = "pointer";
  closeBtn.addEventListener("click", () => {
    URL.revokeObjectURL(videoURL);
    lightbox.style.display = "none";
  });

  lightbox.appendChild(videoEl);
  lightbox.appendChild(closeBtn);
  lightbox.style.display = "flex";

  lightbox.addEventListener("click", e => {
    if (e.target === lightbox) {
      URL.revokeObjectURL(videoURL);
      lightbox.style.display = "none";
    }
  }, { once: true });
}

document.addEventListener("DOMContentLoaded", async () => {
  const isLoginPage = window.location.pathname.endsWith("/login/") || window.location.pathname.endsWith("/login");
  if (isLoginPage) {
    await initLoginPage();
  } else {
    await initPanelPage();
  }
});
