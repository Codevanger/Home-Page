import { requiredElement } from '../../helpers/dom.ts';
import type {
  ManagedWindow,
  WindowConfig,
  WindowManagerApi,
  WindowState,
} from '../../interfaces/desktop.ts';
import type { SiteAnalyticsService } from '../site/analytics.ts';

export class WindowManager implements WindowManagerApi {
  readonly configs: readonly Readonly<WindowConfig>[];
  private readonly windows: readonly ManagedWindow[];

  constructor(
    configs: readonly WindowConfig[],
    private readonly taskbarContainer: HTMLElement,
    private readonly analytics: SiteAnalyticsService,
  ) {
    this.configs = [...configs];
    this.windows = this.configs.map((config) => ({
      config,
      element: requiredElement<HTMLElement>(config.id),
      state: config.visible ? 'open' : 'closed',
    }));
    for (const win of this.windows) {
      this.setState(win, win.state);
      this.attachInteractions(win);
    }
    this.attachHotkeys();
    document
      .getElementById('pocketStart')
      ?.addEventListener('click', () => this.unfocusAll());
    this.render();
  }

  focus(id: string, event?: Event): void {
    event?.stopPropagation();
    const target = this.get(id);
    if (!target || target.state === 'closed') return;
    if (target.state === 'minimized') this.setState(target, 'open');
    this.analytics.focus(id);
    for (const win of this.windows) {
      win.element.classList.toggle('active', win === target);
    }
    this.render();
  }

  show(id: string | undefined, event?: Event): void {
    event?.stopPropagation();
    if (!id) return;
    const win = this.get(id);
    if (!win) return;
    this.setState(win, 'open');
    this.focus(id);
  }

  unfocusAll(): void {
    this.analytics.focus(null);
    for (const win of this.windows) win.element.classList.remove('active');
    this.render();
  }

  private get(id: string): ManagedWindow | undefined {
    return this.windows.find((win) => win.config.id === id);
  }

  private minimize(id: string, event?: Event): void {
    event?.stopPropagation();
    const win = this.get(id);
    if (!win || win.state !== 'open') return;
    this.setState(win, 'minimized');
    this.render();
  }

  private close(id: string, event?: Event): void {
    event?.stopPropagation();
    const win = this.get(id);
    if (!win || win.state === 'closed') return;
    this.setState(win, 'closed');
    this.render();
  }

  private render(): void {
    this.taskbarContainer.innerHTML = '';
    for (const win of this.windows) {
      if (win.state === 'closed') continue;
      const button = document.createElement('button');
      button.textContent = win.config.label;
      button.dataset.windowId = win.config.id;
      const active = win.element.classList.contains('active');
      if (win.state === 'minimized') button.classList.add('minimized');
      if (active) button.classList.add('active');
      button.addEventListener('click', (event) => {
        if (win.state === 'minimized') {
          this.show(win.config.id, event);
        } else if (active) {
          this.minimize(win.config.id, event);
        } else {
          this.focus(win.config.id, event);
        }
      });
      this.taskbarContainer.appendChild(button);
      if (active) this.scrollTaskbarButton(button);
    }
  }

  private setState(win: ManagedWindow, newState: WindowState): void {
    const previous = win.state;
    const wasActive = win.element.classList.contains('active');
    win.state = newState;
    if (newState !== previous) {
      const action =
        newState === 'open'
          ? previous === 'minimized'
            ? 'restore'
            : 'open'
          : newState === 'minimized'
            ? 'minimize'
            : 'close';
      this.analytics.event(`window_${action}_${win.config.id}`);
    }
    if (newState !== 'open' && wasActive) this.analytics.focus(null);
    if (newState === 'open') {
      win.element.style.display = '';
      win.element.dispatchEvent(new Event('window:open'));
    } else {
      win.element.style.display = 'none';
      win.element.dispatchEvent(new Event('window:hide'));
      win.element.classList.remove('active');
    }
  }

  private attachInteractions(win: ManagedWindow): void {
    win.element.addEventListener('click', (event) =>
      this.focus(win.config.id, event),
    );
    const controls = win.element.querySelector<HTMLElement>(
      '.title-bar .title-bar-controls',
    );
    const minButton = controls?.querySelector<HTMLButtonElement>(
      '[aria-label="Minimize"]',
    );
    const closeButton = controls?.querySelector<HTMLButtonElement>(
      '[aria-label="Close"]',
    );
    if (minButton) {
      if (win.config.minimizable) {
        minButton.addEventListener('click', (event) =>
          this.minimize(win.config.id, event),
        );
      } else {
        minButton.style.display = 'none';
      }
    }
    if (closeButton) {
      if (win.config.closable) {
        closeButton.addEventListener('click', (event) =>
          this.close(win.config.id, event),
        );
      } else {
        closeButton.style.display = 'none';
      }
    }
    this.attachDrag(win);
  }

  private attachHotkeys(): void {
    document.addEventListener('keydown', (event) => {
      const active = this.windows.find(
        (win) =>
          win.state === 'open' && win.element.classList.contains('active'),
      );
      if (!active?.config.hotkeysWhenActive) return;
      const handler = active.config.hotkeysWhenActive[event.key];
      if (handler) {
        event.preventDefault();
        handler(this);
      }
    });
  }

  private attachDrag(win: ManagedWindow): void {
    const element = win.element;
    const titleBar = element.getElementsByClassName('title-bar')[0];
    if (!(titleBar instanceof HTMLElement)) return;

    titleBar.addEventListener('mousedown', (event) => {
      if (
        globalThis.matchMedia('(max-width: 43.75rem)').matches ||
        (event.target instanceof Element &&
          event.target.closest('.title-bar-controls'))
      ) {
        return;
      }
      event.stopPropagation();
      this.focus(win.config.id);

      let lastX = event.clientX;
      let lastY = event.clientY;
      const onMouseMove = (moveEvent: MouseEvent): void => {
        const deltaX = moveEvent.clientX - lastX;
        const deltaY = moveEvent.clientY - lastY;
        element.style.left = `${element.offsetLeft + deltaX}px`;
        element.style.top = `${element.offsetTop + deltaY}px`;
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
      };
      const onMouseUp = (): void => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mouseleave', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('mouseleave', onMouseUp);
    });
  }

  private scrollTaskbarButton(button: HTMLButtonElement): void {
    const containerRect = this.taskbarContainer.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    let offset = 0;
    if (buttonRect.left < containerRect.left) {
      offset = buttonRect.left - containerRect.left;
    } else if (buttonRect.right > containerRect.right) {
      offset = buttonRect.right - containerRect.right;
    }
    if (offset) {
      this.taskbarContainer.scrollBy({ left: offset, behavior: 'smooth' });
    }
  }
}
