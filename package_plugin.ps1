# Set the current directory path manually
# $currentDirectory = "C:\Users\Bruger\OneDrive\03_Resources\ThunderAI-Sparks"
$currentDirectory = Get-Location
# Define the new .xpi file path
$xpiFilePath = Join-Path -Path $currentDirectory -ChildPath "MyScriptDirectory.xpi"

# Remove the existing .xpi file if it exists
if (Test-Path $xpiFilePath) {
    Remove-Item $xpiFilePath
}

# Use 7-Zip to create the .xpi file
& "C:\Program Files\7-Zip\7z.exe" a -tzip "$xpiFilePath" "$currentDirectory\*"
