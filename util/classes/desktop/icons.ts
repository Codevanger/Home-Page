import type {
  DesktopCell,
  WindowManagerApi,
} from '../../interfaces/desktop.ts';
import { DesktopLayout } from './layout.ts';

export class DesktopIconsController {
  private suppressClicks = false;
  private readonly openTimers = new Set<number>();
  private readonly icons: HTMLDivElement[] = [];
  private readonly layout: DesktopLayout;

  constructor(
    private readonly manager: WindowManagerApi,
    private readonly container: HTMLElement,
    private readonly background: HTMLElement,
  ) {
    this.layout = new DesktopLayout(container);
  }

  init(): void {
    this.createIcons();
    this.layout.init(this.icons);
    document.addEventListener('keydown', (event) =>
      this.openWithKeyboard(event),
    );
    this.background.addEventListener('click', () => {
      if (this.suppressClicks) return;
      this.manager.unfocusAll();
      this.deselect();
    });
    this.background.addEventListener('pointerdown', (event) =>
      this.startMarquee(event),
    );
  }

  private createIcons(): void {
    for (const config of this.manager.configs) {
      if (!config.icon) continue;
      const icon = document.createElement('div');
      icon.className = 'desktop-icon';
      icon.dataset.windowId = config.id;
      icon.tabIndex = 0;
      icon.setAttribute('role', 'button');
      icon.setAttribute('aria-label', config.label);
      icon.setAttribute('aria-pressed', 'false');

      const image = document.createElement('img');
      image.src = config.icon;
      image.alt = '';
      image.draggable = false;
      const label = document.createElement('span');
      label.textContent = config.label;
      icon.append(image, label);

      icon.addEventListener('pointerdown', (event) =>
        this.startDrag(event, icon),
      );
      icon.addEventListener('keydown', (event) => {
        if (event.key === ' ') {
          event.preventDefault();
          this.deselect(icon);
          this.setSelected(icon, true);
          this.openSelected();
        }
      });
      icon.addEventListener('click', (event) => {
        event.stopPropagation();
        if (this.suppressClicks) return;
        if (event.ctrlKey || event.metaKey) {
          this.setSelected(icon, !icon.classList.contains('selected'));
        } else {
          this.deselect(icon);
          this.setSelected(icon, true);
        }
      });
      icon.addEventListener('dblclick', (event) => {
        event.stopPropagation();
        this.setSelected(icon, false);
        this.manager.show(config.id);
      });
      this.container.appendChild(icon);
      this.icons.push(icon);
    }
  }

  private openSelected(): void {
    for (const timer of this.openTimers) clearTimeout(timer);
    this.openTimers.clear();
    const selected = this.icons.filter((icon) =>
      icon.classList.contains('selected'),
    );
    selected.forEach((icon, index) => {
      const timer = setTimeout(() => {
        this.manager.show(icon.dataset.windowId);
        this.openTimers.delete(timer);
      }, index * 300);
      this.openTimers.add(timer);
    });
  }

  private openWithKeyboard(event: KeyboardEvent): void {
    if (!(event.target instanceof Element)) return;
    if (
      event.key !== 'Enter' ||
      event.target.closest('.window, .taskbar, input, textarea, select')
    ) {
      return;
    }
    const focusedIcon = event.target.closest<HTMLDivElement>('.desktop-icon');
    if (!this.icons.some((icon) => icon.classList.contains('selected'))) {
      if (!focusedIcon) return;
      this.deselect(focusedIcon);
      this.setSelected(focusedIcon, true);
    }
    event.preventDefault();
    this.openSelected();
  }

  private setSelected(icon: HTMLDivElement, selected: boolean): void {
    icon.classList.toggle('selected', selected);
    icon.setAttribute('aria-pressed', String(selected));
  }

  private deselect(except?: HTMLDivElement): void {
    const selected = this.container.querySelectorAll<HTMLDivElement>(
      '.desktop-icon.selected',
    );
    for (const icon of selected) {
      if (icon !== except) this.setSelected(icon, false);
    }
  }

  private suppressClick(): void {
    this.suppressClicks = true;
    setTimeout(() => (this.suppressClicks = false), 0);
  }

  private startMarquee(event: PointerEvent): void {
    if (
      event.button !== 0 ||
      !(event.target instanceof Element) ||
      event.target.closest('.desktop-icon, .window, .taskbar')
    ) {
      return;
    }
    event.preventDefault();
    const backgroundRect = this.background.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const additive = event.ctrlKey || event.metaKey;
    const icons = [
      ...this.container.querySelectorAll<HTMLDivElement>('.desktop-icon'),
    ];
    const initialSelection = new Map(
      icons.map((icon) => [icon, icon.classList.contains('selected')]),
    );
    if (!additive) this.deselect();

    const rectangle = document.createElement('div');
    rectangle.className = 'desktop-selection';
    rectangle.style.display = 'none';
    this.background.appendChild(rectangle);
    let moved = false;

    const onPointerMove = (moveEvent: PointerEvent): void => {
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
        this.setSelected(
          icon,
          intersects || (additive && (initialSelection.get(icon) ?? false)),
        );
      }
    };

    const onPointerEnd = (): void => {
      this.background.removeEventListener('pointermove', onPointerMove);
      this.background.removeEventListener('pointerup', onPointerEnd);
      this.background.removeEventListener('pointercancel', onPointerEnd);
      rectangle.remove();
      if (moved) this.suppressClick();
    };
    this.background.setPointerCapture(event.pointerId);
    this.background.addEventListener('pointermove', onPointerMove);
    this.background.addEventListener('pointerup', onPointerEnd);
    this.background.addEventListener('pointercancel', onPointerEnd);
  }

  private startDrag(event: PointerEvent, icon: HTMLDivElement): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    icon.focus();
    if (!icon.classList.contains('selected')) {
      if (!event.ctrlKey && !event.metaKey) this.deselect(icon);
      this.setSelected(icon, true);
    }

    const icons = [
      ...this.container.querySelectorAll<HTMLDivElement>('.desktop-icon'),
    ];
    const draggedIcons = icons.filter((item) =>
      item.classList.contains('selected'),
    );
    const origins = new Map<HTMLDivElement, DesktopCell>(
      draggedIcons.map((item) => [
        item,
        {
          row: Number(item.dataset.row),
          column: Number(item.dataset.column),
        },
      ]),
    );
    const grid = this.layout.grid;
    const startCell = this.layout.cell(event.clientX, event.clientY, grid);
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;

    const onPointerMove = (moveEvent: PointerEvent): void => {
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
    };

    const onPointerEnd = (endEvent: PointerEvent): void => {
      icon.removeEventListener('pointermove', onPointerMove);
      icon.removeEventListener('pointerup', onPointerEnd);
      icon.removeEventListener('pointercancel', onPointerEnd);
      if (!dragging) {
        if (endEvent.type === 'pointerup' && endEvent.pointerType === 'touch') {
          this.manager.show(icon.dataset.windowId);
        }
        return;
      }

      this.suppressClick();
      const cell = this.layout.cell(endEvent.clientX, endEvent.clientY, grid);
      const rowDelta = cell.row - startCell.row;
      const columnDelta = cell.column - startCell.column;
      const moves = new Map<HTMLDivElement, DesktopCell>(
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
      const targets = new Set<string>();
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
          this.layout.setPosition(item, target.row, target.column);
        }
      }
      for (const item of draggedIcons) {
        item.classList.remove('dragging');
        item.style.transform = '';
      }
    };

    icon.setPointerCapture(event.pointerId);
    icon.addEventListener('pointermove', onPointerMove);
    icon.addEventListener('pointerup', onPointerEnd);
    icon.addEventListener('pointercancel', onPointerEnd);
  }
}
