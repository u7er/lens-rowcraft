import { useId } from "react";
import { LayoutEditor, type EditorProps } from "./editor";

/** Lens owns the overlay and modal lifecycle; this is only its content shell. */
export const LayoutEditorDialog = (props: EditorProps) => {
  const titleId = useId();
  return <section className="lwr-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
    <header className="lwr-modal-header">
      <h2 id={titleId}>Workload layout</h2>
      <button type="button" aria-label="Close layout editor" onClick={props.onCancel}>&times;</button>
    </header>
    <div className="lwr-modal-content"><LayoutEditor {...props} /></div>
  </section>;
};
