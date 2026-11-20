import { SiteController } from './util/classes/site/controller.ts';

document.addEventListener(
  'DOMContentLoaded',
  () => new SiteController().init(),
  { once: true },
);
