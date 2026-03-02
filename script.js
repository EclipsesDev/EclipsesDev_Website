const redirect = sessionStorage.redirect;
if (redirect) {
  sessionStorage.removeItem("redirect");
  history.replaceState(null, "", redirect);
}

// const buttons = document.querySelectorAll(".menu-bar button");
// const sections = document.querySelectorAll(".section");
// buttons.forEach(button => {
//   button.addEventListener("click", () => {
//     const target = button.dataset.section;

//     buttons.forEach(b => b.classList.remove("active"));
//     button.classList.add("active");

//     sections.forEach(sec => {
//       sec.classList.remove("active");
//       if (sec.id === target) sec.classList.add("active");
//     });
//   });
// });

function activateSection(id) {
  const buttons = document.querySelectorAll(".menu-bar button, .menu-bar a.menu-button");
  const sections = document.querySelectorAll(".section");
  let found = false;
  
  sections.forEach(sec => {
    if (sec.id === id) {
      sec.style.display = "block";
      found = true;
    } else {
      sec.style.display = "none";
    }
  });

  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === id);
  });

  if (!found) {
    activateSection("home");
  }
}

function handleRoute() {
  const path = window.location.pathname.split("/")[1];
  const section = path || "home";
  activateSection(section);
}

document.querySelectorAll(".menu-bar button").forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.section;
    history.pushState(null, "", "/" + target);
    activateSection(target);
  });
});

window.addEventListener("popstate", handleRoute);
document.addEventListener("DOMContentLoaded", handleRoute);

fetch("https://api.eclipsesdev.my.id/changelog/")
  .then(response => {
    if (!response.ok) {
      throw new Error("Failed to load changelog");
    }
    return response.text();
  })
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
      devTitle.textContent = lines[1].replace("Project: ", "").trim();

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

fetch("https://raw.githubusercontent.com/EclipsesDev/EclipsesDev/main/README.md")
  .then(res => res.text())
  .then(md => {
    const html = marked.parse(md);
    document.getElementById("github-readme").innerHTML = html;
  })
  .catch(err => {
    document.getElementById("github-readme").textContent = "ERROR: Failed to load README.";
    console.error(err);
  });
