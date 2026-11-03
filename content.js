import { ContentService } from './content/service.js';

window.initContent = () => new ContentService().init();
