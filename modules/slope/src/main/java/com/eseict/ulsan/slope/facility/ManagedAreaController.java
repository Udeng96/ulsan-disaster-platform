package com.eseict.ulsan.slope.facility;

import com.eseict.ulsan.slope.facility.dto.GradeUploadResponse;
import com.eseict.ulsan.slope.facility.dto.ManagedAreaResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 관리지역 조회. {@code /slope} 는 context-path.
 *
 * <p>{@code GET  /slope/api/managed-areas} — 전건 (목표 165개소, 현재 89건)
 * <p>{@code GET  /slope/api/managed-areas/grades/template} — 등급 입력 엑셀 양식
 * <p>{@code POST /slope/api/managed-areas/grades} — 등급 엑셀 업로드 ({@link ManagedAreaGradeService})
 *
 * <p>정렬·검색 파라미터를 두지 않는다 — 전건을 한 번에 내려주고 화면에서 처리한다.
 * 한글 정렬은 DB 로케일이 {@code C.UTF-8} 이라 부정확하고, 초성 검색과 표기 흔들림
 * (공백/하이픈/괄호) 처리도 클라이언트가 정확하다. 페이지네이션이 붙으면 그때 서버로 옮긴다.
 *
 * <p><b>관리지역</b>(이 자원)과 <b>급경사지</b>({@link SlopeArea}, {@code /api/areas})는 별개
 * 관리 대상이다. 같은 장소를 가리키는 3건이 양쪽에 있지만 이름도 각자 유지한다
 * ({@code 가상시설0554} ↔ {@code 가상시설0553}).
 */
@RestController
@RequestMapping("/api/managed-areas")
@RequiredArgsConstructor
public class ManagedAreaController {

    private final ManagedAreaService service;
    private final ManagedAreaGradeService gradeService;

    @GetMapping
    public List<ManagedAreaResponse> list() {
        return service.list();
    }

    /** 등급 입력 양식 (.xlsx) — 전 지역의 관리번호·급경사지명·현재 등급. */
    @GetMapping("/grades/template")
    public ResponseEntity<byte[]> gradeTemplate() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("급경사지_등급_양식.xlsx", StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(gradeService.template());
    }

    /**
     * 등급 일괄 변경. 양식 그대로 채운 엑셀 파일을 {@code file} 로 보낸다.
     * 틀린 행이 있으면 400 과 함께 행 목록을 주고 아무것도 반영하지 않는다.
     */
    @PostMapping(value = "/grades", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GradeUploadResponse> uploadGrades(@RequestParam("file") MultipartFile file)
            throws IOException {
        GradeUploadResponse result = gradeService.upload(file.getInputStream());
        return result.errors().isEmpty()
                ? ResponseEntity.ok(result)
                : ResponseEntity.badRequest().body(result);
    }

    /** 엑셀을 읽지 못한 경우 (형식이 다르거나 머리글이 없음). */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> badFile(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
    }
}
