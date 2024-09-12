document.getElementById('generate-btn').addEventListener('click', function() {
    const text = document.getElementById('text-input').value;
    const fontSize = document.getElementById('font-size').value;
    const fontFamily = document.getElementById('font-family').value;
    const color = document.getElementById('color').value;
    const padding = document.getElementById('padding').value;

    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');

    // 清晰度提升：设置高分辨率
    const scaleFactor = 2;
    context.scale(scaleFactor, scaleFactor);

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = color;

    const textWidth = context.measureText(text).width;
    const textHeight = parseInt(fontSize, 10);

    canvas.width = (textWidth + 2 * padding) * scaleFactor;
    canvas.height = (textHeight + 2 * padding) * scaleFactor;

    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = color;
    context.textBaseline = 'top';

    context.fillText(text, padding, padding);

    // 缩放到合适大小
    canvas.style.width = `${canvas.width / scaleFactor}px`;
    canvas.style.height = `${canvas.height / scaleFactor}px`;
});
