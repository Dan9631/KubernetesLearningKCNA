<#
  kcna.ps1 - CLI del laboratorio personal KCNA (kind + Podman)

  Uso:  .\kcna.ps1 <comando> [argumentos]
        .\kcna.ps1 help
#>
param(
    [Parameter(Position = 0)][string]$Command = 'help',
    [Parameter(Position = 1, ValueFromRemainingArguments = $true)][string[]]$Rest,
    [switch]$Install   # para: .\kcna.ps1 setup -Install
)

$ErrorActionPreference = 'Stop'
$Root        = $PSScriptRoot
$ClusterName = 'kcna'
$Nodes       = @("$ClusterName-control-plane", "$ClusterName-worker", "$ClusterName-worker2")
$KindConfig  = Join-Path $Root 'cluster\kind-kcna.yaml'
$Headlamp    = Join-Path $env:LOCALAPPDATA 'Programs\Headlamp\Headlamp.exe'

# Versiones fijadas de los addons
$MetricsServerVersion = 'v0.9.0'
$GatewayApiVersion    = 'v1.6.3'   # debe coincidir con la que usa Traefik (go.mod de traefik)
$TraefikChartVersion  = '42.1.3'
$KubectlChannel       = 'stable-1.37'   # misma version menor que kindest/node de kind 0.33

# Aislamiento: este script SOLO habla con el cluster local, nunca con ~/.kube/config
$env:KUBECONFIG = Join-Path $Root '.kube\kcna-config'
$env:KIND_EXPERIMENTAL_PROVIDER = 'podman'
$KcnaBin = Join-Path $Root '.bin'
if ((Test-Path (Join-Path $KcnaBin 'kubectl.exe')) -and ($env:PATH -notlike "$KcnaBin;*")) { $env:PATH = "$KcnaBin;$env:PATH" }

function Info($m)  { Write-Host "==> $m" -ForegroundColor Cyan }
function Ok($m)    { Write-Host "  OK  $m" -ForegroundColor Green }
function Warn($m)  { Write-Host "  !!  $m" -ForegroundColor Yellow }
function Fail($m)  { Write-Host "  XX  $m" -ForegroundColor Red }

function Invoke-Native {
    # Ejecuta un binario sin que PowerShell 5.1 trate stderr como excepcion
    param([string]$Exe, [string[]]$Arguments)
    $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    try { & $Exe @Arguments 2>&1 | ForEach-Object { "$_" } } finally { $ErrorActionPreference = $old }
}

function Test-ClusterExists {
    $list = Invoke-Native kind @('get', 'clusters')
    return ($list -contains $ClusterName)
}

function Assert-Cluster {
    if (-not (Test-ClusterExists)) { Fail "El cluster '$ClusterName' no existe. Ejecuta: .\kcna.ps1 up"; exit 1 }
}

function Get-LabDir([string]$Id) {
    if (-not $Id) { Fail 'Indica el numero de lab, ej: 03'; exit 1 }
    $Id = $Id.PadLeft(2, '0')
    $dir = Get-ChildItem (Join-Path $Root 'labs') -Directory -Filter "$Id-*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $dir) { Fail "No existe labs\$Id-*"; exit 1 }
    return $dir
}

# ---------------------------------------------------------------------------
# Imagenes: los nodos de kind no salen a internet (el proxy corporativo de la
# VM de Podman solo acepta la red por defecto de Podman). Por eso se descargan
# con Podman en el host y se cargan al cluster con "kind load image-archive".
# ---------------------------------------------------------------------------
function Test-ImageInCluster([string]$Image) {
    $null = Invoke-Native podman @('exec', $Nodes[1], 'crictl', 'inspecti', $Image)
    return ($LASTEXITCODE -eq 0)
}

function Import-Images([string[]]$Images, [switch]$Force) {
    Assert-Cluster
    foreach ($img in ($Images | Where-Object { $_ } | Select-Object -Unique)) {
        if (-not $Force -and (Test-ImageInCluster $img)) { Ok "ya cargada: $img"; continue }
        $null = Invoke-Native podman @('image', 'exists', $img)
        if ($LASTEXITCODE -ne 0) {
            Info "Descargando $img"
            $out = Invoke-Native podman @('pull', $img)
            if ($LASTEXITCODE -ne 0) { Fail "No se pudo descargar $img"; $out | Select-Object -Last 3 | Write-Host; continue }
        }
        $tar = Join-Path $env:TEMP ("kcna-" + [guid]::NewGuid().ToString('N') + '.tar')
        try {
            $null = Invoke-Native podman @('save', '-o', $tar, $img)
            $null = Invoke-Native kind @('load', 'image-archive', $tar, '--name', $ClusterName)
            if ($LASTEXITCODE -ne 0) { Warn "reintentando kind load de $img"; $null = Invoke-Native kind @('load', 'image-archive', $tar, '--name', $ClusterName) }
            if ($LASTEXITCODE -eq 0) { Ok "cargada en el cluster: $img" } else { Fail "kind load fallo para $img" }
        } finally { Remove-Item $tar -ErrorAction SilentlyContinue }
    }
}

function Get-ImagesFromFile([string]$Path) {
    Get-Content $Path | ForEach-Object { ($_ -replace '#.*$', '').Trim() } | Where-Object { $_ }
}

function Get-ChartImages {
    # helm template <args> -> lista de imagenes referenciadas
    param([string[]]$HelmArgs)
    $yaml = Invoke-Native helm (@('template') + $HelmArgs)
    $yaml | Select-String -Pattern '^\s*-?\s*image:\s*"?([^"\s]+)"?' | ForEach-Object { $_.Matches[0].Groups[1].Value } | Select-Object -Unique
}

# ---------------------------------------------------------------------------
function Install-Addons {
    Info 'metrics-server (necesario para kubectl top y HPA)'
    Import-Images @("registry.k8s.io/metrics-server/metrics-server:$MetricsServerVersion")
    $null = Invoke-Native kubectl @('apply', '-f', "https://github.com/kubernetes-sigs/metrics-server/releases/download/$MetricsServerVersion/components.yaml")
    $hasFlag = Invoke-Native kubectl @('-n', 'kube-system', 'get', 'deploy', 'metrics-server', '-o', 'jsonpath={.spec.template.spec.containers[0].args}')
    if ("$hasFlag" -notmatch 'kubelet-insecure-tls') {
        $patch = '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
        $tmp = Join-Path $env:TEMP 'kcna-ms-patch.json'; Set-Content $tmp $patch -Encoding ascii
        $null = Invoke-Native kubectl @('-n', 'kube-system', 'patch', 'deployment', 'metrics-server', '--type=json', "--patch-file=$tmp")
        Remove-Item $tmp
    }
    Ok 'metrics-server aplicado'

    Info "Gateway API CRDs $GatewayApiVersion"
    $null = Invoke-Native kubectl @('apply', '--server-side', '-f', "https://github.com/kubernetes-sigs/gateway-api/releases/download/$GatewayApiVersion/standard-install.yaml")
    Ok 'CRDs de Gateway API instalados'

    Info 'Traefik (Ingress + Gateway API) -> http://localhost:8080'
    $null = Invoke-Native helm @('repo', 'add', 'traefik', 'https://traefik.github.io/charts')
    $null = Invoke-Native helm @('repo', 'update', 'traefik')
    $traefikArgs = @('traefik', 'traefik/traefik', '--version', $TraefikChartVersion, '-n', 'traefik',
        '-f', (Join-Path $Root 'cluster\traefik-values.yaml'))
    Import-Images (Get-ChartImages $traefikArgs)
    $out = Invoke-Native helm (@('upgrade', '--install') + $traefikArgs + @('--create-namespace', '--wait', '--timeout', '5m'))
    if ($LASTEXITCODE -eq 0) { Ok 'Traefik instalado' } else { Fail 'Traefik fallo'; $out | Select-Object -Last 5 | Write-Host }
}

# ---------------------------------------------------------------------------
# Instalacion en una maquina nueva: .\kcna.ps1 setup [-Install]
# Sin -Install solo diagnostica y dice que ejecutar; con -Install instala con winget.
# ---------------------------------------------------------------------------
$Tools = @(
    @{ Name = 'podman'; Id = 'RedHat.Podman';      Required = $true;  Why = 'motor de contenedores (los nodos del cluster son contenedores)' },
    @{ Name = 'kind';   Id = 'Kubernetes.kind';    Required = $true;  Why = 'crea el cluster de Kubernetes sobre Podman' },
    @{ Name = 'helm';   Id = 'Helm.Helm';          Required = $true;  Why = 'instala Traefik y los labs de Prometheus/Argo CD' },
    @{ Name = 'git';    Id = 'Git.Git';            Required = $true;  Why = 'clonar y actualizar el curso' },
    @{ Name = 'k9s';    Id = 'Derailed.k9s';       Required = $false; Why = 'UI de terminal (opcional)' },
    @{ Name = 'node';   Id = 'OpenJS.NodeJS.LTS';  Required = $false; Why = 'solo para el sitio web en web/ (opcional)' }
)

function Update-SessionPath {
    $env:PATH = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
    if ((Test-Path (Join-Path $KcnaBin 'kubectl.exe')) -and ($env:PATH -notlike "$KcnaBin;*")) { $env:PATH = "$KcnaBin;$env:PATH" }
}

function Install-LabKubectl {
    # kubectl con la misma version que el cluster, en .bin\ (no toca el kubectl global)
    $exe = Join-Path $KcnaBin 'kubectl.exe'
    if (Test-Path $exe) { Ok "kubectl del lab: $exe"; return $true }
    Info "Descargando kubectl ($KubectlChannel) a .bin\ desde dl.k8s.io"
    $oldProgress = $ProgressPreference; $ProgressPreference = 'SilentlyContinue'
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $ver = (Invoke-WebRequest -UseBasicParsing "https://dl.k8s.io/release/$KubectlChannel.txt").Content.Trim()
        $url = "https://dl.k8s.io/release/$ver/bin/windows/amd64/kubectl.exe"
        New-Item -ItemType Directory -Force $KcnaBin | Out-Null
        $tmp = "$exe.download"
        Invoke-WebRequest -UseBasicParsing $url -OutFile $tmp
        $expected = (Invoke-WebRequest -UseBasicParsing "$url.sha256").Content.Trim().ToLower()
        $actual = (Get-FileHash $tmp -Algorithm SHA256).Hash.ToLower()
        if ($expected -ne $actual) { Remove-Item $tmp -Force; Fail 'El checksum de kubectl no coincide; descarga descartada'; return $false }
        Move-Item $tmp $exe -Force
        Update-SessionPath
        Ok "kubectl $ver descargado y verificado (sha256)"
        return $true
    } catch { Fail "No se pudo descargar kubectl: $($_.Exception.Message)"; return $false }
    finally { $ProgressPreference = $oldProgress }
}

function Invoke-Setup([switch]$Install) {
    $problems = 0
    Info 'Sistema'
    $os = Get-CimInstance Win32_OperatingSystem
    $ramGb = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
    Ok "$($os.Caption) ($($os.Version)), RAM $ramGb GB"
    if ($ramGb -lt 12) { Warn 'Con menos de 12 GB de RAM el cluster de 3 nodos ira justo: cierra apps pesadas mientras estudias' }

    Info 'Herramientas'
    $hasWinget = [bool](Get-Command winget -ErrorAction SilentlyContinue)
    foreach ($t in $Tools) {
        if (Get-Command $t.Name -ErrorAction SilentlyContinue) { Ok "$($t.Name)"; continue }
        $cmd = "winget install --id $($t.Id) -e --source winget"
        if ($Install -and $hasWinget) {
            Info "Instalando $($t.Name) ($($t.Why))"
            $null = Invoke-Native winget @('install', '--id', $t.Id, '-e', '--source', 'winget', '--silent', '--accept-package-agreements', '--accept-source-agreements')
            Update-SessionPath
            if (Get-Command $t.Name -ErrorAction SilentlyContinue) { Ok "$($t.Name) instalado" }
            else { Warn "$($t.Name) instalado pero no aparece en esta terminal: abre una terminal nueva y repite setup" ; $problems++ }
        } elseif ($t.Required) { Fail "$($t.Name) falta ($($t.Why)). Instala con:  $cmd"; $problems++ }
        else { Warn "$($t.Name) no instalado ($($t.Why)). Opcional:  $cmd" }
    }
    if (-not (Test-Path $Headlamp)) { Warn 'Headlamp no instalado (UI de escritorio, opcional): winget install --id Headlamp.Headlamp -e --source winget' }
    else { Ok 'Headlamp' }

    Info 'WSL2 (Podman en Windows corre dentro de WSL)'
    $null = Invoke-Native wsl.exe @('--status')
    if ($LASTEXITCODE -eq 0) { Ok 'WSL disponible' }
    else { Fail 'WSL2 no esta activo. En una terminal de administrador:  wsl --install  (y reinicia)'; $problems++ }

    Info 'kubectl del laboratorio'
    if (-not (Install-LabKubectl)) { $problems++ }

    Info 'Puertos que publica el cluster en Windows (8080, 8443, 30080)'
    if (Test-ClusterExists) { Ok 'El cluster ya existe: los puertos son suyos' }
    else {
        $busy = foreach ($p in 8080, 8443, 30080) {
            $c = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($c) { "$p (proceso $((Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue).ProcessName))" }
        }
        if ($busy) { Fail "Puertos ocupados: $($busy -join ', '). Libera esos puertos o cambia hostPort en cluster\kind-kcna.yaml"; $problems++ }
        else { Ok 'Libres' }
    }

    Info 'Maquina de Podman'
    if (-not (Get-Command podman -ErrorAction SilentlyContinue)) { Warn 'Instala Podman primero' }
    else {
        $machines = Invoke-Native podman @('machine', 'list', '--format', '{{.Name}}')
        if (-not ($machines | Where-Object { $_ -match '\S' })) {
            if ($Install) {
                Info 'Creando podman machine (rootful, necesaria para kind). Tarda unos minutos...'
                $null = Invoke-Native podman @('machine', 'init', '--rootful', '--now')
            } else { Fail 'No hay podman machine. Crea una con:  podman machine init --rootful --now'; $problems++ }
        }
        $state = "$(Invoke-Native podman @('machine', 'inspect', '--format', '{{.State}}'))"
        $rootful = "$(Invoke-Native podman @('machine', 'inspect', '--format', '{{.Rootful}}'))"
        if ($state -notmatch 'running') {
            if ($Install) { $null = Invoke-Native podman @('machine', 'start'); $state = 'running' }
            else { Warn 'La podman machine esta apagada:  podman machine start' }
        }
        if ($rootful -match 'true') { Ok "podman machine rootful, estado: $state" }
        elseif ($Install) {
            Info 'Cambiando la podman machine a rootful (kind lo necesita en Windows)'
            $null = Invoke-Native podman @('machine', 'stop'); $null = Invoke-Native podman @('machine', 'set', '--rootful'); $null = Invoke-Native podman @('machine', 'start')
            Ok 'podman machine ahora es rootful'
        } else { Fail 'La podman machine no es rootful. Cambiala con:  podman machine stop; podman machine set --rootful; podman machine start'; $problems++ }
    }

    Info 'Memoria para WSL (donde corre la podman machine)'
    $wslconfig = Join-Path $env:USERPROFILE '.wslconfig'
    $mem = if (Test-Path $wslconfig) { (Select-String -Path $wslconfig -Pattern '^\s*memory\s*=\s*(\S+)' | Select-Object -First 1).Matches.Groups[1].Value } else { $null }
    if ($mem) { Ok "memory=$mem en .wslconfig" } else { Ok "Sin limite en .wslconfig: WSL usa hasta el 50% de la RAM (~$([math]::Floor($ramGb / 2)) GB)" }

    Info 'Aislamiento'
    Ok "El laboratorio usa solo $env:KUBECONFIG; tu ~/.kube/config no se lee ni se modifica"

    Write-Host ''
    if ($problems -eq 0) { Write-Host '  Todo listo. Siguiente paso:  .\kcna.ps1 up' -ForegroundColor Green }
    else { Write-Host "  Hay $problems punto(s) pendientes. Corrigelos (o ejecuta .\kcna.ps1 setup -Install) y repite." -ForegroundColor Yellow }
}

function Invoke-Up {
    $null = Install-LabKubectl
    Info 'Verificando maquina de Podman'
    $state = Invoke-Native podman @('machine', 'inspect', '--format', '{{.State}}')
    if ("$state" -notmatch 'running') { Info 'Iniciando podman machine...'; $null = Invoke-Native podman @('machine', 'start') }
    Ok 'Podman listo'

    if (Test-ClusterExists) {
        Ok "El cluster '$ClusterName' ya existe"
        $null = Invoke-Native podman (@('start') + $Nodes)
    } else {
        Info "Creando cluster '$ClusterName' (1 control-plane + 2 workers). Tarda 1-3 minutos..."
        $out = Invoke-Native kind @('create', 'cluster', '--config', $KindConfig, '--wait', '180s')
        if ($LASTEXITCODE -ne 0) { Fail 'kind create fallo'; $out | Write-Host; exit 1 }
        Ok 'Cluster creado'
    }
    Install-Addons
    Info 'Precargando imagenes de los labs (labs\*\images.txt)'
    Invoke-Preload
    Write-Host ''
    Invoke-Status
    Write-Host ''
    Write-Host 'Siguiente paso:  . .\kcna-env.ps1   (carga kubectl apuntando al cluster de practica)' -ForegroundColor Green
}

function Invoke-Preload([string]$Id) {
    $files = if ($Id) { Get-ChildItem (Get-LabDir $Id).FullName -Filter images.txt }
             else { Get-ChildItem (Join-Path $Root 'labs') -Recurse -Filter images.txt -ErrorAction SilentlyContinue }
    $imgs = $files | ForEach-Object { Get-ImagesFromFile $_.FullName }
    if ($imgs) { Import-Images $imgs } else { Warn 'No hay images.txt en los labs' }
}

function Invoke-Status {
    if (-not (Test-ClusterExists)) { Warn "Cluster '$ClusterName' no existe (.\kcna.ps1 up)"; return }
    Info 'Nodos'
    Invoke-Native kubectl @('get', 'nodes', '-o', 'wide') | Write-Host
    Info 'Pods con problemas (si no aparece nada, todo bien)'
    Invoke-Native kubectl @('get', 'pods', '-A', '--field-selector=status.phase!=Running,status.phase!=Succeeded') | Write-Host
    Info 'Namespaces de labs'
    Invoke-Native kubectl @('get', 'ns', '-l', 'kcna-lab') | Write-Host
}

function Invoke-Doctor {
    Info 'Herramientas'
    foreach ($t in 'podman', 'kubectl', 'kind', 'helm', 'k9s') {
        $c = Get-Command $t -ErrorAction SilentlyContinue
        if ($c) { Ok "$t -> $($c.Source)" } else { Fail "$t no encontrado (scoop install $t)" }
    }
    if (Test-Path $Headlamp) { Ok "Headlamp -> $Headlamp" } else { Warn 'Headlamp no instalado (winget install Headlamp.Headlamp --source winget)' }
    Info 'Podman'
    Invoke-Native podman @('machine', 'list') | Write-Host
    Info 'Aislamiento de kubeconfig'
    Ok "Lab usa: $env:KUBECONFIG"
    $default = Join-Path $env:USERPROFILE '.kube\config'
    if (Test-Path $default) {
        $ctx = Invoke-Native kubectl @('--kubeconfig', $default, 'config', 'current-context')
        Ok "Tu kubeconfig por defecto sigue en: $ctx (no se usa en los labs)"
    }
    Invoke-Status
}

# Usada por labs\NN-*\check.ps1
$script:CheckPass = 0; $script:CheckFail = 0
function Check([string]$Description, [scriptblock]$Test) {
    $ok = $false
    try { $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'; $ok = [bool](& $Test 2>$null) } catch { $ok = $false } finally { $ErrorActionPreference = $old }
    if ($ok) { Ok $Description; $script:CheckPass++ } else { Fail $Description; $script:CheckFail++ }
}

function Invoke-Check([string]$Id) {
    Assert-Cluster
    $dir = Get-LabDir $Id
    $file = Join-Path $dir.FullName 'check.ps1'
    if (-not (Test-Path $file)) { Warn "El lab $($dir.Name) no tiene check.ps1"; return }
    Info "Verificando $($dir.Name)"
    . $file
    Write-Host ''
    if ($script:CheckFail -eq 0) { Write-Host "  Lab completado: $script:CheckPass/$script:CheckPass" -ForegroundColor Green }
    else { Write-Host "  Te faltan $script:CheckFail de $($script:CheckPass + $script:CheckFail). Revisa el reto en el modulo." -ForegroundColor Yellow }
}

function Invoke-Lab([string]$Id) {
    Assert-Cluster
    $dir = Get-LabDir $Id
    $ns = "lab-$($Id.PadLeft(2, '0'))"
    $null = Invoke-Native kubectl @('create', 'namespace', $ns)
    $null = Invoke-Native kubectl @('label', 'namespace', $ns, 'kcna-lab=true', '--overwrite')
    Invoke-Preload $Id
    $modulo = Get-ChildItem (Join-Path $Root 'curso') -Filter "$($Id.PadLeft(2, '0'))-*.md" | Select-Object -First 1
    Ok "Namespace listo: $ns"
    Ok "Manifiestos: $($dir.FullName)"
    if ($modulo) { Ok "Guia: $($modulo.FullName)" }
    Write-Host "Tip: kubectl config set-context --current --namespace=$ns" -ForegroundColor Green
}

function Invoke-Reset([string]$Id) {
    Assert-Cluster
    $dir = Get-LabDir $Id
    $ns = "lab-$($Id.PadLeft(2, '0'))"
    $resetScript = Join-Path $dir.FullName 'reset.ps1'
    if (Test-Path $resetScript) { Info 'Limpiando recursos fuera del namespace'; . $resetScript }
    Info "Borrando namespace $ns"
    Invoke-Native kubectl @('delete', 'namespace', $ns, '--ignore-not-found') | Write-Host
    $null = Invoke-Native kubectl @('config', 'set-context', '--current', '--namespace=default')
    Ok 'Listo. Puedes repetir el lab desde cero.'
}

# Sitio web del curso: construye en Windows, empaqueta con nginx y lo publica en el cluster
function Invoke-Site([string]$Action) {
    $web = Join-Path $Root 'web'
    if ($Action -eq 'dev') { Set-Location $web; & npm run dev; return }
    if ($Action -eq 'down') { Assert-Cluster; Invoke-Native kubectl @('delete', '-k', (Join-Path $web 'k8s'), '--ignore-not-found') | Write-Host; return }
    Assert-Cluster
    $tag = 'localhost/kcna-web:' + (Get-Date -Format 'yyyyMMdd-HHmm')
    Info 'Construyendo el sitio (npm run build con PUBLIC_BASE=/curso)'
    Push-Location $web
    try {
        if (-not (Test-Path 'node_modules')) { $null = Invoke-Native npm @('install', '--no-audit', '--no-fund') }
        $env:PUBLIC_BASE = '/curso'
        $out = Invoke-Native npm @('run', 'build')
        if ($LASTEXITCODE -ne 0) { Fail 'npm run build fallo'; $out | Select-Object -Last 15 | Write-Host; return }
    } finally { Pop-Location; Remove-Item Env:PUBLIC_BASE -ErrorAction SilentlyContinue }
    Info "Construyendo la imagen $tag"
    $out = Invoke-Native podman @('build', '-t', $tag, '--build-arg', 'PUBLIC_BASE=/curso', '-f', (Join-Path $web 'Containerfile'), $Root)
    if ($LASTEXITCODE -ne 0) { Fail 'podman build fallo'; $out | Select-Object -Last 10 | Write-Host; return }
    Import-Images @($tag) -Force
    Info 'Publicando en el namespace kcna-web'
    $null = Invoke-Native kubectl @('apply', '-k', (Join-Path $web 'k8s'))
    $null = Invoke-Native kubectl @('-n', 'kcna-web', 'set', 'image', 'deployment/kcna-web', "web=$tag")
    Invoke-Native kubectl @('-n', 'kcna-web', 'rollout', 'status', 'deployment/kcna-web', '--timeout=120s') | Write-Host
    Ok 'Sitio publicado: http://localhost:8080/curso/'
}

function Show-Help {
@"

  KCNA Lab CLI  (cluster local kind sobre Podman, aislado de tus clusters de trabajo)

  INSTALACION (maquina nueva)
    setup              Revisa requisitos y dice que falta (no cambia nada)
    setup -Install     Instala lo que falte con winget y prepara la podman machine

  CLUSTER
    up                 Crea/arranca el cluster + addons (metrics-server, Traefik, Gateway API)
    stop | start       Apaga / enciende los nodos (libera RAM sin perder nada)
    down               Elimina el cluster por completo
    status             Nodos y pods con problemas
    doctor             Diagnostico de herramientas y aislamiento

  LABS
    lab <NN>           Prepara el lab NN (namespace lab-NN + imagenes)
    check <NN>         Verifica automaticamente el reto del lab NN
    reset <NN>         Borra todo lo del lab NN para repetirlo

  IMAGENES (los nodos no salen a internet; se cargan desde Podman)
    load <img> [...]   Descarga con podman y carga al cluster  ej: load nginx:1.27-alpine
    preload [NN]       Carga las imagenes listadas en labs\*\images.txt
    chart-images <args de helm template>   Carga las imagenes de un chart de Helm

  HERRAMIENTAS VISUALES
    ui                 Abre Headlamp (UI de escritorio de Kubernetes) apuntando al lab
    k9s                Abre k9s (UI de terminal)
    quiz               Abre la app de preguntas tipo examen (version simple)

  SITIO WEB DEL CURSO (web\)
    site dev           Servidor de desarrollo en http://localhost:4321
    site               Construye el sitio y lo publica en el cluster: http://localhost:8080/curso
    site down          Quita el sitio del cluster

  Primera vez:   .\kcna.ps1 up    y luego    . .\kcna-env.ps1

"@ | Write-Host
}

switch ($Command.ToLower()) {
    'setup'        { Invoke-Setup -Install:$Install }
    'up'           { Invoke-Up }
    'down'         { Info "Eliminando cluster $ClusterName"; Invoke-Native kind @('delete', 'cluster', '--name', $ClusterName) | Write-Host }
    'stop'         { Info 'Deteniendo nodos'; Invoke-Native podman (@('stop') + $Nodes) | Write-Host }
    'start'        { Info 'Iniciando nodos'; Invoke-Native podman (@('start') + $Nodes) | Write-Host; Start-Sleep 15; Invoke-Status }
    'status'       { Invoke-Status }
    'doctor'       { Invoke-Doctor }
    'addons'       { Assert-Cluster; Install-Addons }
    'load'         { Import-Images $Rest }
    'preload'      { Invoke-Preload ($Rest | Select-Object -First 1) }
    'chart-images' { Import-Images (Get-ChartImages $Rest) }
    'lab'          { Invoke-Lab ($Rest | Select-Object -First 1) }
    'check'        { Invoke-Check ($Rest | Select-Object -First 1) }
    'reset'        { Invoke-Reset ($Rest | Select-Object -First 1) }
    'ui'           { if (Test-Path $Headlamp) { Start-Process $Headlamp; Ok 'Headlamp abierto (usa el contexto kind-kcna)' } else { Fail 'Headlamp no instalado' } }
    'k9s'          { & k9s }
    'quiz'         { Start-Process (Join-Path $Root 'quiz\index.html') }
    'site'         { Invoke-Site ($Rest | Select-Object -First 1) }
    default        { Show-Help }
}
