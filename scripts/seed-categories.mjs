#!/usr/bin/env node
/**
 * 예시 카테고리 6개를 Firestore `categories` 컬렉션에 심는다. **선택 사항이다.**
 *
 * 카테고리의 정본은 Firestore 이고, 만드는 곳은 관리 화면(/admin/categories)이다.
 * 이 스크립트는 v1 의 여섯 개로 시작하고 싶을 때만 쓰는 편의 도구다 —
 * 처음부터 직접 짤 생각이면 돌리지 말고 관리 화면에서 만들면 된다.
 * (코드 어디에도 기본 카테고리가 폴백으로 남아 있지 않다. 안 심으면 0개로 시작한다)
 *
 * 아래 목록은 이 파일에만 있다. 마음대로 고쳐서 자기 분류로 심어도 된다.
 *
 * 이미 있는 문서는 건드리지 않는다 — 관리 화면에서 이름·색을 바꿔둔 뒤에
 * 이 스크립트를 다시 돌려도 그 수정이 되돌아가지 않아야 한다.
 *
 *   npm run categories:seed
 *   npm run categories:seed -- --force   # 있는 문서도 아래 값으로 덮어쓴다
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT = process.cwd();
const force = process.argv.includes('--force');

/** 시작용 예시 — 이 파일이 유일한 정의처다. 고쳐 써도 된다. */
const DEFAULTS = [
  { slug: 'performance', name: '성능', hint: '대표 카테고리', palette: 'coral', order: 0 },
  { slug: 'frontend', name: '프론트엔드', hint: '구현 · 브라우저 API', palette: 'blue', order: 1 },
  { slug: 'architecture', name: '아키텍처', hint: '구조 · 기술 선택 근거', palette: 'purple', order: 2 },
  { slug: 'troubleshooting', name: '트러블슈팅', hint: '실제로 막혔던 문제', palette: 'amber', order: 3 },
  { slug: 'devenv', name: '개발 환경', hint: 'Claude Code · 빌드 · 배포', palette: 'teal', order: 4 },
  { slug: 'retrospective', name: '회고', hint: '프로젝트 마무리', palette: 'pink', order: 5 },
];

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

if (!env.FIREBASE_ADMIN_PRIVATE_KEY) fail('.env.local 의 FIREBASE_ADMIN_* 가 비어 있습니다.');

const app = initializeApp({
  credential: cert({
    projectId: env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(app);

let created = 0;
let skipped = 0;

for (const { slug, ...data } of DEFAULTS) {
  const ref = db.collection('categories').doc(slug);
  const snap = await ref.get();

  if (snap.exists && !force) {
    console.log(`  건너뜀  ${slug} (이미 있음)`);
    skipped += 1;
    continue;
  }

  await ref.set(data);
  console.log(`  ${snap.exists ? '덮어씀' : '만듦'}  ${slug} — ${data.name}`);
  created += 1;
}

console.log(`\n[OK] ${created}개 반영, ${skipped}개 건너뜀.`);
console.log('  관리 화면: /admin/categories\n');
process.exit(0);
