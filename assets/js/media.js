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
            
            if (ckEditorInstance) {
                let mediaHtml = '';
                if (resourceType === 'image') {
                    mediaHtml = `<p><img src="${mediaUrl}" style="width:100%; max-width:1000px; border-radius:8px; margin:15px 0;"></p>`;
                } else if (resourceType === 'video') {
                    mediaHtml = `<p><video controls src="${mediaUrl}" style="width:100%; max-width:1000px; border-radius:8px; margin:15px 0;"></video></p>`;
                } else {
                    mediaHtml = `<p><a href="${mediaUrl}" target="_blank" style="color:#0062ff; font-weight:bold;">📄 Tải về tài liệu: ${result.info.original_filename}</a></p>`;
                }
                const viewFragment = ckEditorInstance.data.processor.toView(mediaHtml);
                const modelFragment = ckEditorInstance.data.toModel(viewFragment);
                ckEditorInstance.model.insertContent(modelFragment);
            }
        }
    });
}

// 3. TẢI VÀ HIỂN THỊ DANH SÁCH FILE MEDIA
function loadCloudinaryMedia() {
    const grid = document.getElementById('cloudinary-media-grid');
    if (!grid) return;

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

        renderMediaGrid();
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
    renderPickerGrid();
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

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: span 4; text-align:center; padding:40px; color:#94a3b8;">
            Không tìm thấy file nào trong kho.
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
    } else if (mediaPickerTarget === 'editor' && ckEditorInstance) {
        let mediaHtml = '';
        if (resourceType === 'image') {
            mediaHtml = `<p><img src="${url}" style="width:100%; max-width:1000px; border-radius:8px; margin:15px 0;"></p>`;
        } else if (resourceType === 'video') {
            mediaHtml = `<p><video controls src="${url}" style="width:100%; max-width:1000px; border-radius:8px; margin:15px 0;"></video></p>`;
        } else {
            mediaHtml = `<p><a href="${url}" target="_blank" style="color:#0062ff; font-weight:bold;">📄 Tải về tài liệu: ${fileName}</a></p>`;
        }
        
        const viewFragment = ckEditorInstance.data.processor.toView(mediaHtml);
        const modelFragment = ckEditorInstance.data.toModel(viewFragment);
        ckEditorInstance.model.insertContent(modelFragment);
        sysAlert("Đã chèn file vào nội dung bài viết!", "success");
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
