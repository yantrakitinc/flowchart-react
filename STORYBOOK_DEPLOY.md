# Storybook Deployment Guide

This guide explains how to deploy Storybook documentation to yantrakit.com for Yantrakit packages.

## Overview

Storybook is deployed as static files to the `com.yantrakit/Web/public/` folder. When pushed to master, Vercel auto-deploys the site, making the Storybook available at `yantrakit.com/<package-name>`.

**Example**: `@yantrakit/flowchart-react` → `yantrakit.com/flowchart-react`

## Setup (One-Time)

### 1. Configure Base Path

In `.storybook/main.ts`, set the Vite base path to match your package's URL path:

```typescript
viteFinal: async (config) => {
  config.base = '/flowchart-react/';  // Change to your package name
  return config;
},
```

### 2. Add Footer Links (Optional)

Create `.storybook/Footer.tsx` with links back to npm and yantrakit.com:

```tsx
import React from 'react';

export function Footer() {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '40px',
      backgroundColor: '#18181b',
      borderTop: '1px solid #3f3f46',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '13px',
      color: '#a1a1aa',
      zIndex: 9999,
    }}>
      <a href="https://www.npmjs.com/package/@yantrakit/flowchart-react" target="_blank" style={{ color: '#cb3837', textDecoration: 'none', fontWeight: 500 }}>npm</a>
      <span style={{ color: '#52525b' }}>•</span>
      <span>Part of</span>
      <a href="https://yantrakit.com" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 500 }}>Yantrakit</a>
    </div>
  );
}
```

Add the footer to `.storybook/preview.tsx`:

```tsx
import { Footer } from './Footer';

decorators: [
  (Story) => (
    <>
      <Story />
      <Footer />
    </>
  ),
],
```

### 3. Add Footer to MDX Docs

The decorator only applies to stories. For docs pages (MDX), add footer HTML at the bottom:

```mdx
---

<div style={{ marginTop: '60px', padding: '20px', borderTop: '1px solid #3f3f46', display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '14px', color: '#a1a1aa' }}>
  <a href="https://www.npmjs.com/package/@yantrakit/flowchart-react" target="_blank" style={{ color: '#cb3837', textDecoration: 'none', fontWeight: 500 }}>npm</a>
  <span style={{ color: '#52525b' }}>•</span>
  <span>Part of</span>
  <a href="https://yantrakit.com" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 500 }}>Yantrakit</a>
</div>
```

## Build and Deploy

```bash
# 1. Build the Storybook
cd /path/to/your/package
pnpm build-storybook

# 2. Remove old and copy new build
rm -rf /path/to/com.yantrakit/Web/public/<package-name>
cp -r storybook-static /path/to/com.yantrakit/Web/public/<package-name>

# 3. Fix base paths in HTML files (required for subdirectory hosting)
# Add <base href="/<package-name>/"> after <meta charset="utf-8" /> in:
#   - public/<package-name>/index.html
#   - public/<package-name>/iframe.html

# 4. Commit and push yantrakit.com
cd /path/to/com.yantrakit/Web
git add -A
git commit -m "Update <package-name> Storybook"
git push
```

## Why Base Path Fix is Needed

Storybook's manager UI doesn't fully respect the Vite `base` config. When hosted at a subdirectory (e.g., `/flowchart-react/`), some assets load from the root (`/sb-addons/`) instead of the subdirectory.

Adding `<base href="/flowchart-react/">` to both HTML files forces all relative URLs to resolve correctly.

## Add Product Card to yantrakit.com

In `com.yantrakit/Web/src/data/products.ts`, add your package:

```typescript
{
  id: "flowchart-react",
  slug: "flowchart-react",
  name: "FlowChart React",
  tagline: "Visualize flows with auto-layout.",
  description: "...",
  category: "npm-package",
  status: "available",
  version: "1.1.2",
  icon: "/icons/flowchart-react.svg",
  storeUrl: "https://www.npmjs.com/package/@yantrakit/flowchart-react",
  siteUrl: "/flowchart-react",  // Links to Storybook
  features: [...],
  pricing: { type: "free" },
  tags: ["developer", "react", ...],
}
```

## Links

After deployment:
- **Storybook**: https://yantrakit.com/flowchart-react
- **npm**: https://www.npmjs.com/package/@yantrakit/flowchart-react
- **Product Page**: https://yantrakit.com/products/flowchart-react
