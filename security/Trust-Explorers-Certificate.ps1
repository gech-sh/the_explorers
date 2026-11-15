# Run on the other PC after copying this script and explorers-local-ca.crt together.
# Installs only this workspace's public CA certificate for the current Windows user.
$certificate = Join-Path $PSScriptRoot 'explorers-local-ca.crt'
if (-not (Test-Path -LiteralPath $certificate)) { throw 'Public CA certificate is missing.' }
Import-Certificate -FilePath $certificate -CertStoreLocation Cert:\CurrentUser\Root
Write-Host 'Certificate installed. Open https://172.31.98.222:8788.'
