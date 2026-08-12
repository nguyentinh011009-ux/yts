// =========================================================================
// HỆ THỐNG QUẢN LÝ KHO MEDIA CLOUDINARY THẬT & TÍCH HỢP GOOGLE DRIVE
// =========================================================================

let cachedMediaAssets = [];
let currentMediaCategory = 'all';

// 1. TỰ ĐỘNG LƯU THÔNG TIN FILE VÀO DATABASE KHI UPLOAD THÀNH CÔNG
async function saveMediaMetadata(fileInfo) {
    if (!fileInfo || !fileInfo.public_id) return;
    try {
        const docId = fileInfo.public_id.replace(/[\/\.]/g, '_');
        await db.collection('yt_media_assets').doc(docId).set({
            public_id: fileInfo.public_id,
            url: fileInfo.secure_url,
            format: fileInfo.format || '',
            resource_type: fileInfo.resource_type || 'image', // 'image', 'video', 'raw'
            bytes: fileInfo.bytes || 0,
            original_filename: fileInfo.original_filename || 'File_No_Name',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Tải lại bảng điều khiển nếu đang ở tab Cloudinary
        loadCloudinaryMedia();
    } catch (e) {
        console.error("Lỗi lưu metadata media:", e);
    }
}

// 2. CẬP NHẬT CÁC HÀM UPLOAD - ƯU TIÊN TIÊN GOOGLE DRIVE LÀM MẶC ĐỊNH
function openCloudinaryWidgetGeneral() {
    if (typeof cloudinary === 'undefined') return sysAlert("Chưa tải xong thư viện Cloudinary!", "error");

    cloudinary.openUploadWidget({
        cloudName: CLOUDINARY_CONFIG.cloudName,
        uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
        sources: ['google_drive', 'local', 'url', 'camera', 'dropbox'],
        defaultSource: 'google_drive', // 👉 ĐẶT GOOGLE DRIVE LÀM MẶC ĐỊNH
        multiple: true
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            saveMediaMetadata(result.info);
            sysAlert(`Đã tải lên thành công: ${result.info.original_filename}`, "success");
        }
    });
}

function openCloudinaryWidgetForCover() {
    if (typeof cloudinary === 'undefined') return sysAlert("Chưa tải xong thư viện Cloudinary!", "error");
    
    cloudinary.openUploadWidget({
        cloudName: CLOUDINARY_CONFIG.cloudName,
        uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
        sources: ['google_drive', 'local', 'url', 'camera'],
        defaultSource: 'google_drive',
        multiple: false,
        clientAllowedFormats: ['image']
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            document.getElementById('p-cover').value = result.info.secure_url;
            saveMediaMetadata(result.info);
            sysAlert("Đã chọn ảnh bìa thành công!", "success");
        }
    });
}

function openCloudinaryWidgetForEditor() {
    if (typeof cloudinary === 'undefined') return sysAlert("Chưa tải xong thư viện Cloudinary!", "error");

    cloudinary.openUploadWidget({
        cloudName: CLOUDINARY_CONFIG.cloudName,
        uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
        sources: ['google_drive', 'local', 'url', 'camera'],
        defaultSource: 'google_drive',
        multiple: true
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            saveMediaMetadata(result.info);
            const mediaUrl = result.info.secure_url;
            const resourceType = result.info.resource_type;
            
if (CKEDITOR.instances['p-content']) {
    let mediaHtml = '';
    if (resourceType === 'image') {
        mediaHtml = `<p><img src="${mediaUrl}" style="width:100%; max-width:1000px; border-radius:8px; margin:15px 0;"></p>`;
    } else if (resourceType === 'video') {
        mediaHtml = `<p><video controls src="${mediaUrl}" style="width:100%; max-width:1000px; border-radius:8px; margin:15px 0;"></video></p>`;
    } else {
        mediaHtml = `<p><a href="${mediaUrl}" target="_blank" style="color:#0062ff; font-weight:bold;">📄 Tải về tài liệu: ${result.info.original_filename}</a></p>`;
    }
    CKEDITOR.instances['p-content'].insertHtml(mediaHtml);
}
        }
    });
}

// 3. TẢI VÀ HIỂN THỊ DANH SÁCH FILE MEDIA
function loadCloudinaryMedia() {
    const grid = document.getElementById('cloudinary-media-grid');
    
    db.collection('yt_media_assets').orderBy('timestamp', 'desc').onSnapshot(snap => {
        cachedMediaAssets = [];
        let counts = { all: 0, image: 0, video: 0, raw: 0 };

        snap.forEach(doc => {
            const item = { docId: doc.id, ...doc.data() };
            cachedMediaAssets.push(item);

            counts.all++;
            const type = item.resource_type || 'image';
            if (counts[type] !== undefined) counts[type]++;
            else counts.raw++;
        });

        // Cập nhật số đếm trên các Tab
        if(document.getElementById('cnt-media-all')) document.getElementById('cnt-media-all').innerText = counts.all;
        if(document.getElementById('cnt-media-image')) document.getElementById('cnt-media-image').innerText = counts.image;
        if(document.getElementById('cnt-media-video')) document.getElementById('cnt-media-video').innerText = counts.video;
        if(document.getElementById('cnt-media-raw')) document.getElementById('cnt-media-raw').innerText = counts.raw;

        renderMediaGrid();  // Vẽ lưới ngoài Tab chính
        renderPickerGrid(); // 👉 THÊM DÒNG NÀY: Vẽ lưới trong Popup Chọn Ảnh!
    });
}

// 4. VẼ GIAO DIỆN LƯỚI THẺ MEDIA (MEDIA CARDS)
function renderMediaGrid(searchKeyword = '') {
    const grid = document.getElementById('cloudinary-media-grid');
    if (!grid) return;

    let filtered = cachedMediaAssets;

    // Lọc theo danh mục
    if (currentMediaCategory !== 'all') {
        filtered = filtered.filter(item => (item.resource_type || 'image') === currentMediaCategory);
    }

    // Lọc theo từ khóa tìm kiếm
    if (searchKeyword.trim() !== '') {
        const kw = searchKeyword.toLowerCase().trim();
        filtered = filtered.filter(item => (item.original_filename || '').toLowerCase().includes(kw));
    }

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: span 4; text-align:center; padding:50px; color:#94a3b8;">
            <i class="fas fa-folder-open fa-3x" style="opacity:0.3; margin-bottom:15px;"></i><br>Không có file nào trong mục này.
        </div>`;
        return;
    }

    let html = '';
    filtered.forEach(item => {
        const fileSizeMB = (item.bytes / (1024 * 1024)).toFixed(2);
        const resType = item.resource_type || 'image';

        // Phân loại hình ảnh xem trước
        let previewHtml = '';
        if (resType === 'image') {
            previewHtml = `<img src="${item.url}" style="width:100%; height:140px; object-fit:cover; border-radius:8px 8px 0 0;">`;
        } else if (resType === 'video') {
            previewHtml = `<div style="height:140px; background:#0f172a; display:flex; align-items:center; justify-content:center; color:#38bdf8; border-radius:8px 8px 0 0;">
                <i class="fas fa-play-circle fa-3x"></i>
            </div>`;
        } else {
            previewHtml = `<div style="height:140px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#64748b; border-radius:8px 8px 0 0;">
                <i class="fas fa-file-alt fa-3x"></i>
            </div>`;
        }

        html += `
            <div class="form-card" style="padding:0; margin-bottom:0; overflow:hidden; border:1px solid #e2e8f0; transition:0.2s; position:relative;" onmouseover="this.style.boxShadow='0 10px 20px rgba(0,0,0,0.08)'" onmouseout="this.style.boxShadow='none'">
                ${previewHtml}
                <div style="padding:12px;">
                    <div style="font-weight:bold; font-size:0.85rem; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.original_filename}">
                        ${item.original_filename}.${item.format || ''}
                    </div>
                    <div style="font-size:0.75rem; color:#64748b; margin-top:4px; display:flex; justify-content:space-between;">
                        <span>${resType.toUpperCase()}</span>
                        <span>${fileSizeMB} MB</span>
                    </div>
                    <div style="display:flex; gap:6px; margin-top:10px;">
                        <button onclick="copyMediaUrl('${item.url}')" class="btn-sm" style="flex:1; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:6px; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:bold;">
                            <i class="fas fa-copy"></i> Copy Link
                        </button>
                        <a href="${item.url}" target="_blank" class="btn-sm" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:6px 10px; border-radius:6px; text-decoration:none; font-size:0.75rem;">
                            <i class="fas fa-external-link-alt"></i>
                        </a>
                        <button onclick="deleteMediaAsset('${item.docId}', '${item.original_filename}')" class="btn-sm" style="background:#fef2f2; color:#ef4444; border:1px solid #fca5a5; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:0.75rem;" title="Xóa file">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

// 5. CHUYỂN ĐỔI BỘ LỌC PHÂN LOẠI
function filterMediaCategory(type) {
    currentMediaCategory = type;
    const categories = ['all', 'image', 'video', 'raw'];
    categories.forEach(c => {
        const btn = document.getElementById(`btn-media-flt-${c}`);
        if (btn) {
            if (c === type) {
                btn.style.background = '#0284c7';
                btn.style.color = 'white';
            } else {
                btn.style.background = 'white';
                btn.style.color = '#64748b';
            }
        }
    });
    renderMediaGrid();
}

function searchMediaFiles(kw) {
    renderMediaGrid(kw);
}

// 6. TÍNH NĂNG SAO CHÉP LINK & XÓA FILE
function copyMediaUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        sysAlert("Đã sao chép đường dẫn file vào bộ nhớ tạm!", "success");
    }).catch(err => {
        alert("Link file: " + url);
    });
}

async function deleteMediaAsset(docId, fileName) {
    const isOk = await sysConfirm(`Bạn có chắc chắn muốn xóa file "${fileName}" khỏi danh sách quản lý?`, "Xóa File", true);
    if (isOk) {
        sysLoading(true, "Đang xóa dữ liệu...");
        try {
            await db.collection('yt_media_assets').doc(docId).delete();
            sysAlert("Đã xóa file khỏi kho lưu trữ!", "success");
        } catch (e) {
            sysAlert("Lỗi khi xóa: " + e.message, "error");
        } finally {
            sysLoading(false);
        }
    }
}

// Tự động tải kho media khi mở Tab
const originalSwitchTab = window.switchTab;
window.switchTab = function(tabId, btn) {
    if (typeof originalSwitchTab === 'function') originalSwitchTab(tabId, btn);
    if (tabId === 'tab-cloudinary-manager') {
        loadCloudinaryMedia();
    }
};
// =========================================================================
// HOẠT ĐỘNG CHỌN MEDIA TRỰC TIẾP TỪ KHO LƯU TRỮ (NO UPLOAD WIDGET REQUIRED)
// =========================================================================

let mediaPickerTarget = 'editor'; // 'cover' hoặc 'editor'
let currentPickerCategory = 'all';

// 1. MỞ HỘP THOẠI CHỌN MEDIA
function openMediaPickerModal(target = 'editor') {
    mediaPickerTarget = target;
    document.getElementById('media-picker-modal').style.display = 'flex';
    
    // Nếu đã có dữ liệu lưu tạm -> Vẽ ngay ra Popup
    if (cachedMediaAssets.length > 0) {
        renderPickerGrid();
    }
    loadCloudinaryMedia();
}

function closeMediaPickerModal() {
    document.getElementById('media-picker-modal').style.display = 'none';
}

// 2. VẼ DANH SÁCH FILE TRONG HỘP THOẠI
function renderPickerGrid(searchKw = '') {
    const grid = document.getElementById('picker-media-grid');
    if (!grid) return;

    let filtered = cachedMediaAssets;

    if (currentPickerCategory !== 'all') {
        filtered = filtered.filter(item => (item.resource_type || 'image') === currentPickerCategory);
    }

    if (searchKw.trim() !== '') {
        const kw = searchKw.toLowerCase().trim();
        filtered = filtered.filter(item => (item.original_filename || '').toLowerCase().includes(kw));
    }

    // NẾU KHO CHƯA CÓ FILE NÀO -> HIỆN NÚT TẢI LÊN NGAY TẠI POPUP
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: span 4; text-align:center; padding:40px 20px; color:#64748b;">
                <i class="fas fa-folder-open fa-3x" style="color:#cbd5e1; margin-bottom:15px;"></i>
                <p style="font-weight:bold; font-size:1.05rem; color:#1e293b; margin-bottom:5px;">Kho hiện chưa có file/ảnh nào!</p>
                <p style="font-size:0.85rem; color:#64748b; margin-bottom:20px;">Hãy tải lên file mới hoặc chọn từ Google Drive của bạn.</p>
                <button onclick="openCloudinaryWidgetGeneral()" class="btn btn-primary" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%); padding:10px 22px; font-weight:bold;">
                    <i class="fab fa-google-drive"></i> Tải lên ngay (Từ Google Drive / Máy tính)
                </button>
            </div>`;
        return;
    }

    let html = '';
    filtered.forEach(item => {
        const resType = item.resource_type || 'image';
        let thumbHtml = '';

        if (resType === 'image') {
            thumbHtml = `<img src="${item.url}" style="width:100%; height:110px; object-fit:cover;">`;
        } else if (resType === 'video') {
            thumbHtml = `<div style="height:110px; background:#0f172a; display:flex; align-items:center; justify-content:center; color:#38bdf8;">
                <i class="fas fa-play-circle fa-2x"></i>
            </div>`;
        } else {
            thumbHtml = `<div style="height:110px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#64748b;">
                <i class="fas fa-file-alt fa-2x"></i>
            </div>`;
        }

        html += `
            <div class="picker-card" onclick="selectMediaForPost('${item.url}', '${resType}', '${item.original_filename}')">
                ${thumbHtml}
                <div style="padding:8px; font-size:0.78rem; font-weight:bold; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.original_filename}">
                    ${item.original_filename}
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

// 3. CHỌN MỘT FILE VÀ TỰ ĐỘNG CHÈN VÀO BÀI VIẾT HOẶC ÁNH BÌA
function selectMediaForPost(url, resourceType, fileName) {
    if (mediaPickerTarget === 'cover') {
        document.getElementById('p-cover').value = url;
        sysAlert("Đã chọn ảnh bìa từ kho thành công!", "success");
} else if (mediaPickerTarget === 'editor') {
    let mediaHtml = '';
    if (resourceType === 'image') {
        mediaHtml = `<p><img src="${url}" style="width:100%; max-width:1000px; border-radius:8px; margin:15px 0;"></p>`;
    } else if (resourceType === 'video') {
        mediaHtml = `<p><video controls src="${url}" style="width:100%; max-width:1000px; border-radius:8px; margin:15px 0;"></video></p>`;
    } else {
        mediaHtml = `<p><a href="${url}" target="_blank" style="color:#0062ff; font-weight:bold;">📄 Tải về tài liệu: ${fileName}</a></p>`;
    }
    
    if (CKEDITOR.instances['p-content']) {
        CKEDITOR.instances['p-content'].insertHtml(mediaHtml);
        sysAlert("Đã chèn file vào nội dung bài viết!", "success");
    }
}
    
    closeMediaPickerModal();
}

function filterPickerCategory(cat) {
    currentPickerCategory = cat;
    ['all', 'image', 'video', 'raw'].forEach(c => {
        const btn = document.getElementById(`btn-picker-flt-${c}`);
        if (btn) {
            btn.style.background = (c === cat) ? '#0284c7' : 'white';
            btn.style.color = (c === cat) ? 'white' : '#64748b';
        }
    });
    renderPickerGrid();
}

function searchPickerFiles(kw) {
    renderPickerGrid(kw);
}
let tiptapEditor = null;
window.isSourceViewMode = false;
let currentStyleBlock = '';

window.loadGoogleFontOnDemand = function(fontName) {
    if (!fontName) return;
    const systemFonts = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Tahoma', 'Verdana', 'Trebuchet MS', 'Impact'];
    if (systemFonts.includes(fontName)) return;
    const fontId = 'gfont-' + fontName.toLowerCase().replace(/\s+/g, '-');
    if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId; link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;600;700&display=swap`;
        document.head.appendChild(link);
    }
};

function extractStyleBlock(html) {
    if (!html) return { style: '', body: '' };
    let styleMatches = [];
    let body = html.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, (match) => { styleMatches.push(match); return ''; });
    return { style: styleMatches.join('\n'), body: body.trim() };
}

window.initCKEditor = function(callback) {
    if (tiptapEditor) { if (typeof callback === 'function') callback(); return; }
    if (!window.TiptapModules) { setTimeout(() => window.initCKEditor(callback), 150); return; }

    const { 
        Editor, StarterKit, Image, Link, Underline, TextAlign, TextStyle, 
        Color, FontFamily, Highlight, Youtube, Table, TableRow, TableHeader, 
        TableCell, TaskList, TaskItem, FontSize, CustomDiv,
        Subscript, Superscript, CharacterCount, LineHeight 
    } = window.TiptapModules;

    const sourceArea = document.getElementById('p-content-source');
    const extracted = extractStyleBlock(sourceArea ? sourceArea.value : '');
    currentStyleBlock = extracted.style;

    const activeExtensions = [
        StarterKit, CustomDiv, Underline, TextStyle, FontSize, Color, FontFamily,
        Subscript, Superscript, CharacterCount, LineHeight,
        Highlight ? Highlight.configure({ multicolors: true }) : null,
        Image,
        Link ? Link.configure({ openOnClick: false, autolink: true }) : null,
        TextAlign ? TextAlign.configure({ types: ['heading', 'paragraph'] }) : null,
        Youtube ? Youtube.configure({ controls: true, nocookie: true }) : null,
        Table ? Table.configure({ resizable: true }) : null,
        TableRow, TableHeader, TableCell, TaskList,
        TaskItem ? TaskItem.configure({ nested: true }) : null
    ].filter(Boolean);

    try {
        tiptapEditor = new Editor({
            element: document.getElementById('tiptap-editor'),
            extensions: activeExtensions,
            content: extracted.body || '',
            onUpdate({ editor }) { updateWordCountStats(editor); },
            onSelectionUpdate({ editor }) {
                // 1. Đồng bộ Font Family
                const fontSelect = document.getElementById('tp-font-family-select');
                if (fontSelect) {
                    const currentFont = editor.getAttributes('textStyle').fontFamily || '';
                    fontSelect.value = currentFont.replace(/['"]/g, '').trim();
                }
                // 2. Đồng bộ Font Size
                const sizeInput = document.getElementById('tp-custom-size-input');
                if (sizeInput) {
                    const currentSize = editor.getAttributes('textStyle').fontSize || '16px';
                    sizeInput.value = currentSize;
                }
                // 3. Đồng bộ Line Height từ block hiện tại
                const lineSelect = document.getElementById('tp-line-height-select');
                if (lineSelect) {
                    let activeLH = '1.15';
                    ['paragraph', 'heading'].forEach(type => {
                        const attrs = editor.getAttributes(type);
                        if (attrs && attrs.lineHeight) activeLH = attrs.lineHeight;
                    });
                    lineSelect.value = activeLH;
                }
            }
        });
        updateWordCountStats(tiptapEditor);
        if (typeof callback === 'function') callback();
    } catch (err) { console.error("Lỗi khởi tạo Tiptap:", err); }
};

function updateWordCountStats(editor) {
    if (!editor) return;
    const text = editor.getText();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    if (document.getElementById('tp-stat-words')) document.getElementById('tp-stat-words').innerText = words.toLocaleString('vi-VN');
    if (document.getElementById('tp-stat-chars')) document.getElementById('tp-stat-chars').innerText = chars.toLocaleString('vi-VN');
}

window.getEditorContent = function() {
    if (window.isSourceViewMode) {
        const sourceVal = document.getElementById('p-content-source').value;
        currentStyleBlock = extractStyleBlock(sourceVal).style;
        return sourceVal;
    }
    const editorHtml = tiptapEditor ? tiptapEditor.getHTML() : '';
    return currentStyleBlock ? `${currentStyleBlock}\n${editorHtml}` : editorHtml;
};

window.setEditorContent = function(html = '') {
    const extracted = extractStyleBlock(html);
    currentStyleBlock = extracted.style;
    if (document.getElementById('p-content-source')) document.getElementById('p-content-source').value = html || '';
    if (tiptapEditor) {
        tiptapEditor.commands.setContent(extracted.body || '');
        updateWordCountStats(tiptapEditor);
        const fontMatches = html.match(/font-family:\s*['"]?([^'";>]+)['"]?/gi);
        if (fontMatches) fontMatches.forEach(f => window.loadGoogleFontOnDemand(f.replace(/font-family:\s*['"]?/i, '').replace(/['"]?$/, '').trim()));
    }
};

window.insertMediaToEditor = function(url, resourceType, fileName) {
    if (!tiptapEditor) return;
    const isEnableZoom = document.getElementById('chk-auto-image-zoom') ? document.getElementById('chk-auto-image-zoom').checked : true;
    if (resourceType === 'image') {
        if (isEnableZoom) tiptapEditor.chain().focus().insertContent(`<p style="text-align:center;"><a href="${url}" target="_blank" rel="noopener noreferrer" class="vts-img-zoom-link"><img src="${url}" alt="${fileName}" data-alignment="center" style="width:100%; max-width:100%; display:block; margin:15px auto; border-radius:10px; cursor:pointer;" /></a></p>`).run();
        else tiptapEditor.chain().focus().setImage({ src: url, alt: fileName }).run();
    } else if (resourceType === 'video') {
        tiptapEditor.chain().focus().insertContent(`<p style="text-align:center;"><video controls src="${url}" style="width:100%; max-width:1000px; border-radius:12px; margin:15px auto;"></video></p>`).run();
    } else {
        tiptapEditor.chain().focus().insertContent(`<p><a href="${url}" target="_blank" style="color:#0062ff; font-weight:bold;">📄 Tải về tài liệu: ${fileName || 'Link file'}</a></p>`).run();
    }
    sysAlert("Đã chèn nội dung vào bài viết!", "success");
};

window.execTiptapCmd = function(cmd, param = null) {
    if (!tiptapEditor) return;
    switch(cmd) {
        case 'fontFamily': 
            if (param) { window.loadGoogleFontOnDemand(param); tiptapEditor.chain().focus().setFontFamily(param).run(); } 
            else tiptapEditor.chain().focus().unsetFontFamily().run();
            break;
        case 'fontSize': 
            if (param) tiptapEditor.chain().focus().setMark('textStyle', { fontSize: isNaN(param) ? param : `${param}px` }).run(); 
            break;
        case 'bold': tiptapEditor.chain().focus().toggleBold().run(); break;
        case 'italic': tiptapEditor.chain().focus().toggleItalic().run(); break;
        case 'underline': tiptapEditor.chain().focus().toggleUnderline().run(); break;
        case 'strike': tiptapEditor.chain().focus().toggleStrike().run(); break;
        case 'subscript': tiptapEditor.chain().focus().toggleSubscript().run(); break;
        case 'superscript': tiptapEditor.chain().focus().toggleSuperscript().run(); break;
        case 'color': if (param) tiptapEditor.chain().focus().setColor(param).run(); break;
        case 'highlight': if (param) tiptapEditor.chain().focus().toggleHighlight({ color: param }).run(); break;
        case 'clearFormatting': tiptapEditor.chain().focus().unsetAllMarks().clearNodes().run(); break;
        case 'alignLeft': tiptapEditor.chain().focus().setTextAlign('left').run(); break;
        case 'alignCenter': tiptapEditor.chain().focus().setTextAlign('center').run(); break;
        case 'alignRight': tiptapEditor.chain().focus().setTextAlign('right').run(); break;
        case 'alignJustify': tiptapEditor.chain().focus().setTextAlign('justify').run(); break;
        case 'lineHeight': if (param && tiptapEditor.commands.setLineHeight) tiptapEditor.chain().focus().setLineHeight(param).run(); break;
        case 'h1': tiptapEditor.chain().focus().toggleHeading({ level: 1 }).run(); break;
        case 'h2': tiptapEditor.chain().focus().toggleHeading({ level: 2 }).run(); break;
        case 'h3': tiptapEditor.chain().focus().toggleHeading({ level: 3 }).run(); break;
        case 'paragraph': tiptapEditor.chain().focus().setParagraph().run(); break;
        case 'bulletList': tiptapEditor.chain().focus().toggleBulletList().run(); break;
        case 'orderedList': tiptapEditor.chain().focus().toggleOrderedList().run(); break;
        case 'taskList': tiptapEditor.chain().focus().toggleTaskList().run(); break;
        
        // FIX LỖI TẠO BẢNG CỨNG 3x3 -> HỎI NGƯỜI DÙNG KÍCH THƯỚC BẢNG TỰ DO
        case 'insertTable': 
            const rows = prompt("Nhập số HÀNG của Bảng:", "3");
            const cols = prompt("Nhập số CỘT của Bảng:", "3");
            if(rows && cols && !isNaN(rows) && !isNaN(cols)) {
                tiptapEditor.chain().focus().insertTable({ rows: parseInt(rows), cols: parseInt(cols), withHeaderRow: true }).run();
            }
            break;
            
        case 'addRowBefore': tiptapEditor.chain().focus().addRowBefore().run(); break;
        case 'addRowAfter': tiptapEditor.chain().focus().addRowAfter().run(); break;
        case 'deleteRow': tiptapEditor.chain().focus().deleteRow().run(); break;
        case 'addColumnBefore': tiptapEditor.chain().focus().addColumnBefore().run(); break;
        case 'addColumnAfter': tiptapEditor.chain().focus().addColumnAfter().run(); break;
        case 'deleteColumn': tiptapEditor.chain().focus().deleteColumn().run(); break;
        case 'mergeCells': tiptapEditor.chain().focus().mergeCells().run(); break;
        case 'splitCell': tiptapEditor.chain().focus().splitCell().run(); break;
        case 'tableCellBg': if (param) tiptapEditor.chain().focus().setCellAttribute('backgroundColor', param).run(); break;
        case 'deleteTable': tiptapEditor.chain().focus().deleteTable().run(); break;
        case 'blockquote': tiptapEditor.chain().focus().toggleBlockquote().run(); break;
        case 'codeBlock': tiptapEditor.chain().focus().toggleCodeBlock().run(); break;
        case 'youtube': 
            const yUrl = prompt('Nhập link Video YouTube:');
            if (yUrl) tiptapEditor.commands.setYoutubeVideo({ src: yUrl });
            break;
        case 'math':
            const latex = prompt('Nhập công thức Toán (LaTeX/KaTeX):', 'E = mc^2');
            if (latex && window.katex) {
                const rendered = window.katex.renderToString(latex, { throwOnError: false });
                tiptapEditor.chain().focus().insertContent(`<span class="math-formula-node" data-latex="${latex}">${rendered}</span>&nbsp;`).run();
            }
            break;
        case 'link':
            const previousUrl = tiptapEditor.getAttributes('link').href;
            const linkUrl = prompt('Nhập đường dẫn URL:', previousUrl);
            if (linkUrl === null) return;
            if (linkUrl === '') tiptapEditor.chain().focus().extendMarkRange('link').unsetLink().run();
            else tiptapEditor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
            break;
        case 'unsetLink': tiptapEditor.chain().focus().unsetLink().run(); break;
        case 'horizontalRule': tiptapEditor.chain().focus().setHorizontalRule().run(); break;
        case 'undo': tiptapEditor.chain().focus().undo().run(); break;
        case 'redo': tiptapEditor.chain().focus().redo().run(); break;
    }
};

window.toggleSourceView = function() {
    const paper = document.getElementById('tiptap-editor');
    const source = document.getElementById('p-content-source');
    const btnSource = document.getElementById('btn-tp-source');
    if (!window.isSourceViewMode) {
        source.value = currentStyleBlock ? `${currentStyleBlock}\n${tiptapEditor.getHTML()}` : tiptapEditor.getHTML();
        paper.style.display = 'none'; source.style.display = 'block';
        window.isSourceViewMode = true;
        if (btnSource) btnSource.classList.add('is-active-source');
    } else {
        const extracted = extractStyleBlock(source.value);
        currentStyleBlock = extracted.style;
        if (tiptapEditor) tiptapEditor.commands.setContent(extracted.body);
        source.style.display = 'none'; paper.style.display = 'block';
        window.isSourceViewMode = false;
        if (btnSource) btnSource.classList.remove('is-active-source');
    }
};

window.toggleFullscreenEditor = function() {
    const wrapper = document.querySelector('.tiptap-editor-wrapper');
    if (!wrapper) return;
    const isFS = wrapper.classList.toggle('is-fullscreen');
    document.body.style.overflow = isFS ? 'hidden' : '';
    const icon = document.getElementById('ic-tp-fullscreen');
    const label = document.getElementById('lbl-tp-fullscreen');
    if (icon) icon.className = isFS ? 'fas fa-check-circle' : 'fas fa-expand';
    if (label) {
        label.innerText = 'XONG';
        label.style.display = isFS ? 'inline-block' : 'none';
    }
    if (isFS && tiptapEditor) tiptapEditor.commands.focus();
};

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
        const wrapper = document.querySelector('.tiptap-editor-wrapper');
        if (wrapper && wrapper.classList.contains('is-fullscreen')) window.toggleFullscreenEditor();
    }
});
