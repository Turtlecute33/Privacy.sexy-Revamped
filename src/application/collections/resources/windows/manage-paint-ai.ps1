[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Disable', 'Restore')]
    [string] $Action
)

$ErrorActionPreference = 'Stop'
$policyPath = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Policies\Paint'
$valueNames = @('DisableCocreator', 'DisableGenerativeFill', 'DisableImageCreator')
$stateDirectory = Join-Path $env:ProgramData 'privacy.sexy\state'
$statePath = Join-Path $stateDirectory 'paint-ai.json'

function Protect-StateDirectory {
    if (-not (Test-Path -LiteralPath $stateDirectory)) {
        New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
    }

    $inheritance = [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
    $propagation = [System.Security.AccessControl.PropagationFlags]::None
    $access = [System.Security.AccessControl.AccessControlType]::Allow
    $acl = New-Object System.Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($sidValue in @('S-1-5-18', 'S-1-5-32-544')) {
        $sid = New-Object System.Security.Principal.SecurityIdentifier($sidValue)
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            $sid,
            [System.Security.AccessControl.FileSystemRights]::FullControl,
            $inheritance,
            $propagation,
            $access
        )
        $acl.AddAccessRule($rule)
    }
    Set-Acl -LiteralPath $stateDirectory -AclObject $acl
}

function Get-CurrentValue([string] $Name) {
    $key = Get-Item -LiteralPath $policyPath -ErrorAction SilentlyContinue
    if (($null -eq $key) -or ($key.GetValueNames() -notcontains $Name)) {
        return [ordered]@{ Exists = $false }
    }
    return [ordered]@{
        Exists = $true
        Kind = $key.GetValueKind($Name).ToString()
        Data = $key.GetValue(
            $Name,
            $null,
            [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
        )
    }
}

function Save-OriginalState {
    if (Test-Path -LiteralPath $statePath) {
        Write-Host "Original Paint policy state is already recorded at `"$statePath`"."
        return
    }

    Protect-StateDirectory
    $values = [ordered]@{}
    foreach ($name in $valueNames) {
        $values[$name] = Get-CurrentValue $name
    }
    $state = [ordered]@{
        Version = 1
        KeyExisted = (Test-Path -LiteralPath $policyPath)
        Values = $values
    }
    $temporaryPath = "$statePath.$([Guid]::NewGuid().ToString('N')).tmp"
    try {
        $json = $state | ConvertTo-Json -Depth 8
        [System.IO.File]::WriteAllText(
            $temporaryPath,
            $json,
            (New-Object System.Text.UTF8Encoding($false))
        )
        Move-Item -LiteralPath $temporaryPath -Destination $statePath -Force
    } finally {
        Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
    }
}

function Restore-Value([string] $Name, $OriginalState) {
    $current = Get-CurrentValue $Name
    if (-not $current.Exists -or $current.Kind -ne 'DWord' -or [int64]$current.Data -ne 1) {
        Write-Warning "Skipping `"$Name`" because it changed after privacy.sexy applied it."
        return $false
    }

    if (-not $OriginalState.Exists) {
        Remove-ItemProperty -LiteralPath $policyPath -Name $Name -ErrorAction Stop
        Write-Host "Removed `"$Name`" because it did not exist before the change."
        return $true
    }

    $data = $OriginalState.Data
    switch ($OriginalState.Kind) {
        'Binary' { $data = [byte[]]@($data) }
        'None' { $data = [byte[]]@($data) }
        'DWord' { $data = [int32]$data }
        'QWord' { $data = [int64]$data }
        'MultiString' { $data = [string[]]@($data) }
        default { $data = [string]$data }
    }
    New-ItemProperty `
        -LiteralPath $policyPath `
        -Name $Name `
        -PropertyType $OriginalState.Kind `
        -Value $data `
        -Force `
        | Out-Null
    Write-Host "Restored the original `"$Name`" value."
    return $true
}

$windowsVersion = [Environment]::OSVersion.Version
if (($windowsVersion.Major -lt 10) -or ($windowsVersion.Build -lt 22621)) {
    Write-Host 'Skipping: Paint generative-feature policies require Windows 11 build 22621 or later.'
    exit 0
}

if ($Action -eq 'Disable') {
    Save-OriginalState
    New-Item -Path $policyPath -Force | Out-Null
    foreach ($name in $valueNames) {
        New-ItemProperty -LiteralPath $policyPath -Name $name -PropertyType DWord -Value 1 -Force | Out-Null
        Write-Host "Disabled Paint feature through policy `"$name`"."
    }
    exit 0
}

if (-not (Test-Path -LiteralPath $statePath)) {
    Write-Host 'Skipping: no Paint policy state recorded by privacy.sexy was found.'
    exit 0
}

$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
if ($state.Version -ne 1) {
    throw "Unsupported Paint policy state version: $($state.Version)."
}

$restoredAllValues = $true
foreach ($name in $valueNames) {
    if (-not (Restore-Value $name $state.Values.$name)) {
        $restoredAllValues = $false
    }
}
if ($restoredAllValues) {
    if (-not $state.KeyExisted -and (Test-Path -LiteralPath $policyPath)) {
        $restoredKey = Get-Item -LiteralPath $policyPath
        if ($restoredKey.GetValueNames().Count -eq 0 -and $restoredKey.GetSubKeyNames().Count -eq 0) {
            Remove-Item -LiteralPath $policyPath
            Write-Host 'Removed the Paint policy key because it did not exist before the change.'
        }
    }
    Remove-Item -LiteralPath $statePath -Force
    Write-Host 'Restored all Paint policies and removed the saved state.'
} else {
    Write-Warning "Saved state remains at `"$statePath`" because at least one value was not restored."
}
