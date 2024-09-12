document.getElementById('generate-btn').addEventListener('click', function() {
    const text = document.getElementById('text-input').value;
    const fontSize = document.getElementById('font-size').value;
    const fontFamily = document.getElementById('font-family').value;
    const color = document.getElementById('color').value;
    const padding = document.getElementById('padding').value;

    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = color;

    const textWidth = context.measureText(text).width;
    const textHeight = parseInt(fontSize, 10);

    canvas.width = textWidth + 2 * padding;
    canvas.height = textHeight + 2 * padding;

    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = color;
    context.textBaseline = 'top';

    context.fillText(text, padding, padding);
});
