document.getElementById('generate-btn').addEventListener('click', function() {
    const text = document.getElementById('text-input').value;
    const fontSize = parseInt(document.getElementById('font-size').value, 10);
    const fontFamily = document.getElementById('font-family').value;
    const color = document.getElementById('color').value;
    const bgColor = document.getElementById('bg-color').value;
    const padding = parseInt(document.getElementById('padding').value, 10);

    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');

    // 设置字体样式，用于测量文本宽度
    context.font = `${fontSize}px ${fontFamily}`;

    // 将文本按行分割
    const lines = text.split('\n');
    const maxLineWidth = Math.max(...lines.map(line => context.measureText(line).width));

    // 设置画布的分辨率
    const scaleFactor = 9;
    const lineHeight = fontSize * 1.2;

    // 设置画布的宽高
    canvas.width = (maxLineWidth + 2 * padding) * scaleFactor;
    canvas.height = (lines.length * lineHeight + 2 * padding) * scaleFactor;

    // 重置缩放比例并清空画布
    context.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    // 设置背景颜色
    context.fillStyle = bgColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // 再次设置字体样式以绘制文本
    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = color;
    context.textBaseline = 'top';

    // 绘制每一行文本
    lines.forEach((line, index) => {
        context.fillText(line, padding, padding + index * lineHeight);
    });

    // 将画布内容转换为Blob并上传到IPFS
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
    copyText.setSelectionRange(0, 99999);
    document.execCommand("copy");
    alert("已复制: " + copyText.value);
}
