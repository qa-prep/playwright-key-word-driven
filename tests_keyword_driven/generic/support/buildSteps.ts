// location: tests_keyword_driven/generic/support/buildSteps.ts
import fg from 'fast-glob';
import path from 'path';

/**
 * Builds the step file list for a given project.
 *
 * Override rule: if a project defines a step file with the same basename as
 * a generic one (e.g. interaction.steps.ts in both generic/ and
 * projects/<name>/steps/), the project's version wins and the generic one
 * is left out automatically — no manual exclude list required.
 */
export function stepsForProject(projectName: string) {
  const genericFiles = fg.sync('tests_keyword_driven/generic/steps/**/*.ts');
  const projectFiles = fg.sync(`tests_keyword_driven/projects/${projectName}/steps/**/*.ts`);

  const projectBasenames = new Set(projectFiles.map((f) => path.basename(f)));
  const filteredGeneric = genericFiles.filter((f) => !projectBasenames.has(path.basename(f)));

  return [
    ...filteredGeneric,
    ...projectFiles,
    'tests_keyword_driven/generic/support/**/*.ts',
  ];
}