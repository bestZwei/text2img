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
    const lineHeight = fontSize * 1.2;

    // Split text into lines
    const lines = text.split('\n');
    const maxLineWidth = Math.max(...lines.map(line => context.measureText(line).width));

    // Set canvas dimensions
    canvas.width = (maxLineWidth + 2 * padding) * scaleFactor;
    canvas.height = (lines.length * lineHeight + 2 * padding) * scaleFactor;

    // Reset scale and clear canvas
    context.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = color;
    context.textBaseline = 'top';

    lines.forEach((line, index) => {
        context.fillText(line, padding, padding + index * lineHeight);
    });
});
