export const appSummary = {
  activeApiCount: 38,
  inactiveControllers: ['ProductsController'],
}

export const roles = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  KITCHEN_STAFF: 'KITCHEN_STAFF',
  STORE_STAFF: 'STORE_STAFF',
  SUPPLY_COORDINATOR: 'SUPPLY_COORDINATOR',
}

const operationalRoles = [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF, roles.STORE_STAFF, roles.SUPPLY_COORDINATOR]

export const navigationGroups = [
  {
    title: 'Tổng quan',
    items: [
      { to: '/dashboard', key: 'dashboard', label: 'Dashboard', icon: 'dashboard', roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF, roles.SUPPLY_COORDINATOR] },
    ],
  },
  {
    title: 'Quản lý',
    items: [
      { to: '/products', key: 'products', label: 'Sản phẩm', icon: 'inventory', roles: [roles.ADMIN, roles.MANAGER] },
      { to: '/categories', key: 'categories', label: 'Danh mục', icon: 'category', roles: [roles.ADMIN, roles.MANAGER] },
      { to: '/ingredients', key: 'ingredients', label: 'Nguyên liệu', icon: 'nutrition', roles: [roles.ADMIN, roles.MANAGER] },
      { to: '/recipes', key: 'recipes', label: 'Công thức', icon: 'menu_book', roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF] },
      { to: '/organization/stores', key: 'stores', label: 'Cửa hàng', icon: 'storefront', roles: [roles.ADMIN, roles.MANAGER, roles.STORE_STAFF] },
      { to: '/suppliers', key: 'suppliers', label: 'Nhà cung cấp', icon: 'local_shipping', roles: [roles.ADMIN, roles.MANAGER, roles.SUPPLY_COORDINATOR] },
    ],
  },
  {
    title: 'Vận hành',
    items: [
      { to: '/inventory', key: 'inventory', label: 'Quản lý kho', icon: 'inventory_2', roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF, roles.SUPPLY_COORDINATOR] },
      { to: '/inventory-logs', key: 'inventoryLogs', label: 'Lịch sử tồn kho', icon: 'history', roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF, roles.SUPPLY_COORDINATOR] },
      { to: '/store-orders', key: 'storeOrders', label: 'Quản lý đặt hàng', icon: 'shopping_cart', roles: [roles.MANAGER, roles.STORE_STAFF] },
      { to: '/order-management', key: 'orderManagement', label: 'Quản lý đơn', icon: 'assignment', roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF, roles.SUPPLY_COORDINATOR] },
      { to: '/payments', key: 'payments', label: 'Thanh toán', icon: 'payments', roles: [roles.ADMIN, roles.MANAGER, roles.STORE_STAFF] },
      { to: '/production-batches/create', key: 'createProductionBatch', label: 'Tạo mẻ SX', icon: 'precision_manufacturing', roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF] },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { to: '/users', key: 'users', label: 'Người dùng', icon: 'group', roles: [roles.ADMIN] },
    ],
  },
]

export function getNavigationByRole(role) {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)
}

export function getDefaultPathByRole(role) {
  const firstGroup = getNavigationByRole(role)[0]
  const firstItem = firstGroup?.items?.[0]
  return firstItem?.to || '/'
}

export const pageCatalog = {
  dashboard: {
    controller: 'DashboardController',
    title: 'Bảng điều khiển vận hành',
    description: 'Màn hình tổng quan cho ba nhóm API Dashboard: sản xuất, đơn hàng và tồn kho. Bộ lọc chỉ dùng đúng query params days và locationType.',
    authorize: 'ADMIN, MANAGER',
    endpoints: [
      { method: 'GET', path: '/api/Dashboard/production', params: 'days?' },
      { method: 'GET', path: '/api/Dashboard/orders' },
      { method: 'GET', path: '/api/Dashboard/inventory', params: 'locationType?' },
    ],
  },
  categories: {
    controller: 'CategoryController',
    title: 'Quản lý danh mục',
    description: 'Màn hình CRUD danh mục bám đúng bốn endpoint /api/Category, không bổ sung thao tác ngoài phạm vi API.',
    authorize: 'ADMIN, MANAGER',
    endpoints: [
      { method: 'GET', path: '/api/Category' },
      { method: 'POST', path: '/api/Category', body: 'CategoryRequest' },
      { method: 'PUT', path: '/api/Category/{id}', body: 'CategoryRequest' },
      { method: 'DELETE', path: '/api/Category/{id}' },
    ],
  },
  organization: {
    controller: 'OrganizationController',
    title: 'Cửa hàng và bếp trung tâm',
    description: 'Không gian cho cửa hàng và bếp tách riêng theo sáu endpoint của OrganizationController. Bếp hiện chỉ hỗ trợ đọc và cập nhật.',
    authorize: 'Stores: ADMIN/MANAGER view, ADMIN mutate | Kitchens: ADMIN/MANAGER view, ADMIN mutate',
    endpoints: [
      { method: 'GET', path: '/api/Organization/stores' },
      { method: 'POST', path: '/api/Organization/stores', body: 'Store' },
      { method: 'PUT', path: '/api/Organization/stores/{id}', body: 'Store' },
      { method: 'DELETE', path: '/api/Organization/stores/{id}' },
      { method: 'GET', path: '/api/Organization/kitchens' },
      { method: 'PUT', path: '/api/Organization/kitchens/{id}', body: 'Kitchen' },
    ],
  },
  recipes: {
    controller: 'RecipesController',
    title: 'Quản lý công thức',
    description: 'Trang này quản lý dòng công thức theo parentProductId. Phần quản lý sản phẩm bị ẩn vì ProductsController đang không hoạt động.',
    authorize: 'ADMIN, MANAGER',
    endpoints: [
      { method: 'GET', path: '/api/Recipes/parent/{parentProductId}' },
      { method: 'POST', path: '/api/Recipes', body: 'RecipeRequest' },
      { method: 'PUT', path: '/api/Recipes/{id}', body: 'RecipeRequest' },
      { method: 'DELETE', path: '/api/Recipes/{id}' },
    ],
  },
  inventory: {
    controller: 'InventoryController',
    title: 'Nghiệp vụ tồn kho',
    description: 'Giao diện tồn kho giới hạn trong bốn luồng chính: tồn tổng, tồn theo storeId, nhật ký tồn kho và chuyển hàng theo orderId.',
    authorize: 'ADMIN, MANAGER',
    endpoints: [
      { method: 'GET', path: '/api/Inventory/stock' },
      { method: 'GET', path: '/api/Inventory/store/{storeId}' },
      { method: 'GET', path: '/api/Inventory/logs' },
      { method: 'POST', path: '/api/Inventory/transfer/{orderId}' },
    ],
  },
  internalOrders: {
    controller: 'InternalOrderController',
    title: 'Đơn hàng nội bộ',
    description: 'Không gian này bao gồm tạo đơn, lọc danh sách theo storeId và trạng thái, xem chi tiết, cùng các thao tác hủy, duyệt, từ chối, xác nhận hoàn tất và cập nhật trạng thái.',
    authorize: 'No [Authorize] attribute on controller/actions',
    endpoints: [
      { method: 'POST', path: '/api/internal-orders', body: 'CreateInternalOrderRequest' },
      { method: 'GET', path: '/api/internal-orders', params: 'storeId, status?' },
      { method: 'GET', path: '/api/internal-orders/{orderId}' },
      { method: 'PUT', path: '/api/internal-orders/{orderId}/cancel' },
      { method: 'PUT', path: '/api/internal-orders/{orderId}/confirm-completed' },
      { method: 'PUT', path: '/api/internal-orders/{orderId}/approve', note: 'approvedBy hardcoded = 1' },
      { method: 'PUT', path: '/api/internal-orders/{orderId}/reject', body: 'RejectOrderRequest' },
      { method: 'PUT', path: '/api/internal-orders/{orderId}/status', body: 'UpdateOrderStatusRequest' },
    ],
  },
  productionBatches: {
    controller: 'ProductionBatchesController',
    title: 'Mẻ sản xuất',
    description: 'Controller này chưa có endpoint GET danh sách, nên UI tập trung vào tạo mẻ và thao tác theo id gồm đổi trạng thái, phân bổ và hủy. Khi chuyển sang IN_PROGRESS, backend sẽ bung BOM đệ quy đến nguyên liệu RAW và trừ tồn kho theo tổng nhu cầu.',
    authorize: 'ADMIN, MANAGER',
    endpoints: [
      { method: 'POST', path: '/api/ProductionBatches', body: 'BatchCreateRequest' },
      { method: 'PUT', path: '/api/ProductionBatches/{id}/status', body: 'BatchStatusUpdateRequest' },
      { method: 'POST', path: '/api/ProductionBatches/{id}/allocate', body: 'List<BatchAllocationRequest>' },
      { method: 'PUT', path: '/api/ProductionBatches/{id}/cancel' },
    ],
  },
  users: {
    controller: 'UserController',
    title: 'Quản trị người dùng',
    description: 'Quản trị người dùng hiện giới hạn ở bốn endpoint CRUD /api/User. Ma trận phân quyền cũ đã bỏ vì backend chưa cung cấp API quản lý role.',
    authorize: 'ADMIN',
    endpoints: [
      { method: 'GET', path: '/api/User' },
      { method: 'POST', path: '/api/User', body: 'User' },
      { method: 'PUT', path: '/api/User/{id}', body: 'User' },
      { method: 'DELETE', path: '/api/User/{userId}' },
    ],
  },
  payments: {
    controller: 'InternalOrderController',
    title: 'Thanh toán và hoàn tiền',
    description: 'Workspace thanh toán tích hợp PayOS QR code và xử lý hoàn tiền theo chính sách. Hỗ trợ tạo link thanh toán, webhook tự động và hoàn tiền theo policy.',
    authorize: 'ADMIN (view-only), MANAGER, STORE_STAFF',
    endpoints: [
      { method: 'POST', path: '/api/internal-orders/{orderId}/payos-link', params: 'returnUrl, cancelUrl' },
      { method: 'POST', path: '/api/internal-orders/payos-webhook', note: 'PayOS tự động gọi' },
      { method: 'POST', path: '/api/internal-orders/{orderId}/pay', note: 'Thanh toán thủ công' },
      { method: 'GET', path: '/api/internal-orders/refund-policies' },
      { method: 'POST', path: '/api/internal-orders/{orderId}/refund', body: 'RefundRequest' },
    ],
  },
}
