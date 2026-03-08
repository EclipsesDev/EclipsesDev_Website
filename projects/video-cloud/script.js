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

    const remainingText =
        remaining > 0
            ? ` (${formatRemainingSeconds(remaining)} left)`
            : "";

    sessionInfo.textContent =
        `Signed in as ${session.username}${remainingText}`;
}

async function initPanelPage() {
    const session = await VideoCloudAuth.getSession();

    if (!session.authenticated) {
        const currentPath =
            `${window.location.pathname}${window.location.search}${window.location.hash}`;

        const returnParam = encodeURIComponent(currentPath);

        window.location.href =
            `/projects/video-cloud/login?return=${returnParam}`;

        return;
    }

    document
        .getElementById("logout-btn")
        .addEventListener("click", VideoCloudAuth.logout);

    renderSessionInfo(session);

    loadVideos();
}

async function loadVideos() {
    const container = document.getElementById("video-grid");

    container.innerHTML = "Loading videos...";

    try {
        const res = await fetch("/video-api/storage/list", {
            credentials: "include"
        });

        if (!res.ok) {
            container.innerHTML = "Failed to load videos";
            return;
        }

        const videos = await res.json();

        container.innerHTML = "";

        videos.forEach(video => {
            const card = document.createElement("div");
            card.className = "video-card";

            const img = document.createElement("img");
            img.src = video.thumbnail || "/assets/img/favicon.ico";

            const title = document.createElement("h3");
            title.textContent = video.title || "Untitled";

            card.appendChild(img);
            card.appendChild(title);

            card.onclick = () => openVideo(video.id);

            container.appendChild(card);
        });

    } catch (err) {
        container.innerHTML = "Video service unavailable";
    }
}

/* VIDEO PLAYER */

async function openVideo(id) {
    const lightbox = document.getElementById("video-lightbox");
    const video = document.getElementById("video-player");

    const res = await fetch(`/video-api/storage/video?id=${id}`, {
        credentials: "include"
    });

    if (!res.ok) {
        alert("Video failed to load");
        return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    video.src = url;

    lightbox.style.display = "flex";

    video.play();

    function close() {
        video.pause();
        video.src = "";

        URL.revokeObjectURL(url);

        lightbox.style.display = "none";
    }

    document
        .getElementById("close-video")
        .onclick = close;

    lightbox.onclick = (e) => {
        if (e.target === lightbox) {
            close();
        }
    };
}

/* START */

document.addEventListener("DOMContentLoaded", () => {
    const isLoginPage =
        window.location.pathname.endsWith("/login") ||
        window.location.pathname.endsWith("/login/");

    if (!isLoginPage) {
        initPanelPage();
    }
});