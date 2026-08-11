export const improvedDeleteConfirmationStyles = `
  .delete-confirmation{
  position:absolute;
  top:50%;
  left:50%;
  width:320px;           /* fixed width instead of 100 % */
  max-width:90%;
  background:#fff;
  border-radius:12px;
  padding:24px;
  transform:translate(-50%,-50%) scale(0.9);
  transition:transform .25s ease,opacity .25s ease;
  box-shadow:0 8px 24px rgba(0,0,0,.18);
  opacity:0;             /* start hidden */
}
.delete-confirmation.active{
  transform:translate(-50%,-50%) scale(1);
  opacity:1;
}

  .delete-confirmation-header {
    font-size: 18px;
    font-weight: 600 !important;
    color: #ef4444;
    margin-bottom: 16px;
  }
  .delete-confirmation-content {
    margin-bottom: 24px;
    color: #4b5563;
    font-size: 14px;
    line-height: 1.5;
  }
  .delete-confirmation-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
  .btn-cancel-delete {
    padding: 10px 16px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500 !important;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-cancel-delete:hover {
    background: #f9fafb;
    color: #374151;
  }
  .btn-confirm-delete {
    padding: 10px 16px;
    background: #ef4444;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500 !important;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-confirm-delete:hover {
    background: #dc2626;
  }

  .modal .delete-confirmation {
    position: absolute;
    border-radius: 12px;
    box-sizing: border-box;
  }

  .delete-confirmation.active {
    transform: translateY(0);
  }
`



