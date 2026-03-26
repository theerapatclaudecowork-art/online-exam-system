export default function Spinner({ label = 'กำลังโหลด...' }) {
  return (
    <div className="quiz-card no-hover rounded-2xl p-10 text-center animate-fade">
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}
