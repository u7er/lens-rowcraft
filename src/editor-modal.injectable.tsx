import { getInjectable2 } from "@k8slens/injectable";
import { getModalInjectableBunch, getModalKind, openModalInjectionToken, useRespondFromModal, type ModalProps } from "@k8slens/modal-contracts";
import { ModalContainer, ModalContent, ModalHeader } from "@k8slens/modal-components";
import { LayoutEditor } from "./editor";
import type { LayoutSettings, TableCatalog } from "./config.ts";

const layoutEditorKind = getModalKind<[tables: TableCatalog[], settings: LayoutSettings], LayoutSettings | null>()("layout-editor");

const EditorModal = ({ input: [tables, settings] }: ModalProps<typeof layoutEditorKind>) => {
  const respond = useRespondFromModal(layoutEditorKind);
  return <ModalContainer $style={{ width: "min(1020px, calc(100vw - 48px))", maxHeight: "calc(100vh - 48px)", overflowY: "auto" }}>
    <ModalHeader onClose={() => respond(null)}>Workload layout</ModalHeader>
    <ModalContent><LayoutEditor tables={tables} settings={settings} onApply={(value) => respond(value)} onCancel={() => respond(null)} /></ModalContent>
  </ModalContainer>;
};

export const layoutEditorModalBunch = getModalInjectableBunch({ kind: layoutEditorKind, Component: EditorModal, onClose: () => null });

export const openEditorInjectable = getInjectable2({
  id: "lens-workload-rows.open-editor",
  consumptions: [openModalInjectionToken],
  instantiate: (di) => {
    const open = di.inject(openModalInjectionToken.for(layoutEditorKind).for(di.scopeIds))();
    return () => open;
  },
});
