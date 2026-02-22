import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportToExcel } from './useExport';

const aoaToSheetMock = vi.fn();
const bookNewMock = vi.fn(() => ({}));
const bookAppendSheetMock = vi.fn();
const writeFileMock = vi.fn();

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: aoaToSheetMock,
    book_new: bookNewMock,
    book_append_sheet: bookAppendSheetMock,
  },
  writeFile: writeFileMock,
}));

describe('exportToExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  it('builds headers and rows from provided columns', () => {
    exportToExcel(
      [{ id: 1, name: 'Alice', missing: null }],
      [
        { key: 'name', label: '姓名' },
        { key: 'missing', label: '空值' },
      ],
      'report'
    );

    expect(aoaToSheetMock).toHaveBeenCalledWith([
      ['姓名', '空值'],
      ['Alice', ''],
    ]);
    expect(writeFileMock).toHaveBeenCalledWith(expect.any(Object), 'report_1700000000000.xlsx');
  });

  it('returns early when data is empty', () => {
    exportToExcel([], undefined, 'empty');

    expect(aoaToSheetMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
  });
});
