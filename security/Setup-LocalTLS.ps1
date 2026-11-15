$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$secretDir = Join-Path $projectRoot '.secrets'
if (Test-Path (Join-Path $secretDir 'server.pem')) {
  Write-Host 'Existing certificate preserved. See README.md to regenerate for a changed address.'
  exit 0
}
$mkcert = Get-Command mkcert -ErrorAction SilentlyContinue
$localTool = Join-Path $projectRoot 'tools\mkcert.exe'
if ($mkcert) { $executable = $mkcert.Source }
elseif (Test-Path $localTool) { $executable = $localTool }
else { throw 'Install mkcert from https://github.com/FiloSottile/mkcert/releases and run this script again. No certificate trust changes have been made.' }
New-Item -ItemType Directory -Force (Join-Path $secretDir 'ca') | Out-Null
$env:CAROOT = Join-Path $secretDir 'ca'
$addresses = @(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress -Unique)
& $executable -cert-file (Join-Path $secretDir 'server.pem') -key-file (Join-Path $secretDir 'server-key.pem') localhost 127.0.0.1 ::1 @addresses
if ($LASTEXITCODE -ne 0) { throw 'Certificate generation failed.' }
Copy-Item (Join-Path $env:CAROOT 'rootCA.pem') (Join-Path $PSScriptRoot 'explorers-local-ca.crt')
Write-Host 'Certificate created. Review and install the public CA with Trust-Explorers-Certificate.ps1 on each client. Never copy .secrets.'
