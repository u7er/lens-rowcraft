# Releasing

Published npm package: `@u7er/lens-rowcraft@0.3.2` (2026-11-15). Future releases require a new version.

Publish the public npm package as `@u7er/lens-rowcraft`, owned by the `u7er` npm organization. Sign in as `iamu7er`, with publishing permission in that organization. `publishConfig.access` defaults to `public`; organization publishing still requires npm's account authentication and 2FA requirements. GitHub repository ownership is configured separately.

The existing `v0.3.2` tag predates this scope change and the supplied Lens baseline. For automated publication, use a new version and tag containing these changes; do not run the old tag's publishing workflow expecting the updated package.

## Dependency baseline verification (2026-11-15)

The maintainer supplied the contents of Lens's generated `extension-dependency-versions.json` from another machine. They are saved in `.github/lens-extension-dependency-versions.json`, which the existing CI and Release workflows already use. The exact originating Lens application version has not been confirmed.

The publishing compatibility guard and production build both pass against this baseline: every declared dependency range includes the version Lens serves. This verifies dependency ranges; live Lens installation, workload behavior and persistence testing remain outstanding.

For local PowerShell commands, set the baseline in the same terminal before building or publishing:

```powershell
$env:LENS_EXTENSION_DEPENDENCY_VERSIONS_FILE = (Resolve-Path '.github/lens-extension-dependency-versions.json').Path
npm.cmd run prepublishOnly
```

This uses Lens's supplied baseline without requiring a local Lens installation or Kubernetes cluster. The environment variable applies to subsequent commands in that terminal, including `npm.cmd publish --access public`.

## GitHub automation

- **CI** runs on pushes to main, pull requests, manual runs and reusable workflow calls. It runs tests, browser checks, builds and package validation, then uploads an installable archive. It never creates tags or GitHub releases and never publishes to npm.
- **Release** runs when you explicitly push a tag matching `v*`. The tag must exactly match `v` plus the package version. It repeats CI, requires the supplied Lens baseline, runs the publishing compatibility guard, and stages the package on npm through OIDC. Ordinary commits to main cannot trigger npm staging.
- **Release** can also be run manually for verification only. Manual runs never stage a package or create a GitHub release, even when a tag is selected.
- Stable releases stage with npm's `latest` tag; prereleases stage with `next`. The workflow creates a **draft** GitHub release with the archive after npm staging succeeds. Publish that draft after approving the npm version.
- The workflow uses npm 11.15.0 for staged publishing. The trusted publisher grants only `npm stage publish`; approval requires an interactive maintainer session and 2FA. No npm token secret is needed.

### One-time release setup

1. Keep the actual generated Lens baseline in `.github/lens-extension-dependency-versions.json`. Refresh it when changing supported Lens versions; record live Lens testing separately.
2. In the npm package's **Settings > Trusted Publisher**, configure GitHub owner **u7er**, repository **lens-rowcraft**, workflow filename **release.yml**, and allow **npm stage publish**. Leave the environment name blank; this workflow does not use a GitHub environment.
3. Enable GitHub Actions. Run **Actions > Release > Run workflow** to verify without publishing. A dry run cannot certify OIDC authentication; only an actual tag-triggered staging operation exercises it.
4. The screenshot's **Pending validation** is npm's trusted-publisher configuration status, separate from Lens audit status. A new connection must complete its first successful publish within two days. If it expires, recreate the connection before the next release. Check npm's returned state after the first staging run; do not assume a manual account publish validated the OIDC connection.

### Release a new version

With a clean working tree after the release setup changes have been committed and pushed, use PowerShell:

```powershell
npm.cmd version patch
$releaseTag = "v$(node -p "require('./package.json').version")"
git push origin main
git push origin $releaseTag
```

Push only the intended release tag, for example `git push origin v0.3.3`, rather than all local tags. `npm version patch` updates package.json and package-lock.json, commits them and creates the version tag locally. Review the version and changelog before pushing. For a specific version, use `npm.cmd version 0.3.3` (or an unused prerelease version). Never reuse or move the existing `v0.3.2` tag or overwrite published 0.3.2.

After the tag workflow succeeds, sign in as `iamu7er` and inspect the staged release:

```powershell
npx.cmd --yes npm@11.15.0 stage list @u7er/lens-rowcraft --json
npx.cmd --yes npm@11.15.0 stage view STAGE_ID
npx.cmd --yes npm@11.15.0 stage approve STAGE_ID
```

Replace `STAGE_ID` with the ID returned by the list command and complete the 2FA prompt. If the workflow staged successfully but a later step failed, inspect the existing stage before rerunning; the same version cannot be staged twice. After approval, verify the exact version with `npm.cmd view @u7er/lens-rowcraft@0.3.3 version`, then publish the corresponding draft GitHub release.

References: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers), [npm staged publishing](https://docs.npmjs.com/cli/v11/commands/npm-stage). The workflow retains Lens's publishing compatibility guard.

## Local verification (2026-11-14)

- Clean dependency installation completed with Node 24.20.0 on Windows.
- All 18 automated tests passed, including regressions for extreme widths, temporarily unavailable columns and stale styling on unsupported rows.
- Headless Chrome geometry checks passed at 1800, 900 and 560 pixels.
- Type checks and production build passed.
- Standalone editor screenshot generated and visually inspected.
- npm archive inspected: compiled entrypoint, package metadata, icon, banner, screenshot, README, development guide, changelog, LICENSE and NOTICE included. Source, tests and node_modules excluded.
- Public npm lookup returned 404 for `lens-rowcraft`; the name appears unpublished, but this does not reserve or guarantee the name.
- Public GitHub API lookup returned 404 for `u7er/lens-rowcraft`. Confirm whether the repository is private or missing before publishing links to it.
- Lens is not available on this machine. Host dependency compatibility, installation of the archive, persistence across Lens restarts and actual Marketplace rendering have not been verified. The publishing guard correctly fails without Lens's generated dependency-version file.
- npm audit reports 19 transitive findings (3 low, 16 moderate), including Jest dependencies brought in through Lens components. A routine `npm audit fix` did not clear the report. No forced upgrades or compatibility overrides were retained. Review this dependency report on the publishing machine; do not describe the package as audit-clean.

## Before publication

1. Make the linked GitHub repository public, or update the repository, homepage and issue URLs to the intended public location. Push the prepared files after reviewing them.
2. Use Lens Plus, Pro, Enterprise or an active trial. Launch the intended Lens version so it generates its extension dependency-version file.
3. Run `npm ci`, `npm run check`, and `npm run prepublishOnly` on that machine. On Windows use `npm.cmd`. Resolve dependency-range mismatches against the actual Lens installation, then rebuild and repeat the checks.
4. Run `npm pack`, and install the resulting `u7er-lens-rowcraft-0.3.2.tgz` using Lens's extension installer if it accepts archives. Otherwise extract it and use Install from File System to select the extracted `package/package.json`. Keep that folder in place.
5. Verify the following in live Lens and record OS and exact Lens version:
   - Pods, Deployments, DaemonSets, StatefulSets, ReplicaSets, ReplicationControllers, Jobs and CronJobs.
   - Large-list scrolling to the end; sort, filter, namespaces, visible columns, row selection, detail links, actions and tab changes.
   - Editor field placement, widths, presets, auto width, Apply and Cancel.
   - Independent layouts per workload type; saved layouts and enabled state survive restart and switching clusters.
   - Toggle off, disable and uninstall restore normal rows. Unsupported views remain unchanged.
6. Verify Lens accepts the SVG icon/banner metadata in the Publish dialog. Public documentation confirms npm discovery but does not specify all asset validation rules. Correct these if the installed Lens validator requests another format or size.
7. Update README compatibility evidence after successful live tests. Keep the experimental/internal-adapter disclosure. Remove the "not published yet" sentence as part of the final release preparation.

## Account and publishing steps

1. Sign in as `iamu7er`, with publishing permission in the `u7er` npm organization. Complete any email verification and account security prompts. Never paste credentials into repository files or chat.
2. Confirm `@u7er/lens-rowcraft` is still available, or that the organization owns it. If the name must change, update package.json, package-lock.json and installation documentation together.
3. Use the configured tag-triggered GitHub Release workflow, or Lens's Publish dialog. For an initial CLI release, sign in with `npm login`, verify the identity with `npm whoami`, then publish from this repository with `npm publish --access public` only after all checks above pass. Do not publish the tarball directly to bypass the source project's lifecycle guard.
4. Confirm the package appears on npm, then search the Lens Marketplace after indexing. Lens says this normally takes minutes.
5. Install from Marketplace in a clean Lens setup. Check publisher identity, description, README images, icon/banner, activation and removal.
6. The tag-triggered workflow stages npm and creates a draft GitHub release with the archive. Approve the npm stage, add the exact tested Lens version and known limitations to the draft notes, then publish the draft. Do not trigger the workflow for an already published version.

## Official references

- [Lens Marketplace and npm keyword discovery](https://lenshq.io/extensions)
- [Lens publishing flow and subscription requirements](https://lenshq.io/blog/lens-release-2026-10)
