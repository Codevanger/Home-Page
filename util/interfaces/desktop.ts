export type WindowState = 'open' | 'minimized' | 'closed';

export interface WindowManagerApi {
  readonly configs: readonly Readonly<WindowConfig>[];
  focus(id: string, event?: Event): void;
  show(id: string | undefined, event?: Event): void;
  unfocusAll(): void;
}

export interface WindowConfig {
  id: string;
  label: string;
  icon?: string;
  closable: boolean;
  minimizable: boolean;
  visible: boolean;
  hotkeysWhenActive?: Record<string, (manager: WindowManagerApi) => void>;
}

export interface ManagedWindow {
  readonly config: Readonly<WindowConfig>;
  readonly element: HTMLElement;
  state: WindowState;
}

export interface DesktopGrid {
  rect: DOMRect;
  rowHeight: number;
  columnWidth: number;
  rowGap: number;
  columnGap: number;
  maxRows: number;
  maxColumns: number;
}

export interface DesktopCell {
  row: number;
  column: number;
}
