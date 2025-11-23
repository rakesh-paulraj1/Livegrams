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
      const editor = this.getEditor();
      const shapes = editor.getCurrentPageShapes();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return shapes.map((shape: any) => ({
        id: shape.id,
        type: shape.type,
        x: shape.x,
        y: shape.y,
        props: shape.props
      }));
    } catch (err) {
      console.error('Error getting shapes:', err);
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
    console.log('deleteAll() called')
    const shapes = this.getShapes();
    console.log(`Found ${shapes.length} shapes on canvas`)
    const ids = shapes.map((s) => s.id);
    console.log('Shape IDs to delete:', ids)
    if (ids.length) {
      console.log(`Deleting ${ids.length} shapes...`)
      this.deleteShapes(ids);
      console.log('Delete operation completed')
    } else {
      console.log('Canvas is already empty')
    }
  }


  async getCanvasImage(): Promise<string> {
    const editor = this.getEditor();

    const shapes = editor.getCurrentPageShapes();
    
    if (shapes.length === 0) {
      throw new Error('No shapes on canvas to capture');
    }
  
    const shapeIds = shapes.map((s: any) => s.id);
    
    const result = await editor.toImageDataUrl(shapeIds, {
      format: 'png', 
      background: true,
      padding: 32,
      scale: 2,
    });
    return result.url;
  } 
}