import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { ScaledFrame } from '@/components/layout/ScaledFrame'
import { AdminCctvRoute } from '@/routes/admin-cctv'
import { TabletRoute } from '@/routes/tablet'
import { WallRoute } from '@/routes/wall'

// 운영 환경 — wall (통합) + tablet (독립) 두 화면.
//   wall   : IP월 ultrawide 단일 표출 (좌측 패널 + 메인 대시보드 + 우측 패널, 2880×1080)
//   tablet : 태블릿 독립 (메인 대시보드만, wall 참여 X)
export const router = createBrowserRouter([
  // tablet — 1920×1080 단일 (default ScaledFrame)
  {
    element: (
      <ScaledFrame>
        <Outlet />
      </ScaledFrame>
    ),
    children: [
      { index: true, element: <Navigate to="/wall" replace /> },
      { path: 'tablet', element: <TabletRoute /> },
    ],
  },
  // wall — 통합 ultrawide 화면 (2880×1080)
  {
    element: (
      <ScaledFrame width={2880} height={1080} background="#000">
        <Outlet />
      </ScaledFrame>
    ),
    children: [
      // 새 화면 — 운영에 올리면서 /wall 로 바꿈. 옛 화면은 /v2/wall 로 옮겨 둔다 (사용자 10-23)
      { path: 'wall', lazy: () => import('@/app/wall/WallPage').then((m) => ({ Component: m.default })) },
      { path: 'v2/wall', element: <WallRoute /> },
    ],
  },
  // 관리자 — 1920×1080 기준 px 레이아웃이라, 배율 125% PC(폭 1536) 에서도 잘리지 않게 통째로 축소한다.
  {
    path: 'admin/cctv',
    element: (
      <ScaledFrame background="#001229">
        <AdminCctvRoute />
      </ScaledFrame>
    ),
  },
  // 개발용 — 옛/새 컴포넌트 비교 화면 (운영 빌드에는 안 들어감)
  ...(import.meta.env.DEV
    ? [{ path: 'dev/ui', lazy: () => import('@/dev/UiParity').then((m) => ({ Component: m.default })) }]
    : []),
  { path: '*', element: <NotFound /> },
])

function NotFound() {
  return (
    <div className="grid h-screen place-items-center bg-black text-white">
      <p className="text-3xl">404</p>
    </div>
  )
}
