# Script para consolidar código fuente
$outputFile = "proyecto_contexto.txt"
$ignoreFolders = @("node_modules", ".git", ".next", "dist", "build", "coverage", ".vscode", "android", "out")
$ignoreFiles = @("package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".DS_Store", "proyecto_contexto.txt")

# Limpiar archivo previo si existe
if (Test-Path $outputFile) { Remove-Item $outputFile }

Get-ChildItem -Recurse | Where-Object {
    $path = $_.FullName
    $shouldIgnore = $false
    foreach ($folder in $ignoreFolders) {
        if ($path -like "*\$folder\*") { $shouldIgnore = $true; break }
    }
    return -not $shouldIgnore -and -not $_.PSIsContainer -and ($ignoreFiles -notcontains $_.Name)
} | ForEach-Object {
    Add-Content -Path $outputFile -Value "`n=================================================="
    Add-Content -Path $outputFile -Value "FILE: $($_.FullName.Replace($(Get-Location).Path, ''))"
    Add-Content -Path $outputFile -Value "==================================================`n"
    Get-Content $_.FullName | Add-Content -Path $outputFile
}

Write-Host "¡Listo! Se ha creado el archivo proyecto_contexto.txt" -ForegroundColor Green