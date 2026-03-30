import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BatchTraceabilityPage from './pages/BatchTraceabilityPage'
import FranchiseNetworkPage from './pages/FranchiseNetworkPage'
import RecipeBOMPage from './pages/RecipeBOMPage'
import StoreDeliveryPage from './pages/StoreDeliveryPage'
import SupplyDispatchPage from './pages/SupplyDispatchPage'
import UserRolesPage from './pages/UserRolesPage'
import StoreOrderPage from './pages/StoreOrderPage'
import OrderManagementPage from './pages/OrderManagementPage'
import SystemConfigPage from './pages/SystemConfigPage'
import ProductManagementPage from './pages/ProductManagementPage'
import IngredientManagementPage from './pages/IngredientManagementPage'
import SuppliersPage from './pages/SuppliersPage'
import CategoriesPage from './pages/CategoriesPage'
import OrganizationPage from './pages/OrganizationPage'
import RecipesPage from './pages/RecipesPage'
import InventoryPage from './pages/InventoryPage'
import InventoryLogsPage from './pages/InventoryLogsPage'
import InternalOrdersPage from './pages/InternalOrdersPage'
import ProductionBatchesPage from './pages/ProductionBatchesPage'
import CreateProductionBatchPage from './pages/CreateProductionBatchPage'
import UsersPage from './pages/UsersPage'
import StoresPage from './pages/StoresPage'
import LandingPage from './pages/LandingPage'
import Layout from './components/Layout'
import { getDefaultPathByRole, roles } from './data/appSchema'
import { getCurrentUserRole, getStoredToken } from './utils/auth'

function RequireAuth({ children }) {
  const token = getStoredToken()
  if (!token) {
    return <Navigate to="/" replace />
  }
  return children
}

function RequireRole({ allowedRoles, children }) {
  const role = getCurrentUserRole()

  if (!allowedRoles || allowedRoles.length === 0) return children

  if (!allowedRoles.includes(role)) {
    const fallbackPath = getDefaultPathByRole(role)
    return <Navigate to={fallbackPath} replace />
  }

  return children
}

function LoginOrHome() {
  const token = getStoredToken()
  if (!token) return <LandingPage />

  const role = getCurrentUserRole()
  return <Navigate to={getDefaultPathByRole(role)} replace />
}

const routeConfig = [
  { path: '/dashboard', element: <DashboardPage />, roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF, roles.STORE_STAFF, roles.SUPPLY_COORDINATOR] },

  { path: '/inventory', element: <InventoryPage />, roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF, roles.SUPPLY_COORDINATOR] },
  { path: '/inventory-logs', element: <InventoryLogsPage />, roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF, roles.SUPPLY_COORDINATOR] },
  { path: '/organization/stores', element: <StoresPage />, roles: [roles.ADMIN, roles.MANAGER, roles.STORE_STAFF] },
  { path: '/organization/kitchens', element: <Navigate to="/organization/stores" replace />, roles: [roles.ADMIN, roles.MANAGER] },
  { path: '/organization', element: <Navigate to="/organization/stores" replace />, roles: [roles.ADMIN, roles.MANAGER] },
  { path: '/network', element: <Navigate to="/organization/stores" replace />, roles: [roles.ADMIN, roles.MANAGER] },
  { path: '/recipes', element: <RecipesPage />, roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF] },
  { path: '/delivery', element: <StoreDeliveryPage />, roles: [roles.ADMIN, roles.MANAGER, roles.STORE_STAFF, roles.SUPPLY_COORDINATOR] },
  { path: '/dispatch', element: <SupplyDispatchPage />, roles: [roles.ADMIN, roles.MANAGER, roles.SUPPLY_COORDINATOR] },
  { path: '/production-batches/create', element: <CreateProductionBatchPage />, roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF] },
  { path: '/users', element: <UsersPage />, roles: [roles.ADMIN] },
  { path: '/store-orders', element: <StoreOrderPage />, roles: [roles.ADMIN, roles.MANAGER, roles.STORE_STAFF] },
  { path: '/order-management', element: <OrderManagementPage />, roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF, roles.SUPPLY_COORDINATOR] },
  { path: '/system-config', element: <SystemConfigPage />, roles: [roles.ADMIN] },
  { path: '/products', element: <ProductManagementPage />, roles: [roles.ADMIN, roles.MANAGER] },
  { path: '/ingredients', element: <IngredientManagementPage />, roles: [roles.ADMIN, roles.MANAGER] },
  { path: '/suppliers', element: <SuppliersPage />, roles: [roles.ADMIN, roles.MANAGER, roles.STORE_STAFF, roles.SUPPLY_COORDINATOR] },

  { path: '/fe/categories', element: <CategoriesPage />, roles: [roles.ADMIN, roles.MANAGER] },
  { path: '/fe/organization', element: <OrganizationPage />, roles: [roles.ADMIN, roles.MANAGER] },
  { path: '/fe/recipes', element: <RecipesPage />, roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF] },
  { path: '/fe/inventory', element: <InventoryPage />, roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF, roles.SUPPLY_COORDINATOR] },
  { path: '/fe/internal-orders', element: <InternalOrdersPage />, roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF, roles.SUPPLY_COORDINATOR] },
  { path: '/fe/production-batches', element: <ProductionBatchesPage />, roles: [roles.ADMIN, roles.MANAGER, roles.KITCHEN_STAFF] },
  { path: '/fe/users', element: <UsersPage />, roles: [roles.ADMIN] },
]

function App() {
  useEffect(() => {
    const candidates = [
      localStorage.getItem('auth_token'),
      localStorage.getItem('token'),
      localStorage.getItem('access_token'),
      sessionStorage.getItem('auth_token'),
      sessionStorage.getItem('token'),
      sessionStorage.getItem('access_token'),
    ]

    const firstToken = candidates.find((item) => String(item || '').trim())
    if (!firstToken) return

    const normalized = String(firstToken).replace(/^Bearer\s+/i, '').trim()
    if (!normalized) return

    localStorage.setItem('auth_token', normalized)
    localStorage.setItem('token', normalized)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginOrHome />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={(
            <RequireAuth>
              <Layout />
            </RequireAuth>
          )}
        >
          {routeConfig.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<RequireRole allowedRoles={route.roles}>{route.element}</RequireRole>}
            />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
