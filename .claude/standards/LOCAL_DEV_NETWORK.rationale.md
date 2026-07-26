# LOCAL_DEV_NETWORK — detail

Why each rule in `LOCAL_DEV_NETWORK.md` exists.

## Ports + local hostnames

`/etc/hosts` is the source of truth for local dev. Why:

- **Unique port per project.** Multiple projects on the same machine each get their own port. Running two projects on `:3000` causes "the wrong project loaded" bugs that look like cache problems.
- **Hostname instead of localhost.** `<project>.<dev-tld>` shows up in the URL bar; the developer knows which project they're looking at. Cookies + auth flows that depend on domain matching work the same locally as in production.
- **`/etc/hosts` is the canonical record.** When `package.json` drifts (someone changed the port in code but forgot the host file), the host file wins — that's the thing the browser actually reads.

The dev-tld is per-project. `.local` is the standard convention; brand-scoped TLDs (e.g., `.yantrakit.local`) are fine for projects in a given product set; anything that doesn't collide with a real TLD works.

Storybook gets its own port + hostname because it runs as a separate dev server. Storybook and the app run as concurrent processes; both need their own slot. (Port assignments are project-specific — see the project's own `README.yaml.local_dev_url` per README_CONTRACT#readme-requirements + `/etc/hosts` entry, not this standards doc. Captured URLs + ports live in project memory per REPO_PROVISIONING#project-memory.)

The drift rule (`/etc/hosts wins; update package.json`) prevents the cycle where "I changed the port in package.json but forgot `/etc/hosts`, now it doesn't work" turns into "I changed `/etc/hosts` too but used a different port, now both are inconsistent". One source of truth.

Last updated: 2026-07-12T00:00:00Z
