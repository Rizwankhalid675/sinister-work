# Work Root — Migration Freeze Notice

The top-level `Work` Git repository is a legacy monolithic repository.

## Do not use the Work root for normal development

Do not run these commands from the Work root:

- `git add`
- `git commit`
- `git push`
- `git pull`
- `git merge`
- `git rebase`
- `git reset`
- `git clean`
- `git worktree remove`
- `git worktree prune`
- `git gc`
- `git prune`

## Work only inside standalone repositories

Use the exact project directory before running Git commands:

- `sinister-revamp`
- `integrations/sinister-forms-api`
- `integrations/tiktok-netsuite-sync/sinister-tiktok-sync`
- `integrations/netsuite-monday-integration`
- `enshield-deliverables-standalone`
- `enshield-deliverables-standalone/.publish/Enshield_data`
- `workspace-notes`

## Root Git must remain active temporarily

`Work\.git` currently backs linked NetSuite and recovery worktrees:

- `integrations/sinister-netsuite-sync-real`
- `.claude/worktrees/agent-ac74a48fec55b2df4`
- `C:\Users\admin\AppData\Local\Temp\sinister-server-deploy`

Do not rename or remove `Work\.git` until server recovery and NetSuite consolidation are complete.

Verified recovery backup:

`C:\Git-Reorganization-Backup\20260729_214206`

Do not stage or commit this notice in the root repository.
