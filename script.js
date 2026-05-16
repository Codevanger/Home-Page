document.onreadystatechange = (event) => {
  if (document.readyState !== "complete") return;

  initWindows();
  initTabs();
  initTime();
};

const WINDOW_CONFIGS = [
  {
    id: "aboutMe",
    label: "About me",
    icon: "icons/about-me.png",
    closable: true,
    minimizable: true,
    visible: true,
    hotkeysWhenActive: {
      F1: (api) => api.show("dancingCat"),
    },
  },
  {
    id: "aboutProjects",
    label: "About projects",
    icon: "icons/about-projects.png",
    closable: true,
    minimizable: true,
    visible: true,
  },
  {
    id: "dancingCat",
    label: "Dancing cat",
    closable: true,
    minimizable: true,
    visible: false,
  },
];

function initWindows() {
  const background = document.getElementById("background");
  const taskbarContainer = document.getElementById("taskbarButtons");
  const desktopContainer = document.getElementById("desktopIcons");
  const manager = createWindowManager(WINDOW_CONFIGS, taskbarContainer);

  initDesktopIcons(manager, desktopContainer);

  background.addEventListener("click", () => {
    manager.unfocusAll();
    deselectDesktopIcons(desktopContainer);
  });

  for (const win of manager.windows) {
    win.element.addEventListener("click", (event) => {
      event.stopPropagation();
      manager.focus(win.config.id);
    });

    makeDraggable(win.element, () => manager.focus(win.config.id));

    const controls = win.element.querySelector(".title-bar .title-bar-controls");
    const minBtn = controls.querySelector('[aria-label="Minimize"]');
    const closeBtn = controls.querySelector('[aria-label="Close"]');

    if (win.config.minimizable) {
      minBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        manager.minimize(win.config.id);
      });
    } else {
      minBtn.style.display = "none";
    }

    if (win.config.closable) {
      closeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        manager.close(win.config.id);
      });
    } else {
      closeBtn.style.display = "none";
    }
  }

  document.addEventListener("keydown", (event) => {
    const active = manager.windows.find(
      (w) => w.state === "open" && w.element.classList.contains("active")
    );
    if (!active || !active.config.hotkeysWhenActive) return;
    const handler = active.config.hotkeysWhenActive[event.key];
    if (handler) {
      event.preventDefault();
      handler(manager);
    }
  });

  manager.render();
}

function initDesktopIcons(manager, container) {
  for (const win of manager.windows) {
    if (!win.config.icon) continue;

    const icon = document.createElement("div");
    icon.className = "desktop-icon";
    icon.dataset.windowId = win.config.id;

    const img = document.createElement("img");
    img.src = win.config.icon;
    img.alt = "";
    img.draggable = false;

    const label = document.createElement("span");
    label.textContent = win.config.label;

    icon.append(img, label);

    icon.addEventListener("click", (event) => {
      event.stopPropagation();
      deselectDesktopIcons(container, icon);
      icon.classList.add("selected");
    });

    icon.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      icon.classList.remove("selected");
      manager.show(win.config.id);
    });

    container.appendChild(icon);
  }
}

function deselectDesktopIcons(container, except) {
  for (const el of container.querySelectorAll(".desktop-icon.selected")) {
    if (el !== except) el.classList.remove("selected");
  }
}

function createWindowManager(configs, taskbarContainer) {
  const windows = configs.map((config) => ({
    config,
    element: document.getElementById(config.id),
    state: config.visible ? "open" : "closed",
  }));

  for (const w of windows) setState(w, w.state);

  function setState(win, newState) {
    win.state = newState;
    if (newState === "open") {
      win.element.style.display = "";
    } else {
      win.element.style.display = "none";
      win.element.classList.remove("active");
      win.element.style.zIndex = 0;
    }
  }

  function get(id) {
    return windows.find((w) => w.config.id === id);
  }

  function focus(id) {
    const target = get(id);
    if (!target || target.state === "closed") return;
    if (target.state === "minimized") setState(target, "open");
    for (const w of windows) {
      const isTarget = w === target;
      w.element.style.zIndex = isTarget ? 1000 : 0;
      w.element.classList.toggle("active", isTarget);
    }
    render();
  }

  function show(id) {
    const w = get(id);
    if (!w) return;
    setState(w, "open");
    focus(id);
  }

  function minimize(id) {
    const w = get(id);
    if (!w || w.state !== "open") return;
    setState(w, "minimized");
    render();
  }

  function close(id) {
    const w = get(id);
    if (!w || w.state === "closed") return;
    setState(w, "closed");
    render();
  }

  function unfocusAll() {
    for (const w of windows) {
      w.element.style.zIndex = 0;
      w.element.classList.remove("active");
    }
    render();
  }

  function render() {
    taskbarContainer.innerHTML = "";
    for (const win of windows) {
      if (win.state === "closed") continue;
      const btn = document.createElement("button");
      btn.textContent = win.config.label;
      btn.dataset.windowId = win.config.id;
      if (win.state === "minimized") btn.classList.add("minimized");
      if (win.element.classList.contains("active")) btn.classList.add("active");
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        if (win.state === "minimized") {
          show(win.config.id);
        } else if (win.element.classList.contains("active")) {
          minimize(win.config.id);
        } else {
          focus(win.config.id);
        }
      });
      taskbarContainer.appendChild(btn);
    }
  }

  return { windows, get, focus, show, minimize, close, unfocusAll, render };
}

function makeDraggable(element, onDragStart) {
  const titleBar = element.getElementsByClassName("title-bar")[0];

  titleBar.addEventListener("mousedown", (event) => {
    if (event.target.closest(".title-bar-controls")) return;
    event.stopPropagation();
    onDragStart?.();

    let lastX = event.clientX;
    let lastY = event.clientY;

    function onMouseMove(event) {
      const deltaX = event.clientX - lastX;
      const deltaY = event.clientY - lastY;

      element.style.left = `${element.offsetLeft + deltaX}px`;
      element.style.top = `${element.offsetTop + deltaY}px`;

      lastX = event.clientX;
      lastY = event.clientY;
    }

    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseleave", onMouseUp);
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
  const minutes = date.getMinutes().toString().padStart(2, '0');

  timeSpan.innerHTML = `${hours}:${minutes}`;
}
