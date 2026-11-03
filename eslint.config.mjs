import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'vendor/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.browser,
        DOMPurify: 'readonly',
        ResumeData: 'readonly',
        ResumeMatcher: 'readonly',
        ResumePDF: 'readonly',
        ResumeSource: 'readonly',
        ResumeThemeData: 'readonly',
        SiteAnalytics: 'readonly',
      },
    },
  },
  {
    files: [
      'content.js',
      'content/**/*.js',
      'experience.js',
      'experience/**/*.js',
    ],
    languageOptions: {
      sourceType: 'module',
    },
  },
  {
    files: ['resume.js', 'resume-*.js', 'resume/**/*.js'],
    languageOptions: {
      sourceType: 'module',
    },
  },
  {
    files: ['resume-data.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
      },
    },
  },
];
