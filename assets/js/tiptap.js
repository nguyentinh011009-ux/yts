        import { Editor, Node, Extension } from 'https://esm.sh/@tiptap/core@2.1.13';
        import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.1.13';
        import Image from 'https://esm.sh/@tiptap/extension-image@2.1.13';
        import Link from 'https://esm.sh/@tiptap/extension-link@2.1.13';
        import Underline from 'https://esm.sh/@tiptap/extension-underline@2.1.13';
        import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@2.1.13';
        import TextStyle from 'https://esm.sh/@tiptap/extension-text-style@2.1.13';
        import Color from 'https://esm.sh/@tiptap/extension-color@2.1.13';
        import FontFamily from 'https://esm.sh/@tiptap/extension-font-family@2.1.13';
        import Highlight from 'https://esm.sh/@tiptap/extension-highlight@2.1.13';
        import Youtube from 'https://esm.sh/@tiptap/extension-youtube@2.1.13';
        import Table from 'https://esm.sh/@tiptap/extension-table@2.1.13';
        import TableRow from 'https://esm.sh/@tiptap/extension-table-row@2.1.13';
        import TableHeader from 'https://esm.sh/@tiptap/extension-table-header@2.1.13';
        import TableCell from 'https://esm.sh/@tiptap/extension-table-cell@2.1.13';
        import TaskList from 'https://esm.sh/@tiptap/extension-task-list@2.1.13';
        import TaskItem from 'https://esm.sh/@tiptap/extension-task-item@2.1.13';
        import Subscript from 'https://esm.sh/@tiptap/extension-subscript@2.1.13';
        import Superscript from 'https://esm.sh/@tiptap/extension-superscript@2.1.13';

        const LineHeight = Extension.create({
            name: 'lineHeight',
            addOptions() { return { types: ['paragraph', 'heading', 'list_item'] } },
            addGlobalAttributes() {
                return [{
                    types: this.options.types,
                    attributes: {
                        lineHeight: {
                            default: null,
                            parseHTML: element => element.style.lineHeight || null,
                            renderHTML: attributes => {
                                if (!attributes.lineHeight) return {};
                                return { style: `line-height: ${attributes.lineHeight}` };
                            }
                        }
                    }
                }]
            },
            addCommands() {
                return {
                    setLineHeight: (lineHeight) => ({ commands }) => {
                        return this.options.types.every(type => commands.updateAttributes(type, { lineHeight }))
                    },
                    unsetLineHeight: () => ({ commands }) => {
                        return this.options.types.every(type => commands.resetAttributes(type, 'lineHeight'))
                    }
                }
            }
        });
        // 🌟 KHỞI TẠO EXTENSION BẢO TỒN NGUYÊN VẸN THẺ DIV VÀ TOÀN BỘ CLASS/STYLE
        const CustomDiv = Node.create({
            name: 'customDiv',
            group: 'block',
            content: 'block*',
            defining: true,
            addAttributes() {
                return {
                    class: { default: null },
                    style: { default: null },
                    id: { default: null }
                };
            },
            parseHTML() {
                return [{ tag: 'div' }];
            },
            renderHTML({ HTMLAttributes }) {
                return ['div', HTMLAttributes, 0];
            }
        });
    
        // Tạo Extension FontSize
        const FontSize = TextStyle.extend({
            addAttributes() {
                return {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize,
                        renderHTML: attributes => {
                            if (!attributes.fontSize) return {};
                            return { style: `font-size: ${attributes.fontSize}` };
                        },
                    },
                };
            },
        });
    // =========================================================================
    // TIPTAP CUSTOM EXTENSION: SHAPE WORD FIX HOÀN HẢO (SVG 100% & MÀU CHUẨN)
    // =========================================================================
    const CustomShape = Node.create({
        name: 'customShape',
        group: 'block',
        atom: true,
        draggable: true,

        addAttributes() {
            return {
                shapeType: { default: 'arrow' },
                fillColor: { default: '#3b82f6' },
                strokeColor: { default: '#1d4ed8' },
                strokeWidth: { default: '2' },
                strokeStyle: { default: 'solid' },
                width: { default: '240px' },
                height: { default: '130px' },
                alignment: { default: 'center' },
                text: { default: 'Nội dung Shape' },
                textColor: { default: '#ffffff' },
                fontSize: { default: '16' }
            };
        },

        parseHTML() {
            return [{ tag: 'div[data-type="custom-shape"]' }];
        },

        renderHTML({ HTMLAttributes }) {
            const align = HTMLAttributes.alignment || 'center';
            let alignStyle = 'display: block; margin: 15px auto;';
            if (align === 'left') alignStyle = 'display: block; margin: 15px auto 15px 0;';
            else if (align === 'right') alignStyle = 'display: block; margin: 15px 0 15px auto;';
            else if (align === 'float-left') alignStyle = 'float: left; margin: 5px 20px 15px 0;';
            else if (align === 'float-right') alignStyle = 'float: right; margin: 5px 0 15px 20px;';

            const type = HTMLAttributes.shapeType || 'rectangle';
            const fill = HTMLAttributes.fillColor || '#3b82f6';
            const stroke = HTMLAttributes.strokeColor || '#1d4ed8';
            const sWidth = HTMLAttributes.strokeWidth || '2';
            const dash = HTMLAttributes.strokeStyle === 'dashed' ? '6,6' : (HTMLAttributes.strokeStyle === 'dotted' ? '2,4' : 'none');

            let svgContent = '';
            if (type === 'rounded') svgContent = `<rect x="2" y="2" width="96" height="96" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="${sWidth}" stroke-dasharray="${dash}" />`;
            else if (type === 'circle') svgContent = `<ellipse cx="50" cy="50" rx="46" ry="46" fill="${fill}" stroke="${stroke}" stroke-width="${sWidth}" stroke-dasharray="${dash}" />`;
            else if (type === 'triangle') svgContent = `<polygon points="50,4 96,96 4,96" fill="${fill}" stroke="${stroke}" stroke-width="${sWidth}" stroke-dasharray="${dash}" />`;
            else if (type === 'star') svgContent = `<polygon points="50,2 63,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 37,35" fill="${fill}" stroke="${stroke}" stroke-width="${sWidth}" stroke-dasharray="${dash}" />`;
            else if (type === 'arrow') svgContent = `<polygon points="2,25 55,25 55,8 98,50 55,92 55,75 2,75" fill="${fill}" stroke="${stroke}" stroke-width="${sWidth}" stroke-dasharray="${dash}" />`;
            else if (type === 'callout') svgContent = `<path d="M 4 4 H 96 A 4 4 0 0 1 100 8 V 65 A 4 4 0 0 1 96 69 H 35 L 15 96 V 69 H 4 A 4 4 0 0 1 0 65 V 8 A 4 4 0 0 1 4 4 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sWidth}" stroke-dasharray="${dash}" />`;
            else svgContent = `<rect x="2" y="2" width="96" height="96" fill="${fill}" stroke="${stroke}" stroke-width="${sWidth}" stroke-dasharray="${dash}" />`;

            return ['div', {
                'data-type': 'custom-shape',
                style: `width: ${HTMLAttributes.width || '240px'}; height: ${HTMLAttributes.height || '130px'}; position: relative; ${alignStyle}`
            }, 
            ['div', { class: 'tp-shape-svg', style: 'width:100%; height:100%;' }, ['svg', { width: '100%', height: '100%', viewBox: '0 0 100 100', preserveAspectRatio: 'none' }, [0]]],
            ['div', { class: 'tp-shape-input-text', style: `color: ${HTMLAttributes.textColor || '#ffffff'}; font-size: ${HTMLAttributes.fontSize || '16'}px;` }, HTMLAttributes.text || '']
            ];
        },

        addNodeView() {
            return ({ node, getPos, editor }) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'tp-shape-box';

                const svgBox = document.createElement('div');
                svgBox.className = 'tp-shape-svg';

                const textDisplay = document.createElement('div');
                textDisplay.className = 'tp-shape-input-text';

                const updateShape = () => {
                    const attrs = node.attrs;
                    wrapper.style.width = attrs.width;
                    wrapper.style.height = attrs.height;

                    const align = attrs.alignment || 'center';
                    wrapper.style.float = 'none';
                    wrapper.style.display = 'inline-block';
                    wrapper.style.margin = '0';
                    if (align === 'center') wrapper.style.cssText += 'display: block; margin: 15px auto; float: none;';
                    else if (align === 'left') wrapper.style.cssText += 'display: block; margin: 15px auto 15px 0; float: none;';
                    else if (align === 'right') wrapper.style.cssText += 'display: block; margin: 15px 0 15px auto; float: none;';
                    else if (align === 'float-left') wrapper.style.cssText += 'float: left; margin: 5px 20px 15px 0;';
                    else if (align === 'float-right') wrapper.style.cssText += 'float: right; margin: 5px 0 15px 20px;';

                    const fill = attrs.fillColor;
                    const stroke = attrs.strokeColor;
                    const sWidth = attrs.strokeWidth;
                    const dash = attrs.strokeStyle === 'dashed' ? '6,6' : (attrs.strokeStyle === 'dotted' ? '2,4' : 'none');
                    const type = attrs.shapeType;

                    let svgPath = '';
                    if (type === 'rounded') svgPath = `<rect x="2" y="2" width="96" height="96" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="${sWidth}" stroke-dasharray="${dash}" />`;
                    else if (type === 'circle') svgPath = `<ellipse cx="50" cy="50" rx="46" ry="46" fill="${fill}" stroke="${stroke}" stroke-width="${sWidth}" stroke-dasharray="${dash}" />`;
                    else if (type === 'triangle') svgPath = `<polygon points="50,4 96,96 4,96" fill="${fill}" stroke="${stroke}" stroke-width="${sWidth}" stroke-dasharray="${dash}" />`;
                    else if (type === 'star') svgPath = `<polygon points="50,2 63,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 37,35" fill="${fill}" stroke="${stroke}" stroke-width="${sWidth}" stroke-dasharray="${dash}" />`;
                    else if (type === 'arrow') svgPath = `<polygon points="2,25 55,25 55,8 98,50 55,92 55,75 2,75" fill="${fill}" stroke="${stroke}" stroke-width="${sWidth}" stroke-dasharray="${dash}" />`;
                    else if (type === 'callout') svgPath = `<path d="M 4 4 H 96 A 4 4 0 0 1 100 8 V 65 A 4 4 0 0 1 96 69 H 35 L 15 96 V 69 H 4 A 4 4 0 0 1 0 65 V 8 A 4 4 0 0 1 4 4 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sWidth}" stroke-dasharray="${dash}" />`;
                    else svgPath = `<rect x="2" y="2" width="96" height="96" fill="${fill}" stroke="${stroke}" stroke-width="${sWidth}" stroke-dasharray="${dash}" />`;

                    // FIX VIEWBOX DÃN 100% CĂNG KHUNG
                    svgBox.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">${svgPath}</svg>`;

                    textDisplay.style.color = attrs.textColor;
                    textDisplay.style.fontSize = (attrs.fontSize || 16) + 'px';
                    textDisplay.innerText = attrs.text || '';
                };

                // THANH CÔNG CỤ NỔI ĐÃ FIX CHỌN MÀU & SỬA CHỮ 100%
                const toolbar = document.createElement('div');
                toolbar.className = 'tp-sbar';
                toolbar.innerHTML = `
                    <button type="button" class="tp-sbtn" data-act="text" title="Sửa nội dung chữ"><i class="fas fa-edit" style="color:#38bdf8;"></i> Sửa Chữ</button>
                    
                    <div class="tp-ssep"></div>

                    <div class="tp-sbtn" data-trigger="fill" title="Màu nền">
                        <i class="fas fa-fill-drip" style="color:#38bdf8;"></i> Nền
                        <span class="tp-scolor-dot" id="dot-fill" style="background:${node.attrs.fillColor}">
                            <input type="color" data-act="fill" value="${node.attrs.fillColor}">
                        </span>
                    </div>

                    <div class="tp-sbtn" data-trigger="stroke" title="Màu viền">
                        <i class="fas fa-border-style" style="color:#34d399;"></i> Viền
                        <span class="tp-scolor-dot" id="dot-stroke" style="background:${node.attrs.strokeColor}">
                            <input type="color" data-act="stroke" value="${node.attrs.strokeColor}">
                        </span>
                    </div>

                    <button type="button" class="tp-sbtn" data-act="dash" title="Đổi kiểu viền (Liền / Nét đứt)"><i class="fas fa-ellipsis-h"></i></button>

                    <div class="tp-ssep"></div>

                    <div class="tp-sbtn" data-trigger="tcolor" title="Màu chữ">
                        <i class="fas fa-font" style="color:#f59e0b;"></i> Chữ
                        <span class="tp-scolor-dot" id="dot-tcolor" style="background:${node.attrs.textColor}">
                            <input type="color" data-act="tcolor" value="${node.attrs.textColor}">
                        </span>
                    </div>

                    <button type="button" class="tp-sbtn" data-act="f-down" title="Giảm cỡ chữ"><i class="fas fa-minus"></i></button>
                    <button type="button" class="tp-sbtn" data-act="f-up" title="Tăng cỡ chữ"><i class="fas fa-plus"></i></button>

                    <div class="tp-ssep"></div>

                    <button type="button" class="tp-sbtn" data-align="float-left" title="Trôi trái"><i class="fas fa-indent"></i></button>
                    <button type="button" class="tp-sbtn" data-align="center" title="Căn giữa"><i class="fas fa-align-center"></i></button>
                    <button type="button" class="tp-sbtn" data-align="float-right" title="Trôi phải"><i class="fas fa-outdent"></i></button>

                    <div class="tp-ssep"></div>

                    <button type="button" class="tp-sbtn tp-sbtn-danger" data-act="del" title="Xóa Shape"><i class="fas fa-trash"></i></button>
                `;

                // CẢI TIẾN: SỬA CHỮ VÀ CÁC THAO TÁC NÚT BẤM
                toolbar.addEventListener('click', (e) => {
                    const btn = e.target.closest('[data-act], [data-align], [data-trigger]');
                    if (!btn) return;
                    
                    const pos = getPos();
                    if (typeof pos !== 'number') return;

                    const act = btn.getAttribute('data-act');
                    const align = btn.getAttribute('data-align');
                    const trigger = btn.getAttribute('data-trigger');

                    // KÍCH HOẠT MỞ BẢNG CHỌN MÀU KHI BẤM NÚT
                    if (trigger) {
                        const input = toolbar.querySelector(`input[data-act="${trigger}"]`);
                        if (input) input.click();
                        return;
                    }

                    if (act === 'del') {
                        editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run();
                        return;
                    }

                    if (act === 'text') {
                        const currentText = node.attrs.text || '';
                        const newText = prompt("Nhập nội dung chữ hiển thị trong Shape:", currentText);
                        if (newText !== null) {
                            editor.chain().focus().command(({ tr }) => {
                                tr.setNodeMarkup(pos, undefined, { ...node.attrs, text: newText });
                                return true;
                            }).run();
                        }
                        return;
                    }

                    let newAttrs = { ...node.attrs };

                    if (act === 'dash') {
                        newAttrs.strokeStyle = node.attrs.strokeStyle === 'solid' ? 'dashed' : (node.attrs.strokeStyle === 'dashed' ? 'dotted' : 'solid');
                    } else if (act === 'f-up') {
                        newAttrs.fontSize = (parseInt(node.attrs.fontSize || 16) + 2).toString();
                    } else if (act === 'f-down') {
                        newAttrs.fontSize = Math.max(10, parseInt(node.attrs.fontSize || 16) - 2).toString();
                    } else if (align) {
                        newAttrs.alignment = align;
                    }

                    editor.chain().focus().command(({ tr }) => {
                        tr.setNodeMarkup(pos, undefined, newAttrs);
                        return true;
                    }).run();
                });

                // CẢI TIẾN: LẮNG NGHE SỰ KIỆN ĐỔI MÀU THỜI GIAN THỰC (LIVE)
                toolbar.querySelectorAll('input[type="color"]').forEach(input => {
                    const updateColor = (e) => {
                        const pos = getPos();
                        if (typeof pos !== 'number') return;

                        const act = input.getAttribute('data-act');
                        let newAttrs = { ...node.attrs };
                        if (act === 'fill') newAttrs.fillColor = input.value;
                        if (act === 'stroke') newAttrs.strokeColor = input.value;
                        if (act === 'tcolor') newAttrs.textColor = input.value;

                        editor.chain().focus().command(({ tr }) => {
                            tr.setNodeMarkup(pos, undefined, newAttrs);
                            return true;
                        }).run();
                    };

                    input.addEventListener('input', updateColor);
                    input.addEventListener('change', updateColor);
                });

                // NÚT TRÒN KÉO CO GIÃN SHAPE (RESIZER)
                const resizer = document.createElement('div');
                resizer.className = 'tp-sresize-handle';

                let startX, startY, startW, startH;
                resizer.addEventListener('mousedown', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    startX = e.clientX; startY = e.clientY;
                    startW = wrapper.offsetWidth; startH = wrapper.offsetHeight;

                    const onMouseMove = (moveEvt) => {
                        const diffX = moveEvt.clientX - startX;
                        const diffY = moveEvt.clientY - startY;
                        wrapper.style.width = Math.max(80, startW + diffX) + 'px';
                        wrapper.style.height = Math.max(50, startH + diffY) + 'px';
                    };

                    const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        const pos = getPos();
                        if (typeof pos === 'number') {
                            editor.chain().focus().command(({ tr }) => {
                                tr.setNodeMarkup(pos, undefined, {
                                    ...node.attrs,
                                    width: wrapper.style.width,
                                    height: wrapper.style.height
                                });
                                return true;
                            }).run();
                        }
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });

                wrapper.appendChild(svgBox);
                wrapper.appendChild(textDisplay);
                wrapper.appendChild(toolbar);
                wrapper.appendChild(resizer);

                updateShape();

                return {
                    dom: wrapper,
                    update: (updatedNode) => {
                        if (updatedNode.type !== node.type) return false;
                        node = updatedNode;
                        updateShape();
                        return true;
                    }
                };
            };
        }
    });
    // EXTENSION ẢNH CO GIÃN, ĐỐI CĂN & TỰ ĐỘNG BẬT LINK PHÓNG TO (ZOOM)
        const ResizableImage = Image.extend({
            addAttributes() {
                return {
                    ...this.parent?.(),
                    width: {
                        default: '100%',
                        parseHTML: el => el.style.width || el.getAttribute('width') || '100%',
                        renderHTML: attrs => ({ style: `width: ${attrs.width}; max-width: 100%;` })
                    },
                    alignment: {
                        default: 'center',
                        parseHTML: el => el.getAttribute('data-alignment') || 'center',
                        renderHTML: attrs => {
                            let alignStyle = 'display: block; margin: 15px auto;';
                            if (attrs.alignment === 'left') alignStyle = 'display: block; margin: 15px auto 15px 0; float: none;';
                            else if (attrs.alignment === 'right') alignStyle = 'display: block; margin: 15px 0 15px auto; float: none;';
                            else if (attrs.alignment === 'float-left') alignStyle = 'float: left; margin: 5px 20px 15px 0;';
                            else if (attrs.alignment === 'float-right') alignStyle = 'float: right; margin: 5px 0 15px 20px;';
                            
                            return {
                                'data-alignment': attrs.alignment,
                                style: `width: ${attrs.width}; max-width: 100%; ${alignStyle}`
                            };
                        }
                    },
                    // THUỘC TÍNH LƯU TRỮ LINK PHÓNG TO CỦA ẢNH
                    href: {
                        default: null,
                        parseHTML: el => {
                            const parentAnchor = el.closest('a');
                            return parentAnchor ? parentAnchor.getAttribute('href') : el.getAttribute('data-href');
                        },
                        renderHTML: attrs => attrs.href ? { 'data-href': attrs.href } : {}
                    }
                };
            },
            renderHTML({ HTMLAttributes }) {
                // Lấy link phóng to từ 'data-href' do Tiptap đã chuyển đổi
                const linkUrl = HTMLAttributes['data-href'];
                
                // Tạo bản sao các thuộc tính và xóa data-href đi để thẻ <img> hiển thị sạch sẽ
                let imgAttrs = { ...HTMLAttributes };
                delete imgAttrs['data-href'];
    
                // Nếu có tick Zoom (có linkUrl) -> Bọc thẻ <a> ra ngoài thẻ <img>
                if (linkUrl) {
                    return ['a', { 
                        href: linkUrl, 
                        target: '_blank', 
                        rel: 'noopener noreferrer', 
                        class: 'vts-img-zoom-link', 
                        title: 'Bấm vào để xem ảnh phóng to' 
                    }, ['img', imgAttrs]];
                }
                
                // Nếu không tick Zoom -> Chỉ xuất thẻ <img> bình thường
                return ['img', imgAttrs];
            },
    addNodeView() {
                return ({ node, getPos, editor }) => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'tp-image-node-view';
                    
                    const align = node.attrs.alignment || 'center';
                    const width = node.attrs.width || '100%';
    
                    wrapper.setAttribute('data-alignment', align);
                    wrapper.style.width = width;
                    
                    const applyStyle = (a) => {
                        wrapper.style.float = 'none';
                        wrapper.style.display = 'inline-block';
                        wrapper.style.margin = '0';
                        if (a === 'center') wrapper.style.cssText += 'display: block; margin: 15px auto; float: none;';
                        else if (a === 'left') wrapper.style.cssText += 'display: block; margin: 15px auto 15px 0; float: none;';
                        else if (a === 'right') wrapper.style.cssText += 'display: block; margin: 15px 0 15px auto; float: none;';
                        else if (a === 'float-left') wrapper.style.cssText += 'float: left; margin: 5px 20px 15px 0;';
                        else if (a === 'float-right') wrapper.style.cssText += 'float: right; margin: 5px 0 15px 20px;';
                    };
                    applyStyle(align);
    
                    const img = document.createElement('img');
                    img.src = node.attrs.src;
                    img.alt = node.attrs.alt || '';
                    img.className = 'tp-resizable-img';
    
                    // KHUNG CÔNG CỤ NỔI
                    const toolbar = document.createElement('div');
                    toolbar.className = 'tp-img-toolbar';
                    
                    // 🌟 HÀM CẬP NHẬT TRẠNG THÁI GIAO DIỆN NÚT BẤM (FIX LỖI KHÔNG ĐỔI TRẠNG THÁI)
                    const renderToolbarContent = (currentHref) => {
                        const isZoomActive = !!currentHref;
                        toolbar.innerHTML = `
                            <button type="button" class="tp-img-btn ${isZoomActive ? 'is-active-zoom' : ''}" data-action="toggle-zoom" title="Bật/Tắt bấm vào ảnh để phóng to ở tab mới">
                                <i class="${isZoomActive ? 'fas fa-check-square' : 'far fa-square'}" style="color: ${isZoomActive ? '#10b981' : '#cbd5e1'}; pointer-events: none; margin-right: 4px;"></i>
                                <span style="color: ${isZoomActive ? '#10b981' : 'inherit'}; font-weight: ${isZoomActive ? 'bold' : 'normal'}; pointer-events: none;">Bấm Phóng To</span>
                            </button>
                            <span class="tp-img-sep">|</span>
                            <button type="button" class="tp-img-btn" data-align="float-left" title="Chữ bao quanh bên phải"><i class="fas fa-indent" style="pointer-events: none;"></i> Trôi Trái</button>
                            <button type="button" class="tp-img-btn" data-align="center" title="Căn giữa"><i class="fas fa-align-center" style="pointer-events: none;"></i> Giữa</button>
                            <button type="button" class="tp-img-btn" data-align="float-right" title="Chữ bao quanh bên trái"><i class="fas fa-outdent" style="pointer-events: none;"></i> Trôi Phải</button>
                            <span class="tp-img-sep">|</span>
                            <button type="button" class="tp-img-btn" data-size="25%">25%</button>
                            <button type="button" class="tp-img-btn" data-size="50%">50%</button>
                            <button type="button" class="tp-img-btn" data-size="75%">75%</button>
                            <button type="button" class="tp-img-btn" data-size="100%">100%</button>
                            <span class="tp-img-sep">|</span>
                            <button type="button" class="tp-img-btn tp-img-del" title="Xóa ảnh"><i class="fas fa-trash" style="pointer-events: none;"></i></button>
                        `;
                    };
    
                    // Vẽ giao diện ban đầu
                    renderToolbarContent(node.attrs.href);
                    if (node.attrs.href) img.style.cursor = 'pointer';
    
                    // BẮT SỰ KIỆN CLICK NÚT BẤM (ĐÃ ĐƯỢC TỐI ƯU SỰ KIỆN)
                    toolbar.addEventListener('click', (e) => {
                        const btn = e.target.closest('.tp-img-btn');
                        if (!btn) return;
                        e.preventDefault();
                        e.stopPropagation();
    
                        if (typeof getPos !== 'function') return;
                        const pos = getPos();
                        if (typeof pos !== 'number') return;
    
                        if (btn.classList.contains('tp-img-del')) {
                            editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run();
                            return;
                        }
    
                        const action = btn.getAttribute('data-action');
                        const newAlign = btn.getAttribute('data-align');
                        const newSize = btn.getAttribute('data-size');
    
                        let attrs = { ...node.attrs };
    
                        // Đảo ngược trạng thái Link Zoom
                        if (action === 'toggle-zoom') {
                            attrs.href = attrs.href ? null : (node.attrs.src || img.src);
                        }
                        if (newAlign) attrs.alignment = newAlign;
                        if (newSize) attrs.width = newSize;
    
                        // Thực thi cập nhật thuộc tính vào Tiptap Engine
                        editor.chain().focus().command(({ tr }) => {
                            tr.setNodeMarkup(pos, undefined, attrs);
                            return true;
                        }).run();
                    });
    
                    const resizer = document.createElement('div');
                    resizer.className = 'tp-img-resizer';
                    
                    let startX, startWidth;
                    resizer.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startX = e.clientX;
                        startWidth = wrapper.offsetWidth;
    
                        const onMouseMove = (moveEvt) => {
                            const currentX = moveEvt.clientX;
                            const diffX = currentX - startX;
                            const parentWidth = wrapper.parentElement ? wrapper.parentElement.offsetWidth : 800;
                            let newWidthPx = Math.max(100, Math.min(parentWidth, startWidth + diffX));
                            let newWidthPercent = Math.round((newWidthPx / parentWidth) * 100) + '%';
                            wrapper.style.width = newWidthPercent;
                        };
    
                        const onMouseUp = () => {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                            const finalWidth = wrapper.style.width;
                            if (typeof getPos === 'function') {
                                const pos = getPos();
                                if (typeof pos === 'number') {
                                    editor.chain().focus().command(({ tr }) => {
                                        tr.setNodeMarkup(pos, undefined, { ...node.attrs, width: finalWidth });
                                        return true;
                                    }).run();
                                }
                            }
                        };
    
                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                    });
    
                    wrapper.appendChild(img);
                    wrapper.appendChild(toolbar);
                    wrapper.appendChild(resizer);
    
                    return {
                        dom: wrapper,
                        update: (updatedNode) => {
                            if (updatedNode.type !== node.type) return false;
                            node = updatedNode;
    
                            img.src = node.attrs.src;
                            img.alt = node.attrs.alt || '';
    
                            const newAlign = node.attrs.alignment || 'center';
                            const newWidth = node.attrs.width || '100%';
                            const newHref = node.attrs.href;
    
                            img.style.cursor = newHref ? 'pointer' : 'default';
                            wrapper.style.width = newWidth;
                            wrapper.setAttribute('data-alignment', newAlign);
                            applyStyle(newAlign);
    
                            // 🌟 TỰ ĐỘNG CẬP NHẬT TÍCH XANH / Ô XÁM TỚI NÚT BẤM KHI TRẠNG THÁI THAY ĐỔI
                            renderToolbarContent(newHref);
    
                            return true;
                        }
                    };
                };
            }
        });
    
        window.TiptapModules = { 
            Editor, StarterKit, Image: ResizableImage, Link, Underline, TextAlign, TextStyle, 
            Color, FontFamily, Highlight, Youtube, Table, TableRow, TableHeader, 
            TableCell, TaskList, TaskItem, FontSize, CustomDiv, Subscript, Superscript, LineHeight, CustomShape
        };
