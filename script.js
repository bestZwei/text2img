document.getElementById('generate-btn').addEventListener('click', function() {
    const text = document.getElementById('text-input').value;
    const fontSize = parseInt(document.getElementById('font-size').value, 10);
    const fontFamily = document.getElementById('font-family').value;
    const color = document.getElementById('color').value;
    const padding = parseInt(document.getElementById('padding').value, 10);

    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');

    // Set a high resolution for the canvas
    const scaleFactor = 2;
    context.scale(scaleFactor, scaleFactor);

    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = color;

    const lines = text.split('\n');
    const lineHeight = fontSize * 1.2;
    const maxWidth = 400; // Set a max width for text wrapping

    // Calculate canvas size
    const textWidth = Math.max(...lines.map(line => context.measureText(line).width));
    const textHeight = lineHeight * lines.length;

    canvas.width = (textWidth + 2 * padding) * scaleFactor;
    canvas.height = (textHeight + 2 * padding) * scaleFactor;

    context.scale(scaleFactor, scaleFactor);
    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = color;
    context.textBaseline = 'top';

    lines.forEach((line, index) => {
        context.fillText(line, padding, padding + index * lineHeight);
    });
});
