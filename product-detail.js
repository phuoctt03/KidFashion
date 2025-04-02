document.addEventListener("DOMContentLoaded", () => {
    // Biến lưu trữ dữ liệu sản phẩm
    let allProducts = []
    let currentProduct = null
    let relatedProducts = []
  
    // Thêm biến toàn cục để theo dõi ảnh đã được tải trước
    const preloadedImages = {}
  
    // Lấy thông tin sản phẩm từ URL
    const urlParams = new URLSearchParams(window.location.search)
    const productName = urlParams.get("name")
    const selectedColor = urlParams.get("color")
  
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
  
              // Nhóm sản phẩm theo tên
              const groupedProducts = groupProducts(allProducts)
  
              // Tìm sản phẩm hiện tại dựa trên tên
              if (productName) {
                currentProduct = groupedProducts.find(
                  (product) => product.nameProduct === decodeURIComponent(productName),
                )
  
                if (currentProduct) {
                  displayProductDetails(currentProduct, selectedColor)
  
                  // Tìm các sản phẩm liên quan (cùng danh mục)
                  relatedProducts = groupedProducts.filter(
                    (product) =>
                      product.category === currentProduct.category && product.nameProduct !== currentProduct.nameProduct,
                  )
  
                  // Hiển thị tối đa 4 sản phẩm liên quan
                  displayRelatedProducts(relatedProducts.slice(0, 4))
  
                  // Ẩn overlay chuyển trang sau khi tải xong
                  const pageTransitionOverlay = document.getElementById("pageTransitionOverlay")
                  setTimeout(() => {
                    pageTransitionOverlay.classList.remove("active")
                  }, 500)
                } else {
                  // Xử lý khi không tìm thấy sản phẩm
                  showProductNotFound()
                }
              } else {
                // Xử lý khi không có tên sản phẩm trong URL
                showProductNotFound()
              }
            },
          })
        })
        .catch((error) => console.error("Lỗi khi tải tệp CSV:", error))
    }
  
    // Hàm nhóm sản phẩm theo tên
    function groupProducts(products) {
      const groupedProductsMap = {}
  
      products.forEach((product) => {
        if (!groupedProductsMap[product.nameProduct]) {
          groupedProductsMap[product.nameProduct] = {
            nameProduct: product.nameProduct,
            category: product.category,
            price: product.price,
            imageUrl: product.imageUrl,
            description: product.description,
            variants: [],
          }
        }
  
        // Thêm biến thể màu sắc vào sản phẩm
        if (product.color) {
          groupedProductsMap[product.nameProduct].variants.push({
            color: product.color,
            imageUrl: product.imageUrl,
          })
        }
      })
  
      // Chuyển đổi từ đối tượng sang mảng
      return Object.values(groupedProductsMap)
    }
  
    // Hàm hiển thị chi tiết sản phẩm
    function displayProductDetails(product, selectedColorName) {
      // Cập nhật thông tin sản phẩm
      document.getElementById("productDetailName").textContent = product.nameProduct
      document.getElementById("productDetailCategory").textContent = product.category
  
      // Format giá với dấu phân cách hàng nghìn
      const formattedPrice = new Intl.NumberFormat("vi-VN").format(product.price)
      document.getElementById("productDetailPrice").textContent = `${formattedPrice}đ`
  
      document.getElementById("productDetailDescription").textContent = product.description
  
      // Hiển thị ảnh sản phẩm
      const productImage = document.getElementById("productDetailImage")
      const loadingOverlay = document.getElementById("detailImageLoading")
  
      // Mặc định hiển thị ảnh đầu tiên
      let initialImageUrl = product.imageUrl
  
      // Nếu có màu được chọn, hiển thị ảnh của màu đó
      if (selectedColorName && product.variants) {
        const selectedVariant = product.variants.find(
          (variant) => variant.color.name === decodeURIComponent(selectedColorName),
        )
  
        if (selectedVariant) {
          initialImageUrl = selectedVariant.imageUrl
        }
      }
  
      // Hiển th�� loading khi tải ảnh
      loadingOverlay.style.display = "flex"
      productImage.style.opacity = "0.5"
  
      // Tải ảnh
      if (preloadedImages[initialImageUrl] && preloadedImages[initialImageUrl].complete) {
        setTimeout(() => {
          productImage.src = initialImageUrl
          productImage.style.opacity = "1"
          loadingOverlay.style.display = "none"
        }, 300)
      } else {
        const newImg = new Image()
        newImg.onload = () => {
          productImage.src = initialImageUrl
          productImage.style.opacity = "1"
          loadingOverlay.style.display = "none"
          preloadedImages[initialImageUrl] = newImg
        }
        newImg.src = initialImageUrl
      }
  
      // Hiển thị các tùy chọn màu sắc
      const colorsContainer = document.getElementById("productDetailColors")
      colorsContainer.innerHTML = ""
  
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant) => {
          const isActive = selectedColorName
            ? variant.color.name === decodeURIComponent(selectedColorName)
            : variant.imageUrl === initialImageUrl
  
          const colorOption = document.createElement("div")
          colorOption.className = `color-option ${isActive ? "active" : ""}`
          colorOption.dataset.color = variant.color.name
          colorOption.dataset.colorCode = variant.color.code
          colorOption.dataset.imageUrl = variant.imageUrl
          colorOption.style.backgroundColor = variant.color.code
          colorOption.title = variant.color.name
  
          colorOption.addEventListener("click", function () {
            // Xóa active từ tất cả các màu
            colorsContainer.querySelectorAll(".color-option").forEach((opt) => opt.classList.remove("active"))
  
            // Thêm active vào màu được chọn
            this.classList.add("active")
  
            // Cập nhật URL với màu mới được chọn
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.set("color", encodeURIComponent(this.dataset.color))
            window.history.replaceState({}, "", newUrl.toString())
  
            // Cập nhật hình ảnh
            updateProductImage(this.dataset.imageUrl)
  
            // Cập nhật thumbnails
            updateThumbnailSelection(this.dataset.imageUrl)
          })
  
          colorsContainer.appendChild(colorOption)
  
          // Tải trước ảnh
          preloadImage(variant.imageUrl)
        })
      }
  
      // Hiển thị thumbnails
      displayThumbnails(product.variants, initialImageUrl)
    }
  
    // Hàm hiển thị thumbnails
    function displayThumbnails(variants, activeImageUrl) {
      const thumbnailsContainer = document.getElementById("productThumbnails")
      thumbnailsContainer.innerHTML = ""
  
      if (variants && variants.length > 0) {
        variants.forEach((variant) => {
          const isActive = variant.imageUrl === activeImageUrl
  
          const thumbnail = document.createElement("div")
          thumbnail.className = `product-thumbnail ${isActive ? "active" : ""}`
          thumbnail.dataset.imageUrl = variant.imageUrl
  
          const thumbnailImg = document.createElement("img")
          thumbnailImg.src = variant.imageUrl
          thumbnailImg.alt = variant.color.name
          thumbnailImg.className = "thumbnail-img"
  
          thumbnail.appendChild(thumbnailImg)
  
          thumbnail.addEventListener("click", function () {
            // Cập nhật hình ảnh chính
            updateProductImage(this.dataset.imageUrl)
  
            // Cập nhật selection
            updateThumbnailSelection(this.dataset.imageUrl)
  
            // Cập nhật màu sắc được chọn
            const colorOption = document.querySelector(`.color-option[data-image-url="${this.dataset.imageUrl}"]`)
            if (colorOption) {
              document.querySelectorAll(".color-option").forEach((opt) => opt.classList.remove("active"))
              colorOption.classList.add("active")
  
              // Cập nhật URL
              const newUrl = new URL(window.location.href)
              newUrl.searchParams.set("color", encodeURIComponent(colorOption.dataset.color))
              window.history.replaceState({}, "", newUrl.toString())
            }
          })
  
          thumbnailsContainer.appendChild(thumbnail)
        })
      }
    }
  
    // Hàm cập nhật hình ảnh sản phẩm
    function updateProductImage(imageUrl) {
      const productImage = document.getElementById("productDetailImage")
      const loadingOverlay = document.getElementById("detailImageLoading")
  
      // Hiển thị loading
      loadingOverlay.style.display = "flex"
      productImage.style.opacity = "0.5"
  
      // Tải ảnh
      if (preloadedImages[imageUrl] && preloadedImages[imageUrl].complete) {
        setTimeout(() => {
          productImage.src = imageUrl
          productImage.style.opacity = "1"
          loadingOverlay.style.display = "none"
        }, 300)
      } else {
        const newImg = new Image()
        newImg.onload = () => {
          productImage.src = imageUrl
          productImage.style.opacity = "1"
          loadingOverlay.style.display = "none"
          preloadedImages[imageUrl] = newImg
        }
        newImg.src = imageUrl
      }
    }
  
    // Hàm cập nhật thumbnail được chọn
    function updateThumbnailSelection(imageUrl) {
      const thumbnails = document.querySelectorAll(".product-thumbnail")
      thumbnails.forEach((thumbnail) => {
        if (thumbnail.dataset.imageUrl === imageUrl) {
          thumbnail.classList.add("active")
        } else {
          thumbnail.classList.remove("active")
        }
      })
    }
  
    // Hàm hiển thị sản phẩm liên quan
    function displayRelatedProducts(products) {
      const container = document.getElementById("relatedProductsContainer")
      container.innerHTML = ""
  
      if (products.length === 0) {
        const noRelated = document.createElement("div")
        noRelated.className = "col-12 text-center py-4"
        noRelated.innerHTML = "<p>Không có sản phẩm liên quan.</p>"
        container.appendChild(noRelated)
        return
      }
  
      products.forEach((product) => {
        const productCard = document.createElement("div")
        productCard.className = "col-6 col-md-3 product-item"
  
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
          <a href="product-detail.html?name=${encodeURIComponent(product.nameProduct)}" class="product-card">
            <div class="product-img-container">
              <img src="${product.imageUrl}" alt="${product.nameProduct}" class="product-img">
            </div>
            <div class="product-info">
              <span class="product-category">${product.category}</span>
              <h5 class="product-title">${product.nameProduct}</h5>
              <p class="product-price">${formattedPrice}đ</p>
              ${colorsHtml}
            </div>
          </a>
        `
  
        container.appendChild(productCard)
  
        // Tải trước ảnh
        preloadImage(product.imageUrl)
  
        // Thêm sự kiện click cho sản phẩm liên quan
        const productLink = productCard.querySelector("a")
        productLink.addEventListener("click", function (e) {
          e.preventDefault()
  
          // Hiển thị overlay chuyển trang
          const pageTransitionOverlay = document.getElementById("pageTransitionOverlay")
          pageTransitionOverlay.classList.add("active")
  
          // Chuyển hướng sau một khoảng thời gian ngắn
          setTimeout(() => {
            window.location.href = this.href
          }, 300)
        })
      })
    }
  
    // Hàm hiển thị thông báo không tìm thấy sản phẩm
    function showProductNotFound() {
      const container = document.querySelector(".container")
      container.innerHTML = `
        <div class="product-not-found text-center py-5">
          <i class="bi bi-exclamation-circle display-1 text-muted mb-3"></i>
          <h2>Không tìm thấy sản phẩm</h2>
          <p class="text-muted mb-4">Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.</p>
          <a href="index.html" class="btn btn-primary">
            <i class="bi bi-arrow-left me-2"></i> Quay lại trang chủ
          </a>
        </div>
      `
  
      // Ẩn overlay chuyển trang
      const pageTransitionOverlay = document.getElementById("pageTransitionOverlay")
      setTimeout(() => {
        pageTransitionOverlay.classList.remove("active")
      }, 500)
    }
  
    // Xử lý nút cuộn lên đầu trang
    const scrollToTopButton = document.getElementById("scrollToTop")
  
    // Hiển thị nút khi cuộn xuống
    window.addEventListener("scroll", () => {
      if (window.pageYOffset > 300) {
        scrollToTopButton.classList.add("visible")
      } else {
        scrollToTopButton.classList.remove("visible")
      }
    })
  
    // Cuộn lên đầu trang khi nhấp vào nút
    scrollToTopButton.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    })
  
    // Hiển thị overlay chuyển trang khi trang đang tải
    window.addEventListener("load", () => {
      const pageTransitionOverlay = document.getElementById("pageTransitionOverlay")
      pageTransitionOverlay.classList.add("active")
    })
  
    // Tải sản phẩm khi trang tải
    loadProducts()
  })
  
  