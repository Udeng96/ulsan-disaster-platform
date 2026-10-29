package com.eseict.ulsan.slope.facility;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.eseict.ulsan.slope.facility.dto.GradeUploadResponse;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * 관리지역 등급 엑셀 — 양식이 다시 읽히는지, 틀린 행이 있으면 전체를 거부하는지.
 */
class ManagedAreaGradeServiceTest {

    private ManagedArea a1;
    private ManagedArea a2;
    private ManagedAreaGradeService service;

    @BeforeEach
    void setUp() {
        a1 = area("3114000001", "가상시설0729", "A");
        a2 = area("3114000002", "가상시설0227", "A");
        ManagedAreaRepository repository = mock(ManagedAreaRepository.class);
        when(repository.findAll()).thenReturn(List.of(a1, a2));
        when(repository.findAllByOrderByMgmtNoAsc()).thenReturn(List.of(a1, a2));
        service = new ManagedAreaGradeService(repository);
    }

    @Test
    @DisplayName("양식은 전 지역을 현재 등급과 함께 담고, 그대로 다시 읽힌다")
    void templateRoundTrip() {
        List<ManagedAreaGradeService.GradeRow> rows =
                ManagedAreaGradeService.parse(new ByteArrayInputStream(service.template()));

        assertThat(rows).containsExactly(
                new ManagedAreaGradeService.GradeRow(2, "3114000001", "A"),
                new ManagedAreaGradeService.GradeRow(3, "3114000002", "A"));
    }

    @Test
    @DisplayName("관리번호로 찾아 등급만 바꾼다. 빈 칸은 건너뛰고 소문자·공백은 맞춘다")
    void appliesGrades() throws IOException {
        GradeUploadResponse result = service.upload(xlsx(
                new String[]{"3114000001", "아무 이름", " d "},
                new String[]{"3114000002", "가상시설0227", ""}));

        assertThat(result.errors()).isEmpty();
        assertThat(result.changed()).isEqualTo(1);
        assertThat(result.skipped()).isEqualTo(1);
        assertThat(a1.getGrade()).isEqualTo("D");
        assertThat(a2.getGrade()).isEqualTo("A");
    }

    @Test
    @DisplayName("한 줄이라도 틀리면 아무것도 반영하지 않는다")
    void rejectsAll() throws IOException {
        GradeUploadResponse result = service.upload(xlsx(
                new String[]{"3114000001", "", "B"},
                new String[]{"3114000002", "", "F"},
                new String[]{"9999999999", "", "C"},
                new String[]{"3114000001", "", "C"}));

        assertThat(result.errors()).extracting(GradeUploadResponse.RowError::row).containsExactly(3, 4, 5);
        assertThat(a1.getGrade()).isEqualTo("A");
        assertThat(result.changed()).isZero();
    }

    @Test
    @DisplayName("머리글이 다르면 양식을 쓰라고 알려준다")
    void missingHeader() {
        assertThatThrownBy(() -> service.upload(xlsxWithHeader("번호", "이름", "등급")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("관리번호");
    }

    private static ManagedArea area(String mgmtNo, String name, String grade) {
        ManagedArea a = new ManagedArea();
        ReflectionTestUtils.setField(a, "mgmtNo", mgmtNo);
        ReflectionTestUtils.setField(a, "name", name);
        ReflectionTestUtils.setField(a, "grade", grade);
        return a;
    }

    private static ByteArrayInputStream xlsx(String[]... rows) throws IOException {
        return write(new String[]{"관리번호", "급경사지명", "등급"}, rows);
    }

    private static ByteArrayInputStream xlsxWithHeader(String... header) throws IOException {
        return write(header);
    }

    private static ByteArrayInputStream write(String[] header, String[]... rows) throws IOException {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet();
            String[][] all = new String[rows.length + 1][];
            all[0] = header;
            System.arraycopy(rows, 0, all, 1, rows.length);
            for (int i = 0; i < all.length; i++) {
                Row row = sheet.createRow(i);
                for (int j = 0; j < all[i].length; j++) {
                    row.createCell(j).setCellValue(all[i][j]);
                }
            }
            wb.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }
}
