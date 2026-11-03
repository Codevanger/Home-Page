import { ResumeController } from './resume/controller.js';
import { ResumeDataAdapter } from './resume/data.js';
import { resumeMatcher } from './resume/matcher.js';
import { resumePDF } from './resume/pdf.js';
import { resumeSource } from './resume/source.js';

window.ResumeData = ResumeDataAdapter;
window.ResumeSource = resumeSource;
window.ResumeMatcher = resumeMatcher;
window.ResumePDF = resumePDF;
window.initResume = () => new ResumeController().init();
