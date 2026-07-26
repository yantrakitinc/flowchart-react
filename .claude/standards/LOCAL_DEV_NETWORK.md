# LOCAL_DEV_NETWORK

> an agent needs to APPLY and ENFORCE: unique ports, /etc/hosts as source of truth, and the <project>.<dev-tld> hostname pattern. ---------- ports + local hostnames ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## ports

- `source_of_truth`: "/etc/hosts"
- `rule`: every project gets a UNIQUE port; never share
- `hostname_pattern`: "<project>.<dev-tld>"
- `dev_tld`:
  - `default`: ".local"
  - `examples`: [".local", ".lan", ".test", ".yantrakit.local"]
  - `chosen_per_project`: true
- `/etc/hosts_entry`: "127.0.0.1   <project>.<dev-tld> _(port XXXXX")_
- `storybook_entry`: "127.0.0.1   <project>-storybook.<dev-tld> _(port YYYYY")_
- `package_json_alignment`:
  - `rule`: scripts MUST match /etc/hosts ports exactly
  - `example_scripts`:
    - `dev`: "next dev --port XXXXX" start:local: "next start --port XXXXX"
    - `storybook`: "storybook dev --port YYYYY"
- `on_drift`: "/etc/hosts wins; update package.json to match"

Last updated: 2026-07-12T00:00:00Z