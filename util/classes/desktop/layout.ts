import type { DesktopCell, DesktopGrid } from '../../interfaces/desktop.ts';

export class DesktopLayout {
  private readonly compactMedia = globalThis.matchMedia(
    '(max-width: 43.75rem)',
  );
  private icons: readonly HTMLDivElement[] = [];

  constructor(private readonly container: HTMLElement) {}

  init(icons: readonly HTMLDivElement[]): void {
    this.icons = [...icons];
    this.layout();
    this.compactMedia.addEventListener('change', () => this.layout());
  }

  get grid(): DesktopGrid {
    const style = getComputedStyle(this.container);
    const rect = this.container.getBoundingClientRect();
    const compact = this.compactMedia.matches;
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
      Math.floor((this.container.clientHeight + rowGap) / (rowHeight + rowGap)),
    );
    return {
      rect,
      rowHeight,
      columnWidth,
      rowGap,
      columnGap,
      maxRows: compact
        ? Math.max(visibleRows, Math.ceil(this.icons.length / compactColumns))
        : visibleRows,
      maxColumns: compact
        ? compactColumns
        : Math.max(
            1,
            Math.floor(
              (globalThis.innerWidth - rect.left + columnGap) /
                (columnWidth + columnGap),
            ),
          ),
    };
  }

  cell(clientX: number, clientY: number, grid: DesktopGrid): DesktopCell {
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

  setPosition(icon: HTMLDivElement, row: number, column: number): void {
    icon.dataset.row = String(row);
    icon.dataset.column = String(column);
    icon.style.gridRow = String(row);
    icon.style.gridColumn = String(column);
  }

  private layout(): void {
    const grid = this.grid;
    this.icons.forEach((icon, index) => {
      if (this.compactMedia.matches) {
        this.setPosition(
          icon,
          Math.floor(index / grid.maxColumns) + 1,
          (index % grid.maxColumns) + 1,
        );
      } else {
        this.setPosition(
          icon,
          (index % grid.maxRows) + 1,
          Math.floor(index / grid.maxRows) + 1,
        );
      }
    });
  }
}
