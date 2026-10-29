// Xeus-Gate Player 2.2.0 (vendor JS) 타입 선언.
//   WebSocket 으로 게이트 서버에 접속 → cctvMgrNo 영상 스트림 수신 후 playerId DOM 에 렌더.

declare module '@/vendor/xeus.player.2.2.0' {
  export interface XeusPlayerOptions {
    /** 영상이 렌더될 DOM element id. */
    playerId: string
    /** 게이트 서버 WebSocket URL. */
    url: string
    /** 접속 사용자 id. */
    userId: string
    /** CCTV 관리번호 (/api/cctv 의 cctvId). */
    cctvMgrNo: string
    /** 내부 상세 로그 (XeusGate.Log) 활성화. */
    debug?: boolean
  }

  export interface XeusPlayerInstance {
    destroy?: () => void
  }

  const XeusGate: {
    Player: new (options: XeusPlayerOptions) => XeusPlayerInstance
  }
  export default XeusGate
}
