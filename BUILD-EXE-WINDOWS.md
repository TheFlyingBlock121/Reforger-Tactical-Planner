# Windows installer build

v0.7 intentionally uses an **installer**, not a portable/loose EXE.

Install the current Node.js LTS once, extract the project, add both map tile sets, then double-click:

```text
BUILD-INSTALLER-WINDOWS.bat
```

The build may take a while the first time because it validates large map folders and generates lower-detail zoom tiles. Later builds skip LOD generation when the map source has not changed.

The final Setup.exe installs the app normally, includes both maps, creates shortcuts, and does not require Node.js on your friend's computer.
