# Contributing

Thanks for your interest in improving **yaml-dot-resolve**.

## Getting started

1. Clone the repository and open the package root (where this `package.json` lives).
2. Install dependencies:

   ```bash
   npm install
   ```

3. Run tests:

   ```bash
   npm test
   ```

4. Build to verify TypeScript compiles:

   ```bash
   npm run build
   ```

## Pull requests

- Prefer small, focused changes with a clear description of behavior and motivation.
- Add or update tests for any new behavior or bug fix.
- Ensure `npm test` and `npm run build` pass before submitting.
- For user-visible changes, add a short note under `[Unreleased]` in [CHANGELOG.md](CHANGELOG.md) (maintainers fold these into the next version at release time).

## Releases

- Tag versions with `vMAJOR.MINOR.PATCH` and publish to npm per [`.github/workflows/publish-npm.yml`](.github/workflows/publish-npm.yml) (or your usual release process).
- Move `[Unreleased]` items into a dated section when cutting a release, and link the compare URLs at the bottom of the changelog like existing entries.

## Repository topics (GitHub)

Topics are set in the GitHub UI under **Settings → General → Topics**. Suggested labels for discovery: `yaml`, `nodejs`, `typescript`, `config`, `placeholder`, `interpolation`, `jsonpath`, `serverless`, `npm-package`.

## Code style

Match existing patterns in the codebase (formatting, naming, and module structure). Avoid unrelated refactors in the same change as feature or fix work.

## License

By contributing, you agree that your contributions will be licensed under the same terms as the project ([MIT License](LICENSE)).
