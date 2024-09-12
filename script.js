document.getElementById('generate-btn').addEventListener('click', function() {
    const text = document.getElementById('text-input').value;
    const fontSize = document.getElementById('font-size').value;
    const fontFamily = document.getElementById('font-family').value;
    const color = document.getElementById('color').value;
    const padding = document.getElementById('padding').value;

    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');

    // 设置高分辨率
    const scaleFactor = 2;
    context.font = `${fontSize * scaleFactor}px ${fontFamily}`;
    const textWidth = context.measureText(text).width;
    const textHeight = parseInt(fontSize, 10) * scaleFactor;

    canvas.width = (textWidth + 2 * padding * scaleFactor);
    canvas.height = (textHeight + 2 * padding * scaleFactor);

    context.scale(scaleFactor, scaleFactor);
    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = color;
    context.textBaseline = 'top';

    context.fillText(text, padding, padding);
});
