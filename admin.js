const API = "http://localhost:8080/identity/api";

// Biến lưu loại form đang mở (dùng để biết đang thêm hay sửa cái gì)
let currentFormType = "";
let currentEditId = null;

// ==========================================
// 0. XÁC THỰC VÀ HIỂN THỊ USER
// ==========================================
function kiemTraDangNhap() {
    const userStr = localStorage.getItem("adminUser");
    if (!userStr) {
        alert("Vui lòng đăng nhập bằng tài khoản Quản trị viên!");
        window.location.href = "dangnhap.html";
        return null;
    }
    const user = JSON.parse(userStr);
    if (user.vaiTro !== "ADMIN") {
        alert("Bạn không có quyền truy cập trang này!");
        window.location.href = "index.html";
        return null;
    }
    // Hiển thị tên
    document.getElementById("adminName").innerText = "👤 " + user.tenDangNhap;
    return user;
}

function dangXuat() {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        localStorage.removeItem("adminUser");
        window.location.href = "dangnhap.html";
    }
}

function toggleUserMenu() {
    document.getElementById("userDropdown").classList.toggle("show");
}

// Đóng dropdown khi click ra ngoài
window.onclick = function (event) {
    if (!event.target.closest('.admin-user')) {
        const dropdowns = document.getElementsByClassName("user-dropdown");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('show')) {
                dropdowns[i].classList.remove('show');
            }
        }
    }
}

// ==========================================
// 1. CHUYỂN TAB
// ==========================================
async function chuyenTab(tabName) {
    // Cập nhật active menu
    document.querySelectorAll(".menu-item").forEach(btn => btn.classList.remove("active"));
    const menus = document.querySelectorAll(".menu-item");
    menus.forEach(menu => {
        if (menu.getAttribute('onclick').includes(tabName)) {
            menu.classList.add("active");
        }
    });

    // Đổi tiêu đề header
    const titles = {
        dashboard: "Tổng quan hệ thống",
        sach: "Quản lý Sách",
        donhang: "Quản lý Đơn hàng",
        khachhang: "Quản lý Khách hàng",
        theloai: "Quản lý Thể loại",
        tacgia: "Quản lý Tác giả",
        nxb: "Quản lý Nhà xuất bản",
        khuyenmai: "Quản lý Khuyến mãi",
        danhgia: "Quản lý Đánh giá"
    };
    document.getElementById("pageTitle").innerText = titles[tabName] || "";

    // Tải file HTML fragment qua AJAX
    try {
        const response = await fetch(`admin-pages/${tabName}.html`);
        if (!response.ok) throw new Error("Không thể tải trang " + tabName);
        
        const html = await response.text();
        document.getElementById("main-content").innerHTML = html;
        
        // Hiện tab (sau khi load html xong thì tab-content mặc định ẩn, ta cần ép nó hiện lên)
        const tabContent = document.getElementById("tab-" + tabName);
        if (tabContent) {
            tabContent.classList.add("active");
        }

        // Tải dữ liệu cho tab tương ứng
        if (tabName === "dashboard") taiDashboard();
        if (tabName === "sach") taiDanhSachSach();
        if (tabName === "donhang") taiDanhSachDonHang();
        if (tabName === "khachhang") taiDanhSachKhachHang();
        if (tabName === "theloai") taiDanhSachTheLoai();
        if (tabName === "tacgia") taiDanhSachTacGia();
        if (tabName === "nxb") loadNxb();
        if (tabName === "khuyenmai") taiDanhSachKhuyenMai();
        if (tabName === "danhgia") taiDanhSachDanhGia();

    } catch (error) {
        console.error("Lỗi tải trang:", error);
        document.getElementById("main-content").innerHTML = `
            <div style="padding: 20px; color: red;">
                <h3>Lỗi kết nối!</h3>
                <p>Không thể tải file giao diện <b>admin-pages/${tabName}.html</b>.</p>
                <p>Vui lòng chạy web qua Live Server hoặc IDE để sử dụng được chức năng tải file nội bộ (AJAX).</p>
            </div>
        `;
    }
}

// ==========================================
// 2. DASHBOARD - TỔNG QUAN NÂNG CAO
// ==========================================
function taiDashboard() {
    let tongSach = 0;
    let danhSachSach = [];
    let tongKhachHang = 0;
    let danhSachDonHang = [];

    // Lấy danh sách sách
    const fetchSach = fetch(`${API}/sach`).then(res => res.json()).then(data => {
        danhSachSach = data;
        tongSach = data.length;
        document.getElementById("statTotalBooks").innerText = tongSach;

        // Tính sách sắp hết hàng (<= 5)
        const lowStock = data.filter(s => s.soLuongTon <= 5);
        document.getElementById("statLowStock").innerText = lowStock.length;

        // Render bảng sách sắp hết hàng
        const tbodyLowStock = document.getElementById("lowStockBooks");
        if (lowStock.length === 0) {
            tbodyLowStock.innerHTML = '<tr><td colspan="4">Không có sách nào sắp hết hàng.</td></tr>';
        } else {
            tbodyLowStock.innerHTML = lowStock.slice(0, 5).map(s => {
                let badgeClass = s.soLuongTon === 0 ? 'stock-danger' : 'stock-low';
                let statusText = s.soLuongTon === 0 ? 'Hết hàng' : 'Sắp hết';
                return `
                <tr>
                    <td>#${s.id}</td>
                    <td>${s.tenSach}</td>
                    <td class="stock-warning">${s.soLuongTon}</td>
                    <td><span class="${badgeClass}">${statusText}</span></td>
                </tr>
            `}).join("");
        }
    }).catch(() => { });

    // Lấy khách hàng
    const fetchKhachHang = fetch(`${API}/khachhang`).then(res => res.json()).then(data => {
        tongKhachHang = data.length;
        document.getElementById("statTotalCustomers").innerText = tongKhachHang;
    }).catch(() => { });

    // Lấy đơn hàng (để lấy danh sách đơn mới nhất)
    const fetchDonHang = fetch(`${API}/donhang`).then(res => res.json()).then(data => {
        danhSachDonHang = data;

        // Tính đơn chờ xử lý
        const pendingOrders = data.filter(d => !d.trangThai || d.trangThai === "CHO_XU_LY");
        document.getElementById("statPendingOrders").innerText = pendingOrders.length;

        // Render bảng đơn hàng mới nhất (lấy 5 đơn cuối mảng giả định là mới nhất)
        const tbodyRecentOrders = document.getElementById("recentOrders");
        if (data.length === 0) {
            tbodyRecentOrders.innerHTML = '<tr><td colspan="4">Chưa có đơn hàng nào.</td></tr>';
        } else {
            const recent = [...data].reverse().slice(0, 5); // Đảo ngược để lấy mới nhất
            tbodyRecentOrders.innerHTML = recent.map(d => {
                let statusClass = "status-cho";
                let statusText = "Chờ xử lý";
                if (d.trangThai === "DA_GIAO") { statusClass = "status-dagiao"; statusText = "Đã giao"; }
                if (d.trangThai === "DA_HUY") { statusClass = "status-huy"; statusText = "Đã hủy"; }

                return `
                <tr>
                    <td>#${d.id}</td>
                    <td>${d.ngayDat || 'Vừa xong'}</td>
                    <td style="font-weight:600; color:#e74c3c">${new Intl.NumberFormat('vi-VN').format(d.tongTien || 0)} đ</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                </tr>
            `}).join("");
        }
    }).catch(() => { });

    // Lấy thống kê API backend
    const fetchThongKe = fetch(`${API}/thongke/tong-quan`).then(res => res.json()).then(data => {
        document.getElementById("statTotalOrders").innerText = data.tongDonHangThanhCong || 0;
        document.getElementById("statRevenue").innerText = new Intl.NumberFormat('vi-VN').format(data.tongDoanhThu || 0) + " đ";
    }).catch(() => { });

    // Chờ các request hoàn thành thì render biểu đồ ảo
    Promise.all([fetchSach, fetchKhachHang, fetchDonHang, fetchThongKe]).then(() => {
        renderRevenueChart(danhSachDonHang);
    });
}

function renderRevenueChart(orders) {
    const chartContainer = document.getElementById("revenueChart");
    if (!chartContainer) return;
    
    let chartHTML = '';
    const daysLabel = [];
    const revenueData = [];
    
    // Tạo danh sách 7 ngày qua (định dạng YYYY-MM-DD)
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        
        // Format YYYY-MM-DD
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        
        // Tên thứ
        const dayOfWeek = d.getDay();
        const thuStr = dayOfWeek === 0 ? 'CN' : 'T' + (dayOfWeek + 1);
        
        daysLabel.push(thuStr);
        
        // Tính tổng doanh thu trong ngày (chỉ tính đơn ĐÃ GIAO hoặc không bị Hủy)
        let total = 0;
        if (orders && orders.length > 0) {
            orders.forEach(o => {
                // Kiểm tra xem đơn hàng có thuộc ngày này không
                // So sánh theo ngày (bỏ qua giờ phút)
                const orderDate = o.ngayDat ? o.ngayDat.substring(0, 10) : "";
                if (orderDate === dateStr && o.trangThai !== "DA_HUY") {
                    total += (o.tongTien || 0);
                }
            });
        }
        revenueData.push(total);
    }
    
    // Tìm giá trị max để tính % chiều cao cột
    let maxVal = Math.max(...revenueData);
    if (maxVal === 0) maxVal = 10000; // Tránh chia cho 0 nếu chưa có doanh thu

    // Vẽ biểu đồ
    for (let i = 0; i < 7; i++) {
        const val = revenueData[i];
        let height = (val / maxVal) * 100;
        if (height < 5) height = 5; // Cột tối thiểu 5% để nhìn thấy được
        if (height > 100) height = 100;
        
        const displayVal = new Intl.NumberFormat('vi-VN').format(val);
        const shortVal = val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val;
        
        chartHTML += `
            <div class="chart-bar-wrapper">
                <div class="chart-bar-value" style="opacity:0; transition: 0.3s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">${shortVal}</div>
                <div class="chart-bar" style="height: ${height}%" title="${displayVal} đ"></div>
                <div class="chart-bar-label">${daysLabel[i]}</div>
            </div>
        `;
    }

    chartContainer.innerHTML = chartHTML;
}


// ==========================================
// 3. QUẢN LÝ SÁCH
// ==========================================
let listSachAdmin = [];
let sachCurrentPage = 1;
const itemsPerPage = 10;

function taiDanhSachSach() {
    fetch(`${API}/sach`)
        .then(res => res.json())
        .then(data => {
            listSachAdmin = data;
            sachCurrentPage = 1;
            const searchInput = document.getElementById("searchSach");
            if(searchInput) searchInput.value = "";
            locSach();
        })
        .catch(err => console.error("Lỗi tải sách:", err));
}

function locSach() {
    const keyword = document.getElementById("searchSach") ? document.getElementById("searchSach").value.toLowerCase() : "";
    const filtered = listSachAdmin.filter(s => {
        const ten = (s.tenSach || "").toLowerCase();
        return ten.includes(keyword);
    });
    hienThiDanhSachSach(filtered);
}

function hienThiDanhSachSach(danhSach) {
    const tbody = document.getElementById("tableSach");
    const pagination = document.getElementById("paginationSach");
    
    if (!tbody) return;
    
    if (danhSach.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">Không tìm thấy sách nào.</td></tr>';
        if(pagination) pagination.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(danhSach.length / itemsPerPage);
    if (sachCurrentPage > totalPages) sachCurrentPage = totalPages;
    if (sachCurrentPage < 1) sachCurrentPage = 1;

    const start = (sachCurrentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentList = danhSach.slice(start, end);

    tbody.innerHTML = currentList.map(s => `
        <tr>
            <td>${s.id}</td>
            <td><strong>${s.tenSach}</strong></td>
            <td>${new Intl.NumberFormat('vi-VN').format(s.giaBan)} đ</td>
            <td>${s.soLuongTon || 0}</td>
            <td>${s.namXuatBan || '-'}</td>
            <td>
                <button class="btn-edit" onclick="suaSach(${s.id})">Sửa</button>
                <button class="btn-delete" onclick="xoaSach(${s.id})">Xóa</button>
            </td>
        </tr>
    `).join("");

    if(pagination) {
        let pageHTML = '';
        if (totalPages > 1) {
            pageHTML += `<button class="page-btn" ${sachCurrentPage === 1 ? 'disabled' : ''} onclick="chuyenTrangSach(${sachCurrentPage - 1})">« Trước</button>`;
            pageHTML += `<span style="margin: 0 10px;">Trang ${sachCurrentPage} / ${totalPages}</span>`;
            pageHTML += `<button class="page-btn" ${sachCurrentPage === totalPages ? 'disabled' : ''} onclick="chuyenTrangSach(${sachCurrentPage + 1})">Sau »</button>`;
        }
        pagination.innerHTML = pageHTML;
    }
}

function chuyenTrangSach(page) {
    sachCurrentPage = page;
    locSach();
}

function loadSelectOptions(selectedTheLoai = '', selectedTacGia = '', selectedNxb = '') {
    // Tải Thể loại
    fetch(`${API}/theloai`).then(r => r.json()).then(data => {
        const select = document.getElementById('fIdTheLoai');
        if (select) select.innerHTML = data.map(d => `<option value="${d.id}" ${d.id == selectedTheLoai ? 'selected' : ''}>${d.tenTheLoai}</option>`).join('');
    });
    // Tải Tác giả
    fetch(`${API}/tacgia`).then(r => r.json()).then(data => {
        const select = document.getElementById('fIdTacGia');
        if (select) select.innerHTML = data.map(d => `<option value="${d.id}" ${d.id == selectedTacGia ? 'selected' : ''}>${d.tenTacGia}</option>`).join('');
    });
    // Tải NXB
    fetch(`${API}/nhaxuatban`).then(r => r.json()).then(data => {
        const select = document.getElementById('fIdNxb');
        if (select) select.innerHTML = data.map(d => `<option value="${d.id}" ${d.id == selectedNxb ? 'selected' : ''}>${d.tenNxb}</option>`).join('');
    });
}

function uploadHinhAnh(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    document.getElementById("previewHinhAnh").innerHTML = "Đang tải ảnh lên...";

    fetch(`${API}/upload`, {
        method: "POST",
        body: formData
    })
        .then(async res => {
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || "Upload thất bại");
            }
            return res.text();
        })
        .then(url => {
            document.getElementById("fHinhAnh").value = url;
            document.getElementById("previewHinhAnh").innerHTML = `<img src="${url}" style="height: 100px; border-radius: 8px; margin-top: 10px; object-fit: cover;">`;
        })
        .catch(err => {
            alert(err.message);
            document.getElementById("previewHinhAnh").innerHTML = "";
        });
}

function moFormThemSach() {
    currentFormType = "sach";
    currentEditId = null;
    document.getElementById("modalTitle").innerText = "Thêm sách mới";
    document.getElementById("modalBody").innerHTML = `
        <div class="modal-field"><label>Tên sách *</label><input id="fTenSach" required></div>
        <div class="modal-field"><label>Giá bán *</label><input id="fGiaBan" type="number" required></div>
        <div class="modal-field"><label>Số lượng tồn</label><input id="fSoLuongTon" type="number" value="0"></div>
        <div class="modal-field"><label>Năm xuất bản</label><input id="fNamXB" type="number"></div>
        <div class="modal-field"><label>Số trang</label><input id="fSoTrang" type="number"></div>
        <div class="modal-field">
            <label>Hình ảnh bìa</label>
            <input type="file" id="fHinhAnhFile" accept="image/*" onchange="uploadHinhAnh(event)">
            <input type="hidden" id="fHinhAnh">
            <div id="previewHinhAnh"></div>
        </div>
        <div class="modal-field"><label>Mô tả</label><textarea id="fMoTa" rows="3"></textarea></div>
        <div class="modal-field"><label>Thể loại *</label><select id="fIdTheLoai" required></select></div>
        <div class="modal-field"><label>Tác giả *</label><select id="fIdTacGia" required></select></div>
        <div class="modal-field"><label>Nhà xuất bản *</label><select id="fIdNxb" required></select></div>
    `;
    loadSelectOptions();
    moModal();
}

function suaSach(id) {
    fetch(`${API}/sach/${id}`)
        .then(res => res.json())
        .then(s => {
            currentFormType = "sach";
            currentEditId = id;
            document.getElementById("modalTitle").innerText = "Sửa sách #" + id;
            document.getElementById("modalBody").innerHTML = `
                <div class="modal-field"><label>Tên sách *</label><input id="fTenSach" value="${s.tenSach}" required></div>
                <div class="modal-field"><label>Giá bán *</label><input id="fGiaBan" type="number" value="${s.giaBan}" required></div>
                <div class="modal-field"><label>Số lượng tồn</label><input id="fSoLuongTon" type="number" value="${s.soLuongTon || 0}"></div>
                <div class="modal-field"><label>Năm xuất bản</label><input id="fNamXB" type="number" value="${s.namXuatBan || ''}"></div>
                <div class="modal-field"><label>Số trang</label><input id="fSoTrang" type="number" value="${s.soTrang || ''}"></div>
                <div class="modal-field">
                    <label>Hình ảnh bìa</label>
                    <input type="file" id="fHinhAnhFile" accept="image/*" onchange="uploadHinhAnh(event)">
                    <input type="hidden" id="fHinhAnh" value="${s.hinhAnh || ''}">
                    <div id="previewHinhAnh">
                        ${s.hinhAnh ? `<img src="${s.hinhAnh}" style="height: 100px; border-radius: 8px; margin-top: 10px; object-fit: cover;">` : ''}
                    </div>
                </div>
                <div class="modal-field"><label>Mô tả</label><textarea id="fMoTa" rows="3">${s.moTa || ''}</textarea></div>
                <div class="modal-field"><label>Thể loại *</label><select id="fIdTheLoai" required></select></div>
                <div class="modal-field"><label>Tác giả *</label><select id="fIdTacGia" required></select></div>
                <div class="modal-field"><label>Nhà xuất bản *</label><select id="fIdNxb" required></select></div>
            `;
            loadSelectOptions(s.idTheLoai, s.idTacGia, s.idNxb);
            moModal();
        });
}

function xoaSach(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa sách #" + id + " không?")) return;
    fetch(`${API}/sach/${id}`, { method: "DELETE" })
        .then(res => res.text())
        .then(msg => { alert(msg); taiDanhSachSach(); })
        .catch(err => alert("Lỗi: " + err));
}

// ==========================================
// 4. QUẢN LÝ ĐƠN HÀNG
// ==========================================
let globalKhachHang = {}; // Lưu cache khách hàng
let globalDonHang = [];   // Lưu cache đơn hàng để lọc
let globalSach = {};      // Lưu cache sách để hiển thị chi tiết

function taiDanhSachDonHang() {
    // Lấy khách hàng trước để map tên
    fetch(`${API}/khachhang`).then(r => r.json()).then(khs => {
        globalKhachHang = {};
        khs.forEach(k => globalKhachHang[k.id] = k);

        // Lấy sách
        fetch(`${API}/sach`).then(r => r.json()).then(sachList => {
            globalSach = {};
            sachList.forEach(s => globalSach[s.id] = s);

            // Cuối cùng lấy đơn hàng
            fetch(`${API}/donhang`)
                .then(res => res.json())
                .then(data => {
                    globalDonHang = data.reverse(); // Đảo ngược để đơn mới nhất lên đầu
                    hienThiDonHang(globalDonHang);
                })
                .catch(err => console.error("Lỗi tải đơn hàng:", err));
        });
    });
}

function hienThiDonHang(data) {
    const tbody = document.getElementById("tableDonHang");
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">Không có đơn hàng nào phù hợp.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(d => {
        let statusClass = "status-cho";
        let statusText = "Chờ xử lý";
        if (d.trangThai === "DA_XAC_NHAN") { statusClass = "status-daxacnhan"; statusText = "Đã xác nhận"; }
        if (d.trangThai === "DANG_GIAO") { statusClass = "status-danggiao"; statusText = "Đang giao"; }
        if (d.trangThai === "DA_GIAO") { statusClass = "status-dagiao"; statusText = "Đã giao"; }
        if (d.trangThai === "DA_HUY") { statusClass = "status-huy"; statusText = "Đã hủy"; }

        const kh = globalKhachHang[d.idKhachHang] || {};
        const tenKhachHang = kh.hoTen || `Khách ẩn danh #${d.idKhachHang}`;
        const sdt = kh.soDienThoai || '-';

        return `
            <tr>
                <td>#${d.id}</td>
                <td>${tenKhachHang}</td>
                <td>${sdt}</td>
                <td>${d.ngayDat || '-'}</td>
                <td style="font-weight:600; color:#e74c3c">${new Intl.NumberFormat('vi-VN').format(d.tongTien || 0)} đ</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-info" onclick="xemChiTietDonHang(${d.id})">Chi tiết</button>
                    <button class="btn-warning" onclick="moFormTrangThaiDonHang(${d.id}, '${d.trangThai || 'CHO_XU_LY'}')">Sửa TT</button>
                    <button class="btn-delete" onclick="xoaDonHang(${d.id})">Xóa</button>
                </td>
            </tr>
        `;
    }).join("");
}

function locDonHang() {
    const keyword = document.getElementById("searchOrder").value.toLowerCase();
    const status = document.getElementById("filterStatus").value;

    const filtered = globalDonHang.filter(d => {
        const kh = globalKhachHang[d.idKhachHang] || {};
        const tenKhachHang = (kh.hoTen || "").toLowerCase();
        const strId = d.id.toString();

        const matchKeyword = strId.includes(keyword) || tenKhachHang.includes(keyword);
        const matchStatus = status === "" || d.trangThai === status || (!d.trangThai && status === "CHO_XU_LY");

        return matchKeyword && matchStatus;
    });

    hienThiDonHang(filtered);
}

function xemChiTietDonHang(idDonHang) {
    const donHang = globalDonHang.find(d => d.id === idDonHang);
    if (!donHang) return;

    const kh = globalKhachHang[donHang.idKhachHang] || {};
    document.getElementById("modalDetailTitle").innerText = "Chi tiết đơn hàng #" + idDonHang;
    document.getElementById("dtTenKH").innerText = kh.hoTen || `Khách ẩn danh #${donHang.idKhachHang}`;
    document.getElementById("dtSdt").innerText = kh.soDienThoai || '-';
    document.getElementById("dtNgay").innerText = donHang.ngayDat || '-';

    let statusText = "Chờ xử lý";
    if (donHang.trangThai === "DA_XAC_NHAN") statusText = "Đã xác nhận";
    if (donHang.trangThai === "DANG_GIAO") statusText = "Đang giao";
    if (donHang.trangThai === "DA_GIAO") statusText = "Đã giao";
    if (donHang.trangThai === "DA_HUY") statusText = "Đã hủy";
    document.getElementById("dtTrangThai").innerText = statusText;
    document.getElementById("dtTongTien").innerText = new Intl.NumberFormat('vi-VN').format(donHang.tongTien || 0) + " đ";

    fetch(`${API}/chitietdonhang/donhang/${idDonHang}`)
        .then(res => res.json())
        .then(details => {
            const tbody = document.getElementById("dtItems");
            if (details.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">Không có sản phẩm nào.</td></tr>';
            } else {
                tbody.innerHTML = details.map(item => {
                    const sach = globalSach[item.idSach] || { tenSach: "Sách đã xóa (#" + item.idSach + ")" };
                    return `
                        <tr>
                            <td>${sach.tenSach}</td>
                            <td>${new Intl.NumberFormat('vi-VN').format(item.donGia || 0)} đ</td>
                            <td>${item.soLuong}</td>
                            <td>${new Intl.NumberFormat('vi-VN').format((item.donGia || 0) * item.soLuong)} đ</td>
                        </tr>
                    `;
                }).join("");
            }
            document.getElementById("modalOrderDetail").classList.add("show");
        });
}

function dongModalDetail() {
    document.getElementById("modalOrderDetail").classList.remove("show");
}

function moFormTrangThaiDonHang(id, currentStatus) {
    document.getElementById("editOrderId").value = id;
    document.getElementById("fTrangThai").value = currentStatus;
    document.getElementById("modalOrderStatus").classList.add("show");
}

function dongModalStatus() {
    document.getElementById("modalOrderStatus").classList.remove("show");
}

function luuTrangThaiDonHang(event) {
    event.preventDefault();
    const id = document.getElementById("editOrderId").value;
    const trangThai = document.getElementById("fTrangThai").value;

    fetch(`${API}/donhang/${id}/trangthai?trangThai=${trangThai}`, {
        method: "PUT"
    })
        .then(async res => {
            if (!res.ok) {
                const err = await res.text();
                throw new Error(err);
            }
            return res.text();
        })
        .then(msg => {
            alert("Cập nhật trạng thái thành công!");
            dongModalStatus();
            taiDanhSachDonHang(); // Tải lại bảng và refresh dashboard
            taiDashboard();
        })
        .catch(err => alert("Lỗi: " + err.message));
}

function xoaDonHang(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa đơn hàng #" + id + " không? Hành động này không thể hoàn tác!")) return;
    fetch(`${API}/donhang/${id}`, { method: "DELETE" })
        .then(async res => {
            if (!res.ok) throw new Error(await res.text());
            return res.text();
        })
        .then(msg => { alert(msg); taiDanhSachDonHang(); taiDashboard(); })
        .catch(err => alert("Lỗi: " + err.message));
}

// ==========================================
// 5. QUẢN LÝ KHÁCH HÀNG
// ==========================================
let globalCustomers = [];
let khCurrentPage = 1;
const khItemsPerPage = 10;

function taiDanhSachKhachHang() {
    fetch(`${API}/khachhang`)
        .then(res => res.json())
        .then(data => {
            globalCustomers = data;
            khCurrentPage = 1; // Reset về trang 1
            document.getElementById("searchKhachHang").value = ""; // Xóa bộ lọc
            locKhachHang();
        })
        .catch(err => console.error("Lỗi:", err));
}

function locKhachHang() {
    const keyword = document.getElementById("searchKhachHang").value.toLowerCase();
    
    const filtered = globalCustomers.filter(k => {
        const hoTen = (k.hoTen || "").toLowerCase();
        const email = (k.email || "").toLowerCase();
        const sdt = (k.soDienThoai || "").toLowerCase();
        return hoTen.includes(keyword) || email.includes(keyword) || sdt.includes(keyword);
    });

    hienThiDanhSachKhachHang(filtered);
}

function hienThiDanhSachKhachHang(danhSach) {
    const tbody = document.getElementById("tableKhachHang");
    const pagination = document.getElementById("paginationKhachHang");
    
    if (danhSach.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">Không tìm thấy khách hàng nào.</td></tr>';
        pagination.innerHTML = '';
        return;
    }

    // Tính toán phân trang
    const totalPages = Math.ceil(danhSach.length / khItemsPerPage);
    if (khCurrentPage > totalPages) khCurrentPage = totalPages;
    if (khCurrentPage < 1) khCurrentPage = 1;

    const start = (khCurrentPage - 1) * khItemsPerPage;
    const end = start + khItemsPerPage;
    const currentList = danhSach.slice(start, end);

    // Render bảng
    tbody.innerHTML = currentList.map(k => `
        <tr>
            <td>${k.id}</td>
            <td><strong>${k.hoTen || '-'}</strong></td>
            <td>${k.email || '-'}</td>
            <td>${k.soDienThoai || '-'}</td>
            <td>${k.ngayDangKy || '-'}</td>
            <td>
                <button class="btn-info" onclick="xemChiTietKhachHang(${k.id})">Chi tiết</button>
                <button class="btn-edit" onclick="moFormSuaKhachHang(${k.id})">Sửa</button>
                <button class="btn-delete" onclick="xoaKhachHang(${k.id})">Xóa</button>
            </td>
        </tr>
    `).join("");

    // Render nút phân trang
    let pageHTML = '';
    if (totalPages > 1) {
        pageHTML += `<button class="page-btn" ${khCurrentPage === 1 ? 'disabled' : ''} onclick="chuyenTrangKhachHang(${khCurrentPage - 1})">« Trước</button>`;
        pageHTML += `<span style="margin: 0 10px;">Trang ${khCurrentPage} / ${totalPages}</span>`;
        pageHTML += `<button class="page-btn" ${khCurrentPage === totalPages ? 'disabled' : ''} onclick="chuyenTrangKhachHang(${khCurrentPage + 1})">Sau »</button>`;
    }
    pagination.innerHTML = pageHTML;
}

function chuyenTrangKhachHang(page) {
    khCurrentPage = page;
    locKhachHang();
}

function xemChiTietKhachHang(id) {
    const kh = globalCustomers.find(k => k.id === id);
    if (!kh) return;
    
    document.getElementById("dtCustId").innerText = kh.id;
    document.getElementById("dtCustAccId").innerText = kh.idTaiKhoan || 'Không có';
    document.getElementById("dtCustName").innerText = kh.hoTen || '-';
    document.getElementById("dtCustEmail").innerText = kh.email || '-';
    document.getElementById("dtCustPhone").innerText = kh.soDienThoai || '-';
    document.getElementById("dtCustDob").innerText = kh.ngaySinh || '-';
    document.getElementById("dtCustGender").innerText = kh.gioiTinh || '-';
    document.getElementById("dtCustRegDate").innerText = kh.ngayDangKy || '-';

    document.getElementById("modalCustomerDetail").classList.add("show");
}

function dongModalCustomerDetail() {
    document.getElementById("modalCustomerDetail").classList.remove("show");
}

function moFormSuaKhachHang(id) {
    const kh = globalCustomers.find(k => k.id === id);
    if (!kh) return;

    document.getElementById("editCustId").value = kh.id;
    document.getElementById("editCustAccId").value = kh.idTaiKhoan || '';
    document.getElementById("editCustRegDate").value = kh.ngayDangKy || '';
    document.getElementById("editCustName").value = kh.hoTen || '';
    document.getElementById("editCustEmail").value = kh.email || '';
    document.getElementById("editCustPhone").value = kh.soDienThoai || '';
    document.getElementById("editCustDob").value = kh.ngaySinh || '';
    document.getElementById("editCustGender").value = kh.gioiTinh || '';

    document.getElementById("modalCustomerEdit").classList.add("show");
}

function dongModalCustomerEdit() {
    document.getElementById("modalCustomerEdit").classList.remove("show");
}

function luuKhachHang(event) {
    event.preventDefault();
    const id = document.getElementById("editCustId").value;
    
    const body = {
        idTaiKhoan: document.getElementById("editCustAccId").value ? parseInt(document.getElementById("editCustAccId").value) : null,
        hoTen: document.getElementById("editCustName").value,
        email: document.getElementById("editCustEmail").value,
        soDienThoai: document.getElementById("editCustPhone").value,
        ngaySinh: document.getElementById("editCustDob").value || null,
        gioiTinh: document.getElementById("editCustGender").value || null,
        ngayDangKy: document.getElementById("editCustRegDate").value || null
    };

    fetch(`${API}/khachhang/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(async res => {
        if (!res.ok) throw new Error(await res.text());
        return res.text();
    })
    .then(msg => {
        alert("Cập nhật thông tin khách hàng thành công!");
        dongModalCustomerEdit();
        taiDanhSachKhachHang();
    })
    .catch(err => alert("Lỗi: " + err.message));
}

function xoaKhachHang(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa khách hàng này không? Dữ liệu bị xóa sẽ không thể khôi phục!")) return;
    
    fetch(`${API}/khachhang/${id}`, { method: "DELETE" })
        .then(async res => {
            if (!res.ok) {
                const text = await res.text();
                // Bắt các lỗi Foreign Key thân thiện
                if (text.includes("constraint") || text.includes("foreign key")) {
                    throw new Error("Không thể xóa khách hàng này vì họ đã phát sinh Đơn hàng hoặc Đánh giá trong hệ thống.");
                }
                throw new Error(text);
            }
            return res.text();
        })
        .then(msg => { 
            alert("Xóa khách hàng thành công!"); 
            taiDanhSachKhachHang(); 
        })
        .catch(err => alert("Lỗi: " + err.message));
}

// ==========================================
// 6. QUẢN LÝ THỂ LOẠI
// ==========================================
let globalTheLoai = [];
let theLoaiCurrentPage = 1;

function taiDanhSachTheLoai() {
    fetch(`${API}/theloai`)
        .then(res => res.json())
        .then(data => {
            globalTheLoai = data;
            theLoaiCurrentPage = 1;
            const searchInput = document.getElementById("searchTheLoai");
            if(searchInput) searchInput.value = "";
            locTheLoai();
        })
        .catch(err => console.error("Lỗi:", err));
}

function locTheLoai() {
    const keyword = document.getElementById("searchTheLoai") ? document.getElementById("searchTheLoai").value.toLowerCase() : "";
    const filtered = globalTheLoai.filter(t => {
        const ten = (t.tenTheLoai || "").toLowerCase();
        return ten.includes(keyword);
    });
    hienThiDanhSachTheLoai(filtered);
}

function hienThiDanhSachTheLoai(danhSach) {
    const tbody = document.getElementById("tableTheLoai");
    const pagination = document.getElementById("paginationTheLoai");
    if (!tbody) return;

    if (danhSach.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Không tìm thấy thể loại nào.</td></tr>';
        if(pagination) pagination.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(danhSach.length / itemsPerPage);
    if (theLoaiCurrentPage > totalPages) theLoaiCurrentPage = totalPages;
    if (theLoaiCurrentPage < 1) theLoaiCurrentPage = 1;

    const start = (theLoaiCurrentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentList = danhSach.slice(start, end);

    tbody.innerHTML = currentList.map(t => `
        <tr>
            <td>${t.id}</td>
            <td><strong>${t.tenTheLoai}</strong></td>
            <td>
                <button class="btn-edit" onclick="suaTheLoai(${t.id})">Sửa</button>
                <button class="btn-delete" onclick="xoaTheLoai(${t.id})">Xóa</button>
            </td>
        </tr>
    `).join("");

    if(pagination) {
        let pageHTML = '';
        if (totalPages > 1) {
            pageHTML += `<button class="page-btn" ${theLoaiCurrentPage === 1 ? 'disabled' : ''} onclick="chuyenTrangTheLoai(${theLoaiCurrentPage - 1})">« Trước</button>`;
            pageHTML += `<span style="margin: 0 10px;">Trang ${theLoaiCurrentPage} / ${totalPages}</span>`;
            pageHTML += `<button class="page-btn" ${theLoaiCurrentPage === totalPages ? 'disabled' : ''} onclick="chuyenTrangTheLoai(${theLoaiCurrentPage + 1})">Sau »</button>`;
        }
        pagination.innerHTML = pageHTML;
    }
}

function chuyenTrangTheLoai(page) {
    theLoaiCurrentPage = page;
    locTheLoai();
}

function moFormThemTheLoai() {
    currentFormType = "theloai";
    currentEditId = null;
    document.getElementById("modalTitle").innerText = "Thêm thể loại mới";
    document.getElementById("modalBody").innerHTML = `
        <div class="modal-field"><label>Tên thể loại *</label><input id="fTenTheLoai" required></div>
    `;
    moModal();
}

function suaTheLoai(id) {
    const t = globalTheLoai.find(x => x.id === id);
    if (!t) return;
    currentFormType = "theloai";
    currentEditId = id;
    document.getElementById("modalTitle").innerText = "Sửa thể loại #" + id;
    document.getElementById("modalBody").innerHTML = `
        <div class="modal-field"><label>Tên thể loại *</label><input id="fTenTheLoai" value="${t.tenTheLoai}" required></div>
    `;
    moModal();
}

function xoaTheLoai(id) {
    if (!confirm("Xóa thể loại #" + id + "?")) return;
    fetch(`${API}/theloai/${id}`, { method: "DELETE" })
        .then(async res => {
            if (!res.ok) {
                const text = await res.text();
                if (text.includes("constraint") || text.includes("foreign key")) throw new Error("Không thể xóa vì đã có Sách thuộc thể loại này.");
                throw new Error(text);
            }
            return res.text();
        })
        .then(msg => { alert("Xóa thành công!"); taiDanhSachTheLoai(); })
        .catch(err => alert("Lỗi: " + err.message));
}

// ==========================================
// 7. QUẢN LÝ TÁC GIẢ
// ==========================================
let globalTacGia = [];
let tacGiaCurrentPage = 1;

function taiDanhSachTacGia() {
    fetch(`${API}/tacgia`)
        .then(res => res.json())
        .then(data => {
            globalTacGia = data;
            tacGiaCurrentPage = 1;
            const searchInput = document.getElementById("searchTacGia");
            if(searchInput) searchInput.value = "";
            locTacGia();
        })
        .catch(err => console.error("Lỗi:", err));
}

function locTacGia() {
    const keyword = document.getElementById("searchTacGia") ? document.getElementById("searchTacGia").value.toLowerCase() : "";
    const filtered = globalTacGia.filter(t => {
        const ten = (t.tenTacGia || "").toLowerCase();
        return ten.includes(keyword);
    });
    hienThiDanhSachTacGia(filtered);
}

function hienThiDanhSachTacGia(danhSach) {
    const tbody = document.getElementById("tableTacGia");
    const pagination = document.getElementById("paginationTacGia");
    if (!tbody) return;

    if (danhSach.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Không tìm thấy tác giả nào.</td></tr>';
        if(pagination) pagination.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(danhSach.length / itemsPerPage);
    if (tacGiaCurrentPage > totalPages) tacGiaCurrentPage = totalPages;
    if (tacGiaCurrentPage < 1) tacGiaCurrentPage = 1;

    const start = (tacGiaCurrentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentList = danhSach.slice(start, end);

    tbody.innerHTML = currentList.map(t => `
        <tr>
            <td>${t.id}</td>
            <td><strong>${t.tenTacGia}</strong></td>
            <td>
                <button class="btn-edit" onclick="suaTacGia(${t.id})">Sửa</button>
                <button class="btn-delete" onclick="xoaTacGia(${t.id})">Xóa</button>
            </td>
        </tr>
    `).join("");

    if(pagination) {
        let pageHTML = '';
        if (totalPages > 1) {
            pageHTML += `<button class="page-btn" ${tacGiaCurrentPage === 1 ? 'disabled' : ''} onclick="chuyenTrangTacGia(${tacGiaCurrentPage - 1})">« Trước</button>`;
            pageHTML += `<span style="margin: 0 10px;">Trang ${tacGiaCurrentPage} / ${totalPages}</span>`;
            pageHTML += `<button class="page-btn" ${tacGiaCurrentPage === totalPages ? 'disabled' : ''} onclick="chuyenTrangTacGia(${tacGiaCurrentPage + 1})">Sau »</button>`;
        }
        pagination.innerHTML = pageHTML;
    }
}

function chuyenTrangTacGia(page) {
    tacGiaCurrentPage = page;
    locTacGia();
}

function moFormThemTacGia() {
    currentFormType = "tacgia";
    currentEditId = null;
    document.getElementById("modalTitle").innerText = "Thêm tác giả mới";
    document.getElementById("modalBody").innerHTML = `
        <div class="modal-field"><label>Tên tác giả *</label><input id="fTenTacGia" required></div>
    `;
    moModal();
}

function suaTacGia(id) {
    const t = globalTacGia.find(x => x.id === id);
    if (!t) return;
    currentFormType = "tacgia";
    currentEditId = id;
    document.getElementById("modalTitle").innerText = "Sửa tác giả #" + id;
    document.getElementById("modalBody").innerHTML = `
        <div class="modal-field"><label>Tên tác giả *</label><input id="fTenTacGia" value="${t.tenTacGia}" required></div>
    `;
    moModal();
}

function xoaTacGia(id) {
    if (!confirm("Xóa tác giả #" + id + "?")) return;
    fetch(`${API}/tacgia/${id}`, { method: "DELETE" })
        .then(async res => {
            if (!res.ok) {
                const text = await res.text();
                if (text.includes("constraint") || text.includes("foreign key")) throw new Error("Không thể xóa vì đã có Sách của tác giả này.");
                throw new Error(text);
            }
            return res.text();
        })
        .then(msg => { alert("Xóa thành công!"); taiDanhSachTacGia(); })
        .catch(err => alert("Lỗi: " + err.message));
}

// ==========================================
// 8. MODAL - MỞ / ĐÓNG / SUBMIT
// ==========================================
function moModal() {
    document.getElementById("modalOverlay").classList.add("show");
}

function dongModal() {
    document.getElementById("modalOverlay").classList.remove("show");
    currentFormType = "";
    currentEditId = null;
}

function xuLySubmitForm(event) {
    event.preventDefault();

    if (currentFormType === "sach") {
        const body = {
            tenSach: document.getElementById("fTenSach").value,
            giaBan: parseFloat(document.getElementById("fGiaBan").value),
            soLuongTon: parseInt(document.getElementById("fSoLuongTon").value) || 0,
            namXuatBan: parseInt(document.getElementById("fNamXB").value) || null,
            soTrang: parseInt(document.getElementById("fSoTrang").value) || null,
            hinhAnh: document.getElementById("fHinhAnh").value || null,
            moTa: document.getElementById("fMoTa").value || null,
            idTheLoai: parseInt(document.getElementById("fIdTheLoai").value),
            idTacGia: parseInt(document.getElementById("fIdTacGia").value),
            idNxb: parseInt(document.getElementById("fIdNxb").value)
        };

        const url = currentEditId ? `${API}/sach/${currentEditId}` : `${API}/sach`;
        const method = currentEditId ? "PUT" : "POST";

        fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
            .then(async res => {
                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(errText || "Lỗi lưu sách");
                }
                return res.text();
            })
            .then(msg => { alert(msg); dongModal(); taiDanhSachSach(); })
            .catch(err => alert("Lỗi khi lưu: " + err.message));

    } else if (currentFormType === "theloai") {
        const body = { tenTheLoai: document.getElementById("fTenTheLoai").value };
        const url = currentEditId ? `${API}/theloai/${currentEditId}` : `${API}/theloai`;
        const method = currentEditId ? "PUT" : "POST";
        fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
            .then(res => res.text())
            .then(msg => { alert("Lưu thể loại thành công!"); dongModal(); taiDanhSachTheLoai(); });

    } else if (currentFormType === "tacgia") {
        const body = { tenTacGia: document.getElementById("fTenTacGia").value };
        const url = currentEditId ? `${API}/tacgia/${currentEditId}` : `${API}/tacgia`;
        const method = currentEditId ? "PUT" : "POST";
        fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
            .then(res => res.text())
            .then(msg => { alert("Lưu tác giả thành công!"); dongModal(); taiDanhSachTacGia(); });
            
    } else if (currentFormType === "nxb") {
        const body = { tenNxb: document.getElementById("fTenNxb").value };
        const url = currentEditId ? `${API}/nhaxuatban/${currentEditId}` : `${API}/nhaxuatban`;
        const method = currentEditId ? "PUT" : "POST";
        fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
            .then(res => res.text())
            .then(msg => { alert(msg); dongModal(); loadNxb(); });
            
    } else if (currentFormType === "them_khuyenmai" || currentFormType === "sua_khuyenmai") {
        const body = {
            maKhuyenMai: document.getElementById("fMaKhuyenMai").value,
            phanTramGiam: parseFloat(document.getElementById("fPhanTram").value),
            ngayBatDau: document.getElementById("fNgayBatDau").value,
            ngayKetThuc: document.getElementById("fNgayKetThuc").value,
            dieuKien: document.getElementById("fDieuKien").value || null
        };
        const url = currentEditId ? `${API}/khuyenmai/${currentEditId}` : `${API}/khuyenmai`;
        const method = currentEditId ? "PUT" : "POST";
        
        fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
        .then(async res => {
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text);
            }
            return res.text();
        })
        .then(msg => { alert("Lưu khuyến mãi thành công!"); dongModal(); taiDanhSachKhuyenMai(); })
        .catch(err => alert("Lỗi lưu khuyến mãi: " + err.message));
    }
}

// ==========================================
// KHỞI CHẠY
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const user = kiemTraDangNhap();
    if (user) {
        // Tự động tải tab Tổng quan (dashboard) khi vừa mở trang
        chuyenTab('dashboard');
    }
});

// ==========================================
// QUẢN LÝ NHÀ XUẤT BẢN
// ==========================================
let globalNxb = [];
let nxbCurrentPage = 1;

function loadNxb() {
    fetch(`${API}/nhaxuatban`)
        .then(res => res.json())
        .then(data => {
            globalNxb = data;
            nxbCurrentPage = 1;
            const searchInput = document.getElementById("searchNxb");
            if(searchInput) searchInput.value = "";
            locNxb();
        })
        .catch(err => console.error('Lỗi tải NXB:', err));
}

function locNxb() {
    const keyword = document.getElementById("searchNxb") ? document.getElementById("searchNxb").value.toLowerCase() : "";
    const filtered = globalNxb.filter(n => {
        const ten = (n.tenNxb || "").toLowerCase();
        return ten.includes(keyword);
    });
    hienThiDanhSachNxb(filtered);
}

function hienThiDanhSachNxb(danhSach) {
    const tbody = document.getElementById('tableNxb');
    const pagination = document.getElementById("paginationNxb");
    if (!tbody) return;

    if (danhSach.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">Không tìm thấy nhà xuất bản nào</td></tr>';
        if(pagination) pagination.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(danhSach.length / itemsPerPage);
    if (nxbCurrentPage > totalPages) nxbCurrentPage = totalPages;
    if (nxbCurrentPage < 1) nxbCurrentPage = 1;

    const start = (nxbCurrentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentList = danhSach.slice(start, end);

    tbody.innerHTML = currentList.map(nxb => `
        <tr>
            <td>#${nxb.id}</td>
            <td><strong>${nxb.tenNxb}</strong></td>
            <td>
                <button class="btn-edit" onclick="suaNxb(${nxb.id})">Sửa</button>
                <button class="btn-delete" onclick="xoaNxb(${nxb.id}, '${nxb.tenNxb.replace(/'/g, "\\'")}')">Xóa</button>
            </td>
        </tr>
    `).join('');

    if(pagination) {
        let pageHTML = '';
        if (totalPages > 1) {
            pageHTML += `<button class="page-btn" ${nxbCurrentPage === 1 ? 'disabled' : ''} onclick="chuyenTrangNxb(${nxbCurrentPage - 1})">« Trước</button>`;
            pageHTML += `<span style="margin: 0 10px;">Trang ${nxbCurrentPage} / ${totalPages}</span>`;
            pageHTML += `<button class="page-btn" ${nxbCurrentPage === totalPages ? 'disabled' : ''} onclick="chuyenTrangNxb(${nxbCurrentPage + 1})">Sau »</button>`;
        }
        pagination.innerHTML = pageHTML;
    }
}

function chuyenTrangNxb(page) {
    nxbCurrentPage = page;
    locNxb();
}

function moFormThemNxb() {
    currentEditId = null;
    currentFormType = 'nxb';
    document.getElementById('modalTitle').innerText = 'Thêm Nhà xuất bản mới';
    document.getElementById('modalBody').innerHTML = `
        <div class="modal-field">
            <label>Tên nhà xuất bản *</label>
            <input type="text" id="fTenNxb" required placeholder="Nhập tên NXB...">
        </div>
    `;
    moModal();
}

function suaNxb(id) {
    const n = globalNxb.find(x => x.id === id);
    if (!n) return;
    currentEditId = id;
    currentFormType = 'nxb';
    document.getElementById('modalTitle').innerText = 'Cập nhật Nhà xuất bản';
    document.getElementById('modalBody').innerHTML = `
        <div class="modal-field">
            <label>Tên nhà xuất bản *</label>
            <input type="text" id="fTenNxb" value="${n.tenNxb.replace(/"/g, '&quot;')}" required>
        </div>
    `;
    moModal();
}

function xoaNxb(id, tenNxb) {
    if (confirm(`Bạn có chắc chắn muốn xóa NXB '${tenNxb}' không?`)) {
        fetch(`${API}/nhaxuatban/${id}`, { method: 'DELETE' })
            .then(async res => {
                if (res.ok) {
                    alert('Đã xóa NXB thành công!');
                    loadNxb();
                } else {
                    const msg = await res.text();
                    if (msg.includes("constraint") || msg.includes("foreign key")) {
                        alert("Lỗi: Không thể xóa vì đã có Sách thuộc NXB này.");
                    } else {
                        alert('Lỗi: ' + msg);
                    }
                }
            });
    }
}

// ==========================================
// IN HÓA ĐƠN
// ==========================================
function inHoaDon() {
    const tenKH = document.getElementById('dtTenKH').innerText;
    const sdt = document.getElementById('dtSdt').innerText;
    const ngay = document.getElementById('dtNgay').innerText;
    const tongTien = document.getElementById('dtTongTien').innerText;
    const itemsHTML = document.getElementById('dtItems').innerHTML;

    const invoiceHTML = `
        <html>
        <head>
            <title>Hóa đơn bán hàng</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { margin: 0; color: #2c3e50; }
                .header p { margin: 5px 0; color: #7f8c8d; }
                .info { margin-bottom: 30px; line-height: 1.6; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #f8f9fa; }
                .total { text-align: right; font-size: 20px; font-weight: bold; color: #e74c3c; margin-top: 20px; }
                .footer { text-align: center; margin-top: 50px; color: #7f8c8d; font-style: italic; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>BOOKSTORE</h1>
                <p>Hóa Đơn Bán Lẻ</p>
                <p>Ngày in: ${new Date().toLocaleDateString('vi-VN')}</p>
            </div>
            
            <div class="info">
                <strong>Khách hàng:</strong> ${tenKH}<br>
                <strong>Số điện thoại:</strong> ${sdt}<br>
                <strong>Ngày đặt hàng:</strong> ${ngay}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Sản phẩm</th>
                        <th>Đơn giá</th>
                        <th>SL</th>
                        <th>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>

            <div class="total">Tổng thanh toán: ${tongTien}</div>

            <div class="footer">
                Cảm ơn quý khách đã mua sắm tại BookStore!
            </div>
            
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
}

// ==========================================
// 8. QUẢN LÝ KHUYẾN MÃI
// ==========================================
let globalKhuyenMai = [];
let khuyenMaiCurrentPage = 1;

function taiDanhSachKhuyenMai() {
    fetch(`${API}/khuyenmai`)
        .then(res => res.json())
        .then(data => {
            globalKhuyenMai = data;
            khuyenMaiCurrentPage = 1;
            const searchInput = document.getElementById("searchKhuyenMai");
            if(searchInput) searchInput.value = "";
            locKhuyenMai();
        })
        .catch(err => console.error("Lỗi tải khuyến mãi:", err));
}

function locKhuyenMai() {
    const keyword = document.getElementById("searchKhuyenMai") ? document.getElementById("searchKhuyenMai").value.toLowerCase() : "";
    const filtered = globalKhuyenMai.filter(k => {
        const ma = (k.maKhuyenMai || "").toLowerCase();
        return ma.includes(keyword);
    });
    hienThiDanhSachKhuyenMai(filtered);
}

function hienThiDanhSachKhuyenMai(danhSach) {
    const tbody = document.getElementById("tableKhuyenMai");
    const pagination = document.getElementById("paginationKhuyenMai");
    if (!tbody) return;

    if (danhSach.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">Không tìm thấy khuyến mãi nào.</td></tr>';
        if(pagination) pagination.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(danhSach.length / itemsPerPage);
    if (khuyenMaiCurrentPage > totalPages) khuyenMaiCurrentPage = totalPages;
    if (khuyenMaiCurrentPage < 1) khuyenMaiCurrentPage = 1;

    const start = (khuyenMaiCurrentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentList = danhSach.slice(start, end);

    tbody.innerHTML = currentList.map(item => `
        <tr>
            <td><strong>${item.maKhuyenMai}</strong></td>
            <td class="stock-warning">${item.phanTramGiam}%</td>
            <td>${item.ngayBatDau}</td>
            <td>${item.ngayKetThuc}</td>
            <td>${item.dieuKien || 'Không có'}</td>
            <td>
                <button class="btn-edit" onclick="moFormSuaKhuyenMai(${item.id})">Sửa</button>
                <button class="btn-delete" onclick="xoaKhuyenMai(${item.id})">Xóa</button>
            </td>
        </tr>
    `).join("");

    if(pagination) {
        let pageHTML = '';
        if (totalPages > 1) {
            pageHTML += `<button class="page-btn" ${khuyenMaiCurrentPage === 1 ? 'disabled' : ''} onclick="chuyenTrangKhuyenMai(${khuyenMaiCurrentPage - 1})">« Trước</button>`;
            pageHTML += `<span style="margin: 0 10px;">Trang ${khuyenMaiCurrentPage} / ${totalPages}</span>`;
            pageHTML += `<button class="page-btn" ${khuyenMaiCurrentPage === totalPages ? 'disabled' : ''} onclick="chuyenTrangKhuyenMai(${khuyenMaiCurrentPage + 1})">Sau »</button>`;
        }
        pagination.innerHTML = pageHTML;
    }
}

function chuyenTrangKhuyenMai(page) {
    khuyenMaiCurrentPage = page;
    locKhuyenMai();
}

function moFormThemKhuyenMai() {
    currentFormType = "them_khuyenmai";
    document.getElementById("modalTitle").innerText = "Thêm Khuyến mãi mới";
    document.getElementById("modalBody").innerHTML = `
        <div class="modal-field">
            <label>Mã khuyến mãi (*)</label>
            <input type="text" id="fMaKhuyenMai" required>
        </div>
        <div class="modal-field">
            <label>Phần trăm giảm (*)</label>
            <input type="number" id="fPhanTram" step="0.01" min="0.1" max="100" required>
        </div>
        <div class="modal-field">
            <label>Ngày bắt đầu (*)</label>
            <input type="date" id="fNgayBatDau" required>
        </div>
        <div class="modal-field">
            <label>Ngày kết thúc (*)</label>
            <input type="date" id="fNgayKetThuc" required>
        </div>
        <div class="modal-field">
            <label>Điều kiện (Ghi chú)</label>
            <textarea id="fDieuKien" rows="3"></textarea>
        </div>
    `;
    document.getElementById("modalOverlay").classList.add("show");
}

function moFormSuaKhuyenMai(id) {
    fetch(`${API}/khuyenmai/${id}`)
        .then(res => res.json())
        .then(data => {
            currentFormType = "sua_khuyenmai";
            currentEditId = id;
            document.getElementById("modalTitle").innerText = "Cập nhật Khuyến mãi";
            document.getElementById("modalBody").innerHTML = `
                <div class="modal-field">
                    <label>Mã khuyến mãi (*)</label>
                    <input type="text" id="fMaKhuyenMai" value="${data.maKhuyenMai}" required>
                </div>
                <div class="modal-field">
                    <label>Phần trăm giảm (*)</label>
                    <input type="number" id="fPhanTram" step="0.01" min="0.1" max="100" value="${data.phanTramGiam}" required>
                </div>
                <div class="modal-field">
                    <label>Ngày bắt đầu (*)</label>
                    <input type="date" id="fNgayBatDau" value="${data.ngayBatDau}" required>
                </div>
                <div class="modal-field">
                    <label>Ngày kết thúc (*)</label>
                    <input type="date" id="fNgayKetThuc" value="${data.ngayKetThuc}" required>
                </div>
                <div class="modal-field">
                    <label>Điều kiện (Ghi chú)</label>
                    <textarea id="fDieuKien" rows="3">${data.dieuKien || ''}</textarea>
                </div>
            `;
            document.getElementById("modalOverlay").classList.add("show");
        });
}

function xoaKhuyenMai(id) {
    if (confirm("Bạn có chắc chắn muốn xóa khuyến mãi này?")) {
        fetch(`${API}/khuyenmai/${id}`, { method: 'DELETE' })
            .then(res => {
                if (res.ok) {
                    alert("Xóa thành công!");
                    taiDanhSachKhuyenMai();
                } else {
                    res.text().then(text => alert("Lỗi: " + text));
                }
            });
    }
}

// ==========================================
// 9. QUẢN LÝ ĐÁNH GIÁ
// ==========================================
let globalDanhGia = [];
let danhGiaCurrentPage = 1;
let sachMap = {};
let khMap = {};

async function taiDanhSachDanhGia() {
    try {
        const [danhGiaRes, sachRes, khRes] = await Promise.all([
            fetch(`${API}/danhgia`),
            fetch(`${API}/sach`),
            fetch(`${API}/khachhang`)
        ]);

        globalDanhGia = await danhGiaRes.json();
        const sachs = await sachRes.json();
        const khachHangs = await khRes.json();

        sachMap = {};
        sachs.forEach(s => sachMap[s.id] = s.tenSach);

        khMap = {};
        khachHangs.forEach(k => khMap[k.id] = k.hoTen);

        danhGiaCurrentPage = 1;
        const searchInput = document.getElementById("searchDanhGia");
        if(searchInput) searchInput.value = "";
        locDanhGia();
    } catch (err) {
        console.error("Lỗi tải đánh giá:", err);
    }
}

function locDanhGia() {
    const keyword = document.getElementById("searchDanhGia") ? document.getElementById("searchDanhGia").value.toLowerCase() : "";
    const filtered = globalDanhGia.filter(item => {
        const tenSach = (sachMap[item.idSach] || "").toLowerCase();
        const bl = (item.binhLuan || "").toLowerCase();
        return tenSach.includes(keyword) || bl.includes(keyword);
    });
    hienThiDanhSachDanhGia(filtered);
}

function hienThiDanhSachDanhGia(danhSach) {
    const tbody = document.getElementById("tableDanhGia");
    const pagination = document.getElementById("paginationDanhGia");
    if (!tbody) return;

    if (danhSach.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">Không tìm thấy đánh giá nào</td></tr>';
        if(pagination) pagination.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(danhSach.length / itemsPerPage);
    if (danhGiaCurrentPage > totalPages) danhGiaCurrentPage = totalPages;
    if (danhGiaCurrentPage < 1) danhGiaCurrentPage = 1;

    const start = (danhGiaCurrentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentList = danhSach.slice(start, end);

    tbody.innerHTML = currentList.map(item => {
        const tenSach = sachMap[item.idSach] || `Sách ID: ${item.idSach}`;
        const tenKhach = khMap[item.idKhachHang] || `Khách ID: ${item.idKhachHang}`;
        const sao = "⭐".repeat(item.soSao);
        
        return `
            <tr>
                <td>${item.id}</td>
                <td><strong>${tenKhach}</strong></td>
                <td>${tenSach}</td>
                <td>${sao}</td>
                <td style="max-width: 300px; white-space: normal;">${item.binhLuan || ''}</td>
                <td>${item.ngayDanhGia}</td>
                <td>
                    <button class="btn-delete" onclick="xoaDanhGia(${item.id})">Xóa</button>
                </td>
            </tr>
        `;
    }).join("");

    if(pagination) {
        let pageHTML = '';
        if (totalPages > 1) {
            pageHTML += `<button class="page-btn" ${danhGiaCurrentPage === 1 ? 'disabled' : ''} onclick="chuyenTrangDanhGia(${danhGiaCurrentPage - 1})">« Trước</button>`;
            pageHTML += `<span style="margin: 0 10px;">Trang ${danhGiaCurrentPage} / ${totalPages}</span>`;
            pageHTML += `<button class="page-btn" ${danhGiaCurrentPage === totalPages ? 'disabled' : ''} onclick="chuyenTrangDanhGia(${danhGiaCurrentPage + 1})">Sau »</button>`;
        }
        pagination.innerHTML = pageHTML;
    }
}

function chuyenTrangDanhGia(page) {
    danhGiaCurrentPage = page;
    locDanhGia();
}

function xoaDanhGia(id) {
    if (confirm("Bạn có chắc chắn muốn xóa đánh giá này? Dữ liệu không thể khôi phục!")) {
        fetch(`${API}/danhgia/${id}`, { method: 'DELETE' })
            .then(res => {
                if (res.ok) {
                    alert("Đã xóa đánh giá vi phạm!");
                    taiDanhSachDanhGia();
                } else {
                    res.text().then(text => alert("Lỗi: " + text));
                }
            });
    }
}
