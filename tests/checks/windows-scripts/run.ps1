<#
.SYNOPSIS
    Runs the generated Windows scripts on this machine and records what each one did.

.DESCRIPTION
    Every script is applied twice and, when it is reversible, reverted twice. Before and after each
    run the registry keys the script names, the start type and state of every service, every
    scheduled task and the hosts file are recorded, so the result shows:

    - what a script printed, and whether it printed to the error stream,
    - what applying it changed (nothing at all points at a script that silently does nothing),
    - whether applying it a second time changed anything more,
    - what was still different from the starting state after reverting it.

    The scripts change system settings, remove apps and turn off security features.
    Run this only on a disposable machine, such as a CI runner. It refuses to run elsewhere unless
    -Force is given.

    Written for Windows PowerShell 5.1, which is what the scripts themselves run on.
#>
[CmdletBinding()]
param(
    # Directory written by `generate.spec.ts`: `manifest.json` and `scripts\`.
    [Parameter(Mandatory = $true)] [string] $InputDirectory,
    [Parameter(Mandatory = $true)] [string] $OutputDirectory,
    [int] $ShardIndex = 0,
    [int] $ShardCount = 1,
    # Longest a single run of a script may take before it is killed.
    [int] $TimeoutSeconds = 900,
    # Comma-separated script numbers; when given, only those of the shard's scripts run.
    [string] $Only = '',
    # Comma-separated script numbers to leave out.
    [string] $Skip = '',
    [switch] $Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2

if (-not $Force -and $env:GITHUB_ACTIONS -ne 'true') {
    throw 'This changes system settings and removes apps. Run it on a disposable machine, or pass -Force.'
}

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;

public sealed class BatchRunResult
{
    public int ExitCode;
    public bool TimedOut;
    public double Seconds;
    public string[] Lines;
}

public static class BatchRunner
{
    // Runs a batch file the way a double click does, with no console input, and returns its output
    // with each line marked as standard output ("O ") or standard error ("E ").
    public static BatchRunResult Run(string batchFile, string workingDirectory, int timeoutMilliseconds)
    {
        var lines = new List<string>();
        var gate = new object();
        var startInfo = new ProcessStartInfo
        {
            FileName = Environment.ExpandEnvironmentVariables(@"%SystemRoot%\System32\cmd.exe"),
            Arguments = "/d /s /c \"\"" + batchFile + "\"\"",
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        var result = new BatchRunResult();
        var watch = Stopwatch.StartNew();
        using (var process = new Process { StartInfo = startInfo })
        {
            process.OutputDataReceived += (sender, e) => { if (e.Data != null) { lock (gate) { lines.Add("O " + e.Data); } } };
            process.ErrorDataReceived += (sender, e) => { if (e.Data != null) { lock (gate) { lines.Add("E " + e.Data); } } };
            process.Start();
            process.StandardInput.Close(); // `pause` and any unexpected prompt read end-of-file
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            if (!process.WaitForExit(timeoutMilliseconds))
            {
                result.TimedOut = true;
                KillTree(process.Id);
                process.WaitForExit(15000);
            }
            watch.Stop();
            // A program the script left running keeps the pipes open, so wait briefly for the
            // remaining output instead of waiting for the pipes to close.
            Thread.Sleep(300);
            try { process.CancelOutputRead(); } catch (InvalidOperationException) { }
            try { process.CancelErrorRead(); } catch (InvalidOperationException) { }
            result.ExitCode = process.HasExited ? process.ExitCode : -1;
        }
        result.Seconds = Math.Round(watch.Elapsed.TotalSeconds, 1);
        lock (gate) { result.Lines = lines.ToArray(); }
        return result;
    }

    private static void KillTree(int processId)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = Environment.ExpandEnvironmentVariables(@"%SystemRoot%\System32\taskkill.exe"),
            Arguments = "/F /T /PID " + processId,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        using (var killer = Process.Start(startInfo)) { killer.WaitForExit(30000); }
    }
}
'@

function New-StateMap {
    return New-Object 'System.Collections.Generic.Dictionary[string,string]' ([StringComparer]::OrdinalIgnoreCase)
}

function Format-RegistryData($Data) {
    if ($null -eq $Data) { return '' }
    if ($Data -is [byte[]]) {
        $hex = ($Data | Select-Object -First 64 | ForEach-Object { $_.ToString('x2') }) -join ''
        return "$hex ($($Data.Length) bytes)"
    }
    if ($Data -is [string[]]) { return ($Data -join '|') }
    $text = "$Data"
    if ($text.Length -gt 400) { return $text.Substring(0, 400) + "... ($($text.Length) characters)" }
    return $text
}

function Add-RegistryKeyState($State, [string] $Path) {
    $separator = $Path.IndexOf('\')
    $hive = switch ($Path.Substring(0, $separator)) {
        'HKLM' { [Microsoft.Win32.Registry]::LocalMachine }
        'HKCU' { [Microsoft.Win32.Registry]::CurrentUser }
        'HKCR' { [Microsoft.Win32.Registry]::ClassesRoot }
        'HKU' { [Microsoft.Win32.Registry]::Users }
    }
    $key = $null
    try {
        $key = $hive.OpenSubKey($Path.Substring($separator + 1), $false)
    } catch {
        $State["reg:$Path"] = "<unreadable: $($_.Exception.GetType().Name)>"
        return
    }
    if ($null -eq $key) {
        $State["reg:$Path"] = '<absent>'
        return
    }
    try {
        $State["reg:$Path"] = '<key>'
        foreach ($name in $key.GetValueNames()) {
            $kind = try { "$($key.GetValueKind($name))" } catch { 'Unknown' }
            $data = try {
                Format-RegistryData $key.GetValue($name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
            } catch { '<unreadable>' }
            $State["reg:$Path!$name"] = "${kind}:$data"
        }
        $subKeys = @($key.GetSubKeyNames() | Sort-Object)
        if ($subKeys.Count -le 60) {
            $State["reg:$Path\"] = $subKeys -join '|'
        } else {
            $State["reg:$Path\"] = "$($subKeys.Count) subkeys"
            foreach ($subKey in $subKeys) { $State["reg:$Path\$subKey"] = '<key>' }
        }
    } finally {
        $key.Close()
    }
}

$script:taskService = New-Object -ComObject Schedule.Service
$script:taskService.Connect()

function Add-TaskState($State, $Folder) {
    foreach ($task in $Folder.GetTasks(1)) { # 1: include hidden tasks
        $State["task:$($task.Path)"] = "enabled=$($task.Enabled)"
    }
    foreach ($child in $Folder.GetFolders(0)) {
        Add-TaskState $State $child
    }
}

$alwaysWatchedKeys = @(
    'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment',
    'HKCU\Environment'
)

function Get-SystemState([string[]] $RegistryKeys) {
    $state = New-StateMap
    foreach ($path in ($RegistryKeys + $alwaysWatchedKeys)) {
        Add-RegistryKeyState $state $path
    }
    $services = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey('SYSTEM\CurrentControlSet\Services')
    foreach ($name in $services.GetSubKeyNames()) {
        $service = $null
        try { $service = $services.OpenSubKey($name) } catch { continue }
        if ($null -eq $service) { continue }
        $start = $service.GetValue('Start')
        if ($null -ne $start) { $state["service:$name"] = "start=$start" }
        $service.Close()
    }
    $services.Close()
    foreach ($service in (Get-Service -ErrorAction SilentlyContinue)) {
        $state["running:$($service.Name)"] = "$($service.Status)"
    }
    try {
        Add-TaskState $state $script:taskService.GetFolder('\')
    } catch {
        $state['task:<error>'] = "$($_.Exception.Message)"
    }
    $hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
    if (Test-Path -LiteralPath $hostsPath) {
        $hosts = @(Get-Content -LiteralPath $hostsPath -ErrorAction SilentlyContinue)
        $blocked = @($hosts | Where-Object { $_ -match '^\s*0\.0\.0\.0\s|^\s*127\.0\.0\.1\s|^\s*::1?\s' })
        $state['hosts'] = "$($hosts.Count) lines, $($blocked.Count) entries"
    } else {
        $state['hosts'] = '<absent>'
    }
    return $state
}

function Compare-SystemState($Before, $After) {
    $changes = New-Object 'System.Collections.Generic.List[string]'
    foreach ($name in $Before.Keys) {
        if (-not $After.ContainsKey($name)) {
            $changes.Add("- $name = $($Before[$name])")
        } elseif ($After[$name] -cne $Before[$name]) {
            $changes.Add("~ $name : $($Before[$name]) => $($After[$name])")
        }
    }
    foreach ($name in $After.Keys) {
        if (-not $Before.ContainsKey($name)) {
            $changes.Add("+ $name = $($After[$name])")
        }
    }
    $sorted = @($changes | Sort-Object)
    if ($sorted.Count -gt 200) {
        return @($sorted | Select-Object -First 200) + "... $($sorted.Count - 200) more changes"
    }
    return $sorted
}

function Limit-Lines([string[]] $Lines) {
    $limit = 500
    $trimmed = @($Lines | ForEach-Object { if ($_.Length -gt 1500) { $_.Substring(0, 1500) + '...' } else { $_ } })
    if ($trimmed.Count -le $limit) { return $trimmed }
    $half = $limit / 2
    return @($trimmed | Select-Object -First $half) `
        + "... $($trimmed.Count - $limit) lines omitted ..." `
        + @($trimmed | Select-Object -Last $half)
}

function ConvertTo-NumberSet([string] $List) {
    $set = New-Object 'System.Collections.Generic.HashSet[int]'
    foreach ($item in ($List -split '[,\s]+' | Where-Object { $_ })) { [void] $set.Add([int] $item) }
    return ,$set
}

$InputDirectory = (Resolve-Path -LiteralPath $InputDirectory).Path
$scriptsDirectory = Join-Path $InputDirectory 'scripts'
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$OutputDirectory = (Resolve-Path -LiteralPath $OutputDirectory).Path
$resultsPath = Join-Path $OutputDirectory 'results.jsonl'
$utf8 = New-Object System.Text.UTF8Encoding($false)

# Windows PowerShell 5.1 emits a JSON array as one object; the parentheses make it enumerate.
$manifest = @(([IO.File]::ReadAllText((Join-Path $InputDirectory 'manifest.json')) | ConvertFrom-Json) | ForEach-Object { $_ })
# Named apart from the parameters: PowerShell variables ignore case, so `$only` would be `$Only`.
$onlyNumbers = ConvertTo-NumberSet $Only
$skipNumbers = ConvertTo-NumberSet $Skip
$selected = @($manifest | Where-Object {
    if ($skipNumbers.Contains([int] $_.index)) { return $false }
    if ($onlyNumbers.Count -gt 0 -and -not $onlyNumbers.Contains([int] $_.index)) { return $false }
    return (([int] $_.index) % $ShardCount) -eq $ShardIndex
})
# Scripts that cannot be undone run last, so they do not alter the machine for the others.
$selected = @($selected | Where-Object { $_.reversible }) + @($selected | Where-Object { -not $_.reversible })

$os = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
$environment = [ordered] @{
    product = "$($os.ProductName)"
    displayVersion = "$($os.DisplayVersion)"
    build = "$($os.CurrentBuildNumber).$($os.UBR)"
    edition = "$($os.EditionID)"
    installationType = "$($os.InstallationType)"
    architecture = "$env:PROCESSOR_ARCHITECTURE"
    culture = (Get-UICulture).Name
    user = "$env:USERNAME"
    elevated = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
    powershell = "$($PSVersionTable.PSVersion)"
    shard = "$ShardIndex/$ShardCount"
    scripts = $selected.Count
}
[IO.File]::WriteAllText((Join-Path $OutputDirectory 'environment.json'), ($environment | ConvertTo-Json), $utf8)
Write-Host ($environment | ConvertTo-Json -Compress)

if ($ShardIndex -eq 0) {
    # What this machine has before any script runs, to check the names the scripts target against.
    function Get-Names([scriptblock] $Query) {
        # The comma keeps a one-item result an array on its way out of the function.
        try { return , ([string[]] @(& $Query)) } catch { return , ([string[]] @("<error: $($_.Exception.Message)>")) }
    }
    $inventory = [ordered] @{
        services = Get-Names { Get-CimInstance Win32_Service | ForEach-Object { "$($_.Name)|$($_.StartMode)|$($_.State)" } }
        drivers = Get-Names { Get-CimInstance Win32_SystemDriver | ForEach-Object { "$($_.Name)|$($_.StartMode)|$($_.State)" } }
        tasks = Get-Names { (Get-SystemState @()).GetEnumerator() | Where-Object { $_.Key.StartsWith('task:') } | ForEach-Object { "$($_.Key.Substring(5))|$($_.Value)" } }
        apps = Get-Names { Get-AppxPackage -AllUsers | ForEach-Object { "$($_.Name)|$($_.PublisherId)|$($_.NonRemovable)" } }
        provisionedApps = Get-Names { Get-AppxProvisionedPackage -Online | ForEach-Object { "$($_.DisplayName)" } }
        capabilities = Get-Names { Get-WindowsCapability -Online | ForEach-Object { "$($_.Name)|$($_.State)" } }
        features = Get-Names { Get-WindowsOptionalFeature -Online | ForEach-Object { "$($_.FeatureName)|$($_.State)" } }
    }
    [IO.File]::WriteAllText((Join-Path $OutputDirectory 'inventory.json'), ($inventory | ConvertTo-Json), $utf8)
    Write-Host "Inventory: $(($inventory.Keys | ForEach-Object { "$_=$(@($inventory[$_]).Count)" }) -join ', ')"
}

$position = 0
foreach ($entry in $selected) {
    $position++
    $number = ([int] $entry.index).ToString('0000')
    Write-Host "[$position/$($selected.Count)] #$number $($entry.name)"
    $registryKeys = @($entry.registryKeys | Where-Object { $_ })
    $record = [ordered] @{
        index = [int] $entry.index
        id = "$($entry.id)"
        name = "$($entry.name)"
        level = $entry.level
        reversible = [bool] $entry.reversible
        runs = [ordered] @{}
        changes = [ordered] @{}
    }
    $phases = @('apply', 'apply')
    if ($entry.reversible) { $phases += @('revert', 'revert') }
    $initialState = Get-SystemState $registryKeys
    $previousState = $initialState
    $attempt = @{ apply = 0; revert = 0 }
    foreach ($phase in $phases) {
        $attempt[$phase]++
        $label = "$phase$($attempt[$phase])"
        $file = Join-Path $scriptsDirectory "$number.$phase.bat"
        $run = [BatchRunner]::Run($file, $scriptsDirectory, $TimeoutSeconds * 1000)
        $state = Get-SystemState $registryKeys
        $errorLines = @($run.Lines | Where-Object { $_.StartsWith('E ') }).Count
        $record.runs[$label] = [ordered] @{
            exitCode = $run.ExitCode
            timedOut = $run.TimedOut
            seconds = $run.Seconds
            errorLines = $errorLines
            output = [string[]] @(Limit-Lines $run.Lines)
        }
        $record.changes[$label] = [string[]] @(Compare-SystemState $previousState $state)
        $previousState = $state
        Write-Host ("    {0,-8} {1,6}s exit={2} lines={3} errors={4} changes={5}{6}" -f `
            $label, $run.Seconds, $run.ExitCode, $run.Lines.Count, $errorLines, `
            $record.changes[$label].Count, $(if ($run.TimedOut) { ' TIMED OUT' } else { '' }))
    }
    if ($entry.reversible) {
        # What reverting left behind, compared with the machine before the script ran.
        $record.changes['residual'] = [string[]] @(Compare-SystemState $initialState $previousState)
        if ($record.changes['residual'].Count -gt 0) {
            Write-Host "    residual after revert: $($record.changes['residual'].Count)"
        }
    }
    [IO.File]::AppendAllText($resultsPath, (($record | ConvertTo-Json -Depth 6 -Compress) + "`n"), $utf8)
}
Write-Host "Ran $($selected.Count) scripts. Results: $resultsPath"
