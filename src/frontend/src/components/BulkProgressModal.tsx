interface BulkProgressModalProps {
  action: "approve" | "reject" | "flag";
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  status: "processing" | "completed" | "failed";
  onClose: () => void;
}

export default function BulkProgressModal({
  action,
  progress,
  status,
  onClose,
}: BulkProgressModalProps) {
  const actionLabel =
    action === "approve"
      ? "Approved"
      : action === "reject"
        ? "Rejected"
        : "Flagged";

  const percentage =
    progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  const isComplete = status === "completed" || status === "failed";

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ minWidth: "400px" }}>
        <div className="modal-header">
          <h3 className="modal-title">
            {status === "processing" ? "Processing..." : actionLabel}
          </h3>
        </div>
        <div className="modal-body">
          <div className="progress-container" style={{ marginBottom: 0 }}>
            <div className="progress-header">
              <p>
                {status === "processing"
                  ? "Your bulk action is being processed"
                  : status === "completed"
                    ? "✓ Bulk action completed successfully"
                    : "✗ Bulk action failed"}
              </p>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${percentage}%`,
                  background:
                    status === "failed"
                      ? "#e74c3c"
                      : status === "completed"
                        ? "#27ae60"
                        : "linear-gradient(90deg, #3498db, #2980b9)",
                }}
              ></div>
            </div>
            <div className="progress-stats">
              <div className="progress-stat">
                Total: <strong>{progress.total}</strong>
              </div>
              <div className="progress-stat">
                Completed: <strong>{progress.completed}</strong>
              </div>
              {progress.failed > 0 && (
                <div className="progress-stat">
                  Failed:{" "}
                  <strong style={{ color: "#e74c3c" }}>
                    {progress.failed}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </div>
        {isComplete && (
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
