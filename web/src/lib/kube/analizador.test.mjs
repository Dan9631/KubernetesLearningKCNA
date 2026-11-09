// Prueba del analizador de comandos: node src/lib/kube/analizador.test.mjs
import { Cluster } from './cluster.ts';
import { execute } from './kubectl.ts';
import { analizar, comparar, esqueleto, dist } from './analizador.ts';

const c = new Cluster({ seed: 42 });
let n = 0; let failures = 0;
const check = (name, cond, extra = '') => { n++; if (cond) console.log(`ok ${n}: ${name}`); else { failures++; console.log(`\nFALLO ${n}: ${name}\n  ${extra}`); } };

/** analizar(línea) debe dar como primera nota la clave indicada (o ninguna) y, si se pide, esa corrección */
function nota(line, clave, fix) {
  const r = analizar(line, c);
  const first = r[0];
  const ok = clave === null ? r.length === 0 : first?.clave === clave && (fix === undefined || first.fix === fix);
  check(`analizar: ${line}`, ok, `esperaba ${clave}${fix ? ` -> ${fix}` : ''}; obtuve ${JSON.stringify(r.map((x) => [x.clave, x.fix]))}`);
  return first;
}

check('dist: transposición', dist('gte', 'get') === 1 && dist('replica', 'replicas') === 1 && dist('kubctl', 'kubectl') === 1);

// lo que un principiante escribe de verdad
nota('kubctl get pods', 'binario', 'kubectl get pods');
nota('kubectl gte pods', 'verbo', 'kubectl get pods');
nota('kubectl descirbe pod tools', 'verbo', 'kubectl describe pod tools');
nota('kubectl create deploy api --image nginx:1.28-alpine --replica=3', 'flag-desconocido', 'kubectl create deploy api --image nginx:1.28-alpine --replicas=3');
nota('kubectl get pods --namespace', 'flag-sin-valor');
nota('kubectl get pods -n', 'flag-sin-valor');
nota('kubectl get pods -n -o wide', 'flag-sin-valor');
nota('kubectl run web -image=nginx:1.27-alpine', 'guion-simple', 'kubectl run web --image=nginx:1.27-alpine');
nota('kubectl expose web --port=80', 'falta-tipo', 'kubectl expose deployment web --port=80');
nota('kubectl scale web --replicas=5', 'falta-tipo', 'kubectl scale deployment web --replicas=5');
nota('kubectl rollout history web', 'falta-tipo', 'kubectl rollout history deployment web');
nota('kubectl rollout histroy deployment/web', 'rollout-sub', 'kubectl rollout history deployment/web');
nota('kubectl get tools', 'falta-tipo', 'kubectl get pod tools');
nota('kubectl get deploymnet web', 'tipo-mal-escrito', 'kubectl get deployment web');
nota('kubectl get pods -o wid', 'salida', 'kubectl get pods -o wide');
nota('kubectl scale deployment web', 'scale-replicas');
nota('kubectl set image deployment web nginx:1.28-alpine', 'set-par', 'kubectl set image deployment web nginx=nginx:1.28-alpine');
nota('kubectl set image deployment/catalogo catalogo=redis:7.4-alpine', 'set-contenedor', 'kubectl set image deployment/catalogo redis=redis:7.4-alpine');
nota('kubectl logs catalogo', 'pod-prefijo', 'kubectl logs deployment/catalogo');
nota('kubectl exec tools env', 'exec-separador', 'kubectl exec tools -- env');
nota('kubectl run web', 'run-imagen');
nota('kubectl run web --image=nginx', 'imagen-sin-tag');
nota('kubectl create pod web --image=nginx:1.27-alpine', 'create-pod', 'kubectl run web --image=nginx:1.27-alpine');
nota('kubectl create secret db --from-literal=a=b', 'secret-subtipo', 'kubectl create secret generic db --from-literal=a=b');
nota('kubectl apply pod.yaml', 'apply-archivo');
nota('kubectl taint node kcna-worker2 dedicated=db:noschedule', 'taint-efecto', 'kubectl taint node kcna-worker2 dedicated=db:NoSchedule');
nota('kubectl taint node kcna-worker2 dedicated=db', 'taint-efecto');
nota('kubectl get pods -n lab', 'ns-inexistente');
nota('kubectl config get-context', 'config-sub', 'kubectl config get-contexts');

// comandos correctos: ni una nota (un tutor que se equivoca enseña mal)
for (const ok of [
  'kubectl get pods', 'k get po -A -o wide', 'kubectl get deploy,svc', 'kubectl get pods -l app=web --show-labels', 'kubectl get pod tools -o jsonpath=\'{.status.phase}\'',
  'kubectl get pods -o custom-columns=POD:.metadata.name', 'kubectl describe deployment web', 'kubectl run nginx --image=nginx:1.27-alpine --port=80 -l app=nginx,tier=web',
  'kubectl run tmp --image=busybox:1.37 --dry-run=client -o yaml -- sleep 3600', 'kubectl create deployment api --image=nginx:1.28-alpine --replicas=3', 'kubectl expose deployment web --port=80 --type=NodePort --name=web-np',
  'kubectl scale deploy/web --replicas=5', 'kubectl set image deployment/web nginx=nginx:1.28-alpine', 'kubectl rollout undo deployment/web --to-revision=1', 'kubectl rollout status deploy web --timeout=5s',
  'kubectl logs tools', 'kubectl logs -l app=web --prefix --tail=5', 'kubectl logs deployment/web -f', 'kubectl exec -it tools -- sh', 'kubectl exec tools -c tools -- env', 'kubectl delete pod tools --force --grace-period=0',
  'kubectl label pod tools env=dev --overwrite', 'kubectl taint node kcna-worker2 dedicated=db:NoSchedule', 'kubectl taint node kcna-worker2 dedicated:NoSchedule-', 'kubectl apply -f pod.yaml', 'kubectl config set-context --current --namespace=kube-system',
  'kubectl get events --sort-by=.lastTimestamp', 'kubectl top pods -A --sort-by=cpu', 'kubectl create secret generic db --from-literal=PASSWORD=x', 'kubectl create namespace lab', 'kubectl -n kube-system get pods', 'kubectl get pods -n kube-system | grep dns',
  'kubectl explain pod.spec.containers', 'kubectl delete -f pod.yaml', 'kubectl get all', 'kubectl api-resources', 'helm install saludo ./saludo', 'ls',
]) nota(ok, null);

// el simulador ya no ignora flags mal escritos
const ex = (line, re, okExpected) => { const r = execute(c, line); check(`execute: ${line}`, re.test(r.out) && r.ok === okExpected, r.out); };
ex('kubectl create deployment api --image=nginx:1.28-alpine --replica=3', /^error: unknown flag: --replica\n/, false);
ex('kubectl get deploy api', /NotFound/, false);
ex('kubectl get pods --namespace', /^error: flag needs an argument: --namespace/, false);
ex('kubectl get pods -n', /^error: flag needs an argument: 'n' in -n/, false);
ex('kubectl get pods -n kube-system -owide', /NODE/, true);
ex('kubectl exec -it tools -- env', /HOSTNAME=tools/, true);

// objeto en otro namespace que el del contexto
execute(c, 'kubectl config set-context --current --namespace=kube-system');
nota('kubectl logs tools', 'otro-namespace', 'kubectl logs tools -n default');
nota('kubectl get pods', null);
execute(c, 'kubectl config set-context --current --namespace=default');

// comparar: equivalencias que no deben contar como error
const eq = (a, e, want = true) => { const v = comparar(a, Array.isArray(e) ? e : [e]); check(`comparar ${want ? '==' : '!='}: ${a}`, v.ok === want, JSON.stringify(v.partes)); return v; };
eq('k scale deploy web --replicas 5 -n lab-03', 'kubectl scale deployment web --replicas=5 -n lab-03');
eq('kubectl scale deployment/web -n lab-03 --replicas=5', 'kubectl scale deployment web --replicas=5 -n lab-03');
eq('kubectl get po -owide --namespace=lab-03', 'kubectl get pods -n lab-03 -o wide');
eq('kubectl get pods -l "env=dev,tier=web" -n lab-03', "kubectl get pods -n lab-03 -l 'tier=web,env=dev'");
eq('kubectl rollout undo deploy/web -n lab-03', 'kubectl rollout undo deployment web -n lab-03');
eq('kubectl set image deploy web nginx=nginx:1.28-alpine', 'kubectl set image deployment/web nginx=nginx:1.28-alpine');
eq('kubectl exec -ti tools -- env', 'kubectl exec -it tools -- env');
eq('kubectl logs pod/tools --previous', 'kubectl logs tools --previous');
eq('kubectl create ns lab', 'kubectl create namespace lab');
eq('kubectl explain pods.spec.containers', 'kubectl explain pod.spec.containers');
eq('kubectl -n kube-system get pods', 'kubectl get pods -n kube-system');
eq('kubectl get svc,deploy', 'kubectl get deployments,services');
eq('helm install saludo ./saludo --namespace=lab-12', 'helm install saludo ./saludo -n lab-12');
eq('podman exec -ti web sh', 'podman exec -it web sh');
eq('kubectl logs worker -c worker --follow', 'kubectl logs worker -c worker -f');
eq('kubectl create role r --verb=get --verb=list --resource=pods', 'kubectl create role r --verb=get,list --resource=pods');
eq('kubectl get nodes -L zone -L disktype', 'kubectl get nodes -L disktype,zone');
eq('helm install saludo ./saludo --namespace lab-12', 'helm install saludo ./saludo --namespace=lab-12');
eq('helm upgrade saludo ./saludo -n lab-12 -f values-v2.yaml', ['helm upgrade saludo ./saludo -f values-v2.yaml -n lab-12']);
eq('.\\kcna.ps1 check 03', './kcna.ps1 check 03');
// y diferencias que sí deben contar
const parte = (v, clave) => v.partes.find((p) => p.clave === clave);
let v = eq('kubectl scale deployment web --replicas=3 -n lab-03', 'kubectl scale deployment web --replicas=5 -n lab-03', false);
check('comparar: señala el valor del flag', parte(v, 'flags')?.detalle?.includes('--replicas') && parte(v, 'verbo').ok && parte(v, 'recurso').ok && parte(v, 'nombre').ok, JSON.stringify(v.partes));
v = eq('kubectl scale deployment web --replicas=5', 'kubectl scale deployment web --replicas=5 -n lab-03', false);
check('comparar: dice que falta un flag sin decir cuál', /falta 1 flag/.test(parte(v, 'flags')?.detalle ?? '') && !/namespace/.test(parte(v, 'flags').detalle), JSON.stringify(v.partes));
v = eq('kubectl get pod web', 'kubectl describe pod web', false);
check('comparar: con el verbo mal solo se señala el verbo', !parte(v, 'verbo').ok && v.partes.length === 1);
v = eq('kubectl get svc web', 'kubectl get pod web', false);
check('comparar: recurso', parte(v, 'verbo').ok && !parte(v, 'recurso').ok);
v = eq('kubectl exec tools -- ls', 'kubectl exec tools -- env', false);
check('comparar: comando interior', !parte(v, 'interior').ok);
v = eq('podman get pods', 'kubectl get pods', false);
check('comparar: herramienta', v.partes[0].clave === 'comando');
v = comparar('kubectl get pods -n lab-03 -o wide', ['kubectl describe pod web -n lab-03', 'kubectl get pods -o wide -n lab-03']);
check('comparar: elige la aceptada más parecida', v.ok && v.mejor.startsWith('kubectl get'));

// esqueleto: la forma sin los valores
const sk = (cmd, want) => check(`esqueleto: ${cmd}`, esqueleto(cmd) === want, esqueleto(cmd));
sk('kubectl scale deployment web --replicas=5 -n lab-03', 'kubectl scale deployment ___ --replicas=___ -n ___');
sk('kubectl set image deployment/web nginx=nginx:1.28-alpine', 'kubectl set image deployment/___ ___');
sk('kubectl exec tools -- env', 'kubectl exec ___ -- ___');
sk('kubectl rollout undo deployment web', 'kubectl rollout undo deployment ___');
sk('helm upgrade saludo ./saludo -f values-v2.yaml', 'helm upgrade ___ -f ___');

console.log(`\n${n - failures}/${n} comprobaciones correctas`);
process.exit(failures ? 1 : 0);
