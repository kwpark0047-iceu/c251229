param([string]$Candidate = 'release-safety-foundation-20261020-v6')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $root '.local-state/runtimes/node-v24.22.0-win-x64'
$node = Join-Path $runtime 'node.exe'
if (!(Test-Path -LiteralPath $node -PathType Leaf)) { throw 'Verified portable Node v24.22.0 is required.' }
if ($Candidate -notmatch '^release-safety-[a-z0-9-]{1,64}$') { throw 'Invalid candidate name.' }
$oldPath = $env:PATH
try {
    # 하위 npm 명령에도 격리 Node를 적용하고 전역 설정은 변경하지 않는다.
    $env:PATH = $runtime + [IO.Path]::PathSeparator + $oldPath
    $check = @'
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const semver = require(path.join(path.dirname(process.execPath), 'node_modules/npm/node_modules/semver'));
if (process.version !== 'v24.22.0') throw Error('Unexpected runtime');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'tmp', process.argv[1], 'package-lock.json')));
const failures = [];
for (const [name, pkg] of Object.entries(lock.packages)) {
  if (name && !fs.existsSync(path.join(root, 'tmp', process.argv[1], name, 'package.json'))) continue;
  if (pkg.engines?.node && !semver.satisfies(process.version, pkg.engines.node)) failures.push({name, engine: pkg.engines.node});
}
if (failures.length) throw Error(JSON.stringify(failures));
console.log(JSON.stringify({node:process.version, executable:process.execPath, engineMismatches:failures.length}));
'@
    Push-Location $root
    try {
        & $node -e $check $Candidate
        if ($LASTEXITCODE -ne 0) { throw 'Dependency engine preflight failed.' }
        & $node scripts/release-safety.mjs verify $Candidate
        if ($LASTEXITCODE -ne 0) { throw 'Sequential verification failed.' }
    } finally { Pop-Location }
} finally { $env:PATH = $oldPath }
