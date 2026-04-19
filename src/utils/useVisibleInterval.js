import { useEffect, useRef } from 'react';

/**
 * setInterval ที่ฉลาดขึ้น:
 *  - หยุดทำงานเมื่อ tab ไม่ active (document.hidden) → ประหยัด API call + battery
 *  - ทันทีที่กลับมา visible จะเรียก callback หนึ่งครั้ง (refresh)
 *  - cleanup อัตโนมัติเมื่อ unmount
 *
 * @param {Function} callback - งานที่ต้องการรัน
 * @param {number}   delay    - มิลลิวินาที (null = ปิดใช้งาน)
 */
export function useVisibleInterval(callback, delay) {
  const cbRef = useRef(callback);

  // เก็บ callback ล่าสุดไว้โดยไม่ trigger re-effect
  useEffect(() => { cbRef.current = callback; }, [callback]);

  useEffect(() => {
    if (delay == null) return;
    let id = null;

    const start = () => {
      if (id != null) return;
      id = setInterval(() => {
        if (!document.hidden) cbRef.current();
      }, delay);
    };
    const stop = () => {
      if (id != null) { clearInterval(id); id = null; }
    };
    const onVis = () => {
      if (document.hidden) {
        stop();
      } else {
        // กลับมา visible → ทันทีเรียก 1 ครั้ง + เริ่ม interval ใหม่
        try { cbRef.current(); } catch (_) {}
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [delay]);
}
