document.getElementById('generate-btn').addEventListener('click', function() {
    const text = document.getElementById('text-input').value;
    const maxCharsPerLine = parseInt(document.getElementById('max-chars-per-line').value, 10);
    const lines = text.split('\n').map(line => {
        const regex = new RegExp(`.{1,${maxCharsPerLine}}`, 'g');
        return line.match(regex) || [];
    }).flat();
    const fontSize = parseInt(document.getElementById('font-size').value, 10);
    const fontFamily = document.getElementById('font-family').value;
    const color = document.getElementById('color').value;
    const bgColorStart = document.getElementById('bg-color-start').value;
    const bgColorEnd = document.getElementById('bg-color-end').value;
    const gradientAngle = parseInt(document.getElementById('gradient-angle').value, 10);
    const bgOpacity = document.getElementById('bg-opacity').value / 100;
    const padding = parseInt(document.getElementById('padding').value, 10);
    const squareImg = document.getElementById('square-img').checked;

    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');

    context.font = `${fontSize}px ${fontFamily}`;

    const maxLineWidth = Math.max(...lines.map(line => context.measureText(line).width));

    const scaleFactor = 10;
    const lineHeight = fontSize * 1.2;

    let canvasWidth = (maxLineWidth + 2 * padding) * scaleFactor;
    let canvasHeight = (lines.length * lineHeight + 2 * padding) * scaleFactor;

    if (squareImg) {
        const maxSize = Math.max(canvasWidth, canvasHeight);
        canvasWidth = maxSize;
        canvasHeight = maxSize;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    context.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = context.createLinearGradient(
        canvas.width/2 - Math.cos((gradientAngle - 90) * Math.PI / 180) * Math.max(canvas.width, canvas.height)/2, 
        canvas.height/2 - Math.sin((gradientAngle - 90) * Math.PI / 180) * Math.max(canvas.width, canvas.height)/2, 
        canvas.width/2 + Math.cos((gradientAngle - 90) * Math.PI / 180) * Math.max(canvas.width, canvas.height)/2, 
        canvas.height/2 + Math.sin((gradientAngle - 90) * Math.PI / 180) * Math.max(canvas.width, canvas.height)/2
    );

    const startColor = addAlphaToColor(bgColorStart, bgOpacity);
    const endColor = addAlphaToColor(bgColorEnd, bgOpacity);
    
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width/scaleFactor, canvas.height/scaleFactor);

    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = color;
    context.textBaseline = 'top';

    let yOffset = padding;
    if (squareImg) {
        yOffset = (canvasHeight / scaleFactor - lines.length * lineHeight) / 2;
    }

    lines.forEach((line, index) => {
        const xOffset = squareImg ? (canvasWidth / scaleFactor - context.measureText(line).width) / 2 : padding;
        context.fillText(line, xOffset, yOffset + index * lineHeight);
    });

    // 在生成图片后添加缩放逻辑
    const previewArea = document.querySelector('.preview-area');
    const previewWidth = previewArea.clientWidth;
    
    // 计算缩放比例
    const scale = previewWidth / canvas.width;
    
    // 设置canvas的显示尺寸（不改变实际分辨率）
    if (canvas.width > previewWidth) {
        canvas.style.width = previewWidth + 'px';
        canvas.style.height = (canvas.height * scale) + 'px';
    } else {
        canvas.style.width = '';
        canvas.style.height = '';
    }

    // 添加提示文本
    canvas.title = '点击查看原始大小';
});

document.getElementById('upload-btn').addEventListener('click', function() {
    const canvas = document.getElementById('canvas');
    const filename = document.getElementById('filename').value || 'text2img';
    canvas.toBlob(function(blob) {
        uploadToIPFS(blob, filename);
    });
});

document.getElementById('download-btn').addEventListener('click', function() {
    const canvas = document.getElementById('canvas');
    const filename = document.getElementById('filename').value || 'text2img';
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${filename}.png`;
    link.click();
});

function uploadToIPFS(blob, filename) {
    const api = 'https://cdn.ipfsscan.io/api/v0/add?pin=false';
    const formData = new FormData();
    formData.append('file', blob);

    const maxRetries = 3;
    let retryCount = 0;
    
    if (blob.size > 5 * 1024 * 1024) { // 5MB限制
        console.error('文件过大');
        return;
    }

    $.ajax({
        url: api,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        beforeSend: function() {
            console.log('正在上传...');
        },
        success: function(response) {
            if (response.Hash) {
                const imgSrc = `https://i0.img2ipfs.com/ipfs/${response.Hash}?filename=${filename}.png`;
                document.getElementById('link').value = imgSrc;
                document.getElementById('markdown-link').value = `![Image](${imgSrc})`;
                document.getElementById('html-link').value = `<img src="${imgSrc}" alt="Image">`;
                console.log('上传成功，图片地址:', imgSrc);

                // 调用 seeding 函数
                setTimeout(() => seeding(response.Hash), 3000);
            } else {
                console.error('上传失败');
            }
        },
        error: function(xhr, status, error) {
            handleError(error, '上传失败，请检查网络连接或稍后重试');
            // 添加重试逻辑
            if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(() => uploadToIPFS(blob, filename), 1000 * retryCount);
            }
        }
    });
}

function seeding(hash) {
    const gateways = [
        `https://cdn.ipfsscan.io/ipfs/${hash}`,
        `https://ipfs.io/ipfs/${hash}`,
        `https://i0.img2ipfs.com/ipfs/${hash}`,
        `https://ipfs.crossbell.io/ipfs/${hash}`,
        `https://gateway.ipfsscan.io/ipfs/${hash}`,
        `https://ipfs.cyou/ipfs/${hash}`,
        `https://gateway.pinata.cloud/ipfs/${hash}`,
        `https://hardbin.com/ipfs/${hash}`,
        `https://dlunar.net/ipfs/${hash}`,
        `https://w3s.link/ipfs/${hash}`,
        `https://dweb.link/ipfs/${hash}`,
        `https://ipfs.infura-ipfs.io/ipfs/${hash}`
    ];

    gateways.forEach(url => {
        fetch(url)
            .then(response => console.log(`Seeding ${url}: ${response.status}`))
            .catch(error => console.error(`Error seeding ${url}:`, error));
    });
}

function copyToClipboard(elementId) {
    const copyText = document.getElementById(elementId);
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    document.execCommand("copy");
    alert("已复制: " + copyText.value);
}

// 保存设置到 localStorage
function saveSettings() {
    const settings = {
        fontSize: document.getElementById('font-size').value,
        fontFamily: document.getElementById('font-family').value,
        color: document.getElementById('color').value,
        bgColorStart: document.getElementById('bg-color-start').value,
        bgColorEnd: document.getElementById('bg-color-end').value,
        gradientAngle: document.getElementById('gradient-angle').value,
        bgOpacity: document.getElementById('bg-opacity').value,
        padding: document.getElementById('padding').value,
        squareImg: document.getElementById('square-img').checked,
        filename: document.getElementById('filename').value
    };
    localStorage.setItem('text2imgSettings', JSON.stringify(settings));
}

// 从 localStorage 加载设置
function loadSettings() {
    const savedSettings = localStorage.getItem('text2imgSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        document.getElementById('font-size').value = settings.fontSize;
        document.getElementById('font-family').value = settings.fontFamily;
        document.getElementById('color').value = settings.color;
        document.getElementById('bg-color-start').value = settings.bgColorStart || '#ffffff';
        document.getElementById('bg-color-end').value = settings.bgColorEnd || '#ffffff';
        document.getElementById('gradient-angle').value = settings.gradientAngle || '0';
        document.getElementById('bg-opacity').value = settings.bgOpacity || '100';
        document.getElementById('opacity-value').textContent = (settings.bgOpacity || '100') + '%';
        document.getElementById('padding').value = settings.padding;
        document.getElementById('square-img').checked = settings.squareImg;
        document.getElementById('filename').value = settings.filename;
    }
}

// 添加事件监听器来保存设置
function addSettingsListeners() {
    const settingsElements = [
        'font-size', 'font-family', 'color', 'bg-color-start', 'bg-color-end', 'gradient-angle', 'bg-opacity',
        'padding', 'square-img', 'filename'
    ];
    
    settingsElements.forEach(id => {
        const element = document.getElementById(id);
        element.addEventListener('change', saveSettings);
    });
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    addSettingsListeners();
    createModal();
    
    const previewCanvas = document.getElementById('canvas');
    previewCanvas.addEventListener('click', function() {
        const modal = document.querySelector('.modal');
        const modalCanvas = document.getElementById('modal-canvas');
        const modalContent = document.querySelector('.modal-content');
        
        // 复制原始canvas内容到模态框canvas
        modalCanvas.width = this.width;
        modalCanvas.height = this.height;
        const ctx = modalCanvas.getContext('2d');
        ctx.drawImage(this, 0, 0);
        
        // 如果原始宽度小于模态框宽度，则使用原始宽度
        if (this.width < 800) {
            modalContent.style.width = this.width + 'px';
        } else {
            modalContent.style.width = '800px';
        }
        
        modal.style.display = 'block';
    });
});

function handleError(error, message) {
    console.error(error);
    const errorDiv = document.getElementById('error-message') || document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.className = 'error-message';
    errorDiv.textContent = message || '操作失败，请稍后重试';
    document.querySelector('.main-container').prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

// 添加防抖处理
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 对生成图片功能进行防抖
const debouncedGenerate = debounce(function() {
    // 原generate-btn的处理逻辑
}, 300);

// 添加节流函数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 优化图片生成事件处理
const textInput = document.getElementById('text-input');
textInput.addEventListener('input', throttle(function() {
    document.getElementById('generate-btn').click();
}, 500));

// 优化 canvas 渲染性能
function generateImage() {
    // 使用 requestAnimationFrame
    requestAnimationFrame(() => {
        // ... 现有的图片生成代码 ...
    });
}

// 优化字体加载
document.fonts.ready.then(() => {
    // 字体加载完成后再生成图片
    document.getElementById('generate-btn').click();
});

// 添加模态框HTML
function createModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <canvas id="modal-canvas"></canvas>
        </div>
        <button class="modal-close">×</button>
        <div class="modal-hint">ESC 关闭 | 滚轮缩放 | 双击还原</div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.modal-close');
    const modalContent = modal.querySelector('.modal-content');
    const modalCanvas = modal.querySelector('#modal-canvas');
    let scale = 1;
    let originalWidth = 0;

    function showModal() {
        modal.style.display = 'block';
        requestAnimationFrame(() => modal.classList.add('show'));
    }

    function hideModal() {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            scale = 1;
            modalContent.style.width = '800px';
            modalContent.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 300);
    }

    // 关闭按钮事件
    closeBtn.addEventListener('click', hideModal);

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') hideModal();
    });

    // 滚轮缩放
    modal.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        scale *= delta;
        scale = Math.min(Math.max(0.5, scale), 3); // 限制缩放范围
        
        const newWidth = originalWidth * scale;
        modalContent.style.width = `${newWidth}px`;
    });

    // 双击还原
    modalContent.addEventListener('dblclick', () => {
        scale = 1;
        modalContent.style.width = originalWidth > 800 ? '800px' : `${originalWidth}px`;
    });

    return {
        show: function(sourceCanvas) {
            modalCanvas.width = sourceCanvas.width;
            modalCanvas.height = sourceCanvas.height;
            const ctx = modalCanvas.getContext('2d');
            ctx.drawImage(sourceCanvas, 0, 0);
            
            originalWidth = sourceCanvas.width;
            if (originalWidth < 800) {
                modalContent.style.width = `${originalWidth}px`;
            }
            
            showModal();
        }
    };
}

document.addEventListener('DOMContentLoaded', function() {
    const modal = createModal();
    
    const previewCanvas = document.getElementById('canvas');
    previewCanvas.addEventListener('click', function() {
        modal.show(this);
    });
});

// 添加辅助函数来处理颜色透明度
function addAlphaToColor(color, alpha) {
    const r = parseInt(color.slice(1,3), 16);
    const g = parseInt(color.slice(3,5), 16);
    const b = parseInt(color.slice(5,7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 添加透明度滑块值显示更新
document.getElementById('bg-opacity').addEventListener('input', function() {
    document.getElementById('opacity-value').textContent = this.value + '%';
});
