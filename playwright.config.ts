// location: /playwright.config.ts
import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import fg from 'fast-glob';
import path from 'path';
import { stepsForProject } from './keyword_driven/generic/support/buildSteps';

const projectNames = fg.sync('keyword_driven/projects/*', { onlyDirectories: true })
  .map((dir) => path.basename(dir));

const bddConfigs = Object.fromEntries(
  projectNames.map((name) => [
    name,
    defineBddConfig({
      outputDir: `.features-gen/${name}`,
      features: `keyword_driven/projects/${name}/features/**/*.feature`,
      steps: stepsForProject(name),
      importTestFrom: 'keyword_driven/generic/support/vars.ts',
    }),
  ]),
);

const defaultBdd = defineBddConfig({
  outputDir: '.features-gen/default',
  features: 'keyword_driven/projects/default/features/**/*.feature',
  steps: stepsForProject('default'),
  importTestFrom: 'keyword_driven/generic/support/vars.ts',
});

const REPORT_DIR = process.env.REPORT_DIR ?? 'playwright-report/adhoc';
const REPORT_OPEN = process.env.REPORT_OPEN ?? 'never';

const reporters: any[] =
  REPORT_OPEN === 'none'
    ? [['list']]
    : [
        ['list'],
        ['html', { outputFolder: REPORT_DIR, open: REPORT_OPEN === 'none' ? 'never' : REPORT_OPEN }],
      ];

export default defineConfig({
  reporter: reporters,
  projects: [
    { name: 'spec-chromium', testDir: 'tests', use: { browserName: 'chromium' } },
    { name: 'spec-firefox', testDir: 'tests', use: { browserName: 'firefox' } },
    { name: 'feature-default', testDir: defaultBdd, use: { browserName: 'chromium' } },
    ...projectNames.map((name) => ({
      name: `feature-${name}`,
      testDir: bddConfigs[name],
      use: { browserName: 'chromium' as const },
    })),
  ],
});