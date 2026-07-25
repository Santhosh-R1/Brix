# Get the absolute path to the release binaries
$binPath = Resolve-Path ".\target\release"
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")

# Check if path already exists to avoid duplicates
if ($currentPath -notmatch [regex]::Escape($binPath.Path)) {
    $newPath = $currentPath + ";" + $binPath.Path
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    
    # Set the 'openprix' variable specifically if needed for other scripts
    [Environment]::SetEnvironmentVariable("OPENPRIX_HOME", $binPath.Path, "User")
    
    Write-Host "SUCCESS: OpenPrix added to PATH." -ForegroundColor Green
    Write-Host "Restart your terminal to use 'openprix' or 'openprix --t'." -ForegroundColor Yellow
}
else {
    Write-Host "OpenPrix is already in your environment variables." -ForegroundColor Cyan
}