import type { Map as MlMap } from 'maplibre-gl'
import type { SelectedSensor } from '@/features/menus/steep-slope/SlopeChartPanel'
import { RISK_BADGE_COLOR, RISK_TEXT } from '@/features/menus/steep-slope/variants'
import { SlopeMapPopup } from './SlopeManagedAreaPopup'

interface Props {
  map: MlMap
  sensor: SelectedSensor
  rightInset: number
  onClose: () => void
  pinTop?: boolean
}

/** 급경사지 계측 상세 — 선택한 계측기 정보 팝업. */
export function SlopeSensorPopup({ map, sensor, rightInset, onClose, pinTop }: Props) {
  const title = `${sensor.area} · ${sensor.label}`
  return (
    <SlopeMapPopup
      map={map}
      lat={sensor.lat}
      lng={sensor.lng}
      rightInset={rightInset}
      pinTop={pinTop}
      ariaLabel={`${title} 계측기 정보`}
      closeLabel="계측기 정보 닫기"
      onClose={onClose}
      heading={
        <>
          <span className="slope-managed-popup-number">국가지점번호 {sensor.spotNo || '정보 없음'}</span>
          <div className="slope-managed-popup-name-row">
            <h3>{title}</h3>
            <span className="slope-managed-popup-grade" style={{ color: RISK_BADGE_COLOR[sensor.risk] }}>
              {RISK_TEXT[sensor.risk]}
            </span>
          </div>
        </>
      }
    >
      <div><dt>설치주소</dt><dd>{sensor.address?.trim() || '정보 없음'}</dd></div>
      <div><dt>위치</dt><dd><span>위도 {sensor.lat}</span><span>경도 {sensor.lng}</span></dd></div>
      <div><dt>등록일자</dt><dd>{sensor.installedAt?.slice(0, 10) || '정보 없음'}</dd></div>
    </SlopeMapPopup>
  )
}
