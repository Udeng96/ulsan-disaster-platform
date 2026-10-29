// 랙 판 구역 — SECUI 장비 앞면 (브랜드 전용, 재사용 안 함).

/** LED — 3×3 정수 칸 가운데에 지름 d 원. 칸이 정수라 반올림에 밀리지 않는다. */
function Led({ d, fill }: { d: number; fill: string }) {
  return (
    <svg width="3" height="3" viewBox="0 0 3 3" style={{ flexShrink: 0 }}>
      <circle cx="1.5" cy="1.5" r={d / 2} fill={fill} />
    </svg>
  )
}

/** 포트 — 4×6 밝은 몸체 + 위쪽 어두운 홈. 이전 4.8×5.908 시안 모양을 비율대로 옮겼다. */
function Port() {
  return (
    <svg width="4" height="6" viewBox="0 0 4 6" style={{ flexShrink: 0 }}>
      <rect width="4" height="6" rx="0.3" fill="#E9EEF4" />
      <rect x="0.6" width="2.8" height="1.9" fill="#12283F" />
    </svg>
  )
}

export function RackSecui() {
  return (
    <div className="rack-secui">
      <div className="rack-secui-left">
        <span className="rack-secui-logo">SECUI</span>
        <div className="rack-secui-below">
          <div className="rack-secui-ledblock">
            <div className="rack-secui-tall" />
            <div className="rack-secui-leds">
              <Led d={2} fill="#2ECC5E" />
              <Led d={2} fill="#E3D24A" />
              <Led d={1} fill="#0C161D" />
            </div>
          </div>
          <div className="rack-secui-usb">
            <span className="rack-secui-usb-port" />
            <span className="rack-secui-usb-port" />
          </div>
        </div>
      </div>
      <div className="rack-secui-ports">
        <div className="rack-secui-ports-h">
          <Port />
          <Port />
        </div>
        <div className="rack-secui-ports-v">
          <Port />
          <Port />
        </div>
      </div>
    </div>
  )
}
