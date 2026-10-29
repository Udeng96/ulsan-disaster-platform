package com.eseict.ulsan.gis.common.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * SPA (React Router, history mode) fallback.
 *
 * <p>프론트는 {@code createBrowserRouter} 를 써서 {@code /wall}, {@code /tablet} 같은
 * 클라이언트 라우트를 갖는다. 이 경로로 직접 접속 / 새로고침 하면 서버엔 해당 정적
 * 파일이 없어 404 가 나므로, {@code index.html} 로 forward 해서 프론트 라우터가 처리하게 한다.
 *
 * <p>{@code /} 는 Spring 이 static/index.html 을 자동 서빙하므로 매핑 불필요.
 * 프론트 라우트가 추가되면 아래 매핑에 경로를 추가한다.
 */
@Controller
public class SpaForwardController {

    @GetMapping({"/wall", "/v2/wall", "/tablet", "/admin/cctv"})
    public String forward() {
        return "forward:/index.html";
    }
}
