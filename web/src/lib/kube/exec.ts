// Logs sintéticos por imagen y comandos ejecutados "dentro" de un contenedor (kubectl exec).
import { type Cluster, type Pod, type Service, type Container, containerNameFrom, imageTag } from './cluster.ts';
import { logstamp, clf, hex } from './format.ts';

export interface ExecResult { lines: string[]; code: number }

const NGINX_VERSIONS: Record<string, string> = { '1.27': '1.27.5', '1.28': '1.28.0', '1.29': '1.29.1' };
export const nginxVersion = (image: string) => { const t = imageTag(image); const m = t.match(/^(\d+\.\d+)/); return m ? (NGINX_VERSIONS[m[1]] ?? m[1] + '.0') : '1.29.1'; };

const WELCOME = `<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>`;

const base = (c: Container) => containerNameFrom(c.image);

/** Logs del contenedor principal según la imagen. */
export function logsOf(c: Cluster, p: Pod, ct: Container): string[] {
  const t = p.status.startedAt ?? p.meta.created;
  const b = base(ct);
  const out: string[] = [];
  if (b === 'nginx') {
    const s = logstamp(t);
    out.push('/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration',
      '/docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/',
      '/docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh',
      '10-listen-on-ipv6-by-default.sh: info: Getting the checksum of /etc/nginx/conf.d/default.conf',
      '10-listen-on-ipv6-by-default.sh: info: Enabled listen on IPv6 in /etc/nginx/conf.d/default.conf',
      '/docker-entrypoint.sh: Sourcing /docker-entrypoint.d/15-local-resolvers.envsh',
      '/docker-entrypoint.sh: Launching /docker-entrypoint.d/20-envsubst-on-templates.sh',
      '/docker-entrypoint.sh: Launching /docker-entrypoint.d/30-tune-worker-processes.sh',
      '/docker-entrypoint.sh: Configuration complete; ready for start up',
      `${s} [notice] 1#1: using the "epoll" event method`,
      `${s} [notice] 1#1: nginx/${nginxVersion(ct.image)}`,
      `${s} [notice] 1#1: built by gcc 14.2.0 (Alpine 14.2.0)`,
      `${s} [notice] 1#1: OS: Linux 6.6.87.2-microsoft-standard-WSL2`,
      `${s} [notice] 1#1: getrlimit(RLIMIT_NOFILE): 1048576:1048576`,
      `${s} [notice] 1#1: start worker processes`);
    for (let i = 0; i < 8; i++) out.push(`${s} [notice] 1#1: start worker process ${29 + i}`);
  } else if (b === 'whoami') {
    out.push(`${logstamp(t)} Starting up on port 80`);
  } else if (b === 'redis') {
    const d = new Date(t); const st = `${String(d.getUTCDate()).padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]} ${d.getUTCFullYear()} ${d.toISOString().slice(11, 23)}`;
    out.push(`1:C ${st} # WARNING Memory overcommit must be enabled! Without it, a background save or replication may fail under low memory condition. Being disabled, it can also cause failures without low memory condition, see https://github.com/jemalloc/jemalloc/issues/1328. To fix this issue add 'vm.overcommit_memory = 1' to /etc/sysctl.conf and then reboot or run the command 'sysctl vm.overcommit_memory=1' for this to take effect.`,
      `1:C ${st} * oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo`,
      `1:C ${st} * Redis version=7.4.2, bits=64, commit=00000000, modified=0, pid=1, just started`,
      `1:C ${st} # Warning: no config file specified, using the default config. In order to specify a config file use redis-server /path/to/redis.conf`,
      `1:M ${st} * monotonic clock: POSIX clock_gettime`,
      `1:M ${st} * Running mode=standalone, port=6379.`,
      `1:M ${st} * Server initialized`,
      `1:M ${st} * Ready to accept connections tcp`);
  } else if (b === 'coredns') {
    out.push('.:53', '[INFO] plugin/reload: Running configuration SHA512 = 9e2996f93c5c7a1b1a3a5a6c7a0d3b4c7f0e8e7b2a1b1c1d1e1f2a2b3c3d3e3f4a4b4c4d4e4f5a5b5c5d5e5f6a6b6c6d6e6f7a7b7c7d7e7f8a8b8c8d8e8f9a9b9c9d9e9f', 'CoreDNS-1.12.0', 'linux/amd64, go1.23.3, 51e11f1');
  } else if (b === 'busybox' || b === 'alpine') {
    const cmd = ct.command ?? [];
    if (cmd[0] === 'echo') out.push(cmd.slice(1).join(' '));
    else if (cmd[0] === 'sh' && cmd[1] === '-c' && cmd[2]) { const m = cmd[2].match(/echo\s+(.+?)(?:;|&&|$)/); if (m) out.push(m[1].replace(/^['"]|['"]$/g, '')); }
  } else if (p.meta.namespace === 'kube-system') {
    out.push(`I${logstamp(t).slice(5).replace(/[\/ ]/g, '')}.000000       1 ${b}.go:120] "Starting ${b}" version="v1.37.0"`, `I${logstamp(t).slice(5).replace(/[\/ ]/g, '')}.100000       1 ${b}.go:140] "Ready"`);
  }
  return [...out, ...p.status.logs];
}

const ENV_BY_IMAGE: Record<string, (c: Container) => string[]> = {
  nginx: (c) => [`NGINX_VERSION=${nginxVersion(c.image)}`, 'PKG_RELEASE=1', 'DYNPKG_RELEASE=1', 'NJS_VERSION=0.8.10', 'NJS_RELEASE=1'],
  redis: () => ['REDIS_VERSION=7.4.2', 'REDIS_DOWNLOAD_URL=http://download.redis.io/releases/redis-7.4.2.tar.gz', 'REDIS_DOWNLOAD_SHA=0000000000000000000000000000000000000000000000000000000000000000'],
};

/** Variables de entorno que vería un proceso dentro del pod (incluye las de los Services del namespace). */
export function envOf(c: Cluster, p: Pod, ct: Container): string[] {
  const out = ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', `HOSTNAME=${p.meta.name}`];
  for (const [k, v] of Object.entries(ct.env)) out.push(`${k}=${v}`);
  const svcs = c.services.filter((s) => s.meta.namespace === p.meta.namespace || (s.meta.namespace === 'default' && s.meta.name === 'kubernetes')).sort((a, b) => a.meta.name.localeCompare(b.meta.name));
  for (const s of svcs) {
    const N = s.meta.name.toUpperCase().replace(/-/g, '_');
    const first = s.spec.ports[0];
    out.push(`${N}_SERVICE_HOST=${s.spec.clusterIP}`, `${N}_SERVICE_PORT=${first.port}`);
    if (s.meta.name === 'kubernetes') out.push(`${N}_SERVICE_PORT_HTTPS=${first.port}`);
    out.push(`${N}_PORT=tcp://${s.spec.clusterIP}:${first.port}`);
    for (const pt of s.spec.ports) out.push(`${N}_PORT_${pt.port}_TCP=tcp://${s.spec.clusterIP}:${pt.port}`, `${N}_PORT_${pt.port}_TCP_PROTO=tcp`, `${N}_PORT_${pt.port}_TCP_PORT=${pt.port}`, `${N}_PORT_${pt.port}_TCP_ADDR=${s.spec.clusterIP}`);
  }
  out.push(...(ENV_BY_IMAGE[base(ct)]?.(ct) ?? []));
  out.push('HOME=/root');
  return out;
}

const FS: Record<string, string[]> = {
  '/': ['bin', 'dev', 'etc', 'home', 'lib', 'media', 'mnt', 'opt', 'proc', 'root', 'run', 'sbin', 'srv', 'sys', 'tmp', 'usr', 'var'],
  '/etc': ['alpine-release', 'apk', 'conf.d', 'fstab', 'group', 'hostname', 'hosts', 'init.d', 'motd', 'nginx', 'nsswitch.conf', 'os-release', 'passwd', 'profile', 'resolv.conf', 'shadow', 'ssl'],
  '/etc/nginx': ['conf.d', 'fastcgi.conf', 'fastcgi_params', 'mime.types', 'modules', 'nginx.conf', 'scgi_params', 'uwsgi_params'],
  '/etc/nginx/conf.d': ['default.conf'],
  '/usr/share/nginx/html': ['50x.html', 'index.html'],
  '/var/run/secrets/kubernetes.io/serviceaccount': ['ca.crt', 'namespace', 'token'],
  '/tmp': [],
  '/root': [],
};

function catFile(c: Cluster, p: Pod, ct: Container, path: string): string[] | null {
  switch (path) {
    case '/etc/hostname': return [p.meta.name];
    case '/etc/resolv.conf': return [`search ${p.meta.namespace}.svc.cluster.local svc.cluster.local cluster.local`, 'nameserver 10.96.0.10', 'options ndots:5'];
    case '/etc/hosts': return ['# Kubernetes-managed hosts file.', '127.0.0.1\tlocalhost', '::1\tlocalhost ip6-localhost ip6-loopback', 'fe00::0\tip6-localnet', 'fe00::0\tip6-mcastprefix', 'fe00::1\tip6-allnodes', 'fe00::2\tip6-allrouters', `${p.status.ip}\t${p.meta.name}`];
    case '/etc/os-release': return ['NAME="Alpine Linux"', 'ID=alpine', 'VERSION_ID=3.21.3', 'PRETTY_NAME="Alpine Linux v3.21"', 'HOME_URL="https://alpinelinux.org/"', 'BUG_REPORT_URL="https://gitlab.alpinelinux.org/alpine/aports/-/issues"'];
    case '/etc/alpine-release': return ['3.21.3'];
    case '/var/run/secrets/kubernetes.io/serviceaccount/namespace': return [p.meta.namespace!];
    case '/var/run/secrets/kubernetes.io/serviceaccount/token': return [`eyJhbGciOiJSUzI1NiIsImtpZCI6Ij${hex(p.meta.uid, 40)}In0.eyJhdWQiOlsiaHR0cHM6Ly9rdWJlcm5ldGVzLmRlZmF1bHQuc3ZjLmNsdXN0ZXIubG9jYWwiXSwiZXhwIjoxNzkzMDI0MDAwLCJpYXQiOjE3NjE0ODgwMDAsImlzcyI6Imh0dHBzOi8va3ViZXJuZXRlcy5kZWZhdWx0LnN2Yy5jbHVzdGVyLmxvY2FsIiwia3ViZXJuZXRlcy5pbyI6eyJuYW1lc3BhY2UiOiIke3AubWV0YS5uYW1lc3BhY2V9In19.${hex(p.meta.name, 64)}`];
    case '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt': return ['-----BEGIN CERTIFICATE-----', 'MIIDBTCCAe2gAwIBAgIIRjZ2k2YHaS8wDQYJKoZIhvcNAQELBQAwFTETMBEGA1UE', 'AxMKa3ViZXJuZXRlczAeFw0yNjEwMjYxMjAwMDBaFw0zNjEwMjQxMjAwMDBaMBUx', '...', '-----END CERTIFICATE-----'];
    case '/usr/share/nginx/html/index.html': return base(ct) === 'nginx' ? WELCOME.split('\n') : null;
    case '/etc/nginx/conf.d/default.conf': return base(ct) === 'nginx' ? ['server {', '    listen       80;', '    listen  [::]:80;', '    server_name  localhost;', '', '    location / {', '        root   /usr/share/nginx/html;', '        index  index.html index.htm;', '    }', '', '    error_page   500 502 503 504  /50x.html;', '    location = /50x.html {', '        root   /usr/share/nginx/html;', '    }', '}'] : null;
    default: return null;
  }
}

/** Resuelve un nombre (service, service.ns, FQDN, IP, localhost) a un Service o a un pod. */
function resolve(c: Cluster, p: Pod, host: string): { svc?: Service; pod?: Pod; fqdn?: string; ip?: string } | null {
  if (host === 'localhost' || host === '127.0.0.1') return { pod: p, ip: '127.0.0.1' };
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const svc = c.services.find((s) => s.spec.clusterIP === host);
    if (svc) return { svc, ip: host };
    const pod = c.pods.find((x) => x.status.ip === host && !x.status.deleting);
    return pod ? { pod, ip: host } : { ip: host };
  }
  const parts = host.replace(/\.svc\.cluster\.local\.?$/, '').replace(/\.svc$/, '').split('.');
  const name = parts[0];
  const ns = parts[1] ?? p.meta.namespace!;
  const svc = c.service(ns, name);
  return svc ? { svc, fqdn: `${name}.${ns}.svc.cluster.local`, ip: svc.spec.clusterIP } : null;
}

function http(c: Cluster, p: Pod, url: string, tool: 'wget' | 'curl'): ExecResult {
  const m = url.replace(/^https?:\/\//, '').match(/^([^/:]+)(?::(\d+))?(\/.*)?$/);
  if (!m) return { lines: [`${tool}: bad address '${url}'`], code: 1 };
  const [, host, portS, path = '/'] = m;
  const port = portS ? +portS : 80;
  const r = resolve(c, p, host);
  if (!r) return { lines: tool === 'wget' ? [`wget: bad address '${host}'`] : [`curl: (6) Could not resolve host: ${host}`], code: tool === 'wget' ? 1 : 6 };
  let target: Pod | undefined;
  if (r.svc) {
    const sp = r.svc.spec.ports.find((x) => x.port === port);
    const eps = c.endpoints(r.svc);
    if (!sp || !eps.length) return { lines: tool === 'wget' ? [`wget: can't connect to remote host (${r.svc.spec.clusterIP}): Connection refused`] : [`curl: (7) Failed to connect to ${host} port ${port} after 2 ms: Could not connect to server`], code: tool === 'wget' ? 1 : 7 };
    target = eps[Math.abs(hex(url + c.now, 4).charCodeAt(0)) % eps.length];
  } else if (r.pod) target = r.pod;
  else return { lines: tool === 'wget' ? [`wget: can't connect to remote host (${r.ip}): Connection refused`] : [`curl: (7) Failed to connect to ${host} port ${port} after 2 ms: Could not connect to server`], code: tool === 'wget' ? 1 : 7 };
  const tc = target.spec.containers[0];
  const tb = base(tc);
  if (!target.status.ready || !(tb === 'nginx' || tb === 'whoami') || !(tc.ports.includes(port) || (!tc.ports.length && port === 80))) {
    return { lines: tool === 'wget' ? [`wget: can't connect to remote host (${target.status.ip}): Connection refused`] : [`curl: (7) Failed to connect to ${host} port ${port} after 2 ms: Could not connect to server`], code: tool === 'wget' ? 1 : 7 };
  }
  if (tb === 'nginx') {
    const ok = path === '/' || path === '/index.html';
    target.status.logs.push(`${p.status.ip} - - [${clf(c.now)}] "GET ${path} HTTP/1.1" ${ok ? 200 : 404} ${ok ? 615 : 153} "-" "${tool === 'wget' ? 'Wget' : 'curl/8.12.1'}" "-"`);
    if (!ok) return { lines: tool === 'wget' ? ['wget: server returned error: HTTP/1.1 404 Not Found'] : ['<html>', '<head><title>404 Not Found</title></head>', '<body>', '<center><h1>404 Not Found</h1></center>', `<hr><center>nginx/${nginxVersion(tc.image)}</center>`, '</body>', '</html>'], code: tool === 'wget' ? 1 : 0 };
    return { lines: WELCOME.split('\n'), code: 0 };
  }
  target.status.logs.push(`${logstamp(c.now)} ${p.status.ip}:${40000 + (c.now % 20000)} - - [${clf(c.now)}] "GET ${path} HTTP/1.1" 200 - "${tool === 'wget' ? 'Wget' : 'curl/8.12.1'}" -`);
  return { lines: [`Hostname: ${target.meta.name}`, 'IP: 127.0.0.1', 'IP: ::1', `IP: ${target.status.ip}`, `RemoteAddr: ${p.status.ip}:${40000 + (c.now % 20000)}`, `GET ${path} HTTP/1.1`, `Host: ${host}${port !== 80 ? ':' + port : ''}`, `User-Agent: ${tool === 'wget' ? 'Wget' : 'curl/8.12.1'}`, 'Accept: */*', ...(tool === 'wget' ? ['Connection: close'] : [])], code: 0 };
}

/** Ejecuta un comando dentro del contenedor. */
export function runInContainer(c: Cluster, p: Pod, ct: Container, argv: string[]): ExecResult {
  const b = base(ct);
  const notFound = (cmd: string): ExecResult => ({ lines: [`OCI runtime exec failed: exec failed: unable to start container process: exec: "${cmd}": executable file not found in $PATH: unknown`, 'command terminated with exit code 126'], code: 126 });
  if (!argv.length) return { lines: ['error: you must specify at least one command for the container'], code: 1 };
  if (b === 'whoami') return notFound(argv[0]); // imagen scratch: sin shell ni utilidades
  const [cmd, ...args] = argv;
  const tools = ['env', 'printenv', 'ls', 'cat', 'hostname', 'nslookup', 'wget', 'echo', 'id', 'whoami', 'uname', 'pwd', 'date', 'nproc', 'ps', 'sleep', 'true', 'false', 'sh', 'ash', 'ip', 'ifconfig', 'netstat', 'head', 'grep', 'which', 'nginx', 'redis-cli', 'curl', 'bash', 'top', 'df', 'free', 'uptime'];
  if (!tools.includes(cmd)) return notFound(cmd);
  switch (cmd) {
    case 'sh': case 'ash': case 'bash': {
      if (cmd === 'bash') return notFound('bash'); // alpine/busybox no traen bash
      if (args[0] === '-c' && args[1]) {
        // encadena ; y && de forma sencilla
        const out: string[] = []; let code = 0;
        for (const part of args[1].split(/\s*(?:;|&&)\s*/)) { if (!part) continue; const r = runInContainer(c, p, ct, tokenize(part)); out.push(...r.lines); code = r.code; if (code && args[1].includes('&&')) break; }
        return { lines: out, code };
      }
      return { lines: ['Unable to use a TTY - la terminal simulada no admite sesiones interactivas.', `Ejecuta comandos sueltos: kubectl exec ${p.meta.name} -- <comando>`], code: 1 };
    }
    case 'env': case 'printenv': return { lines: envOf(c, p, ct), code: 0 };
    case 'hostname': return { lines: [p.meta.name], code: 0 };
    case 'whoami': return { lines: ['root'], code: 0 };
    case 'id': return { lines: ['uid=0(root) gid=0(root) groups=0(root),1(bin),2(daemon),3(sys),4(adm),6(disk),10(wheel),11(floppy),20(dialout),26(tape),27(video)'], code: 0 };
    case 'pwd': return { lines: ['/'], code: 0 };
    case 'nproc': return { lines: ['8'], code: 0 };
    case 'true': case 'sleep': return { lines: [], code: 0 };
    case 'false': return { lines: ['command terminated with exit code 1'], code: 1 };
    case 'echo': return { lines: [args.map((a) => a.replace(/^\$(\w+)$/, (_, v) => envOf(c, p, ct).find((e) => e.startsWith(v + '='))?.split('=').slice(1).join('=') ?? '')).join(' ')], code: 0 };
    case 'date': return { lines: [new Date(c.now).toUTCString().replace(/^(\w+), (\d+) (\w+) (\d+) (\S+) GMT$/, '$1 $3 $2 $5 UTC $4')], code: 0 };
    case 'uname': return { lines: [args.includes('-a') ? `Linux ${p.meta.name} 6.6.87.2-microsoft-standard-WSL2 #1 SMP PREEMPT_DYNAMIC Thu Jun  5 18:30:46 UTC 2025 x86_64 Linux` : 'Linux'], code: 0 };
    case 'which': return args[0] && tools.includes(args[0]) && args[0] !== 'curl' ? { lines: [`/bin/${args[0]}`], code: 0 } : { lines: [], code: 1 };
    case 'ps': return { lines: ['PID   USER     TIME  COMMAND', ...(b === 'nginx' ? ['    1 root      0:00 nginx: master process nginx -g daemon off;', '   29 nginx     0:00 nginx: worker process', '   30 nginx     0:00 nginx: worker process'] : b === 'redis' ? ['    1 redis     0:01 redis-server *:6379'] : [`    1 root      0:00 ${(ct.command ?? ['sh']).join(' ')}`]), `   ${40 + (c.now % 50)} root      0:00 ps${args.length ? ' ' + args.join(' ') : ''}`], code: 0 };
    case 'df': return { lines: ['Filesystem           1K-blocks      Used Available Use% Mounted on', 'overlay              1055762868  12345678 989604660   1% /', 'tmpfs                    65536         0     65536   0% /dev', 'tmpfs                  4063948        12   4063936   0% /var/run/secrets/kubernetes.io/serviceaccount'], code: 0 };
    case 'free': return { lines: ['              total        used        free      shared  buff/cache   available', 'Mem:        8129224     1843672     4712904        1216     1572648     6055240', 'Swap:             0           0           0'], code: 0 };
    case 'uptime': return { lines: [` ${new Date(c.now).toISOString().slice(11, 19)} up 3:${String(Math.floor((c.now / 60000) % 60)).padStart(2, '0')},  load average: 0.21, 0.18, 0.15`], code: 0 };
    case 'top': return { lines: ['Unable to use a TTY - top necesita una terminal interactiva; prueba con: kubectl top pod'], code: 1 };
    case 'ip': case 'ifconfig': return { lines: ['1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000', '    inet 127.0.0.1/8 scope host lo', `2: eth0@if${10 + (p.status.ip?.split('.').pop() ?? '2')}: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP`, `    inet ${p.status.ip}/24 brd 10.244.${p.status.ip?.split('.')[2]}.255 scope global eth0`], code: 0 };
    case 'netstat': return { lines: ['Active Internet connections (only servers)', 'Proto Recv-Q Send-Q Local Address           Foreign Address         State', ...(b === 'nginx' ? ['tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN', 'tcp        0      0 :::80                   :::*                    LISTEN'] : b === 'redis' ? ['tcp        0      0 0.0.0.0:6379            0.0.0.0:*               LISTEN'] : [])], code: 0 };
    case 'nginx': return b === 'nginx' ? (args.includes('-v') || args.includes('-V') ? { lines: [`nginx version: nginx/${nginxVersion(ct.image)}`], code: 0 } : args.includes('-t') ? { lines: ['nginx: the configuration file /etc/nginx/nginx.conf syntax is ok', 'nginx: configuration file /etc/nginx/nginx.conf test is successful'], code: 0 } : { lines: ['nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address in use)'], code: 1 }) : notFound('nginx');
    case 'redis-cli': return b === 'redis' ? { lines: [args[0]?.toLowerCase() === 'ping' ? 'PONG' : args[0]?.toLowerCase() === 'info' ? '# Server\r\nredis_version:7.4.2\r\nredis_mode:standalone\r\nos:Linux 6.6.87.2-microsoft-standard-WSL2 x86_64\r\ntcp_port:6379\r\nuptime_in_seconds:' + Math.floor((c.now - (p.status.startedAt ?? c.now)) / 1000) : 'OK'], code: 0 } : notFound('redis-cli');
    case 'curl': {
      if (b !== 'nginx') return { lines: [`sh: curl: not found`, 'command terminated with exit code 127'], code: 127 };
      const url = args.find((a) => !a.startsWith('-'));
      if (!url) return { lines: ["curl: try 'curl --help' or 'curl --manual' for more information"], code: 2 };
      const r = http(c, p, url, 'curl');
      return r.code ? { lines: [...r.lines, `command terminated with exit code ${r.code}`], code: r.code } : r;
    }
    case 'wget': {
      const url = args.find((a) => !a.startsWith('-'));
      if (!url) return { lines: ['wget: missing URL', 'Usage: wget [-cqS] [--spider] [-O FILE] [-o LOGFILE] [--header STR] [--post-data STR | --post-file FILE] [-Y on/off] [-P DIR] [-S|--server-response] [-U AGENT] [-T SEC] URL...', 'command terminated with exit code 1'], code: 1 };
      const r = http(c, p, url, 'wget');
      if (r.code) return { lines: [...r.lines, 'command terminated with exit code 1'], code: 1 };
      const quiet = args.some((a) => /^-[a-zA-Z]*q/.test(a)) && args.some((a) => /^-[a-zA-Z]*O/.test(a) && (a.endsWith('-') || args[args.indexOf(a) + 1] === '-'));
      if (quiet || args.includes('-qO-') || (args.includes('-O') && args.includes('-'))) return r;
      return { lines: [`Connecting to ${url.replace(/^https?:\/\//, '').split('/')[0]} (${resolve(c, p, url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0])?.ip}:80)`, "saving to 'index.html'", "index.html           100% |********************************|   615  0:00:00 ETA", "'index.html' saved"], code: 0 };
    }
    case 'nslookup': {
      const host = args.find((a) => !a.startsWith('-'));
      if (!host) return { lines: ['BusyBox v1.37.0 (2025-01-17 18:12:01 UTC) multi-call binary.', '', 'Usage: nslookup [-type=QUERY_TYPE] [-debug] HOST [DNS_SERVER]', '', 'Query DNS about HOST', '', 'QUERY_TYPE: soa,ns,a,aaaa,cname,mx,txt,ptr,srv,any', 'command terminated with exit code 1'], code: 1 };
      const head = ['Server:\t\t10.96.0.10', 'Address:\t10.96.0.10:53', ''];
      if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        const svc = c.services.find((s) => s.spec.clusterIP === host);
        const rev = host.split('.').reverse().join('.') + '.in-addr.arpa';
        return svc ? { lines: [...head, `${rev}\tname = ${svc.meta.name}.${svc.meta.namespace}.svc.cluster.local`, ''], code: 0 } : { lines: [...head, `** server can't find ${rev}: NXDOMAIN`, '', 'command terminated with exit code 1'], code: 1 };
      }
      if (host === 'kubernetes') return { lines: [...head, 'Name:\tkubernetes.default.svc.cluster.local', 'Address: 10.96.0.1', ''], code: 0 };
      const r = resolve(c, p, host);
      if (!r?.svc) return { lines: [...head, `** server can't find ${host.includes('.') ? host : host + '.' + p.meta.namespace + '.svc.cluster.local'}: NXDOMAIN`, '', 'command terminated with exit code 1'], code: 1 };
      return { lines: [...head, `Name:\t${r.fqdn}`, `Address: ${r.ip}`, ''], code: 0 };
    }
    case 'ls': {
      const paths = args.filter((a) => !a.startsWith('-'));
      if (!paths.length) paths.push('/');
      const out: string[] = []; let code = 0;
      for (const raw of paths) {
        const path = raw.replace(/\/$/, '') || '/';
        const entries = FS[path] ?? (b === 'nginx' || path.startsWith('/var/run') || path.startsWith('/etc') ? FS[path] : undefined);
        if (!entries) {
          if (catFile(c, p, ct, path)) { out.push(path); continue; }
          out.push(`ls: ${raw}: No such file or directory`); code = 1; continue;
        }
        if ((path === '/etc/nginx' || path === '/usr/share/nginx/html' || path === '/etc/nginx/conf.d') && b !== 'nginx') { out.push(`ls: ${raw}: No such file or directory`); code = 1; continue; }
        if (paths.length > 1) out.push(`${raw}:`);
        out.push(...(args.includes('-l') || args.includes('-la') || args.includes('-al') ? entries.map((e) => `${e.includes('.') ? '-rw-r--r--    1 root     root          ${String(100 + (hex(e, 3).charCodeAt(0) % 900)).padStart(4)}' : 'drwxr-xr-x    2 root     root          4096'} Oct 26 12:00 ${e}`) : entries));
        if (paths.length > 1) out.push('');
      }
      return { lines: code ? [...out, 'command terminated with exit code 1'] : out, code };
    }
    case 'cat': case 'head': {
      const paths = args.filter((a) => !a.startsWith('-') && !/^\d+$/.test(a));
      if (!paths.length) return { lines: [], code: 0 };
      const out: string[] = []; let code = 0;
      for (const path of paths) {
        const lines = catFile(c, p, ct, path);
        if (!lines) { out.push(FS[path] ? `cat: read error: Is a directory` : `cat: can't open '${path}': No such file or directory`); code = 1; }
        else out.push(...(cmd === 'head' ? lines.slice(0, 10) : lines));
      }
      return { lines: code ? [...out, 'command terminated with exit code 1'] : out, code };
    }
    case 'grep': {
      const pat = args.find((a) => !a.startsWith('-'));
      const file = args.filter((a) => !a.startsWith('-'))[1];
      const lines = file ? catFile(c, p, ct, file) : null;
      if (!pat || !lines) return { lines: [`grep: ${file ?? ''}: No such file or directory`, 'command terminated with exit code 2'], code: 2 };
      const hits = lines.filter((l) => l.includes(pat));
      return { lines: hits.length ? hits : ['command terminated with exit code 1'], code: hits.length ? 0 : 1 };
    }
  }
  return notFound(cmd);
}

/** Separa una línea en tokens respetando comillas simples y dobles. */
export function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = ''; let q: string | null = null; let has = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === q) q = null; else cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; has = true; continue; }
    if (/\s/.test(ch)) { if (cur || has) { out.push(cur); cur = ''; has = false; } continue; }
    cur += ch;
  }
  if (cur || has) out.push(cur);
  return out;
}
