import { LeftPanel } from '@/features/wall/left-panel/LeftPanel'
import { RightPanel } from '@/features/wall/right-panel/RightPanel'
import { DashboardPage } from '@/features/wall/main-dashboard/DashboardPage'

// /wall — IP wall 통합 표출 (left 480 + main 1920 + right 480 = 2880 × 1080).
// 단일 ultrawide 디스플레이에서 좌측 패널 / 메인 대시보드 / 우측 패널을 한 화면에 같이 띄움.
//
// wall 시뮬레이션 SSE 는 백엔드 contract 재설계 대기 중 — 호출 코드 제거됨.
// SimulationProvider 없이도 useSimulation() 이 default (전부 false) 반환 → 동작 영향 없음.
// 추후 endpoint 확정 시 useEffect + EventSource 로 wall 참여 + SimulationProvider 복원.
export function WallRoute() {
  return (
    <div className="flex h-full w-full">
      {/* 좌측 패널 — 480 × 1080 (날씨, 위성, 재난방송) */}
      <div style={{ width: '480px', height: '1080px', flexShrink: 0 }}>
        <LeftPanel />
      </div>
      {/* 메인 대시보드 — 1920 × 1080 */}
      <div style={{ width: '1920px', height: '1080px', flexShrink: 0 }}>
        <DashboardPage />
      </div>
      {/* 우측 패널 — 480 × 1080 (배수펌프장 / 육갑문 / 지진가속도) */}
      <div style={{ width: '480px', height: '1080px', flexShrink: 0 }}>
        <RightPanel />
      </div>
    </div>
  )
}
