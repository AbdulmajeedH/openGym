# openGym — personal local-only Vercel build

Based on upstream commit 464355ef43d4c8f8a4e0bb6db9c2af7f240593b5.

## Deploy
Import this repository into Vercel on the free Hobby plan. Keep the root directory at the repository root. vercel.json supplies the install command, build command and output directory. Use Node 24. No backend, database, secret or paid add-on is required.

This deployment is intended for a NEW project/domain, not to replace an existing cloud account installation.

## Changes
VITE_LOCAL_ONLY=1 starts the real guest store without sample data, defaults to Arabic, blocks backend API calls, and replaces account controls with local-data and backup information. Original exercise media and notices are preserved. No native Capacitor build is used.

Open the deployed URL in Safari, Share > Add to Home Screen. Data belongs to that browser/app on that device, not the URL's owner. Anyone else opening the URL has their own empty local data. No cloud synchronization, account login, AI coach or server push reminders.

Settings > Data & backup exports/imports your data. Clearing website data, losing the device or browser storage eviction can erase the only copy. Save backups to Files/iCloud Drive regularly. Offline exercise media only work after cached; source.zip is a source download, not a backup.

## Verification
Production Vite build passed. Eight tests passed, including saving a weigh-in then loading a fresh store without network requests and existing persistence tests. Not yet tested on a physical iPhone or deployed to Vercel.

## Source and license
AGPL-3.0 source is included as /source.zip by the build. Exercise media are delivered separately under exercise-media with their own NOTICE, not licensed under AGPL. Source archive excludes generated output, dependencies, git internals, secrets and exercise media; obtain unchanged 180px media from the pinned upstream commit if rebuilding from that archive.
