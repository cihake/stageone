// Conventional Commits. Examples that pass:
//   feat(server): add /api/auth/register
//   fix(client): correct focus-ring color on dark header
//   chore(repo): bump dev deps
//
// Examples that fail:
//   "stuff"
//   "WIP"
//   "fixed bug"
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
    'scope-enum': [2, 'always', ['repo', 'server', 'client', 'docs', 'ci', 'deps', 'release']],
  },
};
