let changelogLoaded = false;
let readmeLoaded = false;

function activateSection(id) {
  const sections = document.querySelectorAll(".section");
  const buttons = document.querySelectorAll(".menu-bar button");

  sections.forEach(sec => {
    sec.style.display = sec.id === id ? "block" : "none";
  });

  buttons.forEach(btn => {
    if (btn.dataset.section) {
      btn.classList.toggle("active", btn.dataset.section === id);
    }
  });

  if (id === "changelog" && !changelogLoaded) {
    loadChangelog();
    changelogLoaded = true;
  }

  if (id === "home" && !readmeLoaded) {
    loadReadme();
    readmeLoaded = true;
  }
}

function loadChangelog() {
  fetch("https://api.eclipsesdev.my.id/changelog/")
    .then(res => res.ok ? res.text() : Promise.reject("Failed to load changelog"))
    .then(text => {
      const container = document.getElementById("changelog-logs");
      container.innerHTML = "";

      const logs = text.split(/\n?Dev Log\s+/).filter(Boolean).reverse();
      logs.forEach(log => {
        const section = document.createElement("div");
        section.className = "log-section";

        const lines = log.trim().split("\n");
        const titleText = "Dev Log " + lines[0];

        const title = document.createElement("div");
        title.className = "log-title";
        title.textContent = titleText;

        const devTitle = document.createElement("div");
        devTitle.className = "log-project";
        devTitle.textContent = lines[1]?.replace("Project: ", "").trim() || "";

        const list = document.createElement("ul");
        lines.slice(2).forEach(line => {
          if (line.trim().startsWith("-")) {
            const li = document.createElement("li");
            li.textContent = line.replace("-", "").trim();
            list.appendChild(li);
          }
        });

        section.appendChild(title);
        section.appendChild(devTitle);
        section.appendChild(list);
        container.appendChild(section);
      });
    })
    .catch(err => {
      console.error(err);
      document.getElementById("changelog-logs").textContent =
        "ERROR: Unable to load changelog.";
    });
}

function loadReadme() {
  fetch("https://raw.githubusercontent.com/EclipsesDev/EclipsesDev/main/README.md")
    .then(res => res.text())
    .then(md => {
      document.getElementById("github-readme").innerHTML = marked.parse(md);
    })
    .catch(err => {
      document.getElementById("github-readme").textContent = "ERROR: Failed to load README.";
      console.error(err);
    });
}

document.querySelectorAll(".menu-bar button").forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.section;
    history.pushState(null, "", "/" + target);
    activateSection(target);
  });
});

window.addEventListener("popstate", () => {
  const section = window.location.pathname.split("/")[1] || "home";
  activateSection(section);
});

document.addEventListener("DOMContentLoaded", () => {
  const section = window.location.pathname.split("/")[1] || "home";
  activateSection(section);
});