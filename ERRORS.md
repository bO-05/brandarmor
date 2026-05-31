# BrandArmor Error Log

## 2026-05-31

- Task: Verify the deployed Vercel demo and hydrated public listing pages.
- What did not work: The Vercel connector could not inspect the `bo05s-projects` deployment metadata due to a 403 response, and protected Vercel project/preview aliases returned authentication instead of the app. Chrome plugin control was also unavailable in this Windows session because the native host registry entry was missing.
- What worked instead: Verify the public domains directly with HTTP checks and a real headless Chrome/Playwright session using the installed system Chrome. The public domains `brandarmor.asynchronope.my.id` and `brandarmor.vercel.app` showed seeded data and hydrated listing detail pages.
- Note for next time: For judge readiness, prioritize public domain smoke checks over protected project aliases. If Chrome plugin control is unavailable, use headless Playwright/system Chrome or Browser against the same public URLs and record any skipped visual inspection.

## 2026-05-30

- Task: Run `npx react-doctor@latest` in the Codex Windows environment.
- What did not work: The default Node on `PATH` was `v20.11.1`, below React Doctor's required Node `20.19.0+`, and the first workspace-cache install left an incomplete `_npx` package cache without the Windows `oxc-parser` native binding. The default npm cache path also hit a Windows `EPERM` write error under the sandbox.
- What worked instead: Use the installed Node `v22.22.0`, set `npm_config_cache` to `D:\Repo\brandarmor\.npm-cache`, remove the incomplete workspace `.npm-cache\_npx` cache once, then run `npx --yes react-doctor@latest --verbose`.
- Note for next time: For React Doctor in this repo, prefer:
  ```powershell
  $env:Path='C:\Users\user\AppData\Roaming\nvm\v22.22.0;'+$env:Path
  $env:npm_config_cache='D:\Repo\brandarmor\.npm-cache'
  npx --yes react-doctor@latest --verbose
  ```

## 2026-05-24

- Task: Start local dev server for Browser smoke verification.
- What did not work: `Start-Process` with `npm`/`npm.cmd` failed in this Windows environment with duplicate `Path`/`PATH` environment keys. Detached child processes also could not write redirected logs to `C:\tmp`, even though the parent shell can write there.
- What worked instead: Verify the server with `netstat -ano | Select-String ':3015'` and use Browser against `http://localhost:3015`. If a child process needs logs, prefer a workspace build-artifact path such as `.next/` instead of `C:\tmp`.
- Note for next time: Check `netstat` before retrying server starts; `Get-NetTCPConnection` may miss the listener while `netstat` shows it.

- Task: Keep localhost reachable for the user after Codex starts the app.
- What did not work: Foreground `npm run dev` reached `Ready` but was killed when the shell tool timed out. Non-escalated background launches through `Start-Process`, `cmd start /b`, WMI `Win32_Process.Create`, and `schtasks` either failed from sandbox restrictions or produced a listener that disappeared before the next check.
- What worked instead: Launch a persistent user-visible/minimized command window outside the sandbox with `cmd /d /c start "BrandArmor dev server" /min cmd /k "cd /d D:\Repo\brandarmor && npm run dev"` after escalation approval, then verify with `netstat -ano | Select-String ':3015'` and `Invoke-WebRequest http://localhost:3015/`.
- Note for next time: If the user reports `ERR_CONNECTION_REFUSED`, first check `netstat` for `:3015`. If no listener exists, start the dev server in a normal terminal or request approval for a persistent `cmd /d /c start` launch; do not rely on hidden child processes in the Codex sandbox.

When an approach takes more than two attempts, add:

- Date
- Task
- What did not work
- What worked instead
- Note for next time
