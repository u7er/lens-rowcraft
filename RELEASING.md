# First public release

Status: locally prepared, not published. Version: 0.3.2.

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
4. Run `npm pack`, and install the resulting `lens-rowcraft-0.3.2.tgz` using Lens's extension installer if it accepts archives. Otherwise extract it and use Install from File System to select the extracted `package/package.json`. Keep that folder in place.
5. Verify the following in live Lens and record OS and exact Lens version:
   - Pods, Deployments, DaemonSets, StatefulSets, ReplicaSets, ReplicationControllers, Jobs and CronJobs.
   - Large-list scrolling to the end; sort, filter, namespaces, visible columns, row selection, detail links, actions and tab changes.
   - Editor field placement, widths, presets, auto width, Apply and Cancel.
   - Independent layouts per workload type; saved layouts and enabled state survive restart and switching clusters.
   - Toggle off, disable and uninstall restore normal rows. Unsupported views remain unchanged.
6. Verify Lens accepts the SVG icon/banner metadata in the Publish dialog. Public documentation confirms npm discovery but does not specify all asset validation rules. Correct these if the installed Lens validator requests another format or size.
7. Update README compatibility evidence after successful live tests. Keep the experimental/internal-adapter disclosure. Remove the "not published yet" sentence as part of the final release preparation.

## Account and publishing steps

1. Create or sign in to the npm account that should own this package. Complete any email verification and account security prompts. Never paste credentials into repository files or chat.
2. Confirm `lens-rowcraft` is still available, or that your account owns it. If the name must change, update package.json, package-lock.json and installation documentation together.
3. Prefer Lens's Publish dialog for its npm sign-in and validation flow. For CLI publishing, sign in with `npm login`, verify the identity with `npm whoami`, then publish from this repository with `npm publish --access public` only after all checks above pass. Do not publish the tarball directly to bypass the source project's lifecycle guard.
4. Confirm the package appears on npm, then search the Lens Marketplace after indexing. Lens says this normally takes minutes.
5. Install from Marketplace in a clean Lens setup. Check publisher identity, description, README images, icon/banner, activation and removal.
6. Tag the released commit as `v0.3.2` and create GitHub release notes describing the feature, exact tested Lens version and known limitations. Future npm releases need a new version; published versions cannot be reused.

## Official references

- [Lens Marketplace and npm keyword discovery](https://lenshq.io/extensions)
- [Lens publishing flow and subscription requirements](https://lenshq.io/blog/lens-release-2026-10)
