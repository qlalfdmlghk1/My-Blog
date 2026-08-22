#!/usr/bin/env node
/**
 * 새로 발급받은 서비스 계정 키(JSON)를 .env.local 에 반영한다.
 *
 *   node scripts/rotate-admin-key.mjs ~/Downloads/키.json
 *
 * 손으로 옮기면 private_key 의 줄바꿈 형식에서 거의 반드시 틀린다. 실제 줄바꿈이
 * 섞이면 증상이 `DECODER routines::unsupported` 로만 나와 원인을 찾기 어렵다.
 *
 * 키 값은 어디에도 출력하지 않는다.
 */
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const ENV = join(ROOT, '.env.local');
const src = process.argv[2];

function fail(msg) {
  console.error(`${NL}[FAIL] ${msg}${NL}`);
  process.exit(1);
}
const NL = String.fromCharCode(10);

/**
 * .env 한 줄 형식의 줄바꿈 표기 — 백슬래시 + n 두 글자.
 *
 * 이스케이프를 소스에 직접 적지 않고 charCode 로 만든다. 이 파일이 heredoc·에디터를
 * 거쳐 저장되는 과정에서 두 글자가 실제 개행 하나로 접히면 치환이 무의미해지고,
 * 키가 여러 줄로 흩어져도 파일을 열어보기 전엔 티가 나지 않는다. (실제로 겪었다)
 */
const BACKSLASH_N = String.fromCharCode(92) + 'n';

if (!src) fail('키 JSON 경로를 인자로 주세요.');

const json = JSON.parse(await readFile(src, 'utf8').catch(() => fail(`${src} 을 읽을 수 없습니다.`)));
for (const k of ['project_id', 'client_email', 'private_key']) {
  if (!json[k]) fail(`키 JSON 에 ${k} 가 없습니다.`);
}
if (!json.private_key.includes('BEGIN PRIVATE KEY')) fail('private_key 형식이 PEM 이 아닙니다.');

const before = await readFile(ENV, 'utf8').catch(() => fail('.env.local 이 없습니다.'));

const prevProject = before.match(/^FIREBASE_ADMIN_PROJECT_ID=(.*)$/m)?.[1]?.trim();
if (prevProject && prevProject !== json.project_id) {
  fail(`프로젝트가 다릅니다 — 기존 ${prevProject} / 새 키 ${json.project_id}.`);
}

const oneLine = json.private_key.split(/\r?\n/).join(BACKSLASH_N);

const NEW = {
  FIREBASE_ADMIN_PROJECT_ID: json.project_id,
  FIREBASE_ADMIN_CLIENT_EMAIL: json.client_email,
  FIREBASE_ADMIN_PRIVATE_KEY: oneLine,
};

let after = before;
for (const [key, value] of Object.entries(NEW)) {
  const re = new RegExp('^' + key + '=.*$', 'm');
  // 치환문자열의 $ 특수 해석을 피하려고 함수형 replace 를 쓴다
  after = re.test(after) ? after.replace(re, () => key + '=' + value) : after.trimEnd() + NL + key + '=' + value + NL;
}

await copyFile(ENV, ENV + '.bak');
await writeFile(ENV, after, 'utf8');
console.log('✓ .env.local 갱신 (이전 파일은 .env.local.bak 으로 보관)');
console.log(`  project : ${json.project_id}`);
console.log(`  account : ${String(json.client_email).replace(/^[^@]+/, '<계정ID>')}`);

/**
 * 검증은 **파일을 다시 읽어서** 한다.
 * 메모리의 json.private_key 로 붙어보면 파일이 깨져 있어도 통과해 버린다.
 */
const written = await readFile(ENV, 'utf8');
const readBack = written.match(/^FIREBASE_ADMIN_PRIVATE_KEY=(.*)$/m)?.[1]?.trim() ?? '';
console.log(`  key     : (출력하지 않음, 파일에서 ${readBack.length}자 읽음)`);
if (readBack.length < 1000) {
  fail(`.env.local 의 키가 한 줄로 저장되지 않았습니다 (${readBack.length}자). .env.local.bak 으로 되돌리세요.`);
}
if (written.split(/\r?\n/).length !== before.split(/\r?\n/).length) {
  fail('.env.local 의 줄 수가 달라졌습니다 — 키가 여러 줄로 흩어졌을 가능성이 큽니다.');
}

/** admin.ts 의 normalizePrivateKey 와 같은 처리 */
const restored = readBack.replace(/^"|"$/g, '').split(BACKSLASH_N).join(NL);
if (!restored.startsWith('-----BEGIN') || !restored.trimEnd().endsWith('PRIVATE KEY-----')) {
  fail('.env.local 에서 복원한 키가 온전한 PEM 이 아닙니다.');
}

const { cert, initializeApp } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');

try {
  initializeApp({
    credential: cert({
      projectId: json.project_id,
      clientEmail: json.client_email,
      privateKey: restored,
    }),
  });
  const snap = await getFirestore().collection('posts').limit(1).get();
  console.log(`${NL}✓ 파일에서 복원한 키로 Firestore 읽기 성공 (posts ${snap.size}건).`);
} catch (error) {
  console.error(`${NL}[FAIL] 새 키로 Firestore 에 붙지 못했습니다 — 옛 키를 지우지 마세요.${NL}  ${error.message}`);
  process.exit(1);
}
