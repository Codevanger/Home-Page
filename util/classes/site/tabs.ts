import type { SiteAnalyticsService } from './analytics.ts';

export class TabsController {
  constructor(private readonly analytics: SiteAnalyticsService) {
    const tabLists = document.querySelectorAll<HTMLElement>(
      'menu[role="tablist"]',
    );
    for (const tabList of tabLists) this.initTabList(tabList);
  }

  private initTabList(tabList: HTMLElement): void {
    const buttons = [
      ...tabList.querySelectorAll<HTMLButtonElement>(':scope > button'),
    ];
    const section = tabList.parentElement;
    if (!section) return;

    const selectTab = (
      selectedButton: HTMLButtonElement,
      track = true,
    ): void => {
      const wasSelected =
        selectedButton.getAttribute('aria-selected') === 'true';
      for (const button of buttons) {
        const selected = button === selectedButton;
        const panel = this.panel(section, button);
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
        if (panel) panel.hidden = !selected;
      }
      if (track && !wasSelected) {
        this.analytics.event(
          `tab_open_${selectedButton.getAttribute('aria-controls')}`,
        );
      }
    };

    buttons.forEach((button, index) => {
      const panel = this.panel(section, button);
      const panelId = button.getAttribute('aria-controls');
      button.id ||= `${panelId}Tab`;
      if (panel) panel.setAttribute('aria-labelledby', button.id);
      button.tabIndex =
        button.getAttribute('aria-selected') === 'true' ? 0 : -1;
      button.addEventListener('click', () => selectTab(button));
      button.addEventListener('keydown', (event) => {
        let nextIndex: number | undefined;
        if (event.key === 'ArrowRight')
          nextIndex = (index + 1) % buttons.length;
        if (event.key === 'ArrowLeft') {
          nextIndex = (index - 1 + buttons.length) % buttons.length;
        }
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = buttons.length - 1;
        if (nextIndex === undefined) return;
        event.preventDefault();
        buttons[nextIndex]?.focus();
        const nextButton = buttons[nextIndex];
        if (nextButton) selectTab(nextButton);
      });
    });
  }

  private panel(
    section: HTMLElement,
    button: HTMLButtonElement,
  ): HTMLElement | null {
    const panelId = button.getAttribute('aria-controls');
    return section.querySelector<HTMLElement>(`[role="tabpanel"]#${panelId}`);
  }
}
