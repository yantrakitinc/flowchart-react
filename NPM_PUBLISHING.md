# NPM Publishing Guide

## Creating an Access Token

1. Go to [npmjs.com](https://www.npmjs.com) and log in
2. Click your profile icon → **Access Tokens**
3. Click **Generate New Token** → **Granular Access Token**
4. Fill in the form:
   - **Token name**: Give it a descriptive name (e.g., "flowchart-react-publish")
   - **Bypass two-factor authentication (2FA)**: Check this box
   - **Permissions**: Select "Read and write"
   - **Select packages**: "All packages" or select specific packages
   - **Expiration**: Choose based on your needs (longer = fewer regenerations)
5. Click **Generate Token**
6. Copy the token immediately (you won't see it again)

## Configuring npm with the Token

```bash
npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN_HERE
```

## Publishing

```bash
cd /Users/dattu/Code/package.yantrakit.flowchart-react
npm publish --access public
```

## Updating Version Before Publishing

Edit `package.json` and update the `version` field, or use:

```bash
npm version patch   # 1.1.1 → 1.1.2
npm version minor   # 1.1.1 → 1.2.0
npm version major   # 1.1.1 → 2.0.0
```

## Regenerating an Expired Token

1. Go to [npmjs.com](https://www.npmjs.com) → **Access Tokens**
2. Delete the old token (optional)
3. Follow the "Creating an Access Token" steps above
4. Run the `npm config set` command with the new token

## Verifying Your Token

```bash
npm whoami
```

If configured correctly, this will display your npm username.
