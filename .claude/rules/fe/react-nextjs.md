---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "app/**/*.tsx"
---

# Frontend Convention (Next.js App Router + React + TypeScript + FSD)

> 이 문서는 FE 컨벤션 변경 시 함께 업데이트합니다.
> **적용 대상**: Next.js(App Router) + TypeScript + FSD 아키텍처 프로젝트만 복사
> **범위 밖**: Storybook·테스트 세부 컨벤션은 본 문서에 포함하지 않습니다 (별도 룰 파일로 분리하면 여기에 링크 추가).
> **보안 판정 정본**: `.claude/rules/security-compliance.md` (본 문서 마지막 절은 요약)

이 파일은 프로젝트의 프론트엔드 개발 컨벤션을 정의합니다.

## Quick Rules

> 대표 [MUST] 규칙만. 상세·예외·근거는 본문 참조.

| 영역                    | 수준     | 규칙                                                                                     |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------- |
| Import 방향             | MUST     | 상위 → 하위 레이어만 import. 같은 레이어 슬라이스 간 import 금지. 순환 참조 금지          |
| Next `app/` vs FSD app  | MUST     | Next `app/`은 라우팅 진입점 전용. 실제 구현은 `src/` 하위 FSD 레이어에                    |
| 컴포넌트 경계           | MUST     | 기본은 Server Component. `'use client'`는 필요한 최말단 컴포넌트에만                      |
| 시크릿 노출             | MUST NOT | 서버 전용 값(`process.env.SECRET`)을 Client Component 경로에 도달시키지 않음              |
| Query Key Factory       | MUST     | TanStack Query 사용 시 `entities/{entity}/api/queryKeys.ts` 팩토리 패턴 적용              |
| 서버/클라이언트 상태    | MUST     | 서버 데이터 = TanStack Query(or Server Component), 클라이언트 UI 상태 = Zustand           |
| 공통 컴포넌트 수정      | MUST     | `shared/ui` 변경 시 사용처 영향도 분석 + 스토리 갱신 + 시각 회귀 검사                     |
| 비즈니스 로직 분리      | MUST     | `app/*` 또는 단일 `.tsx` 파일에 로직 집중 금지. hooks/entities로 분리                     |
| 컴포넌트 책임 제한      | MUST     | 컴포넌트 = 표현·렌더링. 비즈니스 로직·API 호출은 hooks/api 레이어                         |
| Hook 네이밍             | MUST     | `use` prefix 필수                                                                         |
| 함수 선언 방식          | MUST     | `shared/lib/`·`**/model/`은 function declaration, 컴포넌트 내부 핸들러는 화살표 함수      |
| interface vs type       | MUST     | 객체 형태는 `interface`, union/intersection은 `type`                                      |
| any 사용                | MUST NOT | 명시적 `any` 사용 금지 (불가피하면 `unknown` + 좁히기)                                    |
| ESLint 검증             | MUST     | 작성/수정 완료 후 반드시 ESLint 실행                                                      |

---

## FSD (Feature-Sliced Design) 아키텍처

프로젝트는 FSD 아키텍처를 따릅니다.

### Next `app/` 디렉터리와 FSD `app` 레이어 충돌 해소 [MUST]

Next.js App Router의 `app/`(파일 기반 라우팅)과 FSD의 `app` 레이어(앱 초기화)는 **이름이 같지만 역할이 다릅니다.** 다음 규칙으로 분리합니다.

| 디렉터리        | 역할                                                       | 넣어도 되는 것                                                  |
| --------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| `app/` (루트)   | **Next 라우팅 진입점 전용**                                | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts` |
| `src/app/`      | FSD `app` 레이어 — 앱 초기화                               | providers, 전역 스타일, QueryClient 설정, 전역 config            |
| `src/pages/`    | FSD `pages` 레이어 — 화면 조립체 (Next의 pages router 아님) | `{Route}Page.tsx` (widgets/features 조합)                        |

**규칙:**

- 루트 `app/`의 `page.tsx`는 **FSD `pages` 레이어의 화면 컴포넌트를 import해서 렌더링만** 합니다. 여기에 로직·API 호출·상태를 두지 않습니다.
- `next.config.ts`/`tsconfig.json`에서 pages router가 꺼져 있는지 확인합니다 (`src/pages/`가 Next의 legacy pages router로 오인되지 않도록 **루트에 `app/`을 두고 `src/pages/`는 라우팅 대상이 아님**을 보장).
  - Next는 `src/app` 또는 `app` 중 하나만 라우팅으로 인식합니다. 본 컨벤션은 **루트 `app/`을 라우팅**으로 쓰고, FSD는 전부 `src/` 하위에 둡니다. 이렇게 하면 `src/pages/`가 라우팅으로 해석되지 않습니다.
- 프로젝트가 이 배치와 다르면 `.claude/project.config.md`에 실제 배치를 명시합니다.

```tsx
// app/reports/page.tsx  — 라우팅 진입점만. 로직 금지
import { ReportListPage } from "@/pages/report-list";

export const metadata = { title: "리포트" };

export default function Page() {
  return <ReportListPage />;
}
```

### 레이어 구조

```
app/                        # Next 라우팅 진입점 (page/layout/loading/error/route)
├── layout.tsx
├── page.tsx
└── reports/
    ├── page.tsx
    ├── loading.tsx
    └── error.tsx
src/
├── app/                    # FSD app 레이어 (앱 초기화)
│   ├── providers/          # QueryProvider, ThemeProvider 등
│   └── styles/             # 전역 스타일 (globals.css)
├── pages/                  # 화면 조립체 (여러 widgets 조합)
│   └── {route}/
│       ├── ui/{Route}Page.tsx
│       └── index.ts
├── widgets/                # 복합 UI 블록 (여러 features 조합)
├── features/               # 기능 단위 (사용자 행동)
├── entities/               # 비즈니스 엔티티
│   └── {entity}/
│       ├── api/            # API 함수 + queryKeys.ts
│       ├── model/          # hooks, types, store
│       └── ui/             # 엔티티 관련 UI
└── shared/                 # 공유 자원
    ├── api/                # API 클라이언트, 공통 타입
    ├── config/             # 상수, env 접근 래퍼
    ├── lib/                # 유틸리티 함수
    └── ui/                 # 공통 UI 컴포넌트 (Atomic Design)
        ├── atoms/
        ├── molecules/
        ├── organisms/
        └── theme/          # 디자인 토큰
```

### Import 방향 규칙 [MUST]

- 상위 레이어 → 하위 레이어 import만 허용
- 같은 레이어 내 슬라이스 간 import 금지
- 순환 참조 절대 금지
- 슬라이스는 `index.ts` (public API)를 통해서만 노출. 내부 파일 직접 import 금지

| From        | Import 허용                                              |
| ----------- | -------------------------------------------------------- |
| shared      | 어디서든 ✅                                              |
| entities    | shared ✅ / features, widgets, pages, src/app ❌         |
| features    | shared, entities ✅ / widgets, pages, src/app ❌         |
| widgets     | shared, entities, features ✅ / pages, src/app ❌        |
| pages       | shared, entities, features, widgets ✅ / src/app ❌      |
| src/app     | 모든 레이어 ✅                                           |
| `app/` (Next) | pages, src/app ✅ / features·entities 직접 import 지양 |

---

## Server Component vs Client Component

### 경계 규칙 [MUST]

- **기본값은 Server Component**입니다. `'use client'`를 습관적으로 붙이지 않습니다.
- `'use client'`는 **필요한 최말단(leaf) 컴포넌트에만** 선언합니다. 페이지/레이아웃 상단에 붙이면 하위 트리 전체가 클라이언트 번들에 포함됩니다.
- `'use client'`는 파일 **첫 줄**에 위치합니다.

### Client Component 전환이 필요한 조건

| 조건                                                     | 예시                                                    |
| -------------------------------------------------------- | ------------------------------------------------------- |
| 이벤트 핸들러가 필요                                     | `onClick`, `onChange`, `onSubmit`                        |
| React 훅 사용                                            | `useState`, `useEffect`, `useRef`, `useReducer`          |
| 브라우저 API 접근                                        | `window`, `document`, `localStorage`, `IntersectionObserver` |
| 클라이언트 상태 라이브러리 사용                          | Zustand store, TanStack Query hooks                      |
| 라이프사이클 의존 서드파티                               | 차트·에디터·맵 라이브러리                                |

**위 조건에 해당하지 않으면 Server Component로 둡니다.**

### 컴포지션 패턴 (권장)

Client Component가 필요하더라도, 무거운 서버 렌더링 결과는 `children`/props로 **주입**해 클라이언트 번들을 줄입니다.

```tsx
// src/widgets/report-panel/ui/ReportPanel.tsx  (Server Component)
import { ReportTabs } from "./ReportTabs"; // 'use client'
import { ReportSummary } from "@/entities/report"; // Server Component

export async function ReportPanel({ id }: { id: number }) {
  const summary = await getReportSummary(id); // 서버에서 직접 호출

  return (
    <ReportTabs>
      {/* 서버에서 렌더된 트리를 클라이언트 컴포넌트의 children으로 주입 */}
      <ReportSummary summary={summary} />
    </ReportTabs>
  );
}
```

```tsx
// src/widgets/report-panel/ui/ReportTabs.tsx
"use client";

import { useState, type ReactNode } from "react";

interface ReportTabsProps {
  children: ReactNode;
}

export function ReportTabs({ children }: ReportTabsProps) {
  const [tab, setTab] = useState<"summary" | "detail">("summary");

  return (
    <div>
      <button type="button" onClick={() => setTab("summary")}>
        요약
      </button>
      {tab === "summary" && children}
    </div>
  );
}
```

### Zustand / TanStack Query 경계 [MUST]

- Zustand store와 TanStack Query hook은 **`'use client'` 경계 안에서만** 사용합니다.
- Server Component에서 store/hook을 import하면 런타임 에러가 납니다. 서버는 **직접 호출 + props 전달**로 데이터를 넘깁니다.
- Provider(`QueryClientProvider`)는 `src/app/providers/`에 `'use client'`로 두고, 루트 `app/layout.tsx`에서 감쌉니다.

---

## 데이터 페칭 규칙

### 무엇을 언제 쓰는가 [MUST]

| 상황                                                | 방식                                            |
| --------------------------------------------------- | ----------------------------------------------- |
| 최초 렌더에 필요한 데이터 (SEO·LCP 중요)            | Server Component에서 `fetch` / API 함수 직접 호출 |
| 사용자 상호작용으로 변하는 목록 (필터·페이지네이션) | Client Component + TanStack Query               |
| 폴링·실시간 동기화·낙관적 업데이트                  | TanStack Query                                  |
| 무한 스크롤                                         | TanStack Query `useInfiniteQuery`               |
| 서버 전용 시크릿이 필요한 호출                      | Server Component / Route Handler (클라이언트 금지) |
| 단순 폼 제출 (재검증만 필요)                        | Server Actions                                  |

### Server Component 페칭

```tsx
// src/pages/report-list/ui/ReportListPage.tsx (Server Component)
import { getReportSummary } from "@/entities/report/api";

export async function ReportListPage() {
  // 캐시 정책 명시 [MUST] — 기본값에 의존하지 않음
  const summary = await getReportSummary({ next: { revalidate: 300 } });

  return <ReportSummaryView summary={summary} />;
}
```

- `fetch` 옵션(`cache`, `next.revalidate`, `next.tags`)은 **항상 명시**합니다. Next 버전마다 기본값이 달라 암묵적 캐싱에 의존하면 안 됩니다.
- 요청별로 달라지는 데이터(쿠키·헤더 의존)는 `cache: 'no-store'`를 명시합니다.

---

## 상태 관리

### Zustand (클라이언트 상태)

- UI 상태, 사용자 설정, 앱 전역 상태에 사용
- 파일 위치: `entities/{entity}/model/{entity}.store.ts` 또는 `shared/model/*.store.ts`
- store 파일에는 `'use client'`를 붙이지 않되, **store를 사용하는 컴포넌트가 클라이언트 컴포넌트**여야 합니다.
- **selector로 구독 범위를 좁힙니다** (store 전체 구독 금지 — 불필요한 리렌더 유발)

```typescript
// src/entities/user/model/user.store.ts
import { create } from "zustand";
import type { User } from "./user.type";

interface UserState {
  currentUser: User | null;
  setUser: (user: User | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  setUser: (user) => set({ currentUser: user }),
}));
```

```tsx
// ✅ selector로 필요한 값만 구독
const currentUser = useUserStore((state) => state.currentUser);

// ❌ store 전체 구독 — 무관한 필드 변경에도 리렌더
const { currentUser } = useUserStore();
```

> ⚠️ 서버 렌더 시 store는 요청 간 공유될 수 있으므로, **사용자별 데이터를 모듈 전역 store 초기값에 넣지 않습니다.** 필요하면 Provider 기반 store(`createStore` + Context)로 요청마다 인스턴스를 만듭니다.

### TanStack Query (서버 상태)

- API 데이터 캐싱, 자동 리페치, 낙관적 업데이트에 사용
- 파일 위치: `entities/{entity}/api/queryKeys.ts`, `entities/{entity}/model/use{Entity}Query.ts`

#### Query Key Factory 패턴 [MUST]

Query 키는 Factory 패턴으로 관리합니다.

```typescript
// src/entities/report/api/queryKeys.ts
import type { GetReportsParams, GetSummaryParams } from "./report.api";

export const reportKeys = {
  all: ["reports"] as const,
  lists: () => [...reportKeys.all, "list"] as const,
  list: (params: GetReportsParams) => [...reportKeys.lists(), params] as const,
  summaries: () => [...reportKeys.all, "summary"] as const,
  summary: (params: GetSummaryParams) =>
    [...reportKeys.summaries(), params] as const,
  details: () => [...reportKeys.all, "detail"] as const,
  detail: (id: number) => [...reportKeys.details(), id] as const,
};
```

#### Query hook

```typescript
// src/entities/report/model/useReportQuery.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { reportApi } from "../api/report.api";
import { reportKeys } from "../api/queryKeys";
import type { GetReportsParams, ReportListItem } from "../api/report.api";

export function useReportListQuery(params: GetReportsParams) {
  return useQuery({
    queryKey: reportKeys.list(params),
    queryFn: () => reportApi.getReportList(params),
    select: (response) => ({
      data: response.data as ReportListItem[],
      total: response.pageInfo?.total ?? 0,
    }),
  });
}
```

#### staleTime 설정 (권장)

자주 변하지 않는 데이터는 `staleTime`을 설정하여 불필요한 재요청을 방지합니다. SSR과 함께 쓸 때는 **`staleTime > 0`이어야 하이드레이션 직후 즉시 재요청되지 않습니다.**

```typescript
export function useTeamsQuery() {
  return useQuery({
    queryKey: reportKeys.teams(),
    queryFn: () => reportApi.getTeams(),
    select: (response) => response.data as Team[],
    staleTime: 5 * 60 * 1000, // 5분간 신선하게 유지
  });
}
```

#### Mutation 예시

```typescript
// src/entities/user/model/useUserMutation.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "../api/user.api";
import { userKeys } from "../api/queryKeys";

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
```

#### 필터 상태 + Query 조합 hook (권장)

페이지 로직은 필터 상태 관리와 Query를 조합한 커스텀 훅으로 분리합니다.

```typescript
// src/features/report-filter/model/useReportList.ts
"use client";

import { useMemo, useState, useEffect } from "react";
import { useDebounce } from "@/shared/lib/useDebounce";
import { useReportListQuery, useTeamsQuery } from "@/entities/report";

export function useReportList() {
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_RANGE);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);

  const debouncedKeyword = useDebounce(searchKeyword, 300);

  const listParams = useMemo<GetReportsParams>(
    () => ({
      startDate: formatDateParam(dateRange.start),
      endDate: formatDateParam(dateRange.end),
      teamIds: selectedTeams.length > 0 ? selectedTeams : undefined,
      q: debouncedKeyword || undefined,
      page,
    }),
    [dateRange, selectedTeams, debouncedKeyword, page],
  );

  const { data, isLoading, isFetching } = useReportListQuery(listParams);
  const { data: teams } = useTeamsQuery();

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setPage(1);
  }, [dateRange, selectedTeams, debouncedKeyword]);

  return {
    dateRange,
    setDateRange,
    selectedTeams,
    setSelectedTeams,
    searchKeyword,
    setSearchKeyword,
    reportData: data?.data ?? [],
    totalCount: data?.total ?? 0,
    teams: teams ?? [],
    isLoading,
    isFetching,
  };
}
```

### Zustand vs TanStack Query 사용 기준

| 상황                      | 사용 라이브러리          |
| ------------------------- | ------------------------ |
| API 응답 데이터 캐싱      | TanStack Query           |
| 서버 데이터 실시간 동기화 | TanStack Query           |
| 낙관적 업데이트           | TanStack Query           |
| 무한 스크롤 / 페이지네이션 캐시 | TanStack Query     |
| 폼 상태 관리              | 로컬 `useState` (또는 react-hook-form) |
| 모달/사이드바 열림 상태   | Zustand 또는 로컬 `useState` |
| 사용자 인증 정보          | Zustand                  |
| 테마/언어 설정            | Zustand                  |

> **원칙**: 서버에서 온 데이터를 Zustand에 복사해 두지 않습니다. 서버 데이터의 단일 소스는 TanStack Query 캐시(또는 Server Component)입니다.

---

## TanStack Query와 SSR (Hydration)

서버에서 프리페치하고 클라이언트에서 이어받을 때 `dehydrate` + `HydrationBoundary`를 사용합니다.

### 사용 시점

| 상황                                                     | 방식                                        |
| -------------------------------------------------------- | ------------------------------------------- |
| 서버 렌더 결과만 필요, 이후 상호작용 없음                | Server Component 직접 호출 (Query 불필요)   |
| 첫 화면은 서버 렌더 + 이후 필터·리페치가 클라이언트에서 | **prefetch + HydrationBoundary**            |
| 상호작용 이후에만 필요한 데이터                          | 클라이언트 Query만 (prefetch 불필요)        |

```tsx
// app/reports/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { ReportListPage } from "@/pages/report-list";
import { reportKeys } from "@/entities/report";
import { reportApi } from "@/entities/report/api";

export default async function Page() {
  // 요청마다 새 QueryClient — 전역 인스턴스 공유 금지 [MUST]
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: reportKeys.list(DEFAULT_PARAMS),
    queryFn: () => reportApi.getReportList(DEFAULT_PARAMS),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ReportListPage />
    </HydrationBoundary>
  );
}
```

**필수 규칙 [MUST]**

- 서버에서 `QueryClient`는 **요청마다 새로 생성**합니다. 모듈 전역으로 공유하면 사용자 간 캐시가 섞입니다.
- prefetch에 쓰는 `queryKey`는 클라이언트 hook의 키와 **완전히 동일**해야 합니다 → Query Key Factory를 쓰는 이유.
- 클라이언트 `QueryClient` 기본 옵션에 `staleTime`을 0보다 크게 둡니다(예: 60초). 0이면 하이드레이션 직후 즉시 재요청합니다.

---

## Server Actions 사용 기준

| 용도                                            | 권장 여부                            |
| ----------------------------------------------- | ------------------------------------ |
| 단순 폼 제출 (생성/수정/삭제) + `revalidatePath` | ✅ 사용                              |
| Progressive enhancement가 필요한 폼             | ✅ 사용                              |
| 서버 시크릿이 필요한 단발성 변이                | ✅ 사용                              |
| 목록 조회·검색 등 읽기 작업                     | ❌ 금지 — Server Component / Query   |
| 낙관적 업데이트·복잡한 캐시 무효화가 필요한 변이 | ❌ TanStack Query `useMutation` 우선 |
| 클라이언트 상태와 강하게 얽힌 변이              | ❌ TanStack Query `useMutation`      |

**필수 규칙 [MUST]**

- Server Action은 **공개 엔드포인트와 동일하게 취급**합니다. 내부에서 반드시 인증·인가·입력 검증(zod 등)을 수행합니다.
- 파일 위치: `src/features/{feature}/api/{action}.action.ts`, 파일 상단에 `'use server'`.
- 클라이언트 컴포넌트가 Server Action을 import할 때 **서버 전용 모듈이 함께 딸려오지 않도록** action 파일에는 서버 로직만 둡니다.

```typescript
// src/features/create-report/api/createReport.action.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/shared/api/auth";

const CreateReportSchema = z.object({
  title: z.string().min(1).max(100),
  teamId: z.string(),
});

export async function createReportAction(formData: FormData) {
  const session = await requireSession(); // 인가 [MUST]
  const parsed = CreateReportSchema.parse({
    title: formData.get("title"),
    teamId: formData.get("teamId"),
  });

  await reportApi.createReport(parsed, session.token);
  revalidatePath("/reports");
}
```

---

## 라우팅 · 파일 컨벤션 (App Router)

| 파일               | 역할                                    | 컴포넌트 유형                |
| ------------------ | --------------------------------------- | ---------------------------- |
| `page.tsx`         | 라우트 화면 진입점                      | Server (기본)                |
| `layout.tsx`       | 공유 레이아웃 (하위 라우트 감쌈)        | Server (기본)                |
| `template.tsx`     | 이동 시마다 재마운트되는 레이아웃       | Server                       |
| `loading.tsx`      | Suspense fallback                       | Server                       |
| `error.tsx`        | 에러 바운더리                           | **Client 필수** (`'use client'`) |
| `not-found.tsx`    | 404 화면                                | Server                       |
| `route.ts`         | Route Handler (API)                     | 서버 전용                    |

**규칙**

- 라우트 세그먼트 폴더명은 **kebab-case** (`report-detail/`).
- 동적 세그먼트는 `[id]`, 그룹은 `(group)`, 병렬 라우트는 `@slot`.
- `loading.tsx`와 `error.tsx`는 데이터를 페칭하는 라우트에 **반드시 함께 둡니다.**

### 메타데이터

```tsx
// 정적 메타데이터
export const metadata: Metadata = {
  title: "리포트 목록",
  description: "팀별 리포트를 조회합니다.",
};

// 동적 메타데이터
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const report = await reportApi.getReport(Number(id));
  return { title: report.title };
}
```

- `<head>`를 직접 조작하지 않고 **Metadata API만 사용**합니다.
- App Router에서 `params`/`searchParams`는 **Promise**입니다. `await` 후 사용합니다.

---

## 스타일링

### Tailwind CSS vs CSS Modules 선택 기준

기본은 **Tailwind CSS**입니다. 아래 조건에 해당하면 CSS Modules(SCSS)를 사용합니다.

| 상황                                                    | 방식                     |
| ------------------------------------------------------- | ------------------------ |
| 레이아웃·간격·타이포 등 일반 스타일                     | **Tailwind**             |
| 유틸리티로 표현 가능한 상태 변형 (`hover:`, `disabled:`) | **Tailwind**             |
| 반응형 분기                                             | **Tailwind** (`md:`, `lg:`) |
| 디자인 토큰 변수를 SCSS에서 직접 연산·조합해야 함       | **CSS Modules (SCSS)**   |
| 복잡한 상태 조합(다중 상태 × 변형)으로 클래스가 길어짐  | **CSS Modules (SCSS)**   |
| 키프레임·복합 애니메이션, `::before`/`::after` 중첩     | **CSS Modules (SCSS)**   |
| 서드파티 위젯 내부 DOM 스타일 오버라이드                | **CSS Modules (SCSS)**   |

**필수 규칙**

- 두 방식을 한 컴포넌트에서 **임의 혼용하지 않습니다.** 불가피하면 "레이아웃=Tailwind / 내부 디테일=CSS Module"처럼 경계를 주석으로 명시합니다.
- 조건부 클래스는 문자열 결합 대신 `clsx`/`cva` 같은 유틸을 사용합니다.
- **하드코딩 raw 값 금지.** 색상·간격은 Tailwind 테마 토큰 또는 SCSS 토큰 변수를 사용합니다.

```tsx
// Tailwind + cva — variant 기반 공통 컴포넌트
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        ghost: "bg-transparent hover:bg-muted",
      },
      size: { sm: "h-8 px-3 text-sm", md: "h-10 px-4" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}
```

```tsx
// CSS Modules (SCSS) — 복잡한 상태/토큰 연산이 필요할 때
import styles from "./ReportChart.module.scss";

export function ReportChart({ status }: { status: ChartStatus }) {
  return <div className={`${styles.chart} ${styles[`chart--${status}`]}`} />;
}
```

### 디자인 토큰

- 토큰은 **프로젝트의 토큰 빌드 산출물에 실제로 존재하는 값만** 사용합니다. 변수명을 추측하지 않고 파일을 먼저 확인합니다.
- Tailwind는 `tailwind.config.ts`의 `theme.extend`에서 토큰을 CSS 변수로 매핑해 사용합니다.
- 구체 토큰 목록(색상·타이포 스케일·토큰 산출물 경로 등)은 **프로젝트마다 다르므로 팀 표준 rule에 두지 않습니다.** 각 프로젝트의 `.claude/project.config.md` 또는 프로젝트 rule에 명시하세요.
- 필요한 토큰이 없으면 raw 값을 하드코딩하지 않고, 디자인 시스템 담당과 협의해 토큰에 추가 후 빌드합니다.

---

## 컴포넌트 개발

1. 적절한 FSD 레이어에 컴포넌트 생성
2. `shared/ui/`의 공통 컴포넌트는 Atomic Design 원칙 준수
3. 문서화를 위한 Storybook stories 추가
4. 일관된 스타일링을 위해 design tokens 사용
5. **Server/Client 경계를 먼저 판단**한 뒤 파일을 만듭니다

### 컴포넌트 책임 제한 [MUST]

컴포넌트(`.tsx`)는 다음 역할만 담당:

- props 정의
- UI 렌더링
- 이벤트 핸들러 연결

**금지 사항:**

- 50줄 이상의 컴포넌트 내부 로직
- API 호출 직접 작성 (Server Component의 데이터 로딩 제외 — 그마저도 `entities/*/api` 함수를 호출)
- 복잡한 데이터 변환/계산 (렌더 중 무거운 연산)
- 여러 store 조합 로직

**분리 기준:**

- 로직이 길어지면 → `model/` 커스텀 훅으로 추출
- 재사용 가능한 계산 → `shared/lib/`로 추출
- 상태 공유 필요 → `*.store.ts`로 이동
- 서버 데이터 → `use*Query.ts`로 이동

### 공통 컴포넌트 수정 시 필수 작업 [MUST]

`shared/ui/` 컴포넌트 수정 시 반드시 함께 수정:

1. **사용처 영향도 분석** — 해당 컴포넌트를 import하는 모든 지점 확인
2. **Storybook 스토리 파일** (`*.stories.tsx`)
   - 새로운 prop 추가 시 → argTypes에 추가, 해당 prop 사용하는 스토리 추가
   - prop 삭제/변경 시 → 기존 스토리 업데이트
3. **테스트 파일** (`*.spec.tsx`, `*.test.tsx`)
   - 테스트가 존재하는 경우 → 영향받는 테스트 케이스 수정
4. **Server/Client 경계 변경 주의** — 공통 컴포넌트에 `'use client'`를 추가하면 이를 쓰는 모든 서버 트리가 클라이언트로 전환됩니다. 반드시 사용처 영향도를 먼저 확인합니다.

### Atomic Design (shared/ui/ 전용)

`shared/ui/`에만 Atomic Design을 적용합니다. `entities/`, `features/`, `widgets/`는 FSD 규칙을 따릅니다.

| 분류      | 설명                                      | 예시                                          |
| --------- | ----------------------------------------- | --------------------------------------------- |
| atoms     | 더 이상 분해할 수 없는 최소 UI 단위       | Button, Input, Icon, Badge                    |
| molecules | 2개 이상의 atoms 조합                     | FormField (Label + Input + Error), SearchInput |
| organisms | molecules/atoms 조합으로 독립적 기능 수행 | (필요시에만 생성)                             |

**분류 원칙:**

- 도메인 로직이 포함되면 `entities/` 또는 `features/`로 이동
- 재사용 가능성이 낮으면 해당 레이어에 직접 배치
- `shared/ui`의 atom은 가능한 한 **Server Component로 유지**하고, 상호작용이 필요한 것만 클라이언트로 둡니다

---

## 커스텀 훅으로 비즈니스 로직 분리 [MUST]

- 루트 `app/*` 또는 단일 `.tsx` 파일에 로직 집중 금지
- 컴포넌트에는 UI 이벤트 처리만

| 유형                             | 위치                                                        |
| -------------------------------- | ----------------------------------------------------------- |
| React 상태/이펙트 결합 로직      | `entities/{entity}/model/` 또는 `features/{feature}/model/` |
| 순수 로직 (계산, 포맷, 매핑)     | `shared/lib/`                                               |
| 전역 클라이언트 상태             | `*.store.ts` (Zustand)                                      |
| 서버 상태                        | `use*Query.ts` (TanStack Query)                             |
| 서버 변이 (폼 제출)              | `*.action.ts` (Server Actions)                              |

### Hook 네이밍 [MUST]

- `use` prefix 필수
- 예: `useUsers`, `useUserDetail`, `useUsersQuery`, `useCreateUserMutation`
- 훅 파일에는 `'use client'`가 필요합니다 (훅은 클라이언트 전용)

---

## 파일 네이밍 컨벤션

| 대상               | 규칙                          | 예시                                        |
| ------------------ | ----------------------------- | ------------------------------------------- |
| 컴포넌트 파일      | PascalCase `.tsx`             | `ReportTable.tsx`                           |
| 컴포넌트 디렉터리  | PascalCase 또는 슬라이스 kebab | `shared/ui/atoms/Button/Button.tsx`         |
| Next 라우트 세그먼트 | kebab-case                  | `app/report-detail/[id]/page.tsx`           |
| Hook               | `use*.ts`                     | `useReportList.ts`                          |
| Query hook         | `use*Query.ts`                | `useReportQuery.ts`                         |
| Store              | `*.store.ts`                  | `user.store.ts`                             |
| Types              | `*.type.ts`                   | `report.type.ts`                            |
| API                | `*.api.ts`                    | `report.api.ts`                             |
| Query Keys         | `queryKeys.ts`                | `entities/report/api/queryKeys.ts`          |
| Server Action      | `*.action.ts`                 | `createReport.action.ts`                    |
| CSS Module         | `*.module.scss`               | `ReportChart.module.scss`                   |
| 슬라이스 public API | `index.ts`                   | `entities/report/index.ts`                  |

### Import 전략

- src root에서 absolute imports를 위해 `@/` alias 사용 (`tsconfig.json` `paths`)
- barrel export (`index.ts`)를 통한 public API 노출
- 모든 import는 **명시적으로 작성**합니다 (auto-import 없음 — FSD 레이어 경계 명확화)
- import 순서: 외부 라이브러리 → FSD 상위→하위 레이어 역순 → 상대 경로

---

## TypeScript 컨벤션

### 함수 선언 방식 [MUST]

| 위치                                     | 권장                 |
| ---------------------------------------- | -------------------- |
| `shared/lib/`, `**/model/`, `**/api/`    | function declaration |
| 컴포넌트 정의                            | function declaration |
| 컴포넌트 내부 핸들러/콜백                | arrow function       |

```tsx
// ✅ 컴포넌트는 function declaration
export function ReportTable({ rows }: ReportTableProps) {
  // ✅ 내부 핸들러는 arrow function
  const handleRowClick = (id: number) => {
    router.push(`/reports/${id}`);
  };

  return <table onClick={() => handleRowClick(rows[0].id)} />;
}
```

- `React.FC` 사용 금지 (암묵적 `children`, 제네릭 제약). props는 인터페이스로 명시합니다.

### interface vs type [MUST]

- 객체 구조 / 확장 목적 (props, API 응답) → `interface`
- 유니온 / 튜플 / 조합 타입 → `type`

```typescript
interface ReportTableProps {
  rows: ReportListItem[];
  onSelect?: (id: number) => void;
}

type ChartStatus = "idle" | "loading" | "error";
```

### any 사용 금지 [MUST]

- `any` 타입 사용 금지
- 불가피하면 `unknown` + 타입 가드로 좁힙니다
- 예외 시: 사유 + TODO 주석 명시

### 기타

- `tsconfig.json`은 `strict: true` 유지
- `as` 단언은 최소화. API 응답은 스키마 검증(zod 등) 또는 타입 가드로 좁힙니다
- 비동기 서버 컴포넌트의 반환 타입은 추론에 맡기되, 유틸 함수는 반환 타입을 명시합니다

---

## API 개발 가이드라인

- **Response Types**: `src/shared/api/api.type.ts`의 `ApiResponse<T>`(성공/실패 형태) 항상 사용
- **Type Safety**: API 응답용 구체 타입 정의 후 `ApiResponse<T>`와 조합
- **일관된 구조**: 모든 API 함수는 `Promise<ApiResponse<T>>` 반환
- **Error Handling**: 표준화된 error code/message 형식 사용
- **Server/Client 양쪽에서 호출 가능하게** API 함수는 프레임워크 훅에 의존하지 않는 **순수 비동기 함수**로 작성합니다

```typescript
// src/entities/report/api/report.api.ts
import { apiClient } from "@/shared/api";
import type { ApiResponse } from "@/shared/api";
import type { ReportListItem } from "../model/report.type";

export interface GetReportsParams {
  startDate: string;
  endDate: string;
  teamIds?: string[];
  q?: string;
  page?: number;
}

export async function getReportList(
  params: GetReportsParams,
): Promise<ApiResponse<ReportListItem[]>> {
  return apiClient<ApiResponse<ReportListItem[]>>("/api/reports", { params });
}

export async function getReportById(
  id: number,
): Promise<ApiResponse<ReportListItem>> {
  return apiClient<ApiResponse<ReportListItem>>(`/api/reports/${id}`);
}
```

---

## 금지 사항

| 금지                                                              | 대안                                                        |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| Server Component에서 훅 사용 (`useState`, `useEffect` 등)         | `'use client'` 컴포넌트로 분리                              |
| Server Component에서 이벤트 핸들러(`onClick`) props 전달          | 핸들러가 필요한 부분만 Client Component로 분리              |
| 페이지/레이아웃 최상단에 습관적 `'use client'`                    | 최말단 컴포넌트에만 선언                                    |
| Client Component에 서버 시크릿 노출 (`process.env.API_SECRET`)    | 서버 전용 모듈/Route Handler에서만 접근                     |
| `NEXT_PUBLIC_` prefix에 민감값 저장                               | `NEXT_PUBLIC_`은 **번들에 그대로 노출**됨 — 공개값만        |
| Client Component에서 `fs`, `path` 등 Node 모듈 import             | 서버 경계로 이동                                            |
| 서버에서 `QueryClient` 전역 인스턴스 공유                         | 요청마다 새 인스턴스 생성                                   |
| 서버 데이터를 Zustand에 복사 저장                                 | TanStack Query 캐시를 단일 소스로                           |
| Zustand store 전체 구독                                           | selector로 필요한 값만 구독                                 |
| Server Action으로 읽기(조회) 수행                                 | Server Component 또는 TanStack Query                        |
| `<head>` 직접 조작 / `next/head` 사용 (App Router)                | Metadata API (`metadata`, `generateMetadata`)               |
| `useEffect` 안에서 데이터 페칭                                    | TanStack Query 또는 Server Component                        |
| `React.FC` 사용                                                   | `function Component(props: Props)`                          |
| 하드코딩 색상/치수                                                | Tailwind 테마 토큰 / SCSS 토큰 변수                         |
| 명시적 `any`                                                      | `unknown` + 타입 가드                                       |

---

## ESLint 검증 [MUST]

코드 작성/수정 완료 후 **반드시 ESLint를 실행**하여 오류가 없는지 확인합니다.

### 검증 시점

- 새 파일 생성 후
- 기존 파일 수정 완료 후
- 커밋 전

### 검증 명령어

```bash
# Next.js 통합 린트
npm run lint

# 특정 파일 검사
npx eslint <파일경로>

# 자동 수정 가능한 오류 수정
npx eslint --fix <파일경로>
```

> 프로젝트별 실제 명령(`LINT_COMMAND`, `TYPECHECK_COMMAND`)은 `.claude/project.config.md`를 따릅니다.

### 흔한 오류 유형

| 오류                                                     | 원인                          | 해결                                    |
| -------------------------------------------------------- | ----------------------------- | --------------------------------------- |
| `'x' is defined but never used`                          | 변수/파라미터 미사용          | 제거하거나 `_x`로 명시적 무시           |
| `Unexpected any`                                         | any 타입 사용                 | 구체적 타입으로 변경                    |
| `React Hook ... called conditionally`                    | 조건부 훅 호출                | 훅을 최상단으로 이동                    |
| `You're importing a component that needs useState...`    | Server Component에서 훅 사용  | `'use client'` 추가 또는 경계 분리      |
| `Error: Event handlers cannot be passed to Client Component props` | 서버→클라 핸들러 전달 | 핸들러를 클라이언트 컴포넌트 내부로     |

### 예외 처리

```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _intentionallyUnused = value;
```

---

## 보안 (요약 — 정본은 `security-compliance.md`)

> 보안 판정 기준의 **정본**은 `.claude/rules/security-compliance.md`입니다.
> 아래는 Next.js/React 필수 항목 요약이며, 본 문서와 충돌 시 정본을 따릅니다. 상세 보안 리뷰는 `/secure-review`.

- **시크릿 노출 금지 [MUST]**: 서버 전용 env는 Server Component / Route Handler / Server Action에서만 접근. `NEXT_PUBLIC_` 값은 클라이언트 번들에 그대로 실리므로 **공개 가능한 값만** 넣습니다.
- **개인정보 마스킹**: 마스킹은 **서버/API 책임**입니다. 권한 없는 사용자 응답에 원문이 실려오는지가 1차 판정 기준이며, 클라이언트 마스킹에 의존하지 않습니다.
- **개인정보 조회 제한**: 이름·이메일·전화번호 등 원문 렌더링 지점에 권한 가드를 적용합니다.
- **개인정보처리방침 표시**: 푸터/로그인 화면의 개인정보처리방침 링크는 다른 약관 링크와 시각적으로 구분(강조)되어야 합니다.
- **XSS**: `dangerouslySetInnerHTML` 사용 금지(불가피하면 sanitize + 사유 주석). 사용자 입력을 URL/스크립트로 직접 해석하지 않습니다.
- **Server Action 인가 [MUST]**: Server Action은 공개 엔드포인트와 동일. 내부에서 인증·인가·입력 검증을 반드시 수행합니다.
- **로그**: 토큰·쿠키·고객 식별 정보를 콘솔/서버 로그에 남기지 않습니다.
