(function() {
    'use strict';

    let backgroundImage = null;

    /* ===================== 图片生成 ===================== */

    function generateImage() {
        const text = document.getElementById('text-input').value;

        // 空文本保护：避免 Math.max(...[]) 产生 -Infinity 画布
        if (!text.trim()) {
            const c = document.getElementById('canvas');
            c.width = 0;
            c.height = 0;
            return;
        }

        const maxCharsPerLine = Math.max(1, parseInt(document.getElementById('max-chars-per-line').value, 10) || 50);
        const lines = text.split('\n').map(line => {
            if (line === '') return [''];
            const regex = new RegExp(`.{1,${maxCharsPerLine}}`, 'g');
            return line.match(regex);
        }).flat();

        const fontSize = Math.max(1, parseInt(document.getElementById('font-size').value, 10) || 4);
        const fontFamily = document.getElementById('font-family').value;
        const color = document.getElementById('color').value;
        const lineSpacing = parseFloat(document.getElementById('line-spacing').value) || 1.2;
        const padding = Math.max(0, parseInt(document.getElementById('padding').value, 10) || 0);
        const squareImg = document.getElementById('square-img').checked;

        const lineHeight = fontSize * lineSpacing;

        const canvas = document.getElementById('canvas');
        const context = canvas.getContext('2d');

        context.font = `${fontSize}px ${fontFamily}`;

        const maxLineWidth = Math.max(...lines.map(line => context.measureText(line).width));

        const scaleFactor = 10;

        let canvasWidth = (maxLineWidth + 2 * padding) * scaleFactor;
        let canvasHeight = (lines.length * lineHeight + 2 * padding) * scaleFactor;

        if (squareImg) {
            const maxSize = Math.max(canvasWidth, canvasHeight);
            canvasWidth = maxSize;
            canvasHeight = maxSize;
        }

        canvas.width = Math.floor(canvasWidth);
        canvas.height = Math.floor(canvasHeight);

        context.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (backgroundImage) {
            const bgOpacity = document.getElementById('bg-opacity').value / 100;
            const fitMode = document.getElementById('bg-fit').value;

            context.save();
            context.globalAlpha = bgOpacity;

            const canvasWidthScaled = canvas.width / scaleFactor;
            const canvasHeightScaled = canvas.height / scaleFactor;

            switch (fitMode) {
                case 'cover':
                    drawImageCover(context, backgroundImage, 0, 0, canvasWidthScaled, canvasHeightScaled);
                    break;
                case 'contain':
                    drawImageContain(context, backgroundImage, 0, 0, canvasWidthScaled, canvasHeightScaled);
                    break;
                case 'stretch':
                    context.drawImage(backgroundImage, 0, 0, canvasWidthScaled, canvasHeightScaled);
                    break;
                case 'tile':
                    drawImageTile(context, backgroundImage, canvasWidthScaled, canvasHeightScaled);
                    break;
            }

            context.restore();
        } else {
            const bgColorStart = document.getElementById('bg-color-start').value;
            const bgColorEnd = document.getElementById('bg-color-end').value;
            const gradientAngle = parseInt(document.getElementById('gradient-angle').value, 10) || 0;
            const bgOpacity = document.getElementById('bg-opacity').value / 100;

            const angleInRad = (gradientAngle - 90) * Math.PI / 180;
            const canvasWidthScaled = canvas.width / scaleFactor;
            const canvasHeightScaled = canvas.height / scaleFactor;
            const diagonal = Math.sqrt(canvasWidthScaled * canvasWidthScaled + canvasHeightScaled * canvasHeightScaled);

            const centerX = canvasWidthScaled / 2;
            const centerY = canvasHeightScaled / 2;
            const startX = centerX - Math.cos(angleInRad) * diagonal;
            const startY = centerY - Math.sin(angleInRad) * diagonal;
            const endX = centerX + Math.cos(angleInRad) * diagonal;
            const endY = centerY + Math.sin(angleInRad) * diagonal;

            const gradient = context.createLinearGradient(startX, startY, endX, endY);

            gradient.addColorStop(0, addAlphaToColor(bgColorStart, bgOpacity));
            gradient.addColorStop(0.25, mixColors(bgColorStart, bgColorEnd, 0.25, bgOpacity));
            gradient.addColorStop(0.5, mixColors(bgColorStart, bgColorEnd, 0.5, bgOpacity));
            gradient.addColorStop(0.75, mixColors(bgColorStart, bgColorEnd, 0.75, bgOpacity));
            gradient.addColorStop(1, addAlphaToColor(bgColorEnd, bgOpacity));

            context.fillStyle = gradient;
            context.fillRect(0, 0, canvasWidthScaled, canvasHeightScaled);
        }

        context.font = `${fontSize}px ${fontFamily}`;
        context.fillStyle = color;
        context.textBaseline = 'top';

        let yOffset = padding;
        if (squareImg) {
            yOffset = (canvasHeight / scaleFactor - lines.length * lineHeight) / 2;
        }

        lines.forEach((line, index) => {
            const xOffset = squareImg ?
                (canvasWidth / scaleFactor - context.measureText(line).width) / 2 :
                padding;
            context.fillText(line, xOffset, yOffset + index * lineHeight);
        });

        // 预览缩放
        const previewArea = document.querySelector('.preview-area');
        const previewWidth = previewArea.clientWidth;
        const scale = previewWidth / canvas.width;

        if (canvas.width > previewWidth) {
            canvas.style.width = previewWidth + 'px';
            canvas.style.height = (canvas.height * scale) + 'px';
        } else {
            canvas.style.width = '';
            canvas.style.height = '';
        }

        canvas.title = '点击查看原始大小';
    }

    /* ===================== 图床上传（原生 fetch，替代 jQuery） ===================== */

    function uploadToIPFS(blob, filename) {
        const api = 'https://cdn.ipfsscan.io/api/v0/add?pin=false';
        const formData = new FormData();
        formData.append('file', blob, `${filename}.png`);

        const maxRetries = 3;
        let retryCount = 0;

        if (blob.size > 5 * 1024 * 1024) { // 5MB限制
            handleError(new Error('file too large'), '图片超过 5MB，请降低字号或减少文本');
            return;
        }

        console.log('正在上传...');

        function attemptUpload() {
            fetch(api, { method: 'POST', body: formData })
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.json();
                })
                .then(response => {
                    if (response.Hash) {
                        const imgSrc = `https://i0.img2ipfs.com/ipfs/${response.Hash}?filename=${filename}.png`;
                        document.getElementById('link').value = imgSrc;
                        document.getElementById('markdown-link').value = `![Image](${imgSrc})`;
                        document.getElementById('html-link').value = `<img src="${imgSrc}" alt="Image">`;
                        console.log('上传成功，图片地址:', imgSrc);
                        showToast('上传成功');

                        setTimeout(() => seeding(response.Hash), 3000);
                    } else {
                        handleError(new Error('no hash'), '上传失败，请稍后重试');
                    }
                })
                .catch(error => {
                    console.error(error);
                    if (retryCount < maxRetries) {
                        retryCount++;
                        setTimeout(attemptUpload, 1000 * retryCount);
                    } else {
                        handleError(error, '上传失败，请检查网络连接或稍后重试');
                    }
                });
        }

        attemptUpload();
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

    /* ===================== 下载 / 复制 / Toast ===================== */

    function copyToClipboard(elementId) {
        const copyText = document.getElementById(elementId);
        if (!copyText || !copyText.value) return;
        copyText.select();
        copyText.setSelectionRange(0, 99999);
        document.execCommand("copy");
        showToast("已复制到剪贴板");
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function handleError(error, message) {
        console.error(error);
        const mainContainer = document.querySelector('.main-container');
        if (!mainContainer) return;
        let errorDiv = document.getElementById('error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'error-message';
            errorDiv.className = 'error-message';
            mainContainer.prepend(errorDiv);
        }
        errorDiv.textContent = message || '操作失败，请稍后重试';
        setTimeout(() => errorDiv.remove(), 3000);
    }

    /* ===================== 设置持久化 ===================== */

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
            maxCharsPerLine: document.getElementById('max-chars-per-line').value,
            squareImg: document.getElementById('square-img').checked,
            filename: document.getElementById('filename').value,
            bgFit: document.getElementById('bg-fit').value,
        };
        localStorage.setItem('text2imgSettings', JSON.stringify(settings));
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem('text2imgSettings');
        if (!savedSettings) return;
        try {
            const settings = JSON.parse(savedSettings);
            document.getElementById('font-size').value = settings.fontSize;
            document.getElementById('font-family').value = settings.fontFamily;
            document.getElementById('color').value = settings.color;
            document.getElementById('bg-color-start').value = settings.bgColorStart || '#ffffff';
            document.getElementById('bg-color-end').value = settings.bgColorEnd || '#ffffff';
            document.getElementById('gradient-angle').value = settings.gradientAngle || '0';
            document.getElementById('bg-opacity').value = settings.bgOpacity || '100';
            document.getElementById('padding').value = settings.padding;
            document.getElementById('max-chars-per-line').value = settings.maxCharsPerLine || '50';
            document.getElementById('square-img').checked = settings.squareImg;
            document.getElementById('filename').value = settings.filename;
            document.getElementById('bg-fit').value = settings.bgFit || 'cover';
        } catch (e) {
            console.warn('设置解析失败:', e);
        }
    }

    /* ===================== Google 字体动态加载 ===================== */

    const GOOGLE_FONTS = {
        'Noto Sans SC': 'Noto+Sans+SC:wght@400;700',
        'Noto Serif SC': 'Noto+Serif+SC:wght@400;700',
        'Ma Shan Zheng': 'Ma+Shan+Zheng',
        'Zhi Mang Xing': 'Zhi+Mang+Xing',
        'ZCOOL XiaoWei': 'ZCOOL+XiaoWei',
        'ZCOOL QingKe HuangYou': 'ZCOOL+QingKe+HuangYou',
        'ZCOOL KuaiLe': 'ZCOOL+KuaiLe',
        'Long Cang': 'Long+Cang',
        'Liu Jian Mao Cao': 'Liu+Jian+Mao+Cao',
        'Roboto': 'Roboto:wght@400;700',
        'Open Sans': 'Open+Sans:wght@400;700',
        'Lato': 'Lato:wght@400;700',
        'Montserrat': 'Montserrat:wght@400;700',
        'Raleway': 'Raleway:wght@400;700',
        'Playfair Display': 'Playfair+Display:wght@400;700',
        'Source Sans Pro': 'Source+Sans+Pro:wght@400;700',
        'Merriweather': 'Merriweather:wght@400;700',
        'Ubuntu': 'Ubuntu:wght@400;700',
        'Dancing Script': 'Dancing+Script',
        'Pacifico': 'Pacifico',
        'Shadows Into Light': 'Shadows+Into+Light',
        'Indie Flower': 'Indie+Flower',
        'Great Vibes': 'Great+Vibes',
        'Sacramento': 'Sacramento'
    };

    function loadGoogleFont(fontName) {
        const urlParam = GOOGLE_FONTS[fontName];
        if (!urlParam) return;

        const linkId = 'gf-' + fontName.replace(/\s+/g, '-');
        if (document.getElementById(linkId)) return;

        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${urlParam}&display=swap`;
        document.head.appendChild(link);
    }

    function loadFontForCurrentSelection() {
        const value = document.getElementById('font-family').value;
        const match = value.match(/^'([^']+)'/);
        if (match) loadGoogleFont(match[1]);
    }

    /* ===================== 背景绘制 ===================== */

    function drawImageCover(ctx, img, x, y, width, height) {
        const imgRatio = img.width / img.height;
        const containerRatio = width / height;
        let drawWidth, drawHeight;

        if (containerRatio > imgRatio) {
            drawWidth = width;
            drawHeight = width / imgRatio;
        } else {
            drawHeight = height;
            drawWidth = height * imgRatio;
        }

        const drawX = x + (width - drawWidth) / 2;
        const drawY = y + (height - drawHeight) / 2;

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }

    function drawImageContain(ctx, img, x, y, width, height) {
        const imgRatio = img.width / img.height;
        const containerRatio = width / height;
        let drawWidth, drawHeight;

        if (containerRatio < imgRatio) {
            drawWidth = width;
            drawHeight = width / imgRatio;
        } else {
            drawHeight = height;
            drawWidth = height * imgRatio;
        }

        const drawX = x + (width - drawWidth) / 2;
        const drawY = y + (height - drawHeight) / 2;

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }

    function drawImageTile(ctx, img, width, height) {
        const patternCanvas = document.createElement('canvas');
        const patternContext = patternCanvas.getContext('2d');

        patternCanvas.width = img.width;
        patternCanvas.height = img.height;

        patternContext.drawImage(img, 0, 0, img.width, img.height);

        const pattern = ctx.createPattern(patternCanvas, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
    }

    function addAlphaToColor(color, alpha) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function mixColors(color1, color2, ratio, alpha) {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);

        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);

        const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
        const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
        const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /* ===================== 模态框 ===================== */

    function createModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <canvas id="modal-canvas"></canvas>
            </div>
            <button class="modal-close" aria-label="关闭">×</button>
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

        closeBtn.addEventListener('click', hideModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') hideModal();
        });

        modal.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            scale *= delta;
            scale = Math.min(Math.max(0.5, scale), 3);

            const newWidth = originalWidth * scale;
            modalContent.style.width = `${newWidth}px`;
        }, { passive: false });

        modalContent.addEventListener('dblclick', () => {
            scale = 1;
            modalContent.style.width = originalWidth > 800 ? '800px' : `${originalWidth}px`;
        });

        return {
            show: function(sourceCanvas) {
                if (!sourceCanvas || sourceCanvas.width === 0) return;
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

    /* ===================== 工具函数 ===================== */

    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /* ===================== 初始化 ===================== */

    document.addEventListener('DOMContentLoaded', function() {
        loadSettings();
        loadFontForCurrentSelection();

        const generateBtn = document.getElementById('generate-btn');
        const textInput = document.getElementById('text-input');
        const canvas = document.getElementById('canvas');
        const modal = createModal();

        // 生成
        generateBtn.addEventListener('click', generateImage);

        // 输入实时生成（节流）
        textInput.addEventListener('input', throttle(generateImage, 500));

        // 设置变更保存
        const settingsElements = [
            'font-size', 'font-family', 'color', 'bg-color-start', 'bg-color-end', 'gradient-angle', 'bg-opacity',
            'padding', 'max-chars-per-line', 'square-img', 'filename', 'bg-fit'
        ];
        settingsElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.addEventListener('change', saveSettings);
        });

        // 字体选择变化时动态加载
        document.getElementById('font-family').addEventListener('change', function() {
            loadFontForCurrentSelection();
        });

        // 预览点击放大
        canvas.addEventListener('click', function() {
            modal.show(this);
        });

        // 上传
        document.getElementById('upload-btn').addEventListener('click', function() {
            canvas.toBlob(function(blob) {
                if (!blob) {
                    handleError(new Error('toBlob returned null'), '生成图片失败，请先输入文本');
                    return;
                }
                const filename = document.getElementById('filename').value || 'text2img';
                uploadToIPFS(blob, filename);
            });
        });

        // 下载
        document.getElementById('download-btn').addEventListener('click', function() {
            const filename = document.getElementById('filename').value || 'text2img';
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `${filename}.png`;
            link.click();
        });

        // 背景图
        document.getElementById('bg-image').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    backgroundImage = img;
                    generateImage();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        document.getElementById('clear-bg').addEventListener('click', function() {
            backgroundImage = null;
            document.getElementById('bg-image').value = '';
            generateImage();
        });

        // 首次加载生成一张默认图（含占位提示文本）
        if (!textInput.value.trim()) {
            textInput.value = '在此输入文字\n生成你的专属图片';
            saveSettings();
        }
        generateImage();
    });
})();
