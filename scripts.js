document.addEventListener("DOMContentLoaded", () => {
  // Biến lưu trữ dữ liệu sản phẩm
  let allProducts = []
  let filteredProducts = []
  let groupedProducts = {} // Lưu trữ sản phẩm được nhóm theo tên

  // Các bộ lọc
  let selectedCategory = "all"
  let searchQuery = ""
  let minPrice = 0
  let maxPrice = Number.POSITIVE_INFINITY

  // Hàm tải và phân tích file CSV
  function loadProducts() {
    // Check if Papa is defined
    if (typeof Papa === "undefined") {
      console.error("Papa parse library is not loaded. Please include it in your HTML.")
      return
    }

    fetch("products.csv")
      .then((response) => response.text()) // Đọc nội dung CSV dưới dạng text
      .then((csvText) => {
        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            // Chuyển đổi giá từ chuỗi sang số và xử lý màu sắc
            allProducts = results.data.map((product) => {
              // Xử lý màu sắc từ chuỗi thành đối tượng
              let color = null
              if (product.colors) {
                const [name, code] = product.colors.split(":")
                color = { name, code }
              }

              return {
                ...product,
                price: Number.parseFloat(product.price),
                color: color,
              }
            })

            // Nhóm sản phẩm theo tên
            groupProducts()

            // Hiển thị sản phẩm đã nhóm
            displayGroupedProducts()

            // Thiết lập bộ lọc danh mục
            setupCategoryFilters()

            document.getElementById("loading").style.display = "none"
          },
        })
      })
      .catch((error) => console.error("Lỗi khi tải tệp CSV:", error))
  }

  // Hàm nhóm sản phẩm theo tên
  function groupProducts() {
    groupedProducts = {}

    allProducts.forEach((product) => {
      if (!groupedProducts[product.nameProduct]) {
        groupedProducts[product.nameProduct] = {
          nameProduct: product.nameProduct,
          category: product.category,
          price: product.price,
          imageUrl: product.imageUrl,
          variants: [],
        }
      }

      // Thêm biến thể màu sắc vào sản phẩm
      if (product.color) {
        groupedProducts[product.nameProduct].variants.push({
          color: product.color,
          imageUrl: product.imageUrl, // Có thể khác nhau cho mỗi màu
        })
      }
    })

    // Chuyển đổi từ đối tượng sang mảng để dễ dàng lọc và hiển thị
    filteredProducts = Object.values(groupedProducts)
  }

  // Hàm hiển thị sản phẩm đã nhóm
  function displayGroupedProducts() {
    const container = document.getElementById("products-container")
    const noResults = document.getElementById("no-results")

    container.innerHTML = ""

    if (filteredProducts.length === 0) {
      noResults.style.display = "block"
      return
    }

    noResults.style.display = "none"

    filteredProducts.forEach((product) => {
      const productCard = document.createElement("div")
      productCard.className = "col-6 col-md-4 col-lg-3 product-item"
      productCard.dataset.category = product.category
      productCard.dataset.price = product.price

      // Format giá với dấu phân cách hàng nghìn
      const formattedPrice = new Intl.NumberFormat("vi-VN").format(product.price)

      // Tạo HTML cho các màu sắc
      let colorsHtml = ""
      if (product.variants && product.variants.length > 0) {
        colorsHtml = '<div class="color-options">'
        product.variants.forEach((variant, index) => {
          const isActive = index === 0 ? "active" : ""
          colorsHtml += `
                          <div class="color-option ${isActive}" 
                               data-color="${variant.color.name}" 
                               data-color-code="${variant.color.code}" 
                               data-image-url="${variant.imageUrl}"
                               style="background-color: ${variant.color.code};" 
                               title="${variant.color.name}">
                          </div>`
        })
        colorsHtml += "</div>"
      }

      productCard.innerHTML = `
                  <div class="product-card">
                      <div class="product-img-container">
                          <img src="${product.imageUrl}" alt="${product.nameProduct}" class="product-img">
                      </div>
                      <div class="product-info">
                          <span class="product-category">${product.category}</span>
                          <h5 class="product-title">${product.nameProduct}</h5>
                          <p class="product-price">${formattedPrice}đ</p>
                          ${colorsHtml}
                      </div>
                  </div>
              `

      container.appendChild(productCard)

      // Thêm sự kiện cho các tùy chọn màu sắc
      const colorOptions = productCard.querySelectorAll(".color-option")
      colorOptions.forEach((option) => {
        option.addEventListener("click", function (e) {
          e.preventDefault()
          e.stopPropagation()

          // Xóa lớp active từ tất cả các tùy chọn màu
          colorOptions.forEach((opt) => opt.classList.remove("active"))
          // Thêm lớp active vào tùy chọn được chọn
          this.classList.add("active")

          // Cập nhật màu đã chọn
          const colorName = this.dataset.color
          const colorCode = this.dataset.colorCode
          const imageUrl = this.dataset.imageUrl

          // Cập nhật hình ảnh sản phẩm nếu có
          if (imageUrl) {
            const productImg = productCard.querySelector(".product-img")
            productImg.src = imageUrl
          }

          // Hiển thị thông báo màu đã chọn
          const colorIndicator = document.createElement("div")
          colorIndicator.className = "color-selected-indicator"
          colorIndicator.textContent = `Màu: ${colorName}`
          colorIndicator.style.backgroundColor = colorCode

          // Kiểm tra nếu đã có thông báo màu trước đó thì xóa đi
          const existingIndicator = productCard.querySelector(".color-selected-indicator")
          if (existingIndicator) {
            existingIndicator.remove()
          }

          // Thêm thông báo màu mới
          // const productInfo = productCard.querySelector(".product-info")
          // productInfo.appendChild(colorIndicator)

          // Hiệu ứng hiển thị thông báo
          setTimeout(() => {
            colorIndicator.classList.add("show")
          }, 10)

          // Tự động ẩn thông báo sau 2 giây
          setTimeout(() => {
            colorIndicator.classList.remove("show")
            setTimeout(() => {
              colorIndicator.remove()
            }, 300)
          }, 2000)
        })
      })
    })
  }

  // Hàm thiết lập bộ lọc danh mục
  function setupCategoryFilters() {
    const filterContainer = document.getElementById("category-filters")
    const categories = new Set()

    // Trích xuất các danh mục duy nhất
    filteredProducts.forEach((product) => {
      categories.add(product.category)
    })

    // Xóa các nút danh mục hiện tại
    const existingButtons = filterContainer.querySelectorAll('.category-btn:not([data-category="all"])')
    existingButtons.forEach((button) => button.remove())

    // Thêm các nút danh mục
    categories.forEach((category) => {
      const button = document.createElement("button")
      button.className = "category-btn"
      button.textContent = category
      button.dataset.category = category
      filterContainer.appendChild(button)
    })

    // Thêm trình nghe sự kiện cho các nút danh mục
    const categoryButtons = document.querySelectorAll(".category-btn")
    categoryButtons.forEach((button) => {
      button.addEventListener("click", function () {
        // Xóa lớp active khỏi tất cả các nút
        categoryButtons.forEach((btn) => btn.classList.remove("active"))
        // Thêm lớp active vào nút được nhấp
        this.classList.add("active")

        selectedCategory = this.dataset.category
      })
    })
  }

  // Hàm áp dụng tất cả các bộ lọc
  function applyFilters() {
    // Lấy giá trị từ các trường nhập liệu
    searchQuery = document.getElementById("search-input").value.toLowerCase()
    const minPriceInput = document.getElementById("min-price").value
    const maxPriceInput = document.getElementById("max-price").value

    minPrice = minPriceInput ? Number.parseFloat(minPriceInput) : 0
    maxPrice = maxPriceInput ? Number.parseFloat(maxPriceInput) : Number.POSITIVE_INFINITY

    // Nhóm lại sản phẩm trước khi lọc
    groupProducts()

    // Lọc sản phẩm dựa trên tất cả các điều kiện
    filteredProducts = Object.values(groupedProducts).filter((product) => {
      // Lọc theo danh mục
      const categoryMatch = selectedCategory === "all" || product.category === selectedCategory

      // Lọc theo tên sản phẩm
      const nameMatch = product.nameProduct.toLowerCase().includes(searchQuery)

      // Lọc theo khoảng giá
      const priceMatch = product.price >= minPrice && product.price <= maxPrice

      return categoryMatch && nameMatch && priceMatch
    })

    // Hiển thị sản phẩm đã lọc
    displayGroupedProducts()

    // Đóng accordion sau khi áp dụng bộ lọc trên mobile
    if (window.innerWidth < 768) {
      const searchAccordion = document.getElementById("collapseSearch")

      // Check if bootstrap is defined
      if (typeof bootstrap !== "undefined" && typeof bootstrap.Collapse !== "undefined") {
        const bsCollapse = bootstrap.Collapse.getInstance(searchAccordion)
        if (bsCollapse) bsCollapse.hide()
      } else {
        console.warn("Bootstrap collapse is not available.")
      }
    }
  }

  // Hàm đặt lại bộ lọc
  function resetFilters() {
    // Đặt lại các biến bộ lọc
    selectedCategory = "all"
    searchQuery = ""
    minPrice = 0
    maxPrice = Number.POSITIVE_INFINITY

    // Đặt lại các trường nhập liệu
    document.getElementById("search-input").value = ""
    document.getElementById("min-price").value = ""
    document.getElementById("max-price").value = ""

    // Đặt lại nút danh mục
    const categoryButtons = document.querySelectorAll(".category-btn")
    categoryButtons.forEach((btn) => btn.classList.remove("active"))
    document.querySelector('.category-btn[data-category="all"]').classList.add("active")

    // Hiển thị tất cả sản phẩm
    groupProducts()
    displayGroupedProducts()
  }

  // Thêm trình nghe sự kiện cho các nút bộ lọc
  document.getElementById("apply-filters").addEventListener("click", applyFilters)
  document.getElementById("reset-filters").addEventListener("click", resetFilters)

  // Thêm trình nghe sự kiện cho trường tìm kiếm (tìm kiếm khi nhấn Enter)
  document.getElementById("search-input").addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      applyFilters()
    }
  })

  // Tải sản phẩm khi trang tải
  loadProducts()

  // Thêm code xử lý modal vào cuối file, trước dòng cuối cùng (})

  // Hàm hiển thị modal sản phẩm
  function showProductModal(product, selectedColor) {
    const modal = document.getElementById("productModal")
    const modalImage = document.getElementById("modalProductImage")
    const modalName = document.getElementById("modalProductName")
    const modalPrice = document.getElementById("modalProductPrice")
    const modalColors = document.getElementById("modalProductColors")

    // Cập nhật thông tin sản phẩm trong modal
    modalImage.src = selectedColor ? selectedColor.dataset.imageUrl : product.querySelector(".product-img").src
    modalName.textContent = product.querySelector(".product-title").textContent

    // Format giá
    const priceText = product.querySelector(".product-price").textContent
    modalPrice.textContent = priceText

    // Thêm các tùy chọn màu sắc
    modalColors.innerHTML = ""
    const colorOptions = product.querySelectorAll(".color-option")
    if (colorOptions.length > 0) {
      colorOptions.forEach((option) => {
        const colorClone = option.cloneNode(true)
        colorClone.addEventListener("click", function () {
          // Xóa active từ tất cả các màu
          modalColors.querySelectorAll(".color-option").forEach((opt) => opt.classList.remove("active"))
          // Thêm active vào màu được chọn
          this.classList.add("active")
          // Cập nhật hình ảnh
          modalImage.src = this.dataset.imageUrl
        })
        modalColors.appendChild(colorClone)
      })
    }

    // Hiển thị modal
    const bsModal = new bootstrap.Modal(modal)
    bsModal.show()
  }

  // Thêm sự kiện click cho ảnh sản phẩm
  function setupProductImageClickEvents() {
    document.querySelectorAll(".product-img").forEach((img) => {
      img.addEventListener("click", function () {
        const productCard = this.closest(".product-card")
        const selectedColor = productCard.querySelector(".color-option.active")
        showProductModal(productCard, selectedColor)
      })
    })
  }

  // Xử lý nút hỗ trợ
  document.getElementById("supportButton").addEventListener("click", () => {
    // Đóng modal sản phẩm
    const productModal = bootstrap.Modal.getInstance(document.getElementById("productModal"))
    if (productModal) {
      productModal.hide()
    }

    // Hiển thị modal hỗ trợ
    setTimeout(() => {
      const supportModal = new bootstrap.Modal(document.getElementById("supportModal"))
      supportModal.show()
    }, 500)
  })

  // Ghi đè hàm displayGroupedProducts để thêm sự kiện click
  const originalDisplayGroupedProducts = displayGroupedProducts
  displayGroupedProducts = () => {
    originalDisplayGroupedProducts()
    setupProductImageClickEvents()
  }
})

