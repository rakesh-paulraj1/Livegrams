export type CanvasShape = {
  id: string;
  type: string;
  x?: number;
  y?: number;
  props?: Record<string, unknown>;
};

export class EditorController {
  constructor(private editorRef: React.RefObject<any>) {}

  private getEditor() {
    const ed = this.editorRef?.current;
    if (!ed) throw new Error("Editor not available");
    return ed;
  }

  run<T>(fn: (ed: any) => T) {
    const ed = this.getEditor();
    if (typeof ed.run === "function") {
      return ed.run(() => fn(ed));
    }
    return fn(ed);
  }

  getShapes(): CanvasShape[] {
    try {
      return this.getEditor()?.getShapes?.() ?? [];
    } catch {
      return [];
    }
  }

  createShapes(shapes: CanvasShape[]) {
    return this.run((ed) => ed.createShapes(shapes));
  }

  deleteShapes(ids: string[]) {
    return this.run((ed) => ed.deleteShapes(ids));
  }

  updateShape(id: string, props: Record<string, unknown>) {
    return this.run((ed) => ed.updateShape(id, props));
  }

  deleteAll() {
    const ids = this.getShapes().map((s) => s.id);
    if (ids.length) this.deleteShapes(ids);
  }
}