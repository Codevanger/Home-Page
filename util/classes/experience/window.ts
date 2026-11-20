import type { WindowConfig } from '../../interfaces/desktop.ts';
import type { ExperienceItem } from '../../interfaces/experience.ts';

export class ExperienceWindow {
  private readonly id: string;
  private previousTip = -1;

  constructor(
    private readonly job: ExperienceItem,
    private readonly index: number,
    private readonly background: HTMLElement,
  ) {
    this.id = `experience-${job.id}`;
  }

  create(): WindowConfig {
    const win = this.createElement('section', 'window experience-window');
    win.id = this.id;
    win.style.display = 'none';
    win.style.setProperty('--experience-left', `${16 + this.index * 4}%`);
    win.style.setProperty('--experience-top', `${6 + this.index * 3}%`);
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-labelledby', `${this.id}-title`);
    win.append(
      this.createTitleBar(),
      this.createBody(),
      this.createStatusBar(win),
    );
    this.background.insertBefore(
      win,
      this.background.querySelector('.taskbar'),
    );

    return {
      id: this.id,
      label: this.job.company,
      icon: this.job.icon,
      closable: true,
      minimizable: true,
      visible: false,
    };
  }

  private createTitleBar(): HTMLDivElement {
    const titleBar = this.createElement('div', 'title-bar');
    const title = this.createElement('div', 'title-bar-text', this.job.company);
    title.id = `${this.id}-title`;
    const controls = this.createElement('div', 'title-bar-controls');
    for (const label of ['Minimize', 'Close']) {
      const button = document.createElement('button');
      button.setAttribute('aria-label', label);
      controls.appendChild(button);
    }
    titleBar.append(title, controls);
    return titleBar;
  }

  private createBody(): HTMLDivElement {
    const body = this.createElement('div', 'window-body');
    const groups: HTMLElement[] = [
      this.createGroupBox(
        'Experience',
        this.createElement('h3', '', this.job.position),
        this.createElement('p', 'experience-period', this.job.period),
        this.createElement('p', '', this.job.summary),
      ),
    ];
    if (this.job.highlights.length) {
      groups.push(
        this.createGroupBox(
          'Key results',
          this.createList('ul', 'experience-highlights', this.job.highlights),
        ),
      );
    }
    if (this.job.technologies.length) {
      groups.push(
        this.createGroupBox(
          'Technologies',
          this.createList(
            'ul',
            'experience-technologies',
            this.job.technologies,
          ),
        ),
      );
    }
    if (this.job.projectUrl) {
      const link = this.createElement('a', '', this.job.projectUrl);
      link.href = this.job.projectUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      groups.push(this.createGroupBox('Project link', link));
    }
    body.append(...groups);
    return body;
  }

  private createStatusBar(win: HTMLElement): HTMLDivElement {
    const statusBar = this.createElement('div', 'status-bar');
    const footer = this.createElement(
      'p',
      'status-bar-field',
      this.job.tips[0],
    );
    footer.setAttribute('role', 'status');
    statusBar.appendChild(footer);
    win.addEventListener('window:open', () => {
      let index: number;
      do {
        index = Math.floor(Math.random() * this.job.tips.length);
      } while (this.job.tips.length > 1 && index === this.previousTip);
      footer.textContent = this.job.tips[index] ?? '';
      this.previousTip = index;
    });
    return statusBar;
  }

  private createGroupBox(
    label: string,
    ...children: HTMLElement[]
  ): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    const row = this.createElement('div', 'field-row-stacked');
    row.append(...children);
    fieldset.append(this.createElement('legend', '', label), row);
    return fieldset;
  }

  private createList(
    tag: 'ul' | 'ol',
    className: string,
    items: readonly string[],
  ): HTMLOListElement | HTMLUListElement {
    const list = this.createElement(tag, className);
    for (const item of items) {
      list.appendChild(this.createElement('li', '', item));
    }
    return list;
  }

  private createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    text?: string,
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
}
