document.addEventListener(
  'DOMContentLoaded',
  () => {
    window.initContent();
    window.initResume();
    initWindows();
    initTabs();
    initTime();
  },
  { once: true },
);

const WINDOW_CONFIGS = [
  {
    id: 'resume',
    label: 'Resume',
    icon: 'icons/resume.svg',
    closable: true,
    minimizable: true,
    visible: false,
  },
  {
    id: 'aboutMe',
    label: 'About me',
    icon: 'icons/about-me.png',
    closable: true,
    minimizable: true,
    visible: true,
    hotkeysWhenActive: {
      F1: (api) => api.show('dancingCat'),
    },
  },
  {
    id: 'aboutProjects',
    label: 'About projects',
    icon: 'icons/about-projects.png',
    closable: true,
    minimizable: true,
    visible: true,
  },
  {
    id: 'dancingCat',
    label: 'Dancing cat',
    closable: true,
    minimizable: true,
    visible: false,
  },
];

async function initWindows() {
  const background = document.getElementById('background');
  const taskbarContainer = document.getElementById('taskbarButtons');
  const desktopContainer = document.getElementById('desktopIcons');
  const experienceConfigs = await window.Experience.createWindows(background);
  const manager = createWindowManager(
    [...WINDOW_CONFIGS, ...experienceConfigs],
    taskbarContainer,
  );

  initDesktopIcons(manager, desktopContainer, background);

  for (const win of manager.windows) {
    win.element.addEventListener('click', (event) =>
      manager.focus(win.config.id, event),
    );

    makeDraggable(win.element, () => manager.focus(win.config.id));

    const controls = win.element.querySelector(
      '.title-bar .title-bar-controls',
    );
    const minBtn = controls.querySelector('[aria-label="Minimize"]');
    const closeBtn = controls.querySelector('[aria-label="Close"]');

    win.config.minimizable
      ? minBtn.addEventListener('click', (event) =>
          manager.minimize(win.config.id, event),
        )
      : (minBtn.style.display = 'none');

    if (win.config.closable) {
      closeBtn.addEventListener('click', (event) =>
        manager.close(win.config.id, event),
      );
    } else {
      closeBtn.style.display = 'none';
    }
  }

  document.addEventListener('keydown', (event) => {
    const active = manager.windows.find(
      (w) => w.state === 'open' && w.element.classList.contains('active'),
    );
    if (!active || !active.config.hotkeysWhenActive) return;
    const handler = active.config.hotkeysWhenActive[event.key];
    if (handler) {
      event.preventDefault();
      handler(manager);
    }
  });

  document
    .getElementById('pocketStart')
    .addEventListener('click', () => manager.unfocusAll());
  if (window.matchMedia('(max-width: 43.75rem)').matches) {
    manager.focus('aboutMe');
  }
  manager.render();
}

function initDesktopIcons(manager, container, background) {
  const interaction = { suppressClick: false };
  const openTimers = new Set();
  const icons = [];

  function openSelected() {
    for (const timer of openTimers) clearTimeout(timer);
    openTimers.clear();

    const selected = icons.filter((icon) =>
      icon.classList.contains('selected'),
    );
    selected.forEach((icon, index) => {
      const timer = setTimeout(() => {
        manager.show(icon.dataset.windowId);
        openTimers.delete(timer);
      }, index * 300);
      openTimers.add(timer);
    });
  }

  for (const win of manager.windows) {
    if (!win.config.icon) continue;

    const icon = document.createElement('div');
    icon.className = 'desktop-icon';
    icon.dataset.windowId = win.config.id;
    icon.tabIndex = 0;
    icon.setAttribute('role', 'button');
    icon.setAttribute('aria-label', win.config.label);
    icon.setAttribute('aria-pressed', 'false');

    const img = document.createElement('img');
    img.src = win.config.icon;
    img.alt = '';
    img.draggable = false;

    const label = document.createElement('span');
    label.textContent = win.config.label;
    icon.append(img, label);

    icon.addEventListener('pointerdown', (event) =>
      startDesktopIconDrag(event, icon, container, manager, interaction),
    );
    icon.addEventListener('keydown', (event) => {
      if (event.key === ' ') {
        event.preventDefault();
        deselectDesktopIcons(container, icon);
        setDesktopIconSelected(icon, true);
        openSelected();
      }
    });
    icon.addEventListener('click', (event) => {
      event.stopPropagation();
      if (interaction.suppressClick) return;

      if (event.ctrlKey || event.metaKey) {
        setDesktopIconSelected(icon, !icon.classList.contains('selected'));
      } else {
        deselectDesktopIcons(container, icon);
        setDesktopIconSelected(icon, true);
      }
    });
    icon.addEventListener('dblclick', (event) => {
      event.stopPropagation();
      setDesktopIconSelected(icon, false);
      manager.show(win.config.id);
    });

    container.appendChild(icon);
    icons.push(icon);
  }

  const compactMedia = window.matchMedia('(max-width: 43.75rem)');
  function layoutIcons() {
    const grid = getDesktopGrid(container);
    icons.forEach((icon, index) => {
      if (compactMedia.matches) {
        setDesktopIconPosition(
          icon,
          Math.floor(index / grid.maxColumns) + 1,
          (index % grid.maxColumns) + 1,
        );
      } else {
        setDesktopIconPosition(
          icon,
          (index % grid.maxRows) + 1,
          Math.floor(index / grid.maxRows) + 1,
        );
      }
    });
  }
  layoutIcons();
  compactMedia.addEventListener('change', layoutIcons);

  document.addEventListener('keydown', (event) => {
    if (
      event.key !== 'Enter' ||
      event.target.closest?.('.window, .taskbar, input, textarea, select')
    ) {
      return;
    }

    const focusedIcon = event.target.closest?.('.desktop-icon');
    if (!icons.some((icon) => icon.classList.contains('selected'))) {
      if (!focusedIcon) return;
      deselectDesktopIcons(container, focusedIcon);
      setDesktopIconSelected(focusedIcon, true);
    }

    event.preventDefault();
    openSelected();
  });

  background.addEventListener('click', () => {
    if (interaction.suppressClick) return;
    manager.unfocusAll();
    deselectDesktopIcons(container);
  });
  initDesktopMarquee(background, container, interaction);
}

function setDesktopIconSelected(icon, selected) {
  icon.classList.toggle('selected', selected);
  icon.setAttribute('aria-pressed', String(selected));
}

function deselectDesktopIcons(container, except) {
  for (const icon of container.querySelectorAll('.desktop-icon.selected')) {
    if (icon !== except) setDesktopIconSelected(icon, false);
  }
}

function getDesktopGrid(container) {
  const style = getComputedStyle(container);
  const rect = container.getBoundingClientRect();
  const compact = window.matchMedia('(max-width: 43.75rem)').matches;
  const compactColumns =
    Number(style.getPropertyValue('--desktop-columns')) || 3;
  const rowHeight = parseFloat(style.gridAutoRows) || 80;
  const columnWidth = compact
    ? (rect.width - (compactColumns - 1) * 4) / compactColumns
    : parseFloat(style.gridAutoColumns) || 88;
  const rowGap = parseFloat(style.rowGap) || 0;
  const columnGap = parseFloat(style.columnGap) || 0;
  const visibleRows = Math.max(
    1,
    Math.floor((container.clientHeight + rowGap) / (rowHeight + rowGap)),
  );

  return {
    rect,
    rowHeight,
    columnWidth,
    rowGap,
    columnGap,
    maxRows: compact
      ? Math.max(
          visibleRows,
          Math.ceil(
            container.querySelectorAll('.desktop-icon').length / compactColumns,
          ),
        )
      : visibleRows,
    maxColumns: compact
      ? compactColumns
      : Math.max(
          1,
          Math.floor(
            (window.innerWidth - rect.left + columnGap) /
              (columnWidth + columnGap),
          ),
        ),
  };
}

function setDesktopIconPosition(icon, row, column) {
  icon.dataset.row = String(row);
  icon.dataset.column = String(column);
  icon.style.gridRow = String(row);
  icon.style.gridColumn = String(column);
}

function getDesktopCell(clientX, clientY, grid) {
  return {
    row:
      Math.floor((clientY - grid.rect.top) / (grid.rowHeight + grid.rowGap)) +
      1,
    column:
      Math.floor(
        (clientX - grid.rect.left) / (grid.columnWidth + grid.columnGap),
      ) + 1,
  };
}

function suppressDesktopClick(interaction) {
  interaction.suppressClick = true;
  setTimeout(() => (interaction.suppressClick = false), 0);
}

function startDesktopIconDrag(event, icon, container, manager, interaction) {
  if (event.button !== 0) return;
  event.stopPropagation();
  icon.focus();

  if (!icon.classList.contains('selected')) {
    if (!event.ctrlKey && !event.metaKey) deselectDesktopIcons(container, icon);
    setDesktopIconSelected(icon, true);
  }

  const icons = [...container.querySelectorAll('.desktop-icon')];
  const draggedIcons = icons.filter((item) =>
    item.classList.contains('selected'),
  );
  const origins = new Map(
    draggedIcons.map((item) => [
      item,
      { row: Number(item.dataset.row), column: Number(item.dataset.column) },
    ]),
  );
  const grid = getDesktopGrid(container);
  const startCell = getDesktopCell(event.clientX, event.clientY, grid);
  const startX = event.clientX;
  const startY = event.clientY;
  let dragging = false;

  function onPointerMove(moveEvent) {
    const deltaX = moveEvent.clientX - startX;
    const deltaY = moveEvent.clientY - startY;
    if (!dragging && Math.hypot(deltaX, deltaY) < 5) return;
    if (!dragging) {
      dragging = true;
      for (const item of draggedIcons) item.classList.add('dragging');
    }

    moveEvent.preventDefault();
    for (const item of draggedIcons) {
      item.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
  }

  function onPointerEnd(endEvent) {
    icon.removeEventListener('pointermove', onPointerMove);
    icon.removeEventListener('pointerup', onPointerEnd);
    icon.removeEventListener('pointercancel', onPointerEnd);

    if (!dragging) {
      if (endEvent.type === 'pointerup' && endEvent.pointerType === 'touch') {
        manager.show(icon.dataset.windowId);
      }
      return;
    }

    suppressDesktopClick(interaction);
    const cell = getDesktopCell(endEvent.clientX, endEvent.clientY, grid);
    const rowDelta = cell.row - startCell.row;
    const columnDelta = cell.column - startCell.column;
    const moves = new Map(
      [...origins].map(([item, origin]) => [
        item,
        {
          row: origin.row + rowDelta,
          column: origin.column + columnDelta,
        },
      ]),
    );
    const occupied = new Set(
      icons
        .filter((item) => !origins.has(item))
        .map((item) => `${item.dataset.row}:${item.dataset.column}`),
    );
    const targets = new Set();
    let valid = endEvent.type === 'pointerup';

    for (const target of moves.values()) {
      const key = `${target.row}:${target.column}`;
      if (
        target.row < 1 ||
        target.row > grid.maxRows ||
        target.column < 1 ||
        target.column > grid.maxColumns ||
        occupied.has(key) ||
        targets.has(key)
      ) {
        valid = false;
        break;
      }
      targets.add(key);
    }

    if (valid) {
      for (const [item, target] of moves) {
        setDesktopIconPosition(item, target.row, target.column);
      }
    }
    for (const item of draggedIcons) {
      item.classList.remove('dragging');
      item.style.transform = '';
    }
  }

  icon.setPointerCapture(event.pointerId);
  icon.addEventListener('pointermove', onPointerMove);
  icon.addEventListener('pointerup', onPointerEnd);
  icon.addEventListener('pointercancel', onPointerEnd);
}

function initDesktopMarquee(background, container, interaction) {
  background.addEventListener('pointerdown', (event) => {
    if (
      event.button !== 0 ||
      event.target.closest('.desktop-icon, .window, .taskbar')
    ) {
      return;
    }

    event.preventDefault();
    const backgroundRect = background.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const additive = event.ctrlKey || event.metaKey;
    const icons = [...container.querySelectorAll('.desktop-icon')];
    const initialSelection = new Map(
      icons.map((icon) => [icon, icon.classList.contains('selected')]),
    );
    if (!additive) deselectDesktopIcons(container);

    const rectangle = document.createElement('div');
    rectangle.className = 'desktop-selection';
    rectangle.style.display = 'none';
    background.appendChild(rectangle);
    let moved = false;

    function onPointerMove(moveEvent) {
      if (
        !moved &&
        Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 5
      ) {
        return;
      }
      moved = true;
      const left = Math.min(startX, moveEvent.clientX);
      const top = Math.min(startY, moveEvent.clientY);
      const right = Math.max(startX, moveEvent.clientX);
      const bottom = Math.max(startY, moveEvent.clientY);

      Object.assign(rectangle.style, {
        display: 'block',
        left: `${left - backgroundRect.left}px`,
        top: `${top - backgroundRect.top}px`,
        width: `${right - left}px`,
        height: `${bottom - top}px`,
      });

      for (const icon of icons) {
        const rect = icon.getBoundingClientRect();
        const intersects =
          rect.left < right &&
          rect.right > left &&
          rect.top < bottom &&
          rect.bottom > top;
        setDesktopIconSelected(
          icon,
          intersects || (additive && initialSelection.get(icon)),
        );
      }
    }

    function onPointerEnd() {
      background.removeEventListener('pointermove', onPointerMove);
      background.removeEventListener('pointerup', onPointerEnd);
      background.removeEventListener('pointercancel', onPointerEnd);
      rectangle.remove();
      if (moved) suppressDesktopClick(interaction);
    }

    background.setPointerCapture(event.pointerId);
    background.addEventListener('pointermove', onPointerMove);
    background.addEventListener('pointerup', onPointerEnd);
    background.addEventListener('pointercancel', onPointerEnd);
  });
}

function createWindowManager(configs, taskbarContainer) {
  const windows = configs.map((config) => ({
    config,
    element: document.getElementById(config.id),
    state: config.visible ? 'open' : 'closed',
  }));

  for (const w of windows) setState(w, w.state);

  function setState(win, newState) {
    const previous = win.state;
    const wasActive = win.element.classList.contains('active');
    win.state = newState;
    if (newState !== previous) {
      SiteAnalytics.event(
        'window_' +
          (newState === 'open'
            ? previous === 'minimized'
              ? 'restore'
              : 'open'
            : newState === 'minimized'
              ? 'minimize'
              : 'close') +
          '_' +
          win.config.id,
      );
    }
    if (newState !== 'open' && wasActive) SiteAnalytics.focus(null);
    if (newState === 'open') {
      win.element.style.display = '';
      win.element.dispatchEvent(new Event('window:open'));
    } else {
      win.element.style.display = 'none';
      win.element.dispatchEvent(new Event('window:hide'));
      win.element.classList.remove('active');
    }
  }

  function get(id) {
    return windows.find((w) => w.config.id === id);
  }

  function focus(id, event) {
    event?.stopPropagation();
    const target = get(id);
    if (!target || target.state === 'closed') return;
    if (target.state === 'minimized') setState(target, 'open');
    SiteAnalytics.focus(id);
    for (const w of windows) {
      const isTarget = w === target;
      w.element.classList.toggle('active', isTarget);
    }
    render();
  }

  function show(id, event) {
    event?.stopPropagation();
    const w = get(id);
    if (!w) return;
    setState(w, 'open');
    focus(id);
  }

  function minimize(id, event) {
    event?.stopPropagation();
    const w = get(id);
    if (!w || w.state !== 'open') return;
    setState(w, 'minimized');
    render();
  }

  function close(id, event) {
    event?.stopPropagation();
    const w = get(id);
    if (!w || w.state === 'closed') return;
    setState(w, 'closed');
    render();
  }

  function unfocusAll() {
    SiteAnalytics.focus(null);
    for (const w of windows) {
      w.element.classList.remove('active');
    }
    render();
  }

  function render() {
    taskbarContainer.innerHTML = '';
    for (const win of windows) {
      if (win.state === 'closed') continue;
      const btn = document.createElement('button');
      btn.textContent = win.config.label;
      btn.dataset.windowId = win.config.id;
      const active = win.element.classList.contains('active');
      if (win.state === 'minimized') btn.classList.add('minimized');
      if (active) btn.classList.add('active');
      btn.addEventListener('click', (event) => {
        if (win.state === 'minimized') {
          show(win.config.id, event);
        } else if (win.element.classList.contains('active')) {
          minimize(win.config.id, event);
        } else {
          focus(win.config.id, event);
        }
      });
      taskbarContainer.appendChild(btn);
      if (active) {
        const containerRect = taskbarContainer.getBoundingClientRect();
        const buttonRect = btn.getBoundingClientRect();
        let offset = 0;
        if (buttonRect.left < containerRect.left) {
          offset = buttonRect.left - containerRect.left;
        } else if (buttonRect.right > containerRect.right) {
          offset = buttonRect.right - containerRect.right;
        }
        if (offset) {
          taskbarContainer.scrollBy({ left: offset, behavior: 'smooth' });
        }
      }
    }
  }

  return { windows, get, focus, show, minimize, close, unfocusAll, render };
}

function makeDraggable(element, onDragStart) {
  const titleBar = element.getElementsByClassName('title-bar')[0];

  titleBar.addEventListener('mousedown', (event) => {
    if (
      window.matchMedia('(max-width: 43.75rem)').matches ||
      event.target.closest('.title-bar-controls')
    )
      return;
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
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onMouseUp);
  });
}

function initTabs() {
  const tabLists = document.querySelectorAll('menu[role="tablist"]');

  for (const tabList of tabLists) {
    const buttons = [...tabList.querySelectorAll(':scope > button')];
    const section = tabList.parentElement;

    function selectTab(selectedButton, track = true) {
      const wasSelected =
        selectedButton.getAttribute('aria-selected') === 'true';

      for (const button of buttons) {
        const selected = button === selectedButton;
        const panelId = button.getAttribute('aria-controls');
        const panel = section.querySelector(`[role="tabpanel"]#${panelId}`);

        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
        panel.hidden = !selected;
      }

      if (track && !wasSelected) {
        SiteAnalytics.event(
          'tab_open_' + selectedButton.getAttribute('aria-controls'),
        );
      }
    }

    buttons.forEach((button, index) => {
      const panelId = button.getAttribute('aria-controls');
      const panel = section.querySelector(`[role="tabpanel"]#${panelId}`);
      button.id ||= `${panelId}Tab`;
      panel.setAttribute('aria-labelledby', button.id);
      button.tabIndex =
        button.getAttribute('aria-selected') === 'true' ? 0 : -1;

      button.addEventListener('click', () => selectTab(button));
      button.addEventListener('keydown', (event) => {
        let nextIndex;
        if (event.key === 'ArrowRight')
          nextIndex = (index + 1) % buttons.length;
        if (event.key === 'ArrowLeft')
          nextIndex = (index - 1 + buttons.length) % buttons.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = buttons.length - 1;
        if (nextIndex === undefined) return;

        event.preventDefault();
        buttons[nextIndex].focus();
        selectTab(buttons[nextIndex]);
      });
    });
  }
}

function initTime() {
  const time = document.getElementById('time');
  updateTime(time);

  setInterval(() => updateTime(time), 1000);
}

function updateTime(timeSpan) {
  const date = new Date();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');

  timeSpan.textContent = `${hours}:${minutes}`;
}
