package com.eseict.ulsan.slope.facility;

import com.eseict.ulsan.slope.facility.dto.GradeUploadResponse;
import com.eseict.ulsan.slope.facility.dto.GradeUploadResponse.RowError;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DataValidationHelper;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리지역 등급 엑셀 — 양식 다운로드와 업로드.
 *
 * <pre>
 * 관리번호 | 급경사지명 | 등급
 * </pre>
 *
 * <p><b>관리번호로 찾아 등급만 바꾼다.</b> 급경사지명은 입력하는 사람이 헷갈리지 않게 넣어 둔
 * 참고 열이라 읽지 않는다. 양식에는 전 지역이 현재 등급과 함께 들어 있다.
 *
 * <ul>
 *   <li>등급은 A~E. 일반관리대상 A~C, 붕괴위험지역 D·E</li>
 *   <li>등급 칸이 비면 그 행은 건너뛴다. 엑셀에 없는 지역도 그대로다</li>
 *   <li><b>한 줄이라도 틀리면 전체를 반영하지 않는다</b> — 모르는 관리번호, A~E 밖 등급, 같은
 *       관리번호 중복. 일부만 들어가면 무엇이 반영됐는지 확인하기 어렵다</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ManagedAreaGradeService {

    static final String MGMT_NO = "관리번호";
    static final String NAME = "급경사지명";
    static final String GRADE = "등급";
    static final List<String> GRADES = List.of("A", "B", "C", "D", "E");

    private final ManagedAreaRepository repository;

    /** 전 지역이 현재 등급과 함께 들어간 양식. 등급 칸은 A~E 목록에서만 고를 수 있다. */
    @Transactional(readOnly = true)
    public byte[] template() {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("등급");
            CellStyle header = wb.createCellStyle();
            Font bold = wb.createFont();
            bold.setBold(true);
            header.setFont(bold);

            Row head = sheet.createRow(0);
            String[] titles = {MGMT_NO, NAME, GRADE};
            for (int i = 0; i < titles.length; i++) {
                Cell cell = head.createCell(i);
                cell.setCellValue(titles[i]);
                cell.setCellStyle(header);
            }

            List<ManagedArea> areas = repository.findAllByOrderByMgmtNoAsc();
            for (int i = 0; i < areas.size(); i++) {
                ManagedArea a = areas.get(i);
                Row row = sheet.createRow(i + 1);
                row.createCell(0).setCellValue(a.getMgmtNo());   // 문자열 — 앞자리·지수 표기 방지
                row.createCell(1).setCellValue(a.getName());
                row.createCell(2).setCellValue(a.getGrade() == null ? "" : a.getGrade());
            }

            DataValidationHelper helper = sheet.getDataValidationHelper();
            sheet.addValidationData(helper.createValidation(
                    helper.createExplicitListConstraint(GRADES.toArray(String[]::new)),
                    new CellRangeAddressList(1, Math.max(areas.size(), 1), 2, 2)));

            sheet.setColumnWidth(0, 14 * 256);
            sheet.setColumnWidth(1, 36 * 256);
            sheet.setColumnWidth(2, 8 * 256);
            sheet.createFreezePane(0, 1);

            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("양식 생성 실패", e);
        }
    }

    @Transactional
    public GradeUploadResponse upload(InputStream xlsx) {
        List<GradeRow> rows = parse(xlsx);

        Map<String, ManagedArea> byMgmtNo = new HashMap<>();
        for (ManagedArea a : repository.findAll()) {
            byMgmtNo.put(a.getMgmtNo(), a);
        }

        List<RowError> errors = new ArrayList<>();
        Map<String, String> grades = new LinkedHashMap<>();
        Set<String> seen = new HashSet<>();
        int skipped = 0;
        for (GradeRow r : rows) {
            if (r.mgmtNo().isEmpty()) {
                if (!r.grade().isEmpty()) {
                    errors.add(new RowError(r.row(), "", "관리번호가 비어 있습니다"));
                }
                continue;   // 빈 줄
            }
            if (!seen.add(r.mgmtNo())) {
                errors.add(new RowError(r.row(), r.mgmtNo(), "관리번호가 중복됩니다"));
                continue;
            }
            if (!byMgmtNo.containsKey(r.mgmtNo())) {
                errors.add(new RowError(r.row(), r.mgmtNo(), "없는 관리번호입니다"));
                continue;
            }
            if (r.grade().isEmpty()) {
                skipped++;
                continue;
            }
            if (!GRADES.contains(r.grade())) {
                errors.add(new RowError(r.row(), r.mgmtNo(), "등급은 A~E 중 하나여야 합니다: " + r.grade()));
                continue;
            }
            grades.put(r.mgmtNo(), r.grade());
        }
        if (!errors.isEmpty()) {
            return GradeUploadResponse.rejected(errors);
        }

        int changed = 0;
        for (Map.Entry<String, String> e : grades.entrySet()) {
            if (byMgmtNo.get(e.getKey()).changeGrade(e.getValue())) {
                changed++;
            }
        }
        log.info("관리지역 등급 업로드 — 변경 {} / 그대로 {} / 빈칸 {}", changed, grades.size() - changed, skipped);
        return new GradeUploadResponse(changed, grades.size() - changed, skipped, List.of());
    }

    /**
     * 엑셀 한 행.
     *
     * @param row 엑셀 행 번호 (1부터, 머리글이 1행)
     */
    record GradeRow(int row, String mgmtNo, String grade) {
    }

    /**
     * 첫 시트를 읽는다. 열 위치는 머리글 이름으로 찾아 순서가 바뀌어도 된다.
     *
     * <p>관리번호를 숫자로 입력해도 {@link DataFormatter} 가 화면에 보이는 그대로(지수 표기 없이)
     * 읽는다. 등급은 앞뒤 공백을 지우고 대문자로 맞춘다.
     */
    static List<GradeRow> parse(InputStream xlsx) {
        try (Workbook wb = new XSSFWorkbook(xlsx)) {
            Sheet sheet = wb.getSheetAt(0);
            Row head = sheet.getRow(sheet.getFirstRowNum());
            int mgmtCol = column(head, MGMT_NO);
            int gradeCol = column(head, GRADE);

            DataFormatter fmt = new DataFormatter();
            List<GradeRow> rows = new ArrayList<>();
            for (int i = head.getRowNum() + 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) {
                    continue;
                }
                rows.add(new GradeRow(i + 1,
                        fmt.formatCellValue(row.getCell(mgmtCol)).trim(),
                        fmt.formatCellValue(row.getCell(gradeCol)).trim().toUpperCase()));
            }
            return rows;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (IOException | RuntimeException e) {
            throw new IllegalArgumentException("엑셀 파일(.xlsx)을 읽을 수 없습니다", e);
        }
    }

    private static int column(Row head, String title) {
        if (head != null) {
            for (Cell cell : head) {
                if (title.equals(cell.toString().trim())) {
                    return cell.getColumnIndex();
                }
            }
        }
        throw new IllegalArgumentException("첫 행에 '" + title + "' 열이 없습니다. 양식을 내려받아 사용해 주세요");
    }
}
