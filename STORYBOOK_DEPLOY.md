# Storybook Deployment

Deploy the Storybook documentation to yantrakit.com/flowchart-react.

## Prerequisites

1. Access to the `com.yantrakit` repository
2. Both repos cloned locally:
   - `/Users/dattu/Code/package.yantrakit.flowchart-react`
   - `/Users/dattu/Code/com.yantrakit`

## Build and Deploy

```bash
# 1. Navigate to the package directory
cd /Users/dattu/Code/package.yantrakit.flowchart-react

# 2. Build the Storybook
pnpm build-storybook

# 3. Remove old deployment and copy new build
rm -rf /Users/dattu/Code/com.yantrakit/Web/public/flowchart-react
cp -r storybook-static /Users/dattu/Code/com.yantrakit/Web/public/flowchart-react

# 4. Commit and push to yantrakit.com
cd /Users/dattu/Code/com.yantrakit/Web
git add -A
git commit -m "Update FlowChart React Storybook"
git push
```

## Base Path Configuration

The Storybook is configured to be served from `/flowchart-react/` subdirectory.

This is set in two places:

1. **`.storybook/main.ts`** - Vite base path for preview assets:
   ```typescript
   viteFinal: async (config) => {
     config.base = '/flowchart-react/';
     return config;
   },
   ```

2. **`index.html` and `iframe.html`** - Base tag for manager assets:
   ```html
   <base href="/flowchart-react/" />
   ```

   These are added manually after the build (or could be automated with a post-build script).

## After Deployment

The Storybook will be available at:
- https://yantrakit.com/flowchart-react

Vercel auto-deploys when changes are pushed to master.
