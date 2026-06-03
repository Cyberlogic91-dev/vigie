interface Props {
  loading: boolean
  text: string
  onClose: () => void
}

export function BriefModal({ loading, text, onClose }: Props): JSX.Element {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>📋 Brief du jour</h2>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-dim)' }}>
            <span className="spinner" /> Génération en cours…
          </div>
        ) : (
          <div className="brief-text">{text}</div>
        )}
        <div className="modal-actions">
          <button className="btn primary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
