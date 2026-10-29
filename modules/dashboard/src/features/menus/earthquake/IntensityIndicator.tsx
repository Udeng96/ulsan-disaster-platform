// 진도 색상 막대 + 현재 값/시간 표시 박스 (우측 W 80 영역).
// currentVal / currentTime 은 부모 ChannelRow 의 최신 시계열 데이터에서 추출.

import { COLORS } from '@/styles/designTokens'
import { INTENSITY_LEVELS } from './intensity'

interface Props {
  currentVal: number
  currentTime: string
  /** 현재 진도 (INTENSITY_LEVELS label) — 평상시 'I'. */
  level: string
}

export function IntensityIndicator({ currentVal, currentTime, level }: Props) {
  return (
    <div
      className="flex shrink-0 items-center justify-center self-stretch"
      style={{
        width: '80px',
        padding: '14px 0',
        gap: '4px',
        borderTop: `1px solid ${COLORS.neutral450}`,
      }}
    >
      {/* 좌측 표 영역 — 레벨 (I 로마자) + 수치/시간 박스 */}
      <div
        className="flex shrink-0 flex-col items-start self-stretch"
        style={{ width: '44px' }}
      >
        <div
          className="flex items-center justify-center self-stretch"
          style={{
            padding: '10px',
            gap: '10px',
            flex: '1 0 0',
            background: 'rgba(255, 255, 255, 0.10)',
          }}
        >
          <span
            style={{
              color: COLORS.neutral100,
              textAlign: 'right',
              fontFamily: '"S-Core Dream"',
              fontSize: '14px',
              fontWeight: 200,
              lineHeight: '10px',
            }}
          >
            {level}
          </span>
        </div>

        <div
          className="flex flex-col items-end justify-center self-stretch"
          style={{
            padding: '4px',
            gap: '2px',
            border: `1px solid ${COLORS.neutral450}`,
            background: COLORS.neutral700,
          }}
        >
          <span
            style={{
              color: COLORS.neutral200,
              textAlign: 'right',
              fontFamily: 'Roboto',
              fontSize: '9px',
              fontWeight: 400,
              lineHeight: '12px',
            }}
          >
            {currentVal.toFixed(4)}
          </span>
          <span
            style={{
              color: COLORS.neutral200,
              textAlign: 'right',
              fontFamily: 'Roboto',
              fontSize: '9px',
              fontWeight: 400,
              lineHeight: '12px',
            }}
          >
            {currentTime}
          </span>
        </div>
      </div>

      {/* 우측 색 막대 — 9 단계 (IX→I) */}
      <div className="flex flex-col self-stretch" style={{ flex: '1 0 0' }}>
        {INTENSITY_LEVELS.map((c) => (
          <div
            key={c.label}
            className="flex items-center self-stretch"
            style={{ gap: '2px' }}
          >
            <div
              style={{
                width: '8px',
                height: '12px',
                background: c.color,
              }}
            />
            <span
              style={{
                color: COLORS.neutral100,
                textAlign: 'right',
                fontFamily: '"S-Core Dream"',
                fontSize: '8px',
                fontWeight: 200,
                lineHeight: '10px',
              }}
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
