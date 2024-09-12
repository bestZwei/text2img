document.getElementById('generate-btn').addEventListener('click', function() {
    const text = document.getElementById('text-input').value;
    const fontSize = parseInt(document.getElementById('font-size').value, 10);
    const fontFamily = document.getElementById('font-family').value;
    const color = document.getElementById('color').value;
    const padding = parseInt(document.getElementById('padding').value, 10);

    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');

    // Set font before measuring text
    context.font = `${fontSize}px ${fontFamily}`;

    // Split text into lines
    const lines = text.split('\n');
    const maxLineWidth = Math.max(...lines.map(line => context.measureText(line).width));

    // Set a high resolution for the canvas
    const scaleFactor = 6;
    const lineHeight = fontSize * 1.2;

    // Set canvas dimensions
    canvas.width = (maxLineWidth + 2 * padding);
    canvas.height = (lines.length * lineHeight + 2 * padding);

    // Reset scale and clear canvas
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = color;
    context.textBaseline = 'top';

    lines.forEach((line, index) => {
        context.fillText(line, padding, padding + index * lineHeight);
    });

    // Convert canvas to blob and upload to IPFS
    canvas.toBlob(uploadToIPFS);
});

function uploadToIPFS(blob) {
    const api = 'https://cdn.ipfsscan.io/api/v0/add?pin=false';
    const formData = new FormData();
    formData.append('file', blob);

    $.ajax({
        url: api,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            if (response.Hash) {
                const imgSrc = `https://cdn.ipfsscan.io/ipfs/${response.Hash}`;
                document.getElementById('link').value = imgSrc;
                document.getElementById('markdown-link').value = `![Image](${imgSrc})`;
                document.getElementById('html-link').value = `<img src="${imgSrc}" alt="Image">`;
                console.log('上传成功，图片地址:', imgSrc);
            } else {
                console.error('上传失败');
            }
        },
        error: function() {
            console.error('请求失败');
        }
    });
}

function copyToClipboard(elementId) {
    const copyText = document.getElementById(elementId);
    copyText.select();
    copyText.setSelectionRange(0, 99999); // For mobile devices
    document.execCommand("copy");
    alert("已复制: " + copyText.value);
}
