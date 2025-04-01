document.addEventListener("DOMContentLoaded", () => {
  // Biến lưu trữ dữ liệu
  let allProducts = []
  let categories = new Set()
  let isLoggedIn = false
  let originalCSV = "" // Lưu trữ CSV gốc để so sánh thay đổi
  let githubToken = localStorage.getItem("githubToken") || ""
  let isUploading = false // Biến để kiểm tra trạng thái đang tải lên

  // Thông tin GitHub repository
  const REPO_OWNER = "phuoctt03"
  const REPO_NAME = "KidFashion"

  // Kiểm tra đăng nhập
  checkLoginStatus()

  // Các phần tử DOM
  const adminSections = document.querySelectorAll(".admin-section")
  const adminMenuItems = document.querySelectorAll(".admin-menu .list-group-item")
  const productTableBody = document.getElementById("product-table-body")
  const categoryList = document.getElementById("category-list")
  const productCategorySelect = document.getElementById("product-category")
  const editProductCategorySelect = document.getElementById("edit-product-category")
  const variantProductSelect = document.getElementById("variant-product")
  const productSearch = document.getElementById("product-search")

  // Modals
  const loginModal = new bootstrap.Modal(document.getElementById("loginModal"))
  const editProductModal = new bootstrap.Modal(document.getElementById("editProductModal"))
  const confirmationModal = new bootstrap.Modal(document.getElementById("confirmationModal"))
  const toastNotification = new bootstrap.Toast(document.getElementById("toast-notification"))
  const settingsModal = new bootstrap.Modal(document.getElementById("settingsModal"))

  // Thêm sự kiện cho nút nhập token
  document.getElementById("settings-btn").addEventListener("click", openSettingsModal)

  // Xử lý form cài đặt
  document.getElementById("settings-form").addEventListener("submit", (e) => {
    e.preventDefault()
    saveSettings()
  })

  // Thêm sự kiện cho nút lưu cài đặt
  document.getElementById("save-settings").addEventListener("click", saveSettings)

  // Xử lý chuyển đổi tab
  adminMenuItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetSection = item.getAttribute("data-target")

      // Xóa active class từ tất cả các menu items và sections
      adminMenuItems.forEach((menuItem) => menuItem.classList.remove("active"))
      adminSections.forEach((section) => section.classList.remove("active"))

      // Thêm active class vào menu item và section được chọn
      item.classList.add("active")
      document.getElementById(targetSection).classList.add("active")
    })
  })

  // Nút quay lại danh sách sản phẩm
  document.getElementById("back-to-list").addEventListener("click", () => {
    showSection("product-list")
  })

  document.getElementById("back-to-list-from-variant").addEventListener("click", () => {
    showSection("product-list")
  })

  // Nút thêm sản phẩm mới
  document.getElementById("add-product-btn").addEventListener("click", () => {
    showSection("add-product")
  })

  // Xử lý xem trước ảnh sản phẩm
  document.getElementById("product-image").addEventListener("change", function () {
    previewImage(this, "image-preview")
  })

  document.getElementById("variant-image").addEventListener("change", function () {
    previewImage(this, "variant-image-preview")
  })

  // Xử lý form thêm sản phẩm
  document.getElementById("add-product-form").addEventListener("submit", (e) => {
    e.preventDefault()
    addNewProduct()
  })

  // Xử lý form thêm biến thể
  document.getElementById("add-variant-form").addEventListener("submit", (e) => {
    e.preventDefault()
    addNewVariant()
  })

  // Xử lý form thêm danh mục
  document.getElementById("add-category-form").addEventListener("submit", (e) => {
    e.preventDefault()
    addNewCategory()
  })

  // Xử lý form đăng nhập
  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault()
    login()
  })

  // Xử lý nút reset form
  document.getElementById("reset-form").addEventListener("click", () => {
    document.getElementById("add-product-form").reset()
    document.getElementById("image-preview").classList.add("d-none")
  })

  document.getElementById("reset-variant-form").addEventListener("click", () => {
    document.getElementById("add-variant-form").reset()
    document.getElementById("variant-image-preview").classList.add("d-none")
  })

  // Xử lý tìm kiếm sản phẩm
  productSearch.addEventListener("input", function () {
    filterProducts(this.value)
  })

  // Xử lý lưu chỉnh sửa sản phẩm
  document.getElementById("save-edit-product").addEventListener("click", () => {
    saveEditProduct()
  })

  // Xử lý xóa sản phẩm
  document.getElementById("delete-product-btn").addEventListener("click", () => {
    showConfirmationModal("Bạn có chắc chắn muốn xóa sản phẩm này?", deleteProduct)
  })

  // Hàm kiểm tra trạng thái đăng nhập
  function checkLoginStatus() {
    isLoggedIn = localStorage.getItem("adminLoggedIn") === "true"

    if (!isLoggedIn) {
      loginModal.show()
    } else {
      loadProducts()
    }
  }

  // Hàm đăng nhập
  function login() {
    const username = document.getElementById("username").value
    const password = document.getElementById("password").value
    const loginError = document.getElementById("login-error")

    // Kiểm tra thông tin đăng nhập (demo: admin/admin)
    if (username === "admin" && password === "admin") {
      localStorage.setItem("adminLoggedIn", "true")
      isLoggedIn = true
      loginModal.hide()
      loadProducts()
      showToast("Đăng nhập thành công", "Chào mừng bạn đến với trang quản trị", "success")
    } else {
      loginError.classList.remove("d-none")
    }
  }

  // Hiển thị loading
  function showLoading(element, colSpan) {
    element.innerHTML = `
      <tr>
        <td colspan="${colSpan}" class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Đang tải...</span>
          </div>
          <p class="mt-2 mb-0">Đang tải dữ liệu...</p>
        </td>
      </tr>
    `
  }

  // Hàm tải sản phẩm từ CSV
  function loadProducts() {
    const productTableBody = document.getElementById("product-table-body")
    showLoading(productTableBody, 6)

    fetch("products.csv")
      .then((response) => response.text())
      .then((csvText) => {
        originalCSV = csvText // Lưu CSV gốc

        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            // Xử lý dữ liệu sản phẩm
            allProducts = results.data
              .filter((product) => product.imageUrl && product.nameProduct) // Lọc bỏ dòng trống
              .map((product) => {
                // Xử lý màu sắc từ chuỗi thành đối tượng
                let color = null
                if (product.colors) {
                  const [name, code] = product.colors.split(":")
                  color = { name, code }
                }

                return {
                  ...product,
                  imageUrl: `images/${product.imageUrl}`,
                  price: Number.parseFloat(product.price) || 0,
                  color: color,
                }
              })

            // Nhóm sản phẩm theo tên
            const groupedProducts = groupProductsByName(allProducts)

            // Hiển thị sản phẩm trong bảng
            displayProductsInTable(groupedProducts)

            // Lấy danh sách danh mục
            extractCategories()

            // Hiển thị danh mục
            displayCategories()

            // Cập nhật select box sản phẩm cho phần thêm biến thể
            updateProductSelect()
          },
          error: (error) => {
            console.error("Lỗi khi phân tích CSV:", error)
            showToast("Lỗi", "Không thể phân tích dữ liệu CSV", "error")
            productTableBody.innerHTML = `
              <tr>
                <td colspan="6" class="text-center py-4">Lỗi khi tải dữ liệu</td>
              </tr>
            `
          },
        })
      })
      .catch((error) => {
        console.error("Lỗi khi tải tệp CSV:", error)
        showToast("Lỗi", "Không thể tải dữ liệu sản phẩm", "error")
        productTableBody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4">Lỗi khi tải dữ liệu</td>
          </tr>
        `
      })
  }

  // Hàm nhóm sản phẩm theo tên
  function groupProductsByName(products) {
    const grouped = {}

    products.forEach((product) => {
      if (!grouped[product.nameProduct]) {
        grouped[product.nameProduct] = {
          nameProduct: product.nameProduct,
          category: product.category,
          price: product.price,
          imageUrl: product.imageUrl,
          description: product.description || "",
          variants: [],
        }
      }

      // Thêm biến thể màu sắc
      if (product.color) {
        grouped[product.nameProduct].variants.push({
          color: product.color,
          imageUrl: product.imageUrl,
        })
      }
    })

    return Object.values(grouped)
  }

  // Hàm hiển thị sản phẩm trong bảng
  function displayProductsInTable(products) {
    productTableBody.innerHTML = ""

    if (products.length === 0) {
      productTableBody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4">Không có sản phẩm nào</td>
          </tr>
        `
      return
    }

    products.forEach((product) => {
      // Tạo HTML cho các màu sắc
      let colorsHtml = ""
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant) => {
          colorsHtml += `<span class="color-dot" style="background-color: ${variant.color.code};" title="${variant.color.name}"></span>`
        })
      }

      // Format giá
      const formattedPrice = new Intl.NumberFormat("vi-VN").format(product.price)

      const row = document.createElement("tr")
      row.innerHTML = `
          <td>
            <img src="${product.imageUrl}" alt="${product.nameProduct}" class="product-img">
          </td>
          <td>
            <span class="product-name fw-bold">${product.nameProduct}</span>
            <small class="text-muted d-block">${product.variants ? product.variants.length : 0} màu sắc</small>
          </td>
          <td>
            <span class="product-category">${product.category}</span>
          </td>
          <td>
            <span class="product-price fw-bold">${formattedPrice}đ</span>
          </td>
          <td>
            ${colorsHtml}
          </td>
          <td>
            <button class="btn btn-sm btn-outline-primary btn-action edit-product" data-product-name="${product.nameProduct}" title="Chỉnh sửa">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-success btn-action add-variant-to-product" data-product-name="${product.nameProduct}" title="Thêm màu sắc">
              <i class="bi bi-palette"></i>
            </button>
          </td>
        `

      productTableBody.appendChild(row)
    })

    // Thêm sự kiện cho nút chỉnh sửa
    document.querySelectorAll(".edit-product").forEach((button) => {
      button.addEventListener("click", function () {
        const productName = this.getAttribute("data-product-name")
        openEditProductModal(productName)
      })
    })

    // Thêm sự kiện cho nút thêm biến thể
    document.querySelectorAll(".add-variant-to-product").forEach((button) => {
      button.addEventListener("click", function () {
        const productName = this.getAttribute("data-product-name")
        openAddVariantForProduct(productName)
      })
    })
  }

  // Hàm trích xuất danh mục
  function extractCategories() {
    categories = new Set()

    allProducts.forEach((product) => {
      if (product.category) {
        categories.add(product.category)
      }
    })
  }

  // Hàm hiển thị danh mục
  function displayCategories() {
    // Cập nhật danh sách danh mục
    categoryList.innerHTML = ""

    if (categories.size === 0) {
      categoryList.innerHTML = `
          <li class="list-group-item">Không có danh mục nào</li>
        `
      return
    }

    // Đếm số sản phẩm trong mỗi danh mục
    const categoryCounts = {}
    const uniqueProducts = new Set()

    allProducts.forEach((product) => {
      if (product.category) {
        // Chỉ đếm mỗi tên sản phẩm một lần
        const key = `${product.category}-${product.nameProduct}`
        if (!uniqueProducts.has(key)) {
          uniqueProducts.add(key)
          categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1
        }
      }
    })

    // Hiển thị danh mục và số lượng sản phẩm
    Array.from(categories)
      .sort()
      .forEach((category) => {
        const count = categoryCounts[category] || 0
        const li = document.createElement("li")
        li.className = "list-group-item category-item"
        li.innerHTML = `
          <span class="category-name">${category}</span>
          <span class="category-count">${count}</span>
        `
        categoryList.appendChild(li)
      })

    // Cập nhật select box danh mục
    updateCategorySelects()
  }

  // Hàm cập nhật select box danh mục
  function updateCategorySelects() {
    // Xóa các option cũ
    productCategorySelect.innerHTML = '<option value="" selected disabled>Chọn danh mục</option>'
    editProductCategorySelect.innerHTML = ""

    // Thêm các option mới
    Array.from(categories)
      .sort()
      .forEach((category) => {
        const option1 = document.createElement("option")
        option1.value = category
        option1.textContent = category
        productCategorySelect.appendChild(option1)

        const option2 = document.createElement("option")
        option2.value = category
        option2.textContent = category
        editProductCategorySelect.appendChild(option2)
      })
  }

  // Hàm cập nhật select box sản phẩm
  function updateProductSelect() {
    // Lấy danh sách tên sản phẩm duy nhất
    const uniqueProductNames = [...new Set(allProducts.map((product) => product.nameProduct))].sort()

    // Xóa các option cũ
    variantProductSelect.innerHTML = '<option value="" selected disabled>Chọn sản phẩm</option>'

    // Thêm các option mới
    uniqueProductNames.forEach((name) => {
      const option = document.createElement("option")
      option.value = name
      option.textContent = name
      variantProductSelect.appendChild(option)
    })
  }

  // Hàm lọc sản phẩm theo từ khóa tìm kiếm
  function filterProducts(keyword) {
    if (!keyword) {
      displayProductsInTable(groupProductsByName(allProducts))
      return
    }

    const filteredProducts = allProducts.filter(
      (product) =>
        product.nameProduct.toLowerCase().includes(keyword.toLowerCase()) ||
        product.category.toLowerCase().includes(keyword.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(keyword.toLowerCase())),
    )

    displayProductsInTable(groupProductsByName(filteredProducts))
  }

  // Hàm xem trước ảnh
  function previewImage(input, previewId) {
    const preview = document.getElementById(previewId)

    if (input.files && input.files[0]) {
      const reader = new FileReader()

      reader.onload = (e) => {
        preview.src = e.target.result
        preview.classList.remove("d-none")
      }

      reader.readAsDataURL(input.files[0])
    }
  }

  // Hàm mở modal chỉnh sửa sản phẩm
  function openEditProductModal(productName) {
    // Tìm sản phẩm theo tên
    const groupedProducts = groupProductsByName(allProducts)
    const product = groupedProducts.find((p) => p.nameProduct === productName)

    if (!product) {
      showToast("Lỗi", "Không tìm thấy sản phẩm", "error")
      return
    }

    // Cập nhật thông tin sản phẩm vào form
    document.getElementById("edit-product-id").value = productName
    document.getElementById("edit-product-name").value = product.nameProduct
    document.getElementById("edit-product-price").value = product.price
    document.getElementById("edit-product-description").value = product.description || ""
    document.getElementById("edit-current-image").src = product.imageUrl

    // Chọn danh mục
    const categorySelect = document.getElementById("edit-product-category")
    for (let i = 0; i < categorySelect.options.length; i++) {
      if (categorySelect.options[i].value === product.category) {
        categorySelect.selectedIndex = i
        break
      }
    }

    // Hiển thị màu sắc đầu tiên (nếu có)
    if (product.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0]
      document.getElementById("edit-product-color-name").value = firstVariant.color.name
      document.getElementById("edit-product-color-code").value = firstVariant.color.code
    }

    // Hiển thị modal
    editProductModal.show()
  }

  // Hàm mở form thêm biến thể cho sản phẩm cụ thể
  function openAddVariantForProduct(productName) {
    // Chọn sản phẩm trong select box
    const select = document.getElementById("variant-product")
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === productName) {
        select.selectedIndex = i
        break
      }
    }

    // Hiển thị section thêm biến thể
    showSection("add-variant")

    // Cuộn lên đầu trang
    window.scrollTo(0, 0)
  }

  // Hàm lưu chỉnh sửa sản phẩm
  function saveEditProduct() {
    if (isUploading) {
      showToast("Thông báo", "Đang có quá trình tải lên, vui lòng đợi", "warning")
      return
    }

    const productId = document.getElementById("edit-product-id").value
    const newName = document.getElementById("edit-product-name").value
    const newCategory = document.getElementById("edit-product-category").value
    const newPrice = document.getElementById("edit-product-price").value
    const newDescription = document.getElementById("edit-product-description").value

    if (!newName || !newCategory || !newPrice) {
      showToast("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc", "error")
      return
    }

    // Hiển thị trạng thái đang xử lý
    const saveButton = document.getElementById("save-edit-product")
    const originalText = saveButton.innerHTML
    saveButton.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang lưu...'
    saveButton.disabled = true
    isUploading = true

    // Cập nhật thông tin sản phẩm trong mảng dữ liệu
    allProducts.forEach((product) => {
      if (product.nameProduct === productId) {
        product.nameProduct = newName
        product.category = newCategory
        product.price = Number.parseFloat(newPrice)
        product.description = newDescription
      }
    })

    // Lưu dữ liệu vào CSV
    saveProductsToCSV(
      () => {
        // Khôi phục trạng thái nút
        saveButton.innerHTML = originalText
        saveButton.disabled = false
        isUploading = false

        // Đóng modal
        editProductModal.hide()

        // Hiển thị thông báo
        showToast("Thành công", "Đã cập nhật thông tin sản phẩm", "success")

        // Tải lại danh sách sản phẩm
        loadProducts()
      },
      (error) => {
        // Xử lý lỗi
        saveButton.innerHTML = originalText
        saveButton.disabled = false
        isUploading = false
        showToast("Lỗi", `Không thể cập nhật sản phẩm: ${error}`, "error")
      },
    )
  }

  // Hàm xóa sản phẩm
  function deleteProduct() {
    if (isUploading) {
      showToast("Thông báo", "Đang có quá trình tải lên, vui lòng đợi", "warning")
      return
    }

    const productId = document.getElementById("edit-product-id").value

    // Hiển thị trạng thái đang xử lý
    const deleteButton = document.getElementById("delete-product-btn")
    const originalText = deleteButton.innerHTML
    deleteButton.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xóa...'
    deleteButton.disabled = true
    isUploading = true

    // Xóa sản phẩm khỏi mảng dữ liệu
    allProducts = allProducts.filter((product) => product.nameProduct !== productId)

    // Lưu dữ liệu vào CSV
    saveProductsToCSV(
      () => {
        // Khôi phục trạng thái nút
        deleteButton.innerHTML = originalText
        deleteButton.disabled = false
        isUploading = false

        // Đóng modal
        editProductModal.hide()
        confirmationModal.hide()

        // Hiển thị thông báo
        showToast("Thành công", "Đã xóa sản phẩm", "success")

        // Tải lại danh sách sản phẩm
        loadProducts()
      },
      (error) => {
        // Xử lý lỗi
        deleteButton.innerHTML = originalText
        deleteButton.disabled = false
        isUploading = false
        showToast("Lỗi", `Không thể xóa sản phẩm: ${error}`, "error")
      },
    )
  }

  // Hàm thêm sản phẩm mới
  function addNewProduct() {
    if (isUploading) {
      showToast("Thông báo", "Đang có quá trình tải lên, vui lòng đợi", "warning")
      return
    }

    const name = document.getElementById("product-name").value
    const category = document.getElementById("product-category").value
    const price = document.getElementById("product-price").value
    const description = document.getElementById("product-description").value
    const colorName = document.getElementById("product-color-name").value
    const colorCode = document.getElementById("product-color-code").value
    const imageFile = document.getElementById("product-image").files[0]

    if (!name || !category || !price || !colorName || !imageFile) {
      showToast("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc", "error")
      return
    }

    // Hiển thị trạng thái đang xử lý
    const submitButton = document.querySelector("#add-product-form button[type='submit']")
    const originalText = submitButton.innerHTML
    submitButton.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang lưu...'
    submitButton.disabled = true
    isUploading = true

    // Tạo tên file ảnh
    const imageFileName = `${name.toLowerCase().replace(/\s+/g, "-")}-${colorName.toLowerCase()}-${Date.now()}.jpg`

    // Nếu có GitHub token, tải ảnh lên GitHub
    if (githubToken) {
      uploadImageToGitHub(
        imageFile,
        imageFileName,
        (uploadedFileName) => {
          // Tạo sản phẩm mới sau khi tải ảnh thành công
          const newProduct = {
            imageUrl: `images/${uploadedFileName}`,
            nameProduct: name,
            category: category,
            price: Number.parseFloat(price),
            description: description,
            colors: `${colorName}:${colorCode}`,
          }

          // Thêm sản phẩm vào mảng dữ liệu
          allProducts.push(newProduct)

          // Lưu dữ liệu vào CSV
          saveProductsToCSV(
            () => {
              // Khôi phục trạng thái nút
              submitButton.innerHTML = originalText
              submitButton.disabled = false
              isUploading = false

              // Reset form
              document.getElementById("add-product-form").reset()
              document.getElementById("image-preview").classList.add("d-none")

              // Hiển thị thông báo
              showToast("Thành công", "Đã thêm sản phẩm mới", "success")

              // Quay lại danh sách sản phẩm
              showSection("product-list")

              // Tải lại danh sách sản phẩm
              loadProducts()
            },
            (error) => {
              // Xử lý lỗi
              submitButton.innerHTML = originalText
              submitButton.disabled = false
              isUploading = false
              showToast("Lỗi", `Không thể lưu sản phẩm: ${error}`, "error")
            },
          )
        },
        (error) => {
          // Xử lý lỗi khi tải ảnh
          submitButton.innerHTML = originalText
          submitButton.disabled = false
          isUploading = false
          showToast("Lỗi", `Không thể tải ảnh lên: ${error}`, "error")
        },
      )
    } else {
      // Nếu không có GitHub token, hiển thị thông báo
      submitButton.innerHTML = originalText
      submitButton.disabled = false
      isUploading = false
      showToast("Lỗi", "Vui lòng nhập GitHub token trước khi thêm sản phẩm", "error")
      openSettingsModal()
    }
  }

  // Hàm thêm biến thể màu sắc mới
  function addNewVariant() {
    if (isUploading) {
      showToast("Thông báo", "Đang có quá trình tải lên, vui lòng đợi", "warning")
      return
    }

    const productName = document.getElementById("variant-product").value
    const colorName = document.getElementById("variant-color-name").value
    const colorCode = document.getElementById("variant-color-code").value
    const imageFile = document.getElementById("variant-image").files[0]

    if (!productName || !colorName || !imageFile) {
      showToast("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc", "error")
      return
    }

    // Kiểm tra xem màu sắc đã tồn tại chưa
    const existingProduct = allProducts.find(
      (p) =>
        p.nameProduct === productName && p.colors && p.colors.split(":")[0].toLowerCase() === colorName.toLowerCase(),
    )

    if (existingProduct) {
      showToast("Cảnh báo", `Màu ${colorName} đã tồn tại cho sản phẩm này`, "warning")
      return
    }

    // Hiển thị trạng thái đang xử lý
    const submitButton = document.querySelector("#add-variant-form button[type='submit']")
    const originalText = submitButton.innerHTML
    submitButton.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang lưu...'
    submitButton.disabled = true
    isUploading = true

    // Tạo tên file ảnh
    const imageFileName = `${productName.toLowerCase().replace(/\s+/g, "-")}-${colorName.toLowerCase()}-${Date.now()}.jpg`

    // Tìm thông tin sản phẩm
    const productInfo = allProducts.find((p) => p.nameProduct === productName)

    if (!productInfo) {
      showToast("Lỗi", "Không tìm thấy sản phẩm", "error")
      submitButton.innerHTML = originalText
      submitButton.disabled = false
      isUploading = false
      return
    }

    // Nếu có GitHub token, tải ảnh lên GitHub
    if (githubToken) {
      uploadImageToGitHub(
        imageFile,
        imageFileName,
        (uploadedFileName) => {
          // Tạo biến thể mới sau khi tải ảnh thành công
          const newVariant = {
            imageUrl: `images/${uploadedFileName}`,
            nameProduct: productName,
            category: productInfo.category,
            price: productInfo.price,
            description: productInfo.description || "",
            colors: `${colorName}:${colorCode}`,
          }

          // Thêm biến thể vào mảng dữ liệu
          allProducts.push(newVariant)

          // Lưu dữ liệu vào CSV
          saveProductsToCSV(
            () => {
              // Khôi phục trạng thái nút
              submitButton.innerHTML = originalText
              submitButton.disabled = false
              isUploading = false

              // Reset form
              document.getElementById("add-variant-form").reset()
              document.getElementById("variant-image-preview").classList.add("d-none")

              // Hiển thị thông báo
              showToast("Thành công", "Đã thêm biến thể màu sắc mới", "success")

              // Quay lại danh sách sản phẩm
              showSection("product-list")

              // Tải lại danh sách sản phẩm
              loadProducts()
            },
            (error) => {
              // Xử lý lỗi
              submitButton.innerHTML = originalText
              submitButton.disabled = false
              isUploading = false
              showToast("Lỗi", `Không thể lưu biến thể: ${error}`, "error")
            },
          )
        },
        (error) => {
          // Xử lý lỗi khi tải ảnh
          submitButton.innerHTML = originalText
          submitButton.disabled = false
          isUploading = false
          showToast("Lỗi", `Không thể tải ảnh lên: ${error}`, "error")
        },
      )
    } else {
      // Nếu không có GitHub token, hiển thị thông báo
      submitButton.innerHTML = originalText
      submitButton.disabled = false
      isUploading = false
      showToast("Lỗi", "Vui lòng nhập GitHub token trước khi thêm biến thể", "error")
      openSettingsModal()
    }
  }

  // Hàm thêm danh mục mới
  function addNewCategory() {
    const categoryName = document.getElementById("category-name").value

    if (!categoryName) {
      showToast("Lỗi", "Vui lòng nhập tên danh mục", "error")
      return
    }

    // Kiểm tra danh mục đã tồn tại chưa
    if (categories.has(categoryName)) {
      showToast("Cảnh báo", "Danh mục này đã tồn tại", "warning")
      return
    }

    // Thêm danh mục mới
    categories.add(categoryName)

    // Cập nhật giao diện
    displayCategories()

    // Reset form
    document.getElementById("category-name").value = ""

    // Hiển thị thông báo
    showToast("Thành công", "Đã thêm danh mục mới", "success")
  }

  // Hàm lưu dữ liệu vào CSV
  function saveProductsToCSV(successCallback, errorCallback) {
    // Chuẩn bị dữ liệu cho CSV
    const csvData = allProducts.map((product) => {
      return {
        imageUrl: product.imageUrl.replace("images/", ""),
        nameProduct: product.nameProduct,
        category: product.category,
        price: product.price,
        description: product.description || "",
        colors: product.colors || (product.color ? `${product.color.name}:${product.color.code}` : ""),
      }
    })

    // Tạo nội dung CSV
    const csvContent = Papa.unparse(csvData, {
      quotes: true, // Đảm bảo các trường có dấu phẩy được bọc trong dấu ngoặc kép
      quoteChar: '"',
      header: true,
      newline: "\n",
    })

    // Lưu vào localStorage để demo
    localStorage.setItem("productsCSV", csvContent)

    // Nếu có GitHub token, cập nhật file trên GitHub
    if (githubToken) {
      updateFileOnGitHub("products.csv", csvContent, "Cập nhật danh sách sản phẩm", successCallback, errorCallback)
    } else {
      if (errorCallback) errorCallback("Chưa cấu hình GitHub token")
      showToast("Cảnh báo", "Chưa cấu hình GitHub token. Dữ liệu chỉ được lưu cục bộ.", "warning")
    }
  }

  // Hàm hiển thị section
  function showSection(sectionId) {
    // Ẩn tất cả các section
    adminSections.forEach((section) => section.classList.remove("active"))

    // Hiển thị section được chọn
    document.getElementById(sectionId).classList.add("active")

    // Cập nhật menu
    adminMenuItems.forEach((item) => {
      if (item.getAttribute("data-target") === sectionId) {
        item.classList.add("active")
      } else {
        item.classList.remove("active")
      }
    })
  }

  // Hàm hiển thị modal xác nhận
  function showConfirmationModal(message, confirmCallback) {
    document.getElementById("confirmation-message").textContent = message

    // Xóa sự kiện click cũ
    const confirmButton = document.getElementById("confirm-action")
    const newConfirmButton = confirmButton.cloneNode(true)
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton)

    // Thêm sự kiện click mới
    newConfirmButton.addEventListener("click", confirmCallback)

    // Hiển thị modal
    confirmationModal.show()
  }

  // Hàm hiển thị thông báo
  function showToast(title, message, type = "info") {
    const toast = document.getElementById("toast-notification")
    const toastTitle = document.getElementById("toast-title")
    const toastMessage = document.getElementById("toast-message")

    // Xóa các class cũ
    toast.classList.remove("toast-success", "toast-warning", "toast-error")

    // Thêm class mới
    if (type === "success") {
      toast.classList.add("toast-success")
      toastTitle.innerHTML = '<i class="bi bi-check-circle me-2"></i>' + title
    } else if (type === "warning") {
      toast.classList.add("toast-warning")
      toastTitle.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>' + title
    } else if (type === "error") {
      toast.classList.add("toast-error")
      toastTitle.innerHTML = '<i class="bi bi-x-circle me-2"></i>' + title
    } else {
      toastTitle.innerHTML = '<i class="bi bi-info-circle me-2"></i>' + title
    }

    toastMessage.textContent = message

    // Hiển thị toast
    toastNotification.show()
  }

  // Hàm mở modal cài đặt
  function openSettingsModal() {
    // Điền giá trị token hiện tại vào form
    document.getElementById("github-token").value = githubToken
    document.getElementById("settingsModalLabel").textContent = "Nhập GitHub Token"
    document.getElementById("save-settings").textContent = "Lưu Token"
    settingsModal.show()
  }

  // Hàm lưu cài đặt
  function saveSettings() {
    const token = document.getElementById("github-token").value.trim()

    // Lưu token vào localStorage
    localStorage.setItem("githubToken", token)
    githubToken = token

    // Đóng modal
    settingsModal.hide()

    // Hiển thị thông báo
    showToast("Thành công", "Đã lưu GitHub token", "success")

    // Kiểm tra token
    if (token) {
      testGitHubToken(token)
    }
  }

  // Hàm kiểm tra GitHub token
  function testGitHubToken(token) {
    fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    })
      .then((response) => {
        if (response.ok) {
          showToast("Thành công", "Kết nối GitHub thành công", "success")
        } else {
          showToast("Lỗi", "Token GitHub không hợp lệ hoặc không có quyền truy cập", "error")
        }
      })
      .catch((error) => {
        console.error("Lỗi khi kiểm tra token GitHub:", error)
        showToast("Lỗi", "Không thể kết nối đến GitHub", "error")
      })
  }

  // Hàm cập nhật file trên GitHub
  function updateFileOnGitHub(path, content, commitMessage, successCallback, errorCallback) {
    // Hiển thị thông báo đang xử lý
    showToast("Đang xử lý", "Đang cập nhật dữ liệu lên GitHub...", "info")

    // Đầu tiên, lấy thông tin file hiện tại để có được SHA
    fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Không thể lấy thông tin file: ${response.status} ${response.statusText}`)
        }
        return response.json()
      })
      .then((data) => {
        // Chuẩn bị dữ liệu để cập nhật file
        const payload = {
          message: commitMessage,
          content: btoa(unescape(encodeURIComponent(content))), // Mã hóa nội dung thành base64
          sha: data.sha, // SHA của file hiện tại
          branch: "main",
        }

        // Gửi yêu cầu cập nhật file
        return fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
          method: "PUT",
          headers: {
            Authorization: `token ${githubToken}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github.v3+json",
          },
          body: JSON.stringify(payload),
        })
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Lỗi khi cập nhật file: ${response.status} ${response.statusText}`)
        }
        return response.json()
      })
      .then((data) => {
        showToast("Thành công", `Đã cập nhật ${path} lên GitHub`, "success")
        if (successCallback) successCallback(data)
      })
      .catch((error) => {
        console.error("Lỗi khi cập nhật file trên GitHub:", error)
        showToast("Lỗi", `Không thể cập nhật file lên GitHub: ${error.message}`, "error")
        if (errorCallback) errorCallback(error.message)
      })
  }

  // Hàm tải ảnh lên GitHub
  function uploadImageToGitHub(file, fileName, successCallback, errorCallback) {
    if (!githubToken) {
      if (errorCallback) errorCallback("Chưa cấu hình GitHub token")
      showToast("Lỗi", "Chưa cấu hình GitHub token. Không thể tải ảnh lên.", "error")
      return
    }

    // Hiển thị thông báo đang xử lý
    showToast("Đang xử lý", "Đang tải ảnh lên GitHub...", "info")

    // Đọc file thành base64
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      // Lấy phần base64 từ kết quả (bỏ qua phần data:image/jpeg;base64,)
      const base64data = reader.result.split(",")[1]

      // Chuẩn bị dữ liệu để tải lên
      const payload = {
        message: `Thêm ảnh sản phẩm: ${fileName}`,
        content: base64data,
        branch: "main",
      }

      // Gửi yêu cầu tải lên
      fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/images/${fileName}`, {
        method: "PUT",
        headers: {
          Authorization: `token ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify(payload),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Lỗi khi tải ảnh: ${response.status} ${response.statusText}`)
          }
          return response.json()
        })
        .then((data) => {
          showToast("Thành công", `Đã tải ảnh ${fileName} lên GitHub`, "success")
          if (successCallback) successCallback(fileName)
          return data
        })
        .catch((error) => {
          console.error("Lỗi khi tải ảnh lên GitHub:", error)
          showToast("Lỗi", `Không thể tải ảnh lên GitHub: ${error.message}`, "error")
          if (errorCallback) errorCallback(error.message)
        })
    }
  }

  // Đảm bảo chỉ hiển thị section đầu tiên khi tải trang
  adminSections.forEach((section, index) => {
    if (index === 0) {
      section.classList.add("active")
    } else {
      section.classList.remove("active")
    }
  })
})

// Thêm biến lưu trữ GitHub token
const githubToken = localStorage.getItem("githubToken") || ""
const REPO_OWNER = "phuoctt03"
const REPO_NAME = "KidFashion"

// Fix: Declare bootstrap and Papa
const bootstrap = window.bootstrap
const Papa = window.Papa

