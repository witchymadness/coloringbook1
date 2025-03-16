const canvas = document.getElementById("colorCanvas");
const ctx = canvas.getContext("2d");

// Separate drawing layer
const drawingCanvas = document.createElement("canvas");
const drawingCtx = drawingCanvas.getContext("2d");

const colorPicker = document.getElementById("colorPicker");

let tool = "brush";
let painting = false;
let history = [];
let redoStack = [];

let img = new Image();
img.src = "svg777.svg";  // This assumes the SVG is in the same folder as index.html
img.onload = function () {
    resizeCanvas();
    saveState();
};


function resizeCanvas() {
    let container = document.querySelector(".canvas-container");
    let aspectRatio = img.width / img.height;

    if (window.innerWidth / window.innerHeight > aspectRatio) {
        canvas.height = window.innerHeight - 60;
        canvas.width = canvas.height * aspectRatio;
    } else {
        canvas.width = window.innerWidth;
        canvas.height = canvas.width / aspectRatio;
    }

    drawingCanvas.width = canvas.width;
    drawingCanvas.height = canvas.height;

    redrawCanvas();
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
    event.preventDefault();
    painting = true;
    draw(event);
}

function stopPainting(event) {
    event.preventDefault();
    painting = false;
    drawingCtx.beginPath();
    saveState();
    redrawCanvas();
}

function draw(event) {
    event.preventDefault();
    if (!painting) return;

    drawingCtx.lineWidth = 8;
    drawingCtx.lineCap = "round";

    if (tool === "eraser") {
        drawingCtx.globalCompositeOperation = "destination-out";
        drawingCtx.strokeStyle = "rgba(0,0,0,1)";
    } else {
        drawingCtx.globalCompositeOperation = "source-over";
        drawingCtx.strokeStyle = colorPicker.value;
    }

    let x = event.offsetX || event.touches?.[0]?.clientX - canvas.getBoundingClientRect().left;
    let y = event.offsetY || event.touches?.[0]?.clientY - canvas.getBoundingClientRect().top;

    drawingCtx.lineTo(x, y);
    drawingCtx.stroke();
    drawingCtx.beginPath();
    drawingCtx.moveTo(x, y);

    redrawCanvas();
}

function fillCanvas(event) {
    event.preventDefault();
    if (tool !== "bucket") return;

    let x = event.offsetX || event.touches?.[0]?.clientX - drawingCanvas.getBoundingClientRect().left;
    let y = event.offsetY || event.touches?.[0]?.clientY - drawingCanvas.getBoundingClientRect().top;

    let imageData = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
    let pixels = imageData.data;
    let stack = [[Math.floor(x), Math.floor(y)]];

    let targetIndex = (Math.floor(y) * drawingCanvas.width + Math.floor(x)) * 4;
    let targetAlpha = pixels[targetIndex + 3]; // Alpha channel of clicked pixel

    if (targetAlpha !== 0) { 
        return;  // Exit if the clicked area is not transparent
    }

    let fillColor = hexToRGBA(colorPicker.value);

    while (stack.length > 0) {
        let [px, py] = stack.pop();
        let index = (py * drawingCanvas.width + px) * 4;

        if (pixels[index + 3] === 0) { // Only fill transparent areas
            pixels[index] = fillColor.r;
            pixels[index + 1] = fillColor.g;
            pixels[index + 2] = fillColor.b;
            pixels[index + 3] = 255;

            if (px > 0) stack.push([px - 1, py]); // Left
            if (px < drawingCanvas.width - 1) stack.push([px + 1, py]); // Right
            if (py > 0) stack.push([px, py - 1]); // Up
            if (py < drawingCanvas.height - 1) stack.push([px, py + 1]); // Down
        }
    }

    drawingCtx.putImageData(imageData, 0, 0);
    saveState();
    redrawCanvas();
}

// Convert Hex to RGBA
function hexToRGBA(hex) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
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

// Touch and mouse events
canvas.addEventListener("mousedown", startPainting);
canvas.addEventListener("mouseup", stopPainting);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("click", fillCanvas);

canvas.addEventListener("touchstart", startPainting, { passive: false });
canvas.addEventListener("touchend", stopPainting, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
