const canvas = document.getElementById("colorCanvas");
const ctx = canvas.getContext("2d");

// Create a separate layer for drawing
const drawingCanvas = document.createElement("canvas");
drawingCanvas.width = canvas.width;
drawingCanvas.height = canvas.height;
const drawingCtx = drawingCanvas.getContext("2d");

document.body.appendChild(drawingCanvas);

const colorPicker = document.getElementById("colorPicker");

let tool = "brush";
let painting = false;
let history = [];
let redoStack = [];
let scale = 1;
let rotation = 0;
let lastTouchDistance = 0;
let lastRotation = 0;

let img = new Image();
img.src = "0a98faf0-a206-430c-9ee4-c447997c092f.jpg";
img.onload = function () {
    resizeCanvas();
    saveState();
};

function resizeCanvas() {
    let container = document.querySelector(".canvas-container");
    let aspectRatio = img.width / img.height;

    if (container.clientWidth / container.clientHeight > aspectRatio) {
        canvas.height = container.clientHeight;
        canvas.width = canvas.height * aspectRatio;
    } else {
        canvas.width = container.clientWidth;
        canvas.height = canvas.width / aspectRatio;
    }

    drawingCanvas.width = canvas.width;
    drawingCanvas.height = canvas.height;

    redrawCanvas();
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();
    ctx.drawImage(drawingCanvas, 0, 0);
}

window.addEventListener("resize", resizeCanvas);

function setTool(selectedTool) {
    tool = selectedTool;
}

function saveState() {
    history.push(drawingCanvas.toDataURL());
    redoStack = [];
}

function undo() {
    if (history.length > 1) {
        redoStack.push(history.pop());
        let imgData = new Image();
        imgData.src = history[history.length - 1];
        imgData.onload = function () {
            drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            drawingCtx.drawImage(imgData, 0, 0, drawingCanvas.width, drawingCanvas.height);
            redrawCanvas();
        };
    }
}

function redo() {
    if (redoStack.length > 0) {
        let imgData = new Image();
        let redoState = redoStack.pop();
        imgData.src = redoState;
        imgData.onload = function () {
            drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            drawingCtx.drawImage(imgData, 0, 0, drawingCanvas.width, drawingCanvas.height);
            history.push(redoState);
            redrawCanvas();
        };
    }
}

function startPainting(event) {
    painting = true;
    draw(event);
}

function stopPainting() {
    painting = false;
    drawingCtx.beginPath();
    saveState();
    redrawCanvas();
}

function draw(event) {
    if (!painting) return;
    
    let x, y;
    if (event.touches) {
        event.preventDefault();
        x = event.touches[0].clientX - canvas.getBoundingClientRect().left;
        y = event.touches[0].clientY - canvas.getBoundingClientRect().top;
    } else {
        x = event.offsetX;
        y = event.offsetY;
    }

    drawingCtx.lineWidth = 10 * scale;
    drawingCtx.lineCap = "round";

    if (tool === "eraser") {
        drawingCtx.globalCompositeOperation = "destination-out";
        drawingCtx.strokeStyle = "rgba(0,0,0,1)";
    } else {
        drawingCtx.globalCompositeOperation = "source-over";
        drawingCtx.strokeStyle = colorPicker.value;
    }

    drawingCtx.lineTo(x, y);
    drawingCtx.stroke();
    drawingCtx.beginPath();
    drawingCtx.moveTo(x, y);
    redrawCanvas();
}

function fillCanvas(event) {
    if (tool !== "bucket") return;
    drawingCtx.fillStyle = colorPicker.value;
    drawingCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    saveState();
    redrawCanvas();
}

function downloadImage() {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(drawingCanvas, 0, 0, tempCanvas.width, tempCanvas.height);

    const imageData = tempCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imageData;
    link.download = "colored-image.png";

    if (navigator.userAgent.match(/(iPhone|iPad|iPod)/i)) {
        window.open(imageData, "_blank");
    } else {
        link.click();
    }
}

canvas.addEventListener("mousedown", startPainting);
canvas.addEventListener("mouseup", stopPainting);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("click", fillCanvas);

canvas.addEventListener("touchstart", (event) => {
    event.preventDefault();
    startPainting(event.touches[0]);
});

canvas.addEventListener("touchmove", (event) => {
    event.preventDefault();
    draw(event.touches[0]);
});

canvas.addEventListener("touchend", (event) => {
    event.preventDefault();
    stopPainting();
});
