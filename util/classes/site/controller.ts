import { ClockController } from './clock.ts';
import { ContentService } from './content.ts';
import { DesktopIconsController } from '../desktop/icons.ts';
import type { WindowConfig } from '../../interfaces/desktop.ts';
import { ExperienceService } from '../experience/service.ts';
import { ResumeMatcher } from '../resume/matcher.ts';
import { ResumePDF } from '../resume/pdf.ts';
import { ResumeController } from '../resume/controller.ts';
import { ResumeGenerator } from '../resume/generator.ts';
import { ResumeSource } from '../resume/source.ts';
import { ResumeView } from '../resume/view.ts';
import { SiteAnalyticsService } from './analytics.ts';
import { WindowManager } from '../desktop/window-manager.ts';
import { requiredElement } from '../../helpers/dom.ts';
import { TabsController } from './tabs.ts';

const WINDOW_CONFIGS: readonly WindowConfig[] = [
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
      F1: (manager) => manager.show('dancingCat'),
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

export class SiteController {
  private readonly analytics = new SiteAnalyticsService(location.hostname);
  private readonly source = new ResumeSource();
  private readonly content = new ContentService(this.source);
  private readonly experience = new ExperienceService(this.source);
  private readonly resume = new ResumeController(
    new ResumeGenerator(this.source, new ResumeMatcher(), new ResumePDF()),
    new ResumeView(),
    this.analytics,
  );

  init(): void {
    this.analytics.init();
    void this.content.init();
    this.resume.init();
    void this.initWindows();
    new TabsController(this.analytics);
    new ClockController();
  }

  private async initWindows(): Promise<void> {
    const background = requiredElement<HTMLElement>('background');
    const taskbarContainer = requiredElement<HTMLElement>('taskbarButtons');
    const desktopContainer = requiredElement<HTMLElement>('desktopIcons');
    const experienceConfigs = await this.experience.createWindows(background);
    const manager = new WindowManager(
      [...WINDOW_CONFIGS, ...experienceConfigs],
      taskbarContainer,
      this.analytics,
    );
    new DesktopIconsController(manager, desktopContainer, background).init();
    if (globalThis.matchMedia('(max-width: 43.75rem)').matches) {
      manager.focus('aboutMe');
    }
  }
}
