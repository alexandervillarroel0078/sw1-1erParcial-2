$ErrorActionPreference = "Stop"
$base = "c:\xampp\htdocs\sw1-1erParcial-2\backend\src\main\java\com\dpn\backend"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

$domains = @(
    "auth", "usuario", "departamento", "politica", "tramite", "tarea",
    "informe", "archivo", "analisis", "cliente", "colaborativo", "notificacion", "formulario"
)

function Convert-DpnPackage([string]$pkg) {
    if ($pkg -match '^com\.dpn\.backend\.model\.([^.]+)\.embedded$') {
        return "com.dpn.backend.$($Matches[1]).model.embedded"
    }
    if ($pkg -match '^com\.dpn\.backend\.model\.([^.]+)\.enums$') {
        return "com.dpn.backend.$($Matches[1]).model.enums"
    }
    if ($pkg -match '^com\.dpn\.backend\.model\.([^.]+)$') {
        return "com.dpn.backend.$($Matches[1]).model"
    }
    if ($pkg -match '^com\.dpn\.backend\.controller\.([^.]+)$') {
        return "com.dpn.backend.$($Matches[1]).controller"
    }
    if ($pkg -match '^com\.dpn\.backend\.service\.([^.]+)$') {
        return "com.dpn.backend.$($Matches[1]).service"
    }
    if ($pkg -match '^com\.dpn\.backend\.repository\.([^.]+)$') {
        return "com.dpn.backend.$($Matches[1]).repository"
    }
    if ($pkg -match '^com\.dpn\.backend\.dto\.([^.]+)$') {
        return "com.dpn.backend.$($Matches[1]).dto"
    }
    return $pkg
}

function Convert-RelPath([string]$rel) {
    $rel = $rel -replace '/', '\'
    if ($rel -match '^model\\([^\\]+)\\embedded\\(.+)$') {
        return "$($Matches[1])\model\embedded\$($Matches[2])"
    }
    if ($rel -match '^model\\([^\\]+)\\enums\\(.+)$') {
        return "$($Matches[1])\model\enums\$($Matches[2])"
    }
    if ($rel -match '^model\\([^\\]+)\\(.+)$') {
        return "$($Matches[1])\model\$($Matches[2])"
    }
    if ($rel -match '^controller\\([^\\]+)\\(.+)$') {
        return "$($Matches[1])\controller\$($Matches[2])"
    }
    if ($rel -match '^service\\([^\\]+)\\(.+)$') {
        return "$($Matches[1])\service\$($Matches[2])"
    }
    if ($rel -match '^repository\\([^\\]+)\\(.+)$') {
        return "$($Matches[1])\repository\$($Matches[2])"
    }
    if ($rel -match '^dto\\([^\\]+)\\(.+)$') {
        return "$($Matches[1])\dto\$($Matches[2])"
    }
    return $null
}

$layerRoots = @("controller", "service", "repository", "dto", "model")
$toMove = @()

foreach ($root in $layerRoots) {
    $rootPath = Join-Path $base $root
    if (-not (Test-Path $rootPath)) { continue }
    Get-ChildItem -Path $rootPath -Recurse -Filter "*.java" | ForEach-Object {
        $rel = $_.FullName.Substring($base.Length + 1)
        $newRel = Convert-RelPath $rel
        if ($null -eq $newRel) {
            throw "Cannot map path: $rel"
        }
        $toMove += [PSCustomObject]@{ Old = $_.FullName; NewRel = $newRel }
    }
}

$moved = @()
foreach ($item in $toMove) {
    $dst = Join-Path $base $item.NewRel
    $dir = Split-Path $dst -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    $content = [System.IO.File]::ReadAllText($item.Old, $utf8NoBom)
    if ($content.Length -gt 0 -and [int][char]$content[0] -eq 0xFEFF) {
        $content = $content.Substring(1)
    }

    if ($content -match '(?m)^package\s+([\w.]+);\s*') {
        $oldPkg = $Matches[1]
        $newPkg = Convert-DpnPackage $oldPkg
        $content = $content -replace '(?m)^package\s+[\w.]+;\s*', "package $newPkg;`r`n`r`n"
    } else {
        throw "No package in $($item.Old)"
    }

    [System.IO.File]::WriteAllText($dst, $content, $utf8NoBom)
    if ($item.Old -ne $dst) {
        Remove-Item $item.Old -Force
    }
    $moved += $item.NewRel
}

# Global import/package reference update
$replacements = @()
foreach ($d in $domains) {
    $replacements += @("com.dpn.backend.model.$d.embedded", "com.dpn.backend.$d.model.embedded")
    $replacements += @("com.dpn.backend.model.$d.enums", "com.dpn.backend.$d.model.enums")
}
foreach ($d in $domains) {
    $replacements += @("com.dpn.backend.controller.$d", "com.dpn.backend.$d.controller")
    $replacements += @("com.dpn.backend.service.$d", "com.dpn.backend.$d.service")
    $replacements += @("com.dpn.backend.repository.$d", "com.dpn.backend.$d.repository")
    $replacements += @("com.dpn.backend.dto.$d", "com.dpn.backend.$d.dto")
}
foreach ($d in $domains) {
    $replacements += @("com.dpn.backend.model.$d", "com.dpn.backend.$d.model")
}

$javaRoots = @(
    "c:\xampp\htdocs\sw1-1erParcial-2\backend\src\main\java",
    "c:\xampp\htdocs\sw1-1erParcial-2\backend\src\test\java"
)
foreach ($jr in $javaRoots) {
    if (-not (Test-Path $jr)) { continue }
    Get-ChildItem -Path $jr -Filter "*.java" -Recurse | ForEach-Object {
        $text = [System.IO.File]::ReadAllText($_.FullName, $utf8NoBom)
        if ($text.Length -gt 0 -and [int][char]$text[0] -eq 0xFEFF) {
            $text = $text.Substring(1)
        }
        $orig = $text
        for ($i = 0; $i -lt $replacements.Length; $i += 2) {
            $text = $text.Replace($replacements[$i], $replacements[$i + 1])
        }
        if ($text -ne $orig) {
            [System.IO.File]::WriteAllText($_.FullName, $text, $utf8NoBom)
        }
    }
}

# Remove empty legacy layer folders
foreach ($root in $layerRoots) {
    $rootPath = Join-Path $base $root
    if ((Test-Path $rootPath) -and -not (Get-ChildItem $rootPath -Recurse -File -ErrorAction SilentlyContinue)) {
        Remove-Item $rootPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Output "MOVED_COUNT=$($moved.Count)"
$moved | Sort-Object
