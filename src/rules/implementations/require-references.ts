import { LibraryRule, LibraryRuleViolation, LibraryRuleContext } from '../types';
import { RequireReferencesOptions } from '../../config/types';
import { ALEXANDRIA_DIRS } from '../../constants/paths';
import { matchesPatterns } from '../utils/patterns';

export const requireReferences: LibraryRule = {
  id: 'require-references',
  name: 'Require References',
  severity: 'error',
  category: 'critical',
  description: 'Every markdown file must be used as an overview in at least one CodebaseView',
  impact: 'AI agents lack structured context for understanding this documentation',
  fixable: false,
  enabled: true,

  async check(context: LibraryRuleContext): Promise<LibraryRuleViolation[]> {
    const violations: LibraryRuleViolation[] = [];
    const { markdownFiles, views, config, globAdapter } = context;

    // Get options from config
    const ruleConfig = config?.context?.rules?.find((r) => r.id === 'require-references');
    const configOptions = ruleConfig?.options as RequireReferencesOptions | undefined;

    // Build a set of all markdown files that are associated with views (as overviews only)
    const associatedFiles = new Set<string>();

    // Check files used as view overviews
    for (const view of views) {
      // Check overview path
      if (
        'overviewPath' in view &&
        typeof view.overviewPath === 'string' &&
        view.overviewPath.endsWith('.md')
      ) {
        associatedFiles.add(view.overviewPath);
      }
    }

    const globalExcludePatterns = config?.context?.patterns?.exclude ?? [];

    // Find markdown files that are not associated
    for (const mdFile of markdownFiles) {
      const relativePath = mdFile.relativePath;

      // Skip alexandria's own files
      if (relativePath.startsWith(`${ALEXANDRIA_DIRS.PRIMARY}/`)) {
        continue;
      }

      if (matchesPatterns(globAdapter, globalExcludePatterns, relativePath)) {
        continue;
      }

      // Skip files explicitly excluded in config
      if (matchesPatterns(globAdapter, configOptions?.excludeFiles, relativePath)) {
        continue;
      }

      if (!associatedFiles.has(relativePath)) {
        violations.push({
          ruleId: this.id,
          severity: this.severity,
          file: relativePath,
          message: `Markdown file "${relativePath}" is not used as an overview in any CodebaseView`,
          impact: this.impact,
          fixable: this.fixable,
        });
      }
    }

    return violations;
  },
};
