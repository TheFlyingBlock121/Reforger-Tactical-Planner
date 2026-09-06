# Put v0.7 on GitHub and send it to a friend

There are two separate things on GitHub:

1. **Repository:** small source code only. No 700 MB map folders.
2. **Release:** the finished Setup.exe containing the maps.

The `.gitignore` in v0.7 already ignores the map PNGs, generated LOD cache, local relay environment file and build folders.

---

## Part A - create the repository

### Easiest method: GitHub Desktop

1. Sign in to GitHub in GitHub Desktop.
2. Choose **File -> Add local repository** and select the extracted v0.7 project folder.
3. If it says the folder is not a Git repository, choose **create a repository here**.
4. Repository name example: `Reforger-Tactical-Planner`.
5. Commit the project files.
6. Click **Publish repository**.
7. Choose Public or Private depending on who should see the source.

Before publishing, make sure the huge PNG files do **not** appear in the changed-files list. They should be ignored automatically.

### PowerShell method

Create an empty repository on github.com first. Do not initialize it with another README.

Then in the v0.7 project folder:

```powershell
git init
git add .
git status
```

Read `git status`. Make sure the hundreds of map PNG files are absent.

Then:

```powershell
git commit -m "Reforger Tactical Planner v0.7"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/Reforger-Tactical-Planner.git
git push -u origin main
```

Replace `YOUR-NAME` with your GitHub username.

---

## Part B - deploy the relay

Follow `RELAY-SETUP.md`.

The included `render.yaml` lets Render create the relay from your GitHub repository.

Copy the resulting `https://...onrender.com` address.

---

## Part C - build the installer

Make sure the Everon and Serhiivka source tile folders are filled, then double-click:

```text
BUILD-INSTALLER-WINDOWS.bat
```

Paste the Render URL when asked.

At the end you get:

```text
release-installer/
Reforger-Tactical-Planner-0.7.0-x64-Setup.exe
```

---

## Part D - upload Setup.exe as a GitHub Release

On the GitHub repository page:

1. Open **Releases**.
2. Choose **Draft a new release**.
3. Create tag: `v0.7.0`.
4. Release title: `Reforger Tactical Planner v0.7`.
5. Add a short note describing the release.
6. Drag `Reforger-Tactical-Planner-0.7.0-x64-Setup.exe` into the release asset upload area.
7. Wait until upload completes.
8. Publish the release.

Your friend should download the **Setup.exe release asset**, not GitHub's automatic "Source code (zip)" file.

GitHub currently limits an individual Release asset to under 2 GiB. The build script checks the finished Setup.exe and warns you if it is getting close.

---

## Updating later

For v0.8 or later:

```powershell
git add .
git commit -m "Update planner"
git push
```

Then rebuild the installer and create a new GitHub Release/tag such as `v0.8.0`.

You do not upload the map PNG source folders to the repository each update; they remain local and are packed into the installer during your Windows build.
