export const editorCss = `
.lwr-modal { width: min(1020px, calc(100vw - 48px)); max-height: calc(100vh - 48px); display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; background: var(--contentColor, #fff); color: var(--textColorPrimary, #263548); border: 1px solid var(--borderColor, #cad4df); border-radius: 10px; }
.lwr-modal-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--borderColor, #cad4df); flex-shrink: 0; }
.lwr-modal-header h2 { flex: 1; margin: 0; font: 600 14px/1.4 system-ui, sans-serif; text-align: center; }
.lwr-modal-header button { border: 0; padding: 0 4px; background: transparent; color: inherit; font: 24px/1 system-ui, sans-serif; cursor: pointer; }
.lwr-modal-header button:focus-visible { outline: 2px solid var(--primary, #2874d0); outline-offset: 2px; }
.lwr-modal-content { min-height: 0; padding: 24px; overflow: auto; }
.lwr-editor { color: var(--textColorPrimary, #263548); font: 13px/1.45 system-ui, sans-serif; }
.lwr-editor *, .lwr-editor *::before, .lwr-editor *::after { box-sizing: border-box; }
.lwr-editor button, .lwr-editor select { font: inherit; color: inherit; background: var(--contentColor, #fff); border: 1px solid var(--borderColor, #cad4df); border-radius: 6px; padding: 5px 9px; cursor: pointer; }
.lwr-editor button:hover { background: var(--tableBgcSelected, #eaf1fa); }
.lwr-editor button:disabled { opacity: .35; cursor: default; }
.lwr-editor button:focus-visible, .lwr-editor select:focus-visible, .lwr-editor input:focus-visible { outline: 2px solid var(--primary, #2874d0); outline-offset: 2px; }
.lwr-editor-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.lwr-editor-toolbar label { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.lwr-presets { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.lwr-presets > span, .lwr-help, .lwr-empty-line { color: var(--textColorSecondary, #758399); }
.lwr-preview { border: 1px solid var(--borderColor, #cad4df); border-radius: 10px; overflow: hidden; background: var(--contentColor, #fff); }
.lwr-section-label { text-transform: uppercase; letter-spacing: .08em; font-size: 10px; font-weight: 700; color: var(--textColorSecondary, #758399); padding: 10px 14px 0; }
.lwr-preview-line { display: grid; gap: 14px; padding: 10px 14px; min-height: 45px; }
.lwr-preview-primary { background: color-mix(in srgb, var(--textColorPrimary, #64748b) 3%, var(--contentColor, #fff)); }
.lwr-preview-secondary { border-top: 1px solid var(--borderColor, #e4eaf1); background: var(--contentColor, #fff); }
.lwr-preview-secondary .lwr-preview-value { flex-direction: row; align-items: center; gap: 6px; }
.lwr-preview-secondary .lwr-preview-label { flex-shrink: 0; margin-bottom: 0; }
.lwr-preview-secondary .lwr-preview-group { border-inline-start: 1px solid var(--borderColor, #cbd5e1); padding-inline-start: 14px; }
.lwr-preview-auto { display: flex; gap: 12px; overflow: hidden; }
.lwr-preview-auto .lwr-preview-value { flex: 0 1 auto; }
.lwr-preview-auto .lwr-preview-value:has(.lwr-preview-name) { min-width: 80px; }
.lwr-preview-secondary .lwr-preview-status, .lwr-preview-primary .lwr-preview-status,
.lwr-preview-secondary .lwr-preview-error, .lwr-preview-primary .lwr-preview-error { align-self: flex-start; border-radius: 999px; padding: 1px 7px; background: color-mix(in srgb, currentColor 9%, transparent); }
.lwr-preview-value { min-width: 0; overflow: hidden; display: flex; flex-direction: column; }
.lwr-preview-value > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lwr-preview-label { color: var(--textColorSecondary, #758399); font-size: 10px; margin-bottom: 3px; }
.lwr-preview-name { font-weight: 650; }
.lwr-preview-status { color: var(--colorOk, #25824f); }
.lwr-preview-error { color: var(--colorError, #cf3f4b); }
.lwr-help { margin: 12px 0; font-size: 12px; }
.lwr-lanes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-height: 37vh; min-height: 120px; overflow-y: auto; padding: 2px; }
.lwr-lane, .lwr-hidden { border: 1px solid var(--borderColor, #dce3ec); border-radius: 9px; padding: 10px; min-width: 0; }
.lwr-lane h3, .lwr-hidden h3 { font: 600 12px/1.4 system-ui; margin: 0 0 8px; display: flex; gap: 7px; align-items: center; }
.lwr-lane h3 > span, .lwr-hidden h3 > span { color: var(--textColorSecondary, #758399); font-weight: 400; }
.lwr-drop-ready { border-style: dashed; }
.lwr-field { border: 1px solid var(--borderColor, #dce3ec); border-radius: 7px; padding: 8px 10px; margin-top: 7px; background: var(--contentColor, #fff); display: grid; grid-template-columns: minmax(80px, 1fr) auto; gap: 6px 8px; }
.lwr-field-title { display: flex; gap: 6px; align-items: center; min-width: 0; }
.lwr-field-title strong { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lwr-grip { color: var(--textColorSecondary, #758399); cursor: grab; }
.lwr-field-actions { display: flex; gap: 3px; align-items: center; }
.lwr-field-actions button { padding: 2px 5px; }
.lwr-field-actions select { max-width: 104px; padding: 3px; font-size: 11px; }
.lwr-width { grid-column: 1 / -1; display: flex; gap: 8px; align-items: center; font-size: 10px; color: var(--textColorSecondary, #758399); }
.lwr-width input { flex: 1; min-width: 0; accent-color: var(--primary, #2874d0); height: 13px; }
.lwr-width input:disabled { opacity: .35; }
.lwr-width output { min-width: 18px; text-align: right; }
.lwr-dragging { opacity: .4; }
.lwr-hidden { margin-top: 12px; }
.lwr-hidden-list { display: flex; flex-wrap: wrap; gap: 6px; }
.lwr-hidden-list .lwr-field { margin: 0; }
.lwr-empty-line { font-size: 11px; margin: 6px 0; }
.lwr-editor-options { display: flex; flex-wrap: wrap; gap: 8px 20px; align-items: center; margin: 12px 0; font-size: 11px; }
.lwr-editor-options label { display: flex; gap: 6px; align-items: center; }
.lwr-editor-options > span { color: var(--textColorSecondary, #758399); }
.lwr-editor-footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--borderColor, #dce3ec); padding-top: 12px; }
.lwr-editor button.lwr-apply { background: var(--primary, #2874d0); color: white; border-color: transparent; }
@media (max-width: 650px) { .lwr-lanes { grid-template-columns: 1fr; } .lwr-field { grid-template-columns: 1fr; } .lwr-field-actions { justify-content: flex-end; } }
`;
