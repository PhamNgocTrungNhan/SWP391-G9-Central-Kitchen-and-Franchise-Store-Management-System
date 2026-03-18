export const appSummary = {
  activeApiCount: 39,
  inactiveControllers: ['ProductsController'],
}

export const navigationGroups = [
  {
    title: 'Tổng quan',
    items: [{ to: '/dashboard', key: 'dashboard', label: 'Bảng điều khiển', icon: 'dashboard' }],
  },
  {
    title: 'Dữ liệu gốc',
    items: [
      { to: '/products', key: 'products', label: 'Sản phẩm', icon: 'inventory' },
      { to: '/ingredients', key: 'ingredients', label: 'Nguyên liệu', icon: 'nutrition' },
      { to: '/organization/stores', key: 'stores', label: 'Cửa hàng', icon: 'storefront' },
      { to: '/organization/kitchens', key: 'kitchens', label: 'Bếp trung tâm', icon: 'kitchen' },
      { to: '/recipes', key: 'recipes', label: 'Công thức', icon: 'menu_book' },
      { to: '/users', key: 'users', label: 'Người dùng', icon: 'group' },
    ],
  },
  {
    title: 'Vận hành',
    items: [
      { to: '/inventory', key: 'inventory', label: 'Tồn kho', icon: 'inventory_2' },
      { to: '/store-orders', key: 'storeOrders', label: 'Đơn hàng cửa hàng', icon: 'shopping_cart' },
      { to: '/order-management', key: 'orderManagement', label: 'Quản lý đơn hàng', icon: 'assignment' },
      { to: '/production-batches/create', key: 'createProductionBatch', label: 'Tạo mẻ sản xuất', icon: 'precision_manufacturing' },
      { to: '/delivery', key: 'delivery', label: 'Giao hàng', icon: 'fact_check' },
      { to: '/dispatch', key: 'dispatch', label: 'Điều phối', icon: 'local_shipping' },
      { to: '/system-config', key: 'systemConfig', label: 'Cấu hình hệ thống', icon: 'settings' },
    ],
  },
]

export const pageCatalog = {
  dashboard: {
    controller: 'DashboardController',
    title: 'Operational Dashboard',
    description: 'A single overview screen for the three Dashboard endpoints: production, orders, and inventory. Filters are limited to the real query params days and locationType.',
    authorize: 'ADMIN, MANAGER',
    endpoints: [
      { method: 'GET', path: '/api/Dashboard/production', params: 'days?' },
      { method: 'GET', path: '/api/Dashboard/orders' },
      { method: 'GET', path: '/api/Dashboard/inventory', params: 'locationType?' },
    ],
  },
  categories: {
    controller: 'CategoryController',
    title: 'Category Management',
    description: 'A focused category CRUD screen mapped only to the four /api/Category endpoints. No search, export, or extra actions beyond the API.',
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
    title: 'Stores And Kitchens',
    description: 'Stores and kitchens are split into separate workspaces that mirror the seven OrganizationController endpoints. Kitchens do not show a delete action because no such API exists.',
    authorize: 'Stores: ADMIN/MANAGER view, ADMIN mutate | Kitchens: ADMIN/MANAGER view, ADMIN mutate',
    endpoints: [
      { method: 'GET', path: '/api/Organization/stores' },
      { method: 'POST', path: '/api/Organization/stores', body: 'Store' },
      { method: 'PUT', path: '/api/Organization/stores/{id}', body: 'Store' },
      { method: 'DELETE', path: '/api/Organization/stores/{id}' },
      { method: 'GET', path: '/api/Organization/kitchens' },
      { method: 'POST', path: '/api/Organization/kitchens', body: 'Kitchen' },
      { method: 'PUT', path: '/api/Organization/kitchens/{id}', body: 'Kitchen' },
    ],
  },
  recipes: {
    controller: 'RecipesController',
    title: 'Recipe Lines',
    description: 'This page manages recipe lines by parentProductId only. Product-management UI stays hidden because ProductsController is inactive.',
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
    title: 'Inventory Operations',
    description: 'The inventory UI is limited to four real flows: overall stock, store inventory by storeId, inventory logs, and transfer by orderId.',
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
    title: 'Internal Orders',
    description: 'This workspace covers order creation, list filtering by storeId and status, detail view, and the cancel, approve, reject, confirm-completed, and status-update actions.',
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
    title: 'Production Batches',
    description: 'This controller has no GET list endpoint. The UI therefore focuses on batch creation and an id-based workspace for status, allocation, and cancel actions.',
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
    title: 'User Administration',
    description: 'User administration is limited to the four /api/User CRUD endpoints. The old permission matrix is gone because the backend does not expose role-management APIs.',
    authorize: 'ADMIN',
    endpoints: [
      { method: 'GET', path: '/api/User' },
      { method: 'POST', path: '/api/User', body: 'User' },
      { method: 'PUT', path: '/api/User/{id}', body: 'User' },
      { method: 'DELETE', path: '/api/User/{userId}' },
    ],
  },
}

