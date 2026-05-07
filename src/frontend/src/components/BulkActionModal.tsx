interface BulkActionModalProps {
  action: "approve" | "reject" | "flag";
  count: number;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export default function BulkActionModal({
  action,
  count,
  onConfirm,
  onCancel,
}: BulkActionModalProps) {
  const actionLabel =
    action === "approve" ? "Approve" : action === "reject" ? "Reject" : "Flag";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const reason = formData.get("reason") as string;
    onConfirm(reason || undefined);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{actionLabel} Orders</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p>
              You are about to <strong>{actionLabel.toLowerCase()}</strong>{" "}
              <strong>{count}</strong> order{count !== 1 ? "s" : ""}. This
              action cannot be undone.
            </p>
            {(action === "reject" || action === "flag") && (
              <div style={{ marginTop: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  Reason (optional)
                </label>
                <textarea
                  name="reason"
                  placeholder="Explain why you are rejecting/flagging these orders..."
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    minHeight: "100px",
                  }}
                />
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${
                action === "reject" || action === "flag"
                  ? "btn-danger"
                  : "btn-success"
              }`}
            >
              {actionLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
