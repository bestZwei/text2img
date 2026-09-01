(function() {
    'use strict';

    let backgroundImage = null;
    let previewZoom = 'fit';

    const BASE_SCALE = 10;

    /* ===================== 读取设置 ===================== */

    function getVal(id, fallback) {
        const el = document.getElementById(id);
        return el ? el.value : fallback;
    }

    function getChecked(id) {
        const el = document.getElementById(id);
        return el ? el.checked : false;
    }

    /* ===================== 场景绘制（主预览 / 高清导出共用） ===================== */

    function drawScene(targetCanvas, renderScale) {
        const ctx = targetCanvas.getContext('2d');
        const sf = BASE_SCALE * renderScale;
        const lw = targetCanvas.width / sf;
        const lh = targetCanvas.height / sf;

        const transparentBg = getChecked('transparent-bg');

        ctx.setTransform(sf, 0, 0, sf, 0, 0);
        ctx.clearRect(0, 0, lw, lh);

        if (backgroundImage) {
            const bgOpacity = (parseFloat(getVal('bg-opacity', '100')) || 100) / 100;
            const fitMode = getVal('bg-fit', 'cover');

            ctx.save();
            ctx.globalAlpha = bgOpacity;

            switch (fitMode) {
                case 'cover':
                    drawImageCover(ctx, backgroundImage, 0, 0, lw, lh);
                    break;
                case 'contain':
                    drawImageContain(ctx, backgroundImage, 0, 0, lw, lh);
                    break;
                case 'stretch':
                    ctx.drawImage(backgroundImage, 0, 0, lw, lh);
                    break;
                case 'tile':
                    drawImageTile(ctx, backgroundImage, lw, lh);
                    break;
            }

            ctx.restore();
        } else if (!transparentBg) {
            const bgColorStart = getVal('bg-color-start', '#ffffff');
            const bgColorEnd = getVal('bg-color-end', '#ffffff');
            const gradientAngle = parseInt(getVal('gradient-angle', '0'), 10) || 0;
            const bgOpacity = (parseFloat(getVal('bg-opacity', '100')) || 100) / 100;

            const angleInRad = (gradientAngle - 90) * Math.PI / 180;
            const diagonal = Math.sqrt(lw * lw + lh * lh);

            const centerX = lw / 2;
            const centerY = lh / 2;
            const startX = centerX - Math.cos(angleInRad) * diagonal;
            const startY = centerY - Math.sin(angleInRad) * diagonal;
            const endX = centerX + Math.cos(angleInRad) * diagonal;
            const endY = centerY + Math.sin(angleInRad) * diagonal;

            const gradient = ctx.createLinearGradient(startX, startY, endX, endY);

            gradient.addColorStop(0, addAlphaToColor(bgColorStart, bgOpacity));
            gradient.addColorStop(0.25, mixColors(bgColorStart, bgColorEnd, 0.25, bgOpacity));
            gradient.addColorStop(0.5, mixColors(bgColorStart, bgColorEnd, 0.5, bgOpacity));
            gradient.addColorStop(0.75, mixColors(bgColorStart, bgColorEnd, 0.75, bgOpacity));
            gradient.addColorStop(1, addAlphaToColor(bgColorEnd, bgOpacity));

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, lw, lh);
        }

        // ---- 文字 ----
        const text = document.getElementById('text-input').value;
        const maxCharsPerLine = Math.max(1, parseInt(getVal('max-chars-per-line', '50'), 10) || 50);
        const lines = text.split('\n').map(line => {
            if (line === '') return [''];
            const regex = new RegExp(`.{1,${maxCharsPerLine}}`, 'g');
            return line.match(regex);
        }).flat();

        const fontSize = Math.max(1, parseInt(getVal('font-size', '4'), 10) || 4);
        const fontFamily = getVal('font-family', 'SimSun');
        const color = getVal('color', '#000000');
        const lineSpacing = parseFloat(getVal('line-spacing', '1.2')) || 1.2;
        const padding = Math.max(0, parseInt(getVal('padding', '1'), 10) || 0);
        const squareImg = getChecked('square-img');
        const align = getVal('text-align', 'center');

        const lineHeight = fontSize * lineSpacing;

        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.textBaseline = 'top';

        let yOffset = padding;
        if (squareImg) {
            yOffset = (lh - lines.length * lineHeight) / 2;
        }

        lines.forEach((line, index) => {
            const lineWidth = ctx.measureText(line).width;
            let xOffset;
            if (squareImg || align === 'center') {
                xOffset = (lw - lineWidth) / 2;
            } else if (align === 'right') {
                xOffset = lw - lineWidth - padding;
            } else {
                xOffset = padding;
            }
            ctx.fillText(line, xOffset, yOffset + index * lineHeight);
        });
    }

    /* ===================== 图片生成 ===================== */

    function generateImage() {
        const canvas = document.getElementById('canvas');
        const text = document.getElementById('text-input').value;

        // 空文本保护
        if (!text.trim()) {
            canvas.width = 0;
            canvas.height = 0;
            applyPreviewScale();
            updateOutputInfo();
            return;
        }

        const maxCharsPerLine = Math.max(1, parseInt(getVal('max-chars-per-line', '50'), 10) || 50);
        const lines = text.split('\n').map(line => {
            if (line === '') return [''];
            const regex = new RegExp(`.{1,${maxCharsPerLine}}`, 'g');
            return line.match(regex);
        }).flat();

        const fontSize = Math.max(1, parseInt(getVal('font-size', '4'), 10) || 4);
        const fontFamily = getVal('font-family', 'SimSun');
        const lineSpacing = parseFloat(getVal('line-spacing', '1.2')) || 1.2;
        const padding = Math.max(0, parseInt(getVal('padding', '1'), 10) || 0);
        const squareImg = getChecked('square-img');

        const lineHeight = fontSize * lineSpacing;

        const probe = document.createElement('canvas').getContext('2d');
        probe.font = `${fontSize}px ${fontFamily}`;
        const maxLineWidth = Math.max(...lines.map(line => probe.measureText(line).width));

        let canvasWidth = (maxLineWidth + 2 * padding) * BASE_SCALE;
        let canvasHeight = (lines.length * lineHeight + 2 * padding) * BASE_SCALE;

        if (squareImg) {
            const maxSize = Math.max(canvasWidth, canvasHeight);
            canvasWidth = maxSize;
            canvasHeight = maxSize;
        }

        canvas.width = Math.floor(canvasWidth);
        canvas.height = Math.floor(canvasHeight);

        drawScene(canvas, 1);

        applyPreviewScale();
        updateOutputInfo();
        canvas.title = '点击查看原始大小';
    }

    /* ===================== 预览缩放 ===================== */

    function applyPreviewScale() {
        const canvas = document.getElementById('canvas');
        const previewArea = document.getElementById('preview-area');
        const pWidth = previewArea.clientWidth;

        if (canvas.width === 0) return;

        if (previewZoom === 'fit') {
            if (canvas.width > pWidth) {
                const s = pWidth / canvas.width;
                canvas.style.width = pWidth + 'px';
                canvas.style.height = (canvas.height * s) + 'px';
            } else {
                canvas.style.width = '';
                canvas.style.height = '';
            }
        } else {
            const z = parseInt(previewZoom, 10) || 1;
            canvas.style.width = (canvas.width * z) + 'px';
            canvas.style.height = (canvas.height * z) + 'px';
        }
    }

    /* ===================== 输出信息（尺寸 + 估算大小） ===================== */

    function updateOutputInfo() {
        const canvas = document.getElementById('canvas');
        const info = document.getElementById('output-info');
        const hint = document.getElementById('font-size-hint');
        if (!info || !canvas) return;

        if (canvas.width === 0) {
            info.textContent = '';
            return;
        }

        const exportScale = parseInt(getVal('export-scale', '2'), 10) || 1;
        const outW = canvas.width * exportScale;
        const outH = canvas.height * exportScale;
        const format = getVal('export-format', 'png');

        info.textContent = `${outW} × ${outH} px · ${format.toUpperCase()} @${exportScale}x`;

        if (hint) {
            const fontSize = parseInt(getVal('font-size', '4'), 10) || 4;
            hint.textContent = `输出约 ${fontSize * BASE_SCALE * exportScale} px`;
        }

        // 异步估算文件大小（超大画布跳过，避免卡顿）
        if (canvas.width * canvas.height < 30 * 1000 * 1000) {
            const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
            const quality = (parseInt(getVal('export-quality', '90'), 10) || 90) / 100;
            canvas.toBlob(function(blob) {
                if (blob) info.textContent += ` · 约 ${formatSize(blob.size * exportScale * exportScale)}`;
            }, mime, quality);
        }
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }

    /* ===================== 导出（下载 / 上传共用） ===================== */

    function renderExportBlob(callback) {
        const canvas = document.getElementById('canvas');
        if (canvas.width === 0) {
            handleError(new Error('empty canvas'), '请先输入文本');
            return;
        }

        const format = getVal('export-format', 'png');
        const exportScale = parseInt(getVal('export-scale', '2'), 10) || 1;
        const quality = (parseInt(getVal('export-quality', '90'), 10) || 90) / 100;
        const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

        // 透明背景导出 JPEG 时垫白底
        const needJpegWhiteBg = format === 'jpeg' && getChecked('transparent-bg');

        function finalize(target, blob) {
            if (blob) {
                callback(blob);
            } else if (needJpegWhiteBg && target !== canvas) {
                // 垫白底需要重绘后重试
                target.toBlob(callback, mime, quality);
            } else {
                handleError(new Error('toBlob returned null'), '导出失败，请重试');
            }
        }

        if (exportScale === 1 && !needJpegWhiteBg) {
            canvas.toBlob(function(blob) { finalize(canvas, blob); }, mime, quality);
            return;
        }

        // 离屏高清渲染
        const temp = document.createElement('canvas');
        temp.width = Math.floor(canvas.width * exportScale);
        temp.height = Math.floor(canvas.height * exportScale);
        drawScene(temp, exportScale);

        if (needJpegWhiteBg) {
            const ctx = temp.getContext('2d');
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, temp.width, temp.height);
            ctx.globalCompositeOperation = 'source-over';
        }

        temp.toBlob(function(blob) { finalize(temp, blob); }, mime, quality);
    }

    /* ===================== 图床上传 ===================== */

    function uploadToIPFS(blob) {
        const api = 'https://cdn.ipfsscan.io/api/v0/add?pin=false';
        const formData = new FormData();
        formData.append('file', blob, blob.name || 'text2img.png');

        const maxRetries = 3;
        let retryCount = 0;

        if (blob.size > 5 * 1024 * 1024) { // 5MB限制
            handleError(new Error('file too large'), '图片超过 5MB，请降低倍率或减少文本');
            return;
        }

        function attemptUpload() {
            fetch(api, { method: 'POST', body: formData })
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.json();
                })
                .then(response => {
                    if (response.Hash) {
                        const filename = (document.getElementById('filename').value || 'text2img').replace(/\.(png|jpe?g|webp)$/i, '');
                        const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
                        const imgSrc = `https://i0.img2ipfs.com/ipfs/${response.Hash}?filename=${filename}.${ext}`;
                        document.getElementById('link').value = imgSrc;
                        document.getElementById('markdown-link').value = `![Image](${imgSrc})`;
                        document.getElementById('html-link').value = `<img src="${imgSrc}" alt="Image">`;
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

    const SETTINGS_FIELDS = [
        'font-size', 'font-family', 'color', 'text-align', 'line-spacing',
        'max-chars-per-line', 'padding', 'square-img',
        'transparent-bg', 'bg-color-start', 'bg-color-end', 'gradient-angle', 'bg-opacity', 'bg-fit',
        'filename', 'export-format', 'export-quality', 'export-scale'
    ];

    function saveSettings() {
        const settings = {};
        SETTINGS_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            settings[id] = el.type === 'checkbox' ? el.checked : el.value;
        });
        localStorage.setItem('text2imgSettings', JSON.stringify(settings));
    }

    function loadSettings() {
        const saved = localStorage.getItem('text2imgSettings');
        if (!saved) return;
        try {
            const settings = JSON.parse(saved);
            SETTINGS_FIELDS.forEach(id => {
                const el = document.getElementById(id);
                if (!el || settings[id] === undefined) return;
                if (el.type === 'checkbox') {
                    el.checked = !!settings[id];
                } else {
                    el.value = settings[id];
                }
            });
            syncQualityGroup();
        } catch (e) {
            console.warn('设置解析失败:', e);
        }
    }

    /* ===================== 导出格式联动 ===================== */

    function syncQualityGroup() {
        const format = getVal('export-format', 'png');
        const group = document.getElementById('quality-group');
        if (group) group.style.display = format === 'png' ? 'none' : '';
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
        const value = getVal('font-family', 'SimSun');
        const match = value.match(/^'([^']+)'/);
        if (match) loadGoogleFont(match[1]);
    }

    // 字体加载完成后重绘，避免先按回退字体生成再跳变
    function regenerateWithFont() {
        loadFontForCurrentSelection();
        const font = getVal('font-family', 'SimSun');
        const size = parseInt(getVal('font-size', '4'), 10) || 4;
        const loadPromise = document.fonts && document.fonts.load
            ? document.fonts.load(`${size}px ${font}`)
            : Promise.resolve();
        loadPromise.then(generateImage).catch(generateImage);
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

    /* ===================== 背景图片设置 ===================== */

    function setBackgroundImageFile(file) {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                backgroundImage = img;
                generateImage();
                showToast('已设置背景图片');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
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

    /* ===================== 拖拽支持 ===================== */

    function initDragDrop() {
        const previewArea = document.getElementById('preview-area');
        const hint = document.getElementById('preview-drop-hint');
        const textInput = document.getElementById('text-input');
        const textWrap = textInput.closest('.text-input-wrap');

        // 拖入图片 → 背景
        ['dragenter', 'dragover'].forEach(evt => {
            previewArea.addEventListener(evt, function(e) {
                e.preventDefault();
                e.stopPropagation();
                previewArea.classList.add('dragover');
            });
        });
        ['dragleave', 'drop'].forEach(evt => {
            previewArea.addEventListener(evt, function(e) {
                e.preventDefault();
                e.stopPropagation();
                previewArea.classList.remove('dragover');
            });
        });
        previewArea.addEventListener('drop', function(e) {
            const file = e.dataTransfer.files && e.dataTransfer.files[0];
            if (file) setBackgroundImageFile(file);
        });

        // 拖入 txt → 文本内容
        ['dragenter', 'dragover'].forEach(evt => {
            textWrap.addEventListener(evt, function(e) {
                e.preventDefault();
                e.stopPropagation();
                textWrap.classList.add('dragover');
            });
        });
        ['dragleave', 'drop'].forEach(evt => {
            textWrap.addEventListener(evt, function(e) {
                e.preventDefault();
                e.stopPropagation();
                textWrap.classList.remove('dragover');
            });
        });
        textWrap.addEventListener('drop', function(e) {
            const file = e.dataTransfer.files && e.dataTransfer.files[0];
            if (!file) return;
            if (file.type.startsWith('text/') || /\.txt$/i.test(file.name)) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    textInput.value = event.target.result.trim();
                    generateImage();
                    showToast('已导入文本内容');
                };
                reader.readAsText(file);
            } else if (file.type.startsWith('image/')) {
                setBackgroundImageFile(file);
            }
        });

        // 提示文字跟随显示/隐藏
        if (hint) {
            const updateHint = () => {
                const c = document.getElementById('canvas');
                hint.style.display = (!backgroundImage && c.width === 0) ? 'flex' : 'none';
            };
            document.addEventListener('DOMContentLoaded', updateHint);
            setTimeout(updateHint, 100);
        }
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

        // 设置变更：保存 + 实时生成
        SETTINGS_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', function() {
                saveSettings();
                if (id === 'export-format') syncQualityGroup();
                if (id === 'transparent-bg' || id === 'square-img') generateImage();
            });
        });

        // 数值控件 input 事件也实时刷新预览
        ['font-size', 'line-spacing', 'padding', 'max-chars-per-line', 'gradient-angle', 'bg-opacity', 'text-align']
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', throttle(generateImage, 300));
            });

        // 颜色实时刷新
        ['color', 'bg-color-start', 'bg-color-end'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', throttle(generateImage, 150));
        });

        // 字体：动态加载 + 加载完成后重绘
        document.getElementById('font-family').addEventListener('change', regenerateWithFont);

        // 导出格式联动
        syncQualityGroup();

        // 预览缩放
        document.querySelectorAll('.zoom-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                previewZoom = this.dataset.zoom;
                document.querySelectorAll('.zoom-btn').forEach(b => b.classList.toggle('active', b === this));
                applyPreviewScale();
            });
        });

        // 预览点击放大
        canvas.addEventListener('click', function() {
            modal.show(this);
        });

        // 上传
        document.getElementById('upload-btn').addEventListener('click', function() {
            renderExportBlob(function(blob) {
                blob.name = (document.getElementById('filename').value || 'text2img') + '.' + blob.type.split('/')[1].replace('jpeg', 'jpg');
                uploadToIPFS(blob);
            });
        });

        // 下载
        document.getElementById('download-btn').addEventListener('click', function() {
            renderExportBlob(function(blob) {
                const filename = document.getElementById('filename').value || 'text2img';
                const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${filename}.${ext}`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            });
        });

        // 背景图（文件选择器）
        document.getElementById('bg-image').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) setBackgroundImageFile(file);
        });

        document.getElementById('clear-bg').addEventListener('click', function() {
            backgroundImage = null;
            document.getElementById('bg-image').value = '';
            generateImage();
        });

        // 快捷键：Ctrl+Enter 生成
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                generateImage();
            }
        });

        // 拖拽支持
        initDragDrop();

        // 窗口尺寸变化时重算预览缩放
        window.addEventListener('resize', throttle(applyPreviewScale, 200));

        // 首次加载生成一张默认图（含占位提示文本）
        if (!textInput.value.trim()) {
            textInput.value = '在此输入文字\n生成你的专属图片';
            saveSettings();
        }
        generateImage();
    });
})();
