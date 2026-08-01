<#
.SYNOPSIS
    Read-only Git status inspector for the Work root and all known standalone
    repositories / linked worktrees.

.DESCRIPTION
    Strictly read-only. Does NOT fetch, pull, push, modify files, change
    branches, create commits, or change configuration. Only inspects local
    Git metadata (refs, HEAD, status, existing remote-tracking refs).

    For each target it prints:
      - requested path
      - actual Git root (git rev-parse --show-toplevel)
      - branch
      - HEAD
      - remotes
      - upstream
      - status (porcelain)
      - ahead/behind vs upstream (using existing remote-tracking refs only)

    It also warns clearly if the actual Git root differs from the requested
    path, which would indicate the path is nested inside a different repo
    than expected (e.g. accidentally reporting the Work root's identity for
    a nested project).
#>

$ErrorActionPreference = 'Continue'

$targets = [ordered]@{
    "Work root"                    = "C:\Users\admin\OneDrive\Desktop\Work"
    "sinister-revamp"              = "C:\Users\admin\OneDrive\Desktop\Work\sinister-revamp"
    "sinister-forms-api"           = "C:\Users\admin\OneDrive\Desktop\Work\integrations\sinister-forms-api"
    "sinister-tiktok-sync"         = "C:\Users\admin\OneDrive\Desktop\Work\integrations\tiktok-netsuite-sync\sinister-tiktok-sync"
    "netsuite-monday-integration"  = "C:\Users\admin\OneDrive\Desktop\Work\integrations\netsuite-monday-integration"
    "enshield-deliverables-standalone" = "C:\Users\admin\OneDrive\Desktop\Work\enshield-deliverables-standalone"
    "Enshield_data (nested)"       = "C:\Users\admin\OneDrive\Desktop\Work\enshield-deliverables-standalone\.publish\Enshield_data"
    "workspace-notes"              = "C:\Users\admin\OneDrive\Desktop\Work\workspace-notes"
    "sinister-netsuite-sync-real"  = "C:\Users\admin\OneDrive\Desktop\Work\integrations\sinister-netsuite-sync-real"
    "sinister-server-deploy (external)" = "C:\Users\admin\AppData\Local\Temp\sinister-server-deploy"
}

function Invoke-GitReadOnly {
    param(
        [string]$RepoPath,
        [string[]]$GitArgs
    )
    # Run git strictly as a read-only inspection command against a specific path.
    $out = & git -C "$RepoPath" @GitArgs 2>&1
    return ($out -join "`n")
}

Write-Host "================================================================"
Write-Host " READ-ONLY REPOSITORY STATUS CHECK"
Write-Host " Generated: $(Get-Date -Format o)"
Write-Host " This script does not fetch, pull, push, or modify anything."
Write-Host "================================================================"
Write-Host ""

foreach ($name in $targets.Keys) {
    $requestedPath = $targets[$name]

    Write-Host "----------------------------------------------------------------"
    Write-Host "PROJECT: $name"
    Write-Host "Requested path: $requestedPath"

    if (-not (Test-Path -LiteralPath $requestedPath)) {
        Write-Host "STATUS: PATH DOES NOT EXIST" -ForegroundColor Red
        Write-Host ""
        continue
    }

    $actualRoot = Invoke-GitReadOnly -RepoPath $requestedPath -GitArgs @('rev-parse', '--show-toplevel')

    if ($actualRoot -match '^fatal:') {
        Write-Host "STATUS: NOT A GIT REPOSITORY ($actualRoot)" -ForegroundColor Red
        Write-Host ""
        continue
    }

    # Normalize both paths for comparison (forward slashes, trailing slash, case-insensitive on Windows)
    $normRequested = ($requestedPath -replace '\\', '/').TrimEnd('/').ToLowerInvariant()
    $normActual     = ($actualRoot -replace '\\', '/').TrimEnd('/').ToLowerInvariant()

    Write-Host "Actual Git root: $actualRoot"

    if ($normActual -ne $normRequested) {
        Write-Host "WARNING: Actual Git root DIFFERS from requested path!" -ForegroundColor Yellow
        Write-Host "         This path may be nested inside a different repository." -ForegroundColor Yellow
    }

    $branch   = Invoke-GitReadOnly -RepoPath $requestedPath -GitArgs @('branch', '--show-current')
    $head     = Invoke-GitReadOnly -RepoPath $requestedPath -GitArgs @('rev-parse', 'HEAD')
    $remotes  = Invoke-GitReadOnly -RepoPath $requestedPath -GitArgs @('remote', '-v')
    $upstream = Invoke-GitReadOnly -RepoPath $requestedPath -GitArgs @('rev-parse', '--abbrev-ref', '@{upstream}')
    $status   = Invoke-GitReadOnly -RepoPath $requestedPath -GitArgs @('status', '--porcelain')
    $aheadBehind = Invoke-GitReadOnly -RepoPath $requestedPath -GitArgs @('rev-list', '--left-right', '--count', 'HEAD...@{upstream}')

    Write-Host "Branch: $branch"
    Write-Host "HEAD: $head"
    Write-Host "Remotes:"
    if ([string]::IsNullOrWhiteSpace($remotes)) {
        Write-Host "  (none)"
    } else {
        ($remotes -split "`n") | ForEach-Object { Write-Host "  $_" }
    }
    Write-Host "Upstream: $upstream"

    if ($aheadBehind -match '^fatal:') {
        Write-Host "Ahead/Behind: N/A ($aheadBehind)"
    } else {
        $parts = $aheadBehind -split "`t"
        if ($parts.Count -eq 2) {
            Write-Host "Ahead/Behind vs upstream: ahead $($parts[0]), behind $($parts[1])"
        } else {
            Write-Host "Ahead/Behind: $aheadBehind"
        }
    }

    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Host "Status: clean"
    } else {
        Write-Host "Status:"
        ($status -split "`n") | ForEach-Object { Write-Host "  $_" }
    }

    Write-Host ""
}

Write-Host "================================================================"
Write-Host " END OF READ-ONLY STATUS CHECK"
Write-Host " No fetch, pull, push, commit, branch change, or config change"
Write-Host " was performed by this script."
Write-Host "================================================================"
