const buttons = document.querySelectorAll(".menu-bar button");
const sections = document.querySelectorAll(".section");

buttons.forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.section;

    buttons.forEach(b => b.classList.remove("active"));
    button.classList.add("active");

    sections.forEach(sec => {
      sec.classList.remove("active");
      if (sec.id === target) sec.classList.add("active");
    });
  });
});

fetch("changelog.txt")
  .then(response => response.text())
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

      const list = document.createElement("ul");

      lines.slice(1).forEach(line => {
        if (line.trim().startsWith("-")) {
          const li = document.createElement("li");
          li.textContent = line.replace("-", "").trim();
          list.appendChild(li);
        }
      });

      section.appendChild(title);
      section.appendChild(list);
      container.appendChild(section);
    });
  })
  .catch(() => {
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