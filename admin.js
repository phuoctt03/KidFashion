document.addEventListener("DOMContentLoaded", () => {
  // Biến lưu trữ dữ liệu
  let allProducts = []
  let categories = new Set()
  let originalCSV = "" // Lưu trữ CSV gốc để so sánh thay đổi
  let githubToken = localStorage.getItem("githubToken") || ""
  let isUploading = false // Biến để kiểm tra trạng thái đang tải lên

  // Thông tin GitHub repository
  const REPO_OWNER = "phuoctt03"
  const REPO_NAME = "KidFashion"

  // Biến để theo dõi trạng thái dữ liệu
  let dataModified = true

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

  // Kiểm tra đăng nhập
  checkLoginStatus()

  // Thêm sự kiện cho nút nhập token
  document.getElementById("settings-btn").addEventListener("click", openSettingsModal)

  // Thêm sự kiện cho nút reload products
  document.getElementById("reload-products-btn").addEventListener("click", reloadProductsFromCSV)

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
    // loginFunc() // Remove loginFunc call
  })

  // Hàm xử lý đăng nhập
  // function loginFunc() { // Remove loginFunc
  //   // Lấy giá trị từ các trường nhập liệu
  //   const username = document.getElementById("username").value
  //   const password = document.getElementById("password").value

  //   // Kiểm tra thông tin đăng nhập (ví dụ: so sánh với thông tin cố định)
  //   if (username === "admin" && password === "password") {
  //     // Đăng nhập thành công
  //     showToast("Thành công", "Đăng nhập thành công", "success")
  //     loginModal.hide()
  //   } else {
  //     // Đăng nhập thất bại
  //     showToast("Lỗi", "Tên đăng nhập hoặc mật khẩu không đúng", "error")
  //   }
  // }

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
    loadProducts()
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

    // Nếu dữ liệu đã được sửa đổi, sử dụng dữ liệu từ localStorage
    if (dataModified) {
      console.log("Sử dụng dữ liệu đã sửa đổi từ localStorage")
      const localData = localStorage.getItem("productsCSV")
      if (localData) {
        processCSVData(localData)
        return
      }
    }

    // Nếu không có sửa đổi hoặc không có dữ liệu trong localStorage, tải từ file CSV
    fetch("products.csv")
      .then((response) => response.text())
      .then((csvText) => {
        originalCSV = csvText // Lưu CSV gốc

        // Lấy dữ liệu từ localStorage (nếu có)
        const localData = localStorage.getItem("productsCSV")

        // Nếu không có dữ liệu trong localStorage hoặc dữ liệu CSV đã thay đổi, cập nhật localStorage
        if (!localData || localData !== csvText) {
          localStorage.setItem("productsCSV", csvText)
          console.log("Đã cập nhật dữ liệu từ file CSV vào localStorage")
        } else {
          console.log("Dữ liệu trong localStorage đã cập nhật")
        }

        // Xử lý dữ liệu CSV
        processCSVData(csvText)
      })
      .catch((error) => {
        console.error("Lỗi khi tải tệp CSV:", error)

        // Nếu không tải được file CSV, sử dụng dữ liệu từ localStorage (nếu có)
        const localData = localStorage.getItem("productsCSV")
        if (localData) {
          console.log("Sử dụng dữ liệu từ localStorage do không tải được file CSV")
          processCSVData(localData)
        } else {
          showToast("Lỗi", "Không thể tải dữ liệu sản phẩm", "error")
          productTableBody.innerHTML = `
            <tr>
              <td colspan="6" class="text-center py-4">Lỗi khi tải dữ liệu</td>
            </tr>
          `
        }
      })
  }

  // Thêm hàm mới để xử lý dữ liệu CSV
  function processCSVData(csvText) {
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

  // Cập nhật hàm hiển thị sản phẩm trong bảng để có cấu trúc gọn gàng hơn
  function displayProductsInTable(products) {
    productTableBody.innerHTML = ""

    if (products.length === 0) {
      productTableBody.innerHTML = `
    <tr>
      <td colspan="4" class="text-center py-4">Không có sản phẩm nào</td>
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
      <div class="product-img-container">
        <img src="${product.imageUrl}" alt="${product.nameProduct}" class="product-img">
      </div>
    </td>
    <td>
      <div class="product-info">
        <span class="product-name" title="${product.nameProduct}">${product.nameProduct}</span>
        <span class="product-category">${product.category}</span>
        <small class="variant-count">${product.variants ? product.variants.length : 0} màu sắc</small>
      </div>
    </td>
    <td>
      <div class="price-color-container">
        <span class="product-price">${formattedPrice}đ</span>
        <div class="color-dots-container">
          ${colorsHtml}
        </div>
      </div>
    </td>
    <td>
      <div class="action-buttons">
        <button class="btn btn-sm btn-outline-primary btn-action edit-product" data-product-name="${product.nameProduct}" title="Chỉnh sửa">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-success btn-action add-variant-to-product" data-product-name="${product.nameProduct}" title="Thêm màu sắc">
          <i class="bi bi-palette"></i>
        </button>
      </div>
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

  // Thay đổi hàm mở modal chỉnh sửa sản phẩm để hiển thị tất cả các màu sắc
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

    // Hiển thị tất cả các màu sắc
    const colorsContainer = document.getElementById("edit-product-colors")
    colorsContainer.innerHTML = ""

    product.variants.forEach((variant, index) => {
      const colorItem = document.createElement("div")
      colorItem.className = "color-variant-item"
      colorItem.setAttribute("data-variant-index", index)
      colorItem.innerHTML = `
<span class="color-dot" style="background-color: ${variant.color.code};"></span>
<span class="color-name">${variant.color.name}</span>
<div class="color-actions">
  <button type="button" class="btn btn-sm btn-outline-primary btn-action edit-variant" 
    data-variant-index="${index}" title="Sửa màu">
    <i class="bi bi-pencil"></i>
  </button>
  <button type="button" class="btn btn-sm btn-outline-info btn-action view-variant" 
    data-variant-index="${index}" title="Xem ảnh">
    <i class="bi bi-eye"></i>
  </button>
  <button type="button" class="btn btn-sm btn-outline-danger btn-action delete-variant" 
    data-variant-index="${index}" title="Xóa màu">
    <i class="bi bi-trash"></i>
  </button>
</div>
`
      colorsContainer.appendChild(colorItem)
    })

    // Thêm sự kiện cho nút xem biến thể
    document.querySelectorAll(".view-variant").forEach((button) => {
      button.addEventListener("click", function (e) {
        e.stopPropagation() // Ngăn sự kiện lan ra phần tử cha
        const variantIndex = this.getAttribute("data-variant-index")
        const variant = product.variants[variantIndex]
        document.getElementById("edit-current-image").src = variant.imageUrl
      })
    })

    // Thêm sự kiện cho nút sửa biến thể
    document.querySelectorAll(".edit-variant").forEach((button) => {
      button.addEventListener("click", function (e) {
        e.stopPropagation() // Ngăn sự kiện lan ra phần tử cha
        const variantIndex = this.getAttribute("data-variant-index")
        openEditColorForm(product, variantIndex)
      })
    })

    // Thêm sự kiện cho nút xóa biến thể
    document.querySelectorAll(".delete-variant").forEach((button) => {
      button.addEventListener("click", function (e) {
        e.stopPropagation() // Ngăn sự kiện lan ra phần tử cha
        const variantIndex = this.getAttribute("data-variant-index")
        const variant = product.variants[variantIndex]
        showConfirmationModal(`Bạn có chắc chắn muốn xóa màu "${variant.color.name}" không?`, () => {
          deleteVariant(productName, variantIndex)
        })
      })
    })

    // Thêm sự kiện click cho toàn bộ item màu sắc
    document.querySelectorAll(".color-variant-item").forEach((item) => {
      item.addEventListener("click", function () {
        const variantIndex = this.getAttribute("data-variant-index")
        openEditColorForm(product, variantIndex)
      })
    })

    // Ẩn form chỉnh sửa màu sắc
    document.getElementById("edit-color-form").classList.add("d-none")

    // Hiển thị modal
    editProductModal.show()
  }

  // Thêm hàm mở form chỉnh sửa màu sắc
  function openEditColorForm(product, variantIndex) {
    const variant = product.variants[variantIndex]
    const colorForm = document.getElementById("edit-color-form")

    // Đánh dấu màu đang được chọn
    document.querySelectorAll(".color-variant-item").forEach((item) => {
      item.classList.remove("active")
    })
    document.querySelector(`.color-variant-item[data-variant-index="${variantIndex}"]`).classList.add("active")

    // Hiển thị form chỉnh sửa màu
    colorForm.classList.remove("d-none")

    // Cập nhật thông tin màu sắc vào form
    document.getElementById("current-color-name").textContent = variant.color.name
    document.getElementById("edit-color-name").value = variant.color.name
    document.getElementById("edit-color-code").value = variant.color.code
    document.getElementById("edit-color-index").value = variantIndex

    // Hiển thị ảnh của biến thể
    document.getElementById("edit-current-image").src = variant.imageUrl
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

  // Cập nhật hàm lưu chỉnh sửa sản phẩm để giữ nguyên các biến thể màu sắc
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

    // Xóa tất cả các sản phẩm có cùng tên (bao gồm các biến thể màu sắc)
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
    const imageFileName = `${Date.now()}.jpg`

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
    const imageFileName = `${Date.now()}.jpg`

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
    // Hiển thị thông báo đang xử lý
    showToast("Đang xử lý", "Đang cập nhật dữ liệu lên GitHub...", "info")

    // Đánh dấu dữ liệu đã thay đổi
    dataModified = true

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

        // Lưu vào localStorage
        localStorage.setItem("productsCSV", csvContent)

        // Cập nhật dữ liệu hiện tại
        const groupedProducts = groupProductsByName(allProducts)
        displayProductsInTable(groupedProducts)
        extractCategories()
        displayCategories()
        updateProductSelect()

        // Hiển thị thông báo lưu cục bộ thành công
        showToast("Thành công", "Đã lưu dữ liệu vào bộ nhớ cục bộ", "success")

        // Nếu có GitHub token, cập nhật file trên GitHub
        if (githubToken) {
          updateFileOnGitHub("products.csv", csvContent, "Cập nhật danh sách sản phẩm", successCallback, errorCallback)
        } else {
          if (successCallback) successCallback()
          showToast("Cảnh báo", "Chưa cấu hình GitHub token. Dữ liệu chỉ được lưu cục bộ.", "warning")
        }
      })
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

  // Hàm tải lại dữ liệu từ file CSV
  function reloadProductsFromCSV() {
    // Hiển thị thông báo đang tải
    showToast("Đang xử lý", "Đang tải lại dữ liệu từ file CSV...", "info")

    // Hiển thị loading trong bảng sản phẩm
    showLoading(productTableBody, 6)

    // Tải lại file CSV
    fetch("products.csv")
      .then((response) => response.text())
      .then((csvText) => {
        // Lưu CSV mới vào localStorage
        localStorage.setItem("productsCSV", csvText)
        originalCSV = csvText

        // Xử lý dữ liệu CSV
        processCSVData(csvText)

        // Đặt lại trạng thái dữ liệu
        dataModified = false

        // Hiển thị thông báo thành công
        showToast("Thành công", "Đã tải lại dữ liệu từ file CSV", "success")
      })
      .catch((error) => {
        console.error("Lỗi khi tải tệp CSV:", error)
        showToast("Lỗi", "Không thể tải lại dữ liệu từ file CSV", "error")
      })
  }

  // Thêm hàm xóa biến thể màu sắc
  function deleteVariant(productName, variantIndex) {
    if (isUploading) {
      showToast("Thông báo", "Đang có quá trình tải lên, vui lòng đợi", "warning")
      return
    }

    // Tìm sản phẩm theo tên
    const groupedProducts = groupProductsByName(allProducts)
    const product = groupedProducts.find((p) => p.nameProduct === productName)

    if (!product || !product.variants || !product.variants[variantIndex]) {
      showToast("Lỗi", "Không tìm thấy biến thể màu sắc", "error")
      return
    }

    // Lấy thông tin biến thể cần xóa
    const variant = product.variants[variantIndex]
    const colorName = variant.color.name
    const imageUrl = variant.imageUrl

    // Kiểm tra xem có phải biến thể cuối cùng không
    if (product.variants.length <= 1) {
      showToast(
        "Cảnh báo",
        "Không thể xóa biến thể cuối cùng của sản phẩm. Hãy xóa toàn bộ sản phẩm nếu cần.",
        "warning",
      )
      return
    }

    // Hiển thị trạng thái đang xử lý
    isUploading = true

    // Xóa biến thể khỏi mảng dữ liệu
    allProducts = allProducts.filter((p) => !(p.nameProduct === productName && p.imageUrl === imageUrl))

    // Lưu dữ liệu vào CSV
    saveProductsToCSV(
      () => {
        // Khôi phục trạng thái
        isUploading = false

        // Đóng modal xác nhận
        confirmationModal.hide()

        // Hiển thị thông báo
        showToast("Thành công", `Đã xóa màu "${colorName}" của sản phẩm "${productName}"`, "success")

        // Cập nhật lại modal chỉnh sửa sản phẩm
        openEditProductModal(productName)
      },
      (error) => {
        // Xử lý lỗi
        isUploading = false
        showToast("Lỗi", `Không thể xóa biến thể: ${error}`, "error")
      },
    )
  }

  // Thêm hàm saveColorEdit vào bên trong phạm vi của hàm chính
  // Thêm vào trước dòng "// Thêm sự kiện cho nút lưu màu sắc"

  // Hàm lưu chỉnh sửa màu sắc
  function saveColorEdit() {
    const productId = document.getElementById("edit-product-id").value
    const variantIndex = document.getElementById("edit-color-index").value
    const newColorName = document.getElementById("edit-color-name").value
    const newColorCode = document.getElementById("edit-color-code").value

    if (!newColorName) {
      showToast("Lỗi", "Vui lòng nhập tên màu", "error")
      return
    }

    // Tìm sản phẩm theo tên
    const groupedProducts = groupProductsByName(allProducts)
    const product = groupedProducts.find((p) => p.nameProduct === productId)

    if (!product || !product.variants || !product.variants[variantIndex]) {
      showToast("Lỗi", "Không tìm thấy biến thể màu sắc", "error")
      return
    }

    // Cập nhật thông tin màu sắc trong dữ liệu
    const variant = product.variants[variantIndex]
    const oldColorName = variant.color.name
    const imageUrl = variant.imageUrl

    // Tìm sản phẩm thực tế trong allProducts để cập nhật
    const actualProduct = allProducts.find((p) => p.nameProduct === productId && p.imageUrl === imageUrl)

    if (actualProduct) {
      // Cập nhật màu sắc
      actualProduct.colors = `${newColorName}:${newColorCode}`
      if (actualProduct.color) {
        actualProduct.color.name = newColorName
        actualProduct.color.code = newColorCode
      }

      // Cập nhật giao diện
      const colorItem = document.querySelector(`.color-variant-item[data-variant-index="${variantIndex}"]`)
      if (colorItem) {
        colorItem.querySelector(".color-name").textContent = newColorName
        colorItem.querySelector(".color-dot").style.backgroundColor = newColorCode
      }

      // Cập nhật tên màu hiện tại
      document.getElementById("current-color-name").textContent = newColorName

      // Hiển thị thông báo
      showToast("Thành công", `Đã cập nhật màu từ "${oldColorName}" thành "${newColorName}"`, "success")

      // Đánh dấu dữ liệu đã thay đổi
      dataModified = true
    } else {
      showToast("Lỗi", "Không thể cập nhật màu sắc", "error")
    }
  }

  // Thêm sự kiện cho nút lưu màu sắc
  document.getElementById("save-edit-color").addEventListener("click", saveColorEdit)

  // Thêm sự kiện cho nút hủy chỉnh sửa màu sắc
  document.getElementById("cancel-edit-color").addEventListener("click", () => {
    document.getElementById("edit-color-form").classList.add("d-none")
    document.querySelectorAll(".color-variant-item").forEach((item) => {
      item.classList.remove("active")
    })
  })

  // Thêm hàm lưu chỉnh sửa màu sắc
  // function saveColorEdit() {
  //   const productId = document.getElementById("edit-product-id").value
  //   const variantIndex = document.getElementById("edit-color-index").value
  //   const newColorName = document.getElementById("edit-color-name").value
  //   const newColorCode = document.getElementById("edit-color-code").value

  //   if (!newColorName) {
  //     showToast("Lỗi", "Vui lòng nhập tên màu", "error")
  //     return
  //   }

  //   // Tìm sản phẩm theo tên
  //   const groupedProducts = groupProductsByName(allProducts)
  //   const product = groupedProducts.find((p) => p.nameProduct === productId)

  //   if (!product || !product.variants || !product.variants[variantIndex]) {
  //     showToast("Lỗi", "Không tìm thấy biến thể màu sắc", "error")
  //     return
  //   }

  //   // Cập nhật thông tin màu sắc trong dữ liệu
  //   const variant = product.variants[variantIndex]
  //   const oldColorName = variant.color.name
  //   const imageUrl = variant.imageUrl

  //   // Tìm sản phẩm thực tế trong allProducts để cập nhật
  //   const actualProduct = allProducts.find((p) => p.nameProduct === productId && p.imageUrl === imageUrl)

  //   if (actualProduct) {
  //     // Cập nhật màu sắc
  //     actualProduct.colors = `${newColorName}:${newColorCode}`
  //     if (actualProduct.color) {
  //       actualProduct.color.name = newColorName
  //       actualProduct.color.code = newColorCode
  //     }

  //     // Cập nhật giao diện
  //     const colorItem = document.querySelector(`.color-variant-item[data-variant-index="${variantIndex}"]`)
  //     if (colorItem) {
  //       colorItem.querySelector(".color-name").textContent = newColorName
  //       colorItem.querySelector(".color-dot").style.backgroundColor = newColorCode
  //     }

  //     // Cập nhật tên màu hiện tại
  //     document.getElementById("current-color-name").textContent = newColorName

  //     // Hiển thị thông báo
  //     showToast("Thành công", `Đã cập nhật màu từ "${oldColorName}" thành "${newColorName}"`, "success")

  //     // Đánh dấu dữ liệu đã thay đổi
  //     dataModified = true
  //   } else {
  //     showToast("Lỗi", "Không thể cập nhật màu sắc", "error")
  //   }
  // }
})

// Thêm biến lưu trữ GitHub token
const githubToken = localStorage.getItem("githubToken") || ""
const REPO_OWNER = "phuoctt03"
const REPO_NAME = "KidFashion"
const path = "products.csv"

// Fix: Declare bootstrap and Papa
const bootstrap = window.bootstrap
const Papa = window.Papa

// Xóa hàm loginFunc vì không cần đăng nhập
// Xóa sự kiện đăng nhập
document.getElementById("login-form").removeEventListener("submit", (e) => {
  e.preventDefault()
  // loginFunc()
})

// Thêm mã JavaScript cho nút cuộn lên đầu trang vào cuối file, trước dấu đóng ngoặc cuối cùng

// Xử lý nút cuộn lên đầu trang
document.addEventListener("DOMContentLoaded", () => {
  const scrollToTopBtn = document.getElementById("scroll-to-top")

  // Hiển thị nút khi cuộn xuống 300px
  window.addEventListener("scroll", () => {
    if (window.pageYOffset > 300) {
      scrollToTopBtn.classList.add("show")
    } else {
      scrollToTopBtn.classList.remove("show")
    }
  })

  // Cuộn lên đầu trang khi nhấp vào nút
  scrollToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  })
})

