#!/usr/bin/env node
/**
 * 관리자 계정에 커스텀 클레임 { admin: true } 을 부여한다.
 *
 * 보안 규칙은 UID 대신 이 클레임을 본다. 클레임은 Firebase 가 서명한 ID 토큰
 * 안에 실려 오므로 클라이언트가 위조할 수 없고, 규칙 파일에 계정 식별자를
 * 남기지 않아도 된다.
 *
 * 계정을 바꾸거나 늘릴 때도 규칙 재배포 없이 이 스크립트만 다시 돌리면 된다.
 *
 *   npm run admin:claim              # .env.local 의 ADMIN_UID 에 부여
 *   npm run admin:claim -- --revoke  # 회수
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const ROOT = process.cwd();
const revoke = process.argv.includes('--revoke');

function fail(msg) {
  console.error(`\n[FAIL] ${msg}\n`);
  process.exit(1);
}

/** .env.local 파서 — 이 용도로 dotenv 를 의존성에 넣지 않는다 */
function parseEnv(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && value[0] === value.at(-1) && (value[0] === '"' || value[0] === "'")) {
      value = value.slice(1, -1);
    }
    out[line.slice(0, eq).trim()] = value;
  }
  return out;
}

const env = parseEnv(
  await readFile(join(ROOT, '.env.local'), 'utf8').catch(() =>
    fail('.env.local 이 없습니다.'),
  ),
);

const uid = env.ADMIN_UID;
if (!uid) fail('.env.local 의 ADMIN_UID 가 비어 있습니다.');
if (!env.FIREBASE_ADMIN_PRIVATE_KEY) fail('.env.local 의 FIREBASE_ADMIN_* 가 비어 있습니다.');

const app = initializeApp({
  credential: cert({
    projectId: env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const auth = getAuth(app);

const user = await auth.getUser(uid).catch(() => fail(`UID ${uid} 계정을 찾을 수 없습니다.`));

// 기존 클레임을 보존하고 admin 만 덮어쓴다 — 통째로 교체하면 다른 클레임이 날아간다
const claims = { ...(user.customClaims ?? {}) };
if (revoke) delete claims.admin;
else claims.admin = true;

await auth.setCustomUserClaims(uid, claims);

const after = await auth.getUser(uid);
const ok = after.customClaims?.admin === true;

console.log(`\n  계정   : ${user.email ?? '(이메일 없음)'}`);
console.log(`  UID    : ${uid}`);
console.log(`  클레임 : ${JSON.stringify(after.customClaims ?? {})}`);
console.log(
  revoke
    ? ok
      ? '\n[FAIL] 회수되지 않았습니다.\n'
      : '\n[OK] admin 클레임을 회수했습니다.\n'
    : ok
      ? '\n[OK] admin 클레임을 부여했습니다.\n  이미 로그인한 브라우저는 다시 로그인하거나 토큰이 갱신돼야 반영됩니다.\n'
      : '\n[FAIL] 부여되지 않았습니다.\n',
);

process.exit(ok === !revoke ? 0 : 1);
