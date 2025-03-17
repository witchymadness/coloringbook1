const canvas = document.getElementById("colorCanvas");
const ctx = canvas.getContext("2d");

const drawingCanvas = document.createElement("canvas");
const drawingCtx = drawingCanvas.getContext("2d");

const offscreenCanvas = document.createElement("canvas");
const offscreenCtx = offscreenCanvas.getContext("2d");

const colors = [
    "#fbd9dc", "#ff8cb2", "#ff8cc8", "#ffab8c", "#fff98c",
    "#caff8c", "#8cffa3", "#8ccdff", "#ee8cff"
];
let selectedColor = colors[0];
let currentTool = "brush";
let isDrawing = false;

let history = [];
let redoStack = [];

let img = new Image();
img.src = "1.png";
img.onload = function () {
    resizeCanvas();
    saveState();

    offscreenCanvas.width = img.width;
    offscreenCanvas.height = img.height;
    offscreenCtx.clearRect(0, 0, img.width, img.height);
    offscreenCtx.drawImage(img, 0, 0);
};

function resizeCanvas() {
    canvas.width = 320;
    canvas.height = 700;
    drawingCanvas.width = 320;
    drawingCanvas.height = 700;
    redrawCanvas();
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(drawingCanvas, 0, 0);
}

window.addEventListener("resize", resizeCanvas);

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


function setColor(color) {
    selectedColor = color;
}

function setTool(tool) {
    currentTool = tool;
}

function fillCanvas(event) {
    if (currentTool !== "bucket") return;
    event.preventDefault();

    let rect = canvas.getBoundingClientRect();
    let x = Math.floor(event.clientX - rect.left);
    let y = Math.floor(event.clientY - rect.top);

    let width = drawingCanvas.width;
    let height = drawingCanvas.height;
    let imageData = drawingCtx.getImageData(0, 0, width, height);
    let bgData = offscreenCtx.getImageData(0, 0, img.width, img.height);

    let scaleX = img.width / width;
    let scaleY = img.height / height;
    let imgX = Math.floor(x * scaleX);
    let imgY = Math.floor(y * scaleY);

    let startIdx = (imgY * img.width + imgX) * 4;
    let targetAlpha = bgData.data[startIdx + 3];

    if (targetAlpha !== 0) return;

    let fillColor = hexToRGBA(selectedColor);
    let stack = [[x, y]];
    let visited = new Uint8Array(width * height);

    while (stack.length > 0) {
        let [px, py] = stack.pop();
        if (px < 0 || px >= width || py < 0 || py >= height) continue;
        let index = (py * width + px) * 4;

        if (visited[py * width + px]) continue;
        visited[py * width + px] = 1;

        let drawAlpha = imageData.data[index + 3];

        if (drawAlpha < 10) {
            imageData.data[index] = fillColor.r;
            imageData.data[index + 1] = fillColor.g;
            imageData.data[index + 2] = fillColor.b;
            imageData.data[index + 3] = 255;

            stack.push([px - 1, py]);
            stack.push([px + 1, py]);
            stack.push([px, py - 1]);
            stack.push([px, py + 1]);
        }
    }

    drawingCtx.putImageData(imageData, 0, 0);
    saveState();
    redrawCanvas();
}

function hexToRGBA(hex) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function startDrawing(event) {
    if (currentTool !== "brush") return;
    isDrawing = true;
    drawingCtx.strokeStyle = selectedColor;
    drawingCtx.lineWidth = 5;
    drawingCtx.lineCap = "round";
    drawingCtx.beginPath();
}

function draw(event) {
    if (!isDrawing || currentTool !== "brush") return;
    let rect = canvas.getBoundingClientRect();
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;
    drawingCtx.lineTo(x, y);
    drawingCtx.stroke();
    redrawCanvas();
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        saveState();
    }
}

function generatePalette() {
    let palette = document.getElementById("palette");
    colors.forEach(color => {
        let colorBtn = document.createElement("button");
        colorBtn.style.backgroundColor = color;
        colorBtn.style.width = "40px";
        colorBtn.style.height = "40px";
        colorBtn.style.borderRadius = "50%";
        colorBtn.addEventListener("click", () => setColor(color));
        palette.appendChild(colorBtn);
    });
}

generatePalette();
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing);
canvas.addEventListener("click", fillCanvas);  

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