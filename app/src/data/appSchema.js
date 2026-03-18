export const appSummary = {
  activeApiCount: 39,
  inactiveControllers: ['ProductsController'],
}

export const navigationGroups = [
  {
    title: 'Overview',
    items: [{ to: '/dashboard', key: 'dashboard', label: 'Dashboard', icon: 'dashboard' }],
  },
  {
    title: 'Master Data',
    items: [
      { to: '/categories', key: 'categories', label: 'Categories', icon: 'category' },
      { to: '/organization', key: 'organization', label: 'Organization', icon: 'apartment' },
      { to: '/recipes', key: 'recipes', label: 'Recipes', icon: 'menu_book' },
      { to: '/users', key: 'users', label: 'Users', icon: 'group' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/inventory', key: 'inventory', label: 'Inventory', icon: 'inventory_2' },
      { to: '/internal-orders', key: 'internalOrders', label: 'Internal Orders', icon: 'swap_horiz' },
      { to: '/production-batches', key: 'productionBatches', label: 'Production Batches', icon: 'precision_manufacturing' },
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

