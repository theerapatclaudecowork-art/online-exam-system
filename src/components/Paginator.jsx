// ─────────────────────────────────────────────────────────────
//  Paginator — แถบ pagination ใช้ร่วมกันทุกหน้า
//  Props:
//    page        : number (0-indexed)
//    totalItems  : number
//    pageSize    : number
//    onPage      : (page: number) => void
//    compact     : boolean (แสดงแบบกะทัดรัดสำหรับมือถือ)
// ─────────────────────────────────────────────────────────────
export default function Paginator({ page, totalItems, pageSize, onPage, compact = false }) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const start = page * pageSize + 1;
  const end   = Math.min((page + 1) * pageSize, totalItems);

  // สร้างเลขหน้าที่แสดง (สูงสุด 5 หน้า รอบๆ หน้าปัจจุบัน)
  function getPageNumbers() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const pages = new Set([0, totalPages - 1, page]);
    if (page > 0) pages.add(page - 1);
    if (page < totalPages - 1) pages.add(page + 1);
    if (page > 1) pages.add(page - 2);
    if (page < totalPages - 2) pages.add(page + 2);
    return [...pages].sort((a, b) => a - b);
  }

  const pageNums = getPageNumbers();

  const btnBase = {
    display:       'flex',
    alignItems:    'center',
    justifyContent:'center',
    height:        compact ? 28 : 32,
    minWidth:      compact ? 28 : 32,
    padding:       '0 6px',
    borderRadius:  8,
    border:        '1.5px solid var(--input-border)',
    cursor:        'pointer',
    fontSize:      compact ? 11 : 12,
    fontWeight:    600,
    transition:    'all .15s',
    background:    'var(--card)',
    color:         'var(--text-muted)',
    userSelect:    'none',
  };

  const btnActive = {
    ...btnBase,
    background: 'var(--accent)',
    color:      'white',
    border:     '1.5px solid var(--accent)',
  };

  const btnDisabled = {
    ...btnBase,
    opacity: 0.35,
    cursor:  'default',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap', margin: '12px 0 4px' }}>

      {/* ← ก่อนหน้า */}
      <button
        style={page === 0 ? btnDisabled : btnBase}
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
        title="หน้าก่อนหน้า"
      >
        ‹
      </button>

      {/* เลขหน้า */}
      {pageNums.map((p, idx) => {
        // แทรก ... ถ้าช่องว่าง
        const prev = pageNums[idx - 1];
        const dots = prev !== undefined && p - prev > 1;
        return (
          <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {dots && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 2px' }}>…</span>
            )}
            <button
              style={p === page ? btnActive : btnBase}
              onClick={() => onPage(p)}
            >
              {p + 1}
            </button>
          </span>
        );
      })}

      {/* → ถัดไป */}
      <button
        style={page >= totalPages - 1 ? btnDisabled : btnBase}
        disabled={page >= totalPages - 1}
        onClick={() => onPage(page + 1)}
        title="หน้าถัดไป"
      >
        ›
      </button>

      {/* ข้อมูลสรุป */}
      {!compact && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
          {start}–{end} / {totalItems} รายการ
        </span>
      )}
    </div>
  );
}
