// /wall — IP wall 한 화면 (좌 480 + 메인 1920 + 우 480 = 2880×1080). 새 화면.
//   옛 화면은 /v2/wall 로 옮겨 둠 (사용자 10-23).
import { Dashboard } from './dashboard/Dashboard'
import { LeftPanel } from './left/LeftPanel'
import { RightPanel } from './right/RightPanel'
import { WeatherProvider } from './weather'

export default function WallPage() {
  return (
    <WeatherProvider>
      <div className="flex size-full">
        <div className="h-[1080px] w-[480px] shrink-0">
          <LeftPanel />
        </div>
        <div className="h-[1080px] w-[1920px] shrink-0">
          <Dashboard />
        </div>
        <div className="h-[1080px] w-[480px] shrink-0">
          <RightPanel />
        </div>
      </div>
    </WeatherProvider>
  )
}
