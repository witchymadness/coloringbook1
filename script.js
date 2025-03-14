const canvas = document.getElementById("colorCanvas");
const ctx = canvas.getContext("2d");

const drawingCanvas = document.createElement("canvas");
const drawingCtx = drawingCanvas.getContext("2d");

const colorPicker = document.getElementById("colorPicker");

let tool = "brush";
let painting = false;
let history = [];
let redoStack = [];
let scale = 1;
let rotation = 0;
let lastTouch = null;

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
    lastTouch = event.touches[0];
}

function stopPainting() {
    painting = false;
    drawingCtx.beginPath();
    saveState();
    redrawCanvas();
}

function draw(event) {
    if (!painting || !event.touches.length) return;
    event.preventDefault();
    let touch = event.touches[0];

    let x = touch.clientX - canvas.getBoundingClientRect().left;
    let y = touch.clientY - canvas.getBoundingClientRect().top;

    drawingCtx.lineWidth = 10 * scale;
    drawingCtx.lineCap = "round";

    if (tool === "eraser") {
        drawingCtx.globalCompositeOperation = "destination-out";
        drawingCtx.strokeStyle = "rgba(0,0,0,1)";
    } else {
        drawingCtx.globalCompositeOperation = "source-over";
        drawingCtx.strokeStyle = colorPicker.value;
    }

    drawingCtx.beginPath();
    drawingCtx.moveTo(lastTouch.clientX - canvas.getBoundingClientRect().left, lastTouch.clientY - canvas.getBoundingClientRect().top);
    drawingCtx.lineTo(x, y);
    drawingCtx.stroke();
    
    lastTouch = touch;
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

canvas.addEventListener("touchstart", startPainting);
canvas.addEventListener("touchend", stopPainting);
canvas.addEventListener("touchmove", draw);

