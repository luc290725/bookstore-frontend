// ==========================================
// CẤU HÌNH ĐƯỜNG DẪN TƯƠNG ĐỐI
// ==========================================
const isInPagesDir = window.location.pathname.includes('/pages/');
const rootPath = isInPagesDir ? '../' : './';
const pagesPath = isInPagesDir ? './' : 'pages/';

// ==========================================
// 1. GỌI API LẤY DANH SÁCH THỂ LOẠI (Gắn vào Sidebar)
// ==========================================
const API_BASE_URL = "http://localhost:8080/identity/api";

let globalBooks = [];
let currentCategoryId = null;

document.addEventListener("DOMContentLoaded", () => {
    console.log("Trang web đã tải xong! Bắt đầu gọi API...");
    layDanhSachTheLoai();
    layDanhSachSach();
    capNhatSoLuongGioHang();
    capNhatTrangThaiDangNhap();

    // Lắng nghe sự kiện tìm kiếm sách
    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    
    if (searchInput) {
        searchInput.addEventListener("keyup", (e) => {
            if (e.key === "Enter") locSachTrangChu();
        });
    }
    if (searchBtn) {
        searchBtn.addEventListener("click", locSachTrangChu);
    }
});

function layDanhSachTheLoai() {
    fetch(`${API_BASE_URL}/theloai`)
        .then(res => res.json())
        .then(data => {
            const categoryList = document.getElementById("categoryList");
            if (!categoryList) return;
            
            // Xóa các category cũ (ngoại trừ "Tất cả")
            const allLi = `<li class="active" onclick="locTheoTheLoai(null, this)">Tất cả</li>`;
            
            const catsHTML = data.map(c => `
                <li onclick="locTheoTheLoai(${c.id}, this)">${c.tenTheLoai}</li>
            `).join('');
            
            categoryList.innerHTML = allLi + catsHTML;
        })
        .catch(err => console.error("Lỗi lấy thể loại:", err));
}

function locTheoTheLoai(idTheLoai, element) {
    currentCategoryId = idTheLoai;
    
    // Đổi màu nút active
    const listItems = document.querySelectorAll("#categoryList li");
    listItems.forEach(li => li.classList.remove("active"));
    if (element) {
        element.classList.add("active");
    }
    
    locSachTrangChu();
}

function layDanhSachSach() {
    const booksContainer = document.getElementById("booksContainer");
    if (!booksContainer) return;

    fetch(`${API_BASE_URL}/sach`)
        .then(response => {
            if (!response.ok) throw new Error("Lỗi mạng hoặc Backend chưa chạy!");
            return response.json();
        })
        .then(data => {
            globalBooks = data;
            locSachTrangChu();
        })
        .catch(error => {
            console.error("Lỗi khi gọi API:", error);
            booksContainer.innerHTML = `<p style="color: red;">Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra xem IntelliJ đã chạy chưa!</p>`;
        });
}

function locSachTrangChu() {
    const booksContainer = document.getElementById("booksContainer");
    if (!booksContainer) return;

    const keyword = document.getElementById("searchInput") ? document.getElementById("searchInput").value.toLowerCase() : "";
    
    // Lọc theo keyword và category
    const filteredBooks = globalBooks.filter(sach => {
        const matchKeyword = sach.tenSach.toLowerCase().includes(keyword);
        const matchCategory = currentCategoryId ? sach.idTheLoai === currentCategoryId : true;
        return matchKeyword && matchCategory;
    });

    booksContainer.innerHTML = "";

    if (filteredBooks.length === 0) {
        booksContainer.innerHTML = `<p style="text-align: center; width: 100%; color: #666; font-size: 1.1em; padding: 40px 0;">Không tìm thấy sách nào phù hợp.</p>`;
        return;
    }

    filteredBooks.forEach(sach => {
        const bookCard = taoTheSachHTML(sach);
        booksContainer.innerHTML += bookCard;
    });
}

/**
 * Hàm nhận vào 1 đối tượng Sách (từ Backend) và trả về đoạn code HTML của thẻ sách đó
 */
function taoTheSachHTML(sach) {
    // Định dạng giá tiền VNĐ (Ví dụ: 150000 -> 150.000)
    const giaTienFormat = new Intl.NumberFormat('vi-VN').format(sach.giaBan);

    // Nếu sách không có link ảnh, dùng một ảnh mặc định
    const hinhAnh = sach.hinhAnh ? sach.hinhAnh : "https://via.placeholder.com/250x350.png?text=Chưa+có+ảnh+bìa";

    return `
        <div class="book-card" onclick="window.location.href='${pagesPath}chitiet.html?id=${sach.id}'" style="cursor: pointer;">
            <img src="${hinhAnh}" alt="${sach.tenSach}" class="book-image"
                 onerror="this.onerror=null; this.src='https://placehold.co/250x350/e8e8e8/999?text=${encodeURIComponent(sach.tenSach)}';">
            <div class="book-info">
                <h4 class="book-title">${sach.tenSach}</h4>
                <p class="book-author">Số lượng còn: ${sach.soLuongTon || 0}</p>
                <div class="book-price">${giaTienFormat} đ</div>
                <button class="add-to-cart-btn" onclick="event.stopPropagation(); themVaoGioHang(${sach.id}, '${sach.tenSach.replace(/'/g, "\\'")}', ${sach.giaBan}, '${sach.hinhAnh || ''}')">🛒 Thêm vào giỏ</button>
            </div>
        </div>
    `;
}

/**
 * Hàm thêm sách vào giỏ hàng (Lưu vào localStorage)
 */
function themVaoGioHang(id, tenSach, giaBan, hinhAnh) {
    // Lấy giỏ hàng hiện tại từ localStorage (nếu chưa có thì tạo mảng rỗng)
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    // Kiểm tra xem sách này đã có trong giỏ chưa
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.soLuong++; // Nếu có rồi thì tăng số lượng
    } else {
        // Nếu chưa có thì thêm mới
        cart.push({
            id: id,
            tenSach: tenSach,
            giaBan: giaBan,
            hinhAnh: hinhAnh,
            soLuong: 1
        });
    }

    // Lưu lại vào localStorage
    localStorage.setItem("cart", JSON.stringify(cart));
    capNhatSoLuongGioHang();
    alert("✅ Đã thêm \"" + tenSach + "\" vào giỏ hàng!");
}

/**
 * Cập nhật số lượng hiển thị trên icon giỏ hàng
 */
function capNhatSoLuongGioHang() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.soLuong, 0);
    const cartCountEl = document.getElementById("cartCount");
    if (cartCountEl) {
        cartCountEl.innerText = totalItems;
    }
}

/**
 * Cập nhật trạng thái nút Đăng nhập (Nếu đã đăng nhập thì hiện tên)
 */
function capNhatTrangThaiDangNhap() {
    const user = JSON.parse(localStorage.getItem("user"));
    const userActions = document.querySelector(".user-actions");
    const loginBtn = document.querySelector(".login-btn");
    
    if (user && userActions) {
        // Đã đăng nhập -> Hiển thị dạng Dropdown Menu
        const existingDropdown = document.querySelector(".user-dropdown-container");
        if (!existingDropdown) {
            // Xóa nút login cũ nếu có
            if (loginBtn && !loginBtn.closest('.user-dropdown-container')) {
                loginBtn.remove();
            }
            
            const dropdownHTML = `
                <div class="user-dropdown-container">
                    <button class="login-btn">👤 ${user.tenDangNhap} ▼</button>
                    <div class="user-dropdown-menu">
                        <a href="${pagesPath}taikhoan.html#info">👤 Thông tin tài khoản</a>
                        <a href="${pagesPath}taikhoan.html#orders">📦 Đơn hàng đã đặt</a>
                        <a href="${pagesPath}taikhoan.html#vouchers">🎟️ Voucher đang có</a>
                        <a href="#" onclick="dangXuatKH()">🚪 Đăng xuất</a>
                    </div>
                </div>
            `;
            userActions.insertAdjacentHTML("beforeend", dropdownHTML);
        }
    }
}

function dangXuatKH() {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        localStorage.removeItem("user");
        window.location.href = `${rootPath}index.html`;
    }
}

/**
 * Hàm tìm kiếm sách (Bắt sự kiện khi bấm nút Tìm kiếm)
 */
document.getElementById("searchBtn").addEventListener("click", () => {
    const keyword = document.getElementById("searchInput").value;
    if (keyword.trim() === "") {
        layDanhSachSach(); // Nếu không nhập gì, lấy lại toàn bộ
        return;
    }

    const booksContainer = document.getElementById("booksContainer");
    booksContainer.innerHTML = "<div class='loading'>Đang tìm kiếm...</div>";

    // Gọi API tìm kiếm của Backend
    fetch(`${API_BASE_URL}/sach/search?keyword=${encodeURIComponent(keyword)}`)
        .then(res => res.json())
        .then(data => {
            booksContainer.innerHTML = "";
            if (data.length === 0) {
                booksContainer.innerHTML = "<p>Không tìm thấy sách nào phù hợp.</p>";
                return;
            }
            data.forEach(sach => {
                booksContainer.innerHTML += taoTheSachHTML(sach);
            });
        })
        .catch(error => {
            console.error("Lỗi:", error);
            booksContainer.innerHTML = "<p style='color:red;'>Lỗi tìm kiếm.</p>";
        });
});

// Cho phép bấm Enter để tìm kiếm
document.getElementById("searchInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        document.getElementById("searchBtn").click();
    }
});
