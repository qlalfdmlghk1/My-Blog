#!/usr/bin/env node
/**
 * .env.local 의 ADMIN_UID 를 보안 규칙에 적용한다.
 *
 * 왜 필요한가: 규칙 파일에는 UID 를 하드코딩할 수밖에 없는데(규칙은 환경변수를
 * 읽지 못한다), TODO_ADMIN_UID 인 채로 배포하면 본인조차 글을 쓸 수 없다.
 * 손으로 두 파일을 고치다 한쪽만 바꾸는 사고를 막으려고 스크립트로 둔다.
 *
 *   npm run rules:uid
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const RULES = ['firestore.rules', 'storage.rules'];
const PLACEHOLDER = 'TODO_ADMIN_UID';

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

/** .env.local 파서 — 이 한 가지 용도에 dotenv 를 의존성으로 들이지 않는다 */
function parseEnv(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const envText = await readFile(join(ROOT, '.env.local'), 'utf8').catch(() =>
  fail('.env.local 이 없습니다. `cp .env.example .env.local` 후 값을 채우세요.'),
);

const env = parseEnv(envText);
const uid = env.ADMIN_UID;

if (!uid) fail('.env.local 에 ADMIN_UID 가 비어 있습니다. Firebase Auth 콘솔의 사용자 UID 를 넣으세요.');
if (uid === PLACEHOLDER) fail(`ADMIN_UID 가 아직 ${PLACEHOLDER} 입니다.`);
// Firebase UID 는 28자 영숫자다. 이메일을 잘못 넣는 실수를 여기서 잡는다.
if (!/^[A-Za-z0-9]{20,40}$/.test(uid)) {
  fail(`ADMIN_UID 형식이 UID 같지 않습니다: "${uid}" (이메일이 아니라 Auth 콘솔의 사용자 UID 여야 합니다)`);
}
if (env.NEXT_PUBLIC_ADMIN_UID && env.NEXT_PUBLIC_ADMIN_UID !== uid) {
  fail('NEXT_PUBLIC_ADMIN_UID 와 ADMIN_UID 가 다릅니다. 같은 값이어야 합니다.');
}

let changed = 0;
for (const file of RULES) {
  const path = join(ROOT, file);
  const before = await readFile(path, 'utf8').catch(() => fail(`${file} 을 찾을 수 없습니다.`));

  if (before.includes(uid) && !before.includes(PLACEHOLDER)) {
    console.log(`  · ${file} — 이미 적용됨`);
    continue;
  }
  if (!before.includes(PLACEHOLDER)) {
    fail(`${file} 에 ${PLACEHOLDER} 도 현재 UID 도 없습니다. 파일을 직접 확인하세요.`);
  }

  await writeFile(path, before.replaceAll(PLACEHOLDER, uid), 'utf8');
  console.log(`  ✓ ${file} — UID 적용`);
  changed += 1;
}

console.log(
  changed > 0
    ? '\n다음: npx firebase deploy --only firestore:rules,firestore:indexes,storage\n'
    : '\n변경 없음.\n',
);
