document.onreadystatechange = (event) => {
  if (document.readyState !== "complete") return;

  initWindows();
  initTabs();
  initTime();
};

function initWindows() {
  const aboutMe = document.getElementById("aboutMe");
  const aboutProjects = document.getElementById("aboutProjects");
  const dancingCat = document.getElementById("dancingCat");
  const background = document.getElementById("background");

  background.addEventListener("click", () => {
    aboutMe.style.zIndex = 0;
    aboutProjects.style.zIndex = 0;

    aboutMe.classList.remove("active");
    aboutProjects.classList.remove("active");
  });

  aboutMe.addEventListener("click", (event) => {
    event.stopPropagation();

    aboutMe.style.zIndex = 1000;
    aboutProjects.style.zIndex = 0;
    dancingCat.style.zIndex = 0;

    aboutMe.classList.add("active");
    aboutProjects.classList.remove("active");
    dancingCat.classList.remove("active");
  });

  aboutProjects.addEventListener("click", (event) => {
    event.stopPropagation();

    aboutMe.style.zIndex = 0;
    aboutProjects.style.zIndex = 1000;
    dancingCat.style.zIndex = 0;

    aboutMe.classList.remove("active");
    aboutProjects.classList.add("active");
    dancingCat.classList.remove("active");
  });

  dancingCat.addEventListener("click", (event) => {
    event.stopPropagation();

    aboutMe.style.zIndex = 0;
    aboutProjects.style.zIndex = 0;
    dancingCat.style.zIndex = 1000;

    aboutMe.classList.remove("active");
    aboutProjects.classList.remove("active");
    dancingCat.classList.add("active");
  });

  aboutMe
    .getElementsByClassName("title-bar")[0]
    .addEventListener("mousedown", (event) => {
      event.stopPropagation();

      let lastX = event.clientX;
      let lastY = event.clientY;

      function onMouseMove(event) {
        const deltaX = event.clientX - lastX;
        const deltaY = event.clientY - lastY;

        aboutMe.style.left = `${aboutMe.offsetLeft + deltaX}px`;
        aboutMe.style.top = `${aboutMe.offsetTop + deltaY}px`;

        lastX = event.clientX;
        lastY = event.clientY;
      }

      document.addEventListener("mousemove", onMouseMove);

      aboutMe.onmouseup = function () {
        document.removeEventListener("mousemove", onMouseMove);
        aboutMe.onmouseup = null;
      };
    });

  aboutProjects
    .getElementsByClassName("title-bar")[0]
    .addEventListener("mousedown", (event) => {
      event.stopPropagation();

      aboutMe.style.zIndex = 0;

      let lastX = event.clientX;
      let lastY = event.clientY;

      function onMouseMove(event) {
        const deltaX = event.clientX - lastX;
        const deltaY = event.clientY - lastY;

        aboutProjects.style.left = `${aboutProjects.offsetLeft + deltaX}px`;
        aboutProjects.style.top = `${aboutProjects.offsetTop + deltaY}px`;

        lastX = event.clientX;
        lastY = event.clientY;
      }

      document.addEventListener("mousemove", onMouseMove);

      aboutProjects.onmouseup = function () {
        document.removeEventListener("mousemove", onMouseMove);
        aboutProjects.onmouseup = null;
      };
    });

  dancingCat
    .getElementsByClassName("title-bar")[0]
    .addEventListener("mousedown", (event) => {
      event.stopPropagation();

      aboutMe.style.zIndex = 0;

      let lastX = event.clientX;
      let lastY = event.clientY;

      function onMouseMove(event) {
        const deltaX = event.clientX - lastX;
        const deltaY = event.clientY - lastY;

        dancingCat.style.left = `${dancingCat.offsetLeft + deltaX}px`;
        dancingCat.style.top = `${dancingCat.offsetTop + deltaY}px`;

        lastX = event.clientX;
        lastY = event.clientY;
      }

      document.addEventListener("mousemove", onMouseMove);

      dancingCat.onmouseup = function () {
        document.removeEventListener("mousemove", onMouseMove);
        dancingCat.onmouseup = null;
      };
    });

  const dancingCatButtons = document.getElementsByTagName("button");

  for (let x of dancingCatButtons) {
    x.addEventListener("click", () => {
      dancingCat.style.display = "none";
    });
  }

  // F1 hotkey
  document.addEventListener("keydown", (event) => {
    if (event.key !== "F1") {
      return;
    }

    if (aboutMe.classList.contains("active")) {
      dancingCat.style.display = "block";
    }
  });
}

function initTabs() {
  const tabs = document.querySelectorAll("menu[role=tablist]");

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];

    const tabButtons = tab.querySelectorAll("menu[role=tablist] > button");

    tabButtons.forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();

        tabButtons.forEach((button) => {
          if (
            button.getAttribute("aria-controls") ===
            e.target.getAttribute("aria-controls")
          ) {
            button.setAttribute("aria-selected", true);
            openTab(e, tab);
          } else {
            button.setAttribute("aria-selected", false);
          }
        });
      })
    );
  }

  function openTab(event, tab) {
    const articles = tab.parentNode.querySelectorAll('[role="tabpanel"]');
    articles.forEach((p) => {
      p.setAttribute("hidden", true);
    });
    const article = tab.parentNode.querySelector(
      `[role="tabpanel"]#${event.target.getAttribute("aria-controls")}`
    );
    article.removeAttribute("hidden");
  }
}

function initTime() {
  const time = document.getElementById("time");
  updateTime(time);

  setInterval(() => updateTime(time), 1000);
}

function updateTime(timeSpan) {
  const date = new Date();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  timeSpan.innerHTML = `${hours}:${minutes}`;
}
