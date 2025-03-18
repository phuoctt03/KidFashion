document.addEventListener('DOMContentLoaded', function() {
    // Biến lưu trữ dữ liệu sản phẩm
    let allProducts = [];
    let filteredProducts = [];
    
    // Các bộ lọc
    let selectedCategory = 'all';
    let searchQuery = '';
    let minPrice = 0;
    let maxPrice = Infinity;
    
    // Hàm tải và phân tích file CSV
    function loadProducts() {
    // Để minh họa, chúng ta sẽ sử dụng dữ liệu CSV mẫu
    // Trong ứng dụng thực tế, bạn sẽ sử dụng fetch để lấy file CSV
//         const sampleCsvData = `imageUrl,nameProduct,category,price
// /placeholder.svg?height=400&width=300,Váy Hoa Dễ Thương,Váy,299000
// /placeholder.svg?height=400&width=300,Quần Yếm Jeans,Quần Yếm,349000
// /placeholder.svg?height=400&width=300,Áo Thun Sọc,Áo Thun,149000
// /placeholder.svg?height=400&width=300,Đồ Ngủ Hình Khủng Long,Đồ Ngủ,199000
// /placeholder.svg?height=400&width=300,Váy Tutu Công Chúa,Váy,249000
// /placeholder.svg?height=400&width=300,Áo Hoodie Hoạt Hình,Áo Khoác,279000
// /placeholder.svg?height=400&width=300,Đồ Bơi Chấm Bi,Đồ Bơi,229000
// /placeholder.svg?height=400&width=300,Áo Khoác Mùa Đông,Áo Khoác,399000
// /placeholder.svg?height=400&width=300,Bộ Đồng Phục Học Sinh,Đồng Phục,449000
// /placeholder.svg?height=400&width=300,Áo Thể Thao,Đồ Thể Thao,199000
// /placeholder.svg?height=400&width=300,Bộ Vest Lịch Sự,Trang Phục Lễ Hội,499000
// /placeholder.svg?height=400&width=300,Trang Phục Ba Lê,Trang Phục Nhảy,329000`;

//         // Phân tích dữ liệu CSV
//         Papa.parse(sampleCsvData, {
//           header: true,
//           complete: function(results) {
//             // Chuyển đổi giá từ chuỗi sang số
//             allProducts = results.data.map(product => {
//               return {
//                 ...product,
//                 price: parseFloat(product.price)
//               };
//             });
        
//             filteredProducts = [...allProducts];
//             displayProducts(filteredProducts);
//             setupCategoryFilters(allProducts);
//             document.getElementById('loading').style.display = 'none';
//           }
//         });
    fetch('products.csv')
        .then(response => response.text()) // Đọc nội dung CSV dưới dạng text
        .then(csvText => {
        Papa.parse(csvText, {
            header: true,
            complete: function(results) {
            // Chuyển đổi giá từ chuỗi sang số
            allProducts = results.data.map(product => ({
                ...product,
                price: parseFloat(product.price)
            }));

            filteredProducts = [...allProducts];
            displayProducts(filteredProducts);
            setupCategoryFilters(allProducts);
            document.getElementById('loading').style.display = 'none';
            }
        });
        })
        .catch(error => console.error('Lỗi khi tải tệp CSV:', error));
    }

    // Hàm hiển thị sản phẩm
    function displayProducts(products) {
    const container = document.getElementById('products-container');
    const noResults = document.getElementById('no-results');
    
    container.innerHTML = '';
    
    if (products.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';

    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'col-6 col-md-4 col-lg-3 product-item';
        productCard.dataset.category = product.category;
        productCard.dataset.price = product.price;

        // Format giá với dấu phân cách hàng nghìn
        const formattedPrice = new Intl.NumberFormat('vi-VN').format(product.price);

        productCard.innerHTML = `
        <div class="product-card">
            <div class="product-img-container">
            <img src="${product.imageUrl}" alt="${product.nameProduct}" class="product-img">
            </div>
            <div class="product-info">
            <span class="product-category">${product.category}</span>
            <h5 class="product-title">${product.nameProduct}</h5>
            <p class="product-price">${formattedPrice}đ</p>
            </div>
        </div>
        `;

        container.appendChild(productCard);
    });
    }

    // Hàm thiết lập bộ lọc danh mục
    function setupCategoryFilters(products) {
    const filterContainer = document.getElementById('category-filters');
    const categories = new Set();
    
    // Trích xuất các danh mục duy nhất
    products.forEach(product => {
        categories.add(product.category);
    });
    
    // Thêm các nút danh mục
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.textContent = category;
        button.dataset.category = category;
        filterContainer.appendChild(button);
    });
    
    // Thêm trình nghe sự kiện cho các nút danh mục
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
        // Xóa lớp active khỏi tất cả các nút
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        // Thêm lớp active vào nút được nhấp
        this.classList.add('active');
        
        selectedCategory = this.dataset.category;
        });
    });
    }
    
    // Hàm áp dụng tất cả các bộ lọc
    function applyFilters() {
    // Lấy giá trị từ các trường nhập liệu
    searchQuery = document.getElementById('search-input').value.toLowerCase();
    const minPriceInput = document.getElementById('min-price').value;
    const maxPriceInput = document.getElementById('max-price').value;
    
    minPrice = minPriceInput ? parseFloat(minPriceInput) : 0;
    maxPrice = maxPriceInput ? parseFloat(maxPriceInput) : Infinity;
    
    // Lọc sản phẩm dựa trên tất cả các điều kiện
    filteredProducts = allProducts.filter(product => {
        // Lọc theo danh mục
        const categoryMatch = selectedCategory === 'all' || product.category === selectedCategory;
        
        // Lọc theo tên sản phẩm
        const nameMatch = product.nameProduct.toLowerCase().includes(searchQuery);
        
        // Lọc theo khoảng giá
        const priceMatch = product.price >= minPrice && product.price <= maxPrice;
        
        return categoryMatch && nameMatch && priceMatch;
    });
    
    // Hiển thị sản phẩm đã lọc
    displayProducts(filteredProducts);
    
    // Đóng accordion sau khi áp dụng bộ lọc trên mobile
    if (window.innerWidth < 768) {
        const searchAccordion = document.getElementById('collapseSearch');
        const bsCollapse = bootstrap.Collapse.getInstance(searchAccordion);
        if (bsCollapse) bsCollapse.hide();
    }
    }
    
    // Hàm đặt lại bộ lọc
    function resetFilters() {
    // Đặt lại các biến bộ lọc
    selectedCategory = 'all';
    searchQuery = '';
    minPrice = 0;
    maxPrice = Infinity;
    
    // Đặt lại các trường nhập liệu
    document.getElementById('search-input').value = '';
    document.getElementById('min-price').value = '';
    document.getElementById('max-price').value = '';
    
    // Đặt lại nút danh mục
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector('.category-btn[data-category="all"]').classList.add('active');
    
    // Hiển thị tất cả sản phẩm
    filteredProducts = [...allProducts];
    displayProducts(filteredProducts);
    }
    
    // Thêm trình nghe sự kiện cho các nút bộ lọc
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    
    // Thêm trình nghe sự kiện cho trường tìm kiếm (tìm kiếm khi nhấn Enter)
    document.getElementById('search-input').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        applyFilters();
    }
    });
    
    // Tải sản phẩm khi trang tải
    loadProducts();
});
