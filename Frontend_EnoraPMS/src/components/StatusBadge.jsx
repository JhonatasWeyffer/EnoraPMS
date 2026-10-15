export default function StatusBadge({ status, label, number }) {
  return (
    <div className={`room ${status}`}>
      <h4>{number} UHs</h4>
      <span>{label}</span>
    </div>
  );
}
