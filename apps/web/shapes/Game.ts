import { Tool } from "../components/Canvas";
export type Shape =
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      type: "circle";
      centerX: number;
      centerY: number;
      radius: number;
    }
  | {
      type: "pencil";
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    };

export async function getExistingShapes(roomId: string): Promise<Shape[]> {
  try {
    const response = await fetch(`/api/shapes/${roomId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch shapes: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching shapes:", error);
    return [];
  }
}
async function createShape(shape: Shape, roomId: string): Promise<void> {
  try {
    console.log(roomId);
    const parsedshape=JSON.stringify(shape);
    console.log(parsedshape);
    const response = await fetch(`/api/server/saveshape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId: Number(roomId),
        shapeData: parsedshape
      }),
    });
    

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API Error:", errorData);
      throw new Error(`Failed to save shape: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("Shape saved:", result);
  } catch (error) {
    console.error("Error creating shape:", error);
  }
}

function makeCanvasFullscreen(canvas: HTMLCanvasElement) {
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.zIndex = "999";
  document.body.style.overflow = "hidden";
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private existingShapes: Shape[] = [];
  private roomId: string;
  private isDrawing: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private selectedTool: Tool = "pencil";
  private isInitialized: boolean = false;
  socket: WebSocket;

  constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
    this.canvas = canvas;

    this.canvas.width = 1200;
    this.canvas.height = 700;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas context");
    }
    this.ctx = ctx;
    this.roomId = roomId;
    this.socket = socket;

    makeCanvasFullscreen(this.canvas);

    this.initSocketHandlers();
    this.initMouseHandlers();

    
    this.initializeShapes();
  }
  private async initializeShapes(): Promise<void> {
    try {
      this.existingShapes = await getExistingShapes(this.roomId);
      this.clearAndRedraw();
      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = true;
    }
  }

  setTool(tool: Tool): void {
    this.selectedTool = tool;
    console.log("🔧 Tool set to:", tool);
  }

  private sendShape(shape: Shape): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      const message = {
        type: "chat",
        shape,
        roomId: this.roomId,
      };
      this.socket.send(JSON.stringify(message));
    }
  }

  private initSocketHandlers(): void {
    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        // console.log("Received WebSocket message:", message);
        if (message.type === "chat" && message.shape) {
          this.existingShapes.push(message.shape);
          this.clearAndRedraw();
          // console.log("Added new shape from WebSocket");
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  }

  private initMouseHandlers(): void {
    
    this.canvas.addEventListener("mousedown", this.mouseDownHandler);
    this.canvas.addEventListener("mouseup", this.mouseUpHandler);
    this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
    this.canvas.addEventListener("contextmenu", (e: Event) => e.preventDefault());
 
  }

  destroy(): void {

    this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
    this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
    this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
    if (this.socket) {
      this.socket.onmessage = null;
    }
  }

  public clearCanvas(): void {
    this.clearAndRedraw();
  }
  
  private clearAndRedraw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "#1a1a1a";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = "white";
    this.ctx.lineWidth = 2;

    this.existingShapes.forEach((shape) => this.drawShape(shape));
  }
  
  private drawShape(shape: Shape): void {
    if (shape.type === "rect") {
      this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    } else if (shape.type === "circle") {
      this.ctx.beginPath();
      this.ctx.arc(shape.centerX, shape.centerY, Math.abs(shape.radius), 0, Math.PI * 2);
      this.ctx.stroke();
    } else if (shape.type === "pencil") {
      this.ctx.beginPath();
      this.ctx.moveTo(shape.startX, shape.startY);
      this.ctx.lineTo(shape.endX, shape.endY);
      this.ctx.stroke();
    }
  }

  private mouseDownHandler = (e: MouseEvent): void => {
    if (!this.isInitialized) return;

    this.isDrawing = true;
    const rect = this.canvas.getBoundingClientRect();
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;
  };

  private mouseUpHandler = (e: MouseEvent): void => {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    
    if (this.selectedTool === "pencil") return;

    const rect = this.canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    const width = endX - this.startX;
    const height = endY - this.startY;

    let shape: Shape | null = null;
    if (this.selectedTool === "rect") {
      shape = { type: "rect", x: this.startX, y: this.startY, width, height };
    } else if (this.selectedTool === "circle") {
      const radius = Math.sqrt(width ** 2 + height ** 2) / 2;
      shape = {
        type: "circle",
        radius,
        centerX: this.startX + width / 2,
        centerY: this.startY + height / 2,
      };
    }

    if (shape) {
      this.existingShapes.push(shape);
      this.sendShape(shape);
      this.clearAndRedraw();
      createShape(shape, this.roomId);
    }

    // const jsonshape=
    // const saveshape= await prismaClient.shape.creat
    
    
  };

  private mouseMoveHandler = (e: MouseEvent): void => {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (this.selectedTool === "pencil") {
      const pencilSegment: Shape = {
        type: "pencil",
        startX: this.startX,
        startY: this.startY,
        endX: currentX,
        endY: currentY,
      };
      this.existingShapes.push(pencilSegment);
      this.sendShape(pencilSegment);

      this.clearAndRedraw();

      this.startX = currentX;
      this.startY = currentY;
    } else {
      this.clearAndRedraw();
      
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      this.ctx.setLineDash([5, 5]);

      const width = currentX - this.startX;
      const height = currentY - this.startY;

      let previewShape: Shape | null = null;
      if (this.selectedTool === "rect") {
        previewShape = { type: "rect", x: this.startX, y: this.startY, width, height };
      } else if (this.selectedTool === "circle") {
        const radius = Math.sqrt(width ** 2 + height ** 2) / 2;
        previewShape = { type: "circle", radius, centerX: this.startX + width / 2, centerY: this.startY + height / 2 };
      }

      if (previewShape) this.drawShape(previewShape);
      
      this.ctx.setLineDash([]);
    }
  };
}