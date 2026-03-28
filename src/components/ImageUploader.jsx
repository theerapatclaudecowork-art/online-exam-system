import { useState, useRef } from 'react';
import { apiPost } from '../utils/api';

export default function ImageUploader({ value, onChange, callerUserId }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState(value || '');
  const [error, setError]         = useState('');
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('ไฟล์ใหญ่เกิน 5MB'); return; }
    setError('');
    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64Data = ev.target.result;
        const previewUrl = base64Data;
        setPreview(previewUrl);

        const res = await apiPost({
          action:      'uploadImage',
          callerUserId,
          base64Data,
          fileName:    file.name,
          mimeType:    file.type,
        });

        if (!res.success) throw new Error(res.message);
        setPreview(res.url);
        onChange(res.url);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setError('อัพโหลดไม่สำเร็จ: ' + e.message);
      setUploading(false);
    }
    e.target.value = '';
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          className="themed-input flex-1 text-sm"
          placeholder="URL รูปภาพ หรืออัพโหลดจากเครื่อง..."
          value={value}
          onChange={e => { onChange(e.target.value); setPreview(e.target.value); }}
        />
        <label
          className="btn btn-gray rounded-xl px-3 py-2 text-sm cursor-pointer flex-shrink-0"
          style={{ whiteSpace:'nowrap', opacity: uploading ? .6 : 1 }}>
          {uploading ? '⏳...' : '📁 อัพโหลด'}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
      {error && <p className="text-xs mt-1" style={{ color:'#ef4444' }}>{error}</p>}
      {(preview || value) && (
        <div className="mt-2 relative inline-block">
          <img
            src={preview || value}
            alt="preview"
            className="rounded-xl object-contain"
            style={{ maxHeight:140, maxWidth:'100%', border:'1px solid var(--input-border)' }}
            onError={e => { e.target.style.display='none'; }}
          />
          <button
            type="button"
            className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{ background:'rgba(0,0,0,.5)', color:'white', border:'none', cursor:'pointer' }}
            onClick={() => { setPreview(''); onChange(''); }}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
