import { requiredElement } from '../../helpers/dom.ts';

export class ClockController {
  private readonly time = requiredElement<HTMLElement>('time');

  constructor() {
    this.update();
    setInterval(() => this.update(), 1000);
  }

  private update(): void {
    const date = new Date();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    this.time.textContent = `${hours}:${minutes}`;
  }
}
