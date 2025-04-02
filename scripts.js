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

  // Thêm biến toàn cục để theo dõi ảnh đã được tải trước
  const preloadedImages = {}

  // Hàm tải trước ảnh
  function preloadImage(url) {
    if (!preloadedImages[url]) {
      const img = new Image()
      img.src = url
      preloadedImages[url] = img
    }
    return preloadedImages[url]
  }

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
                imageUrl: `images/${product.imageUrl}`,
                price: Number.parseFloat(product.price),
                color: color,
              }
            })

            // Tải trước tất cả ảnh sản phẩm
            preloadAllProductImages()

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
          description: product.description, // Add this line to include description
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

  // Thay đổi hàm displayGroupedProducts để thêm lazy loading và hiệu ứng loading
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
                      <img data-src="${product.imageUrl}" alt="${product.nameProduct}" class="product-img lazy-image">
                      <div class="img-loading-overlay active">
                          <div class="spinner-border spinner-border-sm text-primary" role="status">
                              <span class="visually-hidden">Đang tải...</span>
                          </div>
                      </div>
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
      const imgContainer = productCard.querySelector(".product-img-container")
      const productImg = productCard.querySelector(".product-img")
      const loadingOverlay = productCard.querySelector(".img-loading-overlay")

      // Thêm sự kiện khi ảnh chính tải xong
      productImg.onload = () => {
        loadingOverlay.classList.remove("active")
      }

      // Thêm sự kiện click cho ảnh sản phẩm để chuyển đến trang chi tiết
      productImg.addEventListener("click", () => {
        // Hiển thị overlay chuyển trang
        const pageTransitionOverlay = document.getElementById("pageTransitionOverlay")
        pageTransitionOverlay.classList.add("active")

        // Lấy màu sắc đang được chọn
        const selectedColor = productCard.querySelector(".color-option.active")
        let colorParam = ""

        if (selectedColor) {
          colorParam = `&color=${encodeURIComponent(selectedColor.dataset.color)}`
        }

        // Chuyển hướng đến trang chi tiết sản phẩm sau một khoảng thời gian ngắn
        setTimeout(() => {
          window.location.href = `product-detail.html?name=${encodeURIComponent(product.nameProduct)}${colorParam}`
        }, 300)
      })

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
          if (imageUrl && imageUrl !== productImg.src) {
            // Hiển thị overlay loading
            loadingOverlay.classList.add("active")

            // Ẩn ảnh hiện tại trong khi đang tải
            productImg.style.opacity = "0.3"

            // Kiểm tra xem ảnh đã được tải trước chưa
            const preloadedImg = preloadedImages[imageUrl]

            if (preloadedImg && preloadedImg.complete) {
              // Nếu ảnh đã tải xong, cập nhật ngay lập tức
              setTimeout(() => {
                productImg.src = imageUrl
                productImg.style.opacity = "1"
                loadingOverlay.classList.remove("active")
              }, 300) // Thêm độ trễ nhỏ để hiệu ứng loading hiển thị rõ ràng hơn
            } else {
              // Nếu ảnh chưa tải xong, đợi sự kiện onload
              const newImg = new Image()
              newImg.onload = () => {
                productImg.src = imageUrl
                productImg.style.opacity = "1"
                loadingOverlay.classList.remove("active")
                preloadedImages[imageUrl] = newImg
              }
              newImg.src = imageUrl
            }
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

    // Khởi tạo lazy loading sau khi đã thêm tất cả sản phẩm vào DOM
    initLazyLoading()
  }

  // Thêm hàm mới để khởi tạo lazy loading
  function initLazyLoading() {
    const lazyImages = document.querySelectorAll(".lazy-image")
    
    // Kiểm tra xem trình duyệt có hỗ trợ Intersection Observer không
    if ("IntersectionObserver" in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const image = entry.target
            image.src = image.dataset.src
            image.classList.remove("lazy-image")
            imageObserver.unobserve(image)
          }
        })
      }, {
        rootMargin: "0px 0px 200px 0px" // Tải trước ảnh khi còn cách 200px
      })

      lazyImages.forEach(image => {
        imageObserver.observe(image)
      })
    } else {
      // Fallback cho trình duyệt không hỗ trợ Intersection Observer
      lazyImages.forEach(image => {
        image.src = image.dataset.src
      })
    }
  }

  // Thêm hàm thiết lập bộ lọc danh mục
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

  // Xử lý nút cuộn lên đầu trang
  const scrollToTopButton = document.getElementById("scrollToTop")

  // Hiển thị nút khi cuộn xuống
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      scrollToTopButton.classList.add("visible")
    } else {
      scrollToTopButton.classList.remove("visible")
    }
    
    // Kiểm tra lại lazy loading khi cuộn trang
    if (typeof initLazyLoading === "function") {
      initLazyLoading()
    }
  })

  // Cuộn lên đầu trang khi nhấp vào nút
  scrollToTopButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  })

  // Kiểm tra xem có đang chuyển từ trang khác sang không
  window.addEventListener("load", () => {
    const pageTransitionOverlay = document.getElementById("pageTransitionOverlay")

    // Ẩn overlay sau khi trang đã tải xong
    setTimeout(() => {
      pageTransitionOverlay.classList.remove("active")
    }, 500)
  })

  // Thêm hàm tải trước tất cả ảnh của sản phẩm
  function preloadAllProductImages() {
    console.log("Preloading all product images...")
    if (allProducts && allProducts.length > 0) {
      allProducts.forEach((product) => {
        if (product.imageUrl) {
          preloadImage(product.imageUrl)
        }
      })
    }
  }

  // Tải sản phẩm khi trang tải
  loadProducts()
})
