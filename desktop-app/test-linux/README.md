# Linux desktop test

This folder provides a Linux test build that uses the same Electron packaging
architecture as the Windows installer: compiled NestJS output, its runtime
dependencies and Prisma files, plus Next.js standalone output are copied into
the application resources. The installed AppImage does not require system npm.

## Build

From the repository root:

```bash
bash desktop-app/test-linux/build-linux.sh
```

Requirements: Linux x64, Node.js 18 or newer, npm, and internet access for the
first dependency installation. The result is written to `desktop-app/dist/`.

## Run the packaged test

```bash
bash desktop-app/test-linux/run-appimage.sh
```

On distributions without FUSE support, run the emitted AppImage with
`--appimage-extract-and-run` instead.
