import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BatchTraceabilityPage from './pages/BatchTraceabilityPage'
import FranchiseNetworkPage from './pages/FranchiseNetworkPage'
import KitchenManagementPage from './pages/KitchenManagementPage'
import RecipeBOMPage from './pages/RecipeBOMPage'
import StoreDeliveryPage from './pages/StoreDeliveryPage'
import SupplyDispatchPage from './pages/SupplyDispatchPage'
import UserRolesPage from './pages/UserRolesPage'
import StoreOrderPage from './pages/StoreOrderPage'
import OrderManagementPage from './pages/OrderManagementPage'
import SystemConfigPage from './pages/SystemConfigPage'
import ProductManagementPage from './pages/ProductManagementPage'
import IngredientManagementPage from './pages/IngredientManagementPage'
import CategoriesPage from './pages/CategoriesPage'
import OrganizationPage from './pages/OrganizationPage'
import RecipesPage from './pages/RecipesPage'
import InventoryPage from './pages/InventoryPage'
import InternalOrdersPage from './pages/InternalOrdersPage'
import ProductionBatchesPage from './pages/ProductionBatchesPage'
import CreateProductionBatchPage from './pages/CreateProductionBatchPage'
import UsersPage from './pages/UsersPage'
import Layout from './components/Layout'

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
        <Route path="/" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* API-first route set */}
          <Route path="/inventory" element={<BatchTraceabilityPage />} />
          <Route path="/organization/stores" element={<FranchiseNetworkPage />} />
          <Route path="/organization/kitchens" element={<KitchenManagementPage />} />
          <Route path="/organization" element={<Navigate to="/organization/stores" replace />} />
          <Route path="/network" element={<Navigate to="/organization/stores" replace />} />
          <Route path="/recipes" element={<RecipeBOMPage />} />
          <Route path="/delivery" element={<StoreDeliveryPage />} />
          <Route path="/dispatch" element={<SupplyDispatchPage />} />
          <Route path="/production-batches/create" element={<CreateProductionBatchPage />} />
          <Route path="/users" element={<UserRolesPage />} />
          <Route path="/store-orders" element={<StoreOrderPage />} />
          <Route path="/order-management" element={<OrderManagementPage />} />
          <Route path="/system-config" element={<SystemConfigPage />} />
          <Route path="/products" element={<ProductManagementPage />} />
          <Route path="/ingredients" element={<IngredientManagementPage />} />

          {/* FE route set (kept under separate paths) */}
          <Route path="/fe/categories" element={<CategoriesPage />} />
          <Route path="/fe/organization" element={<OrganizationPage />} />
          <Route path="/fe/recipes" element={<RecipesPage />} />
          <Route path="/fe/inventory" element={<InventoryPage />} />
          <Route path="/fe/internal-orders" element={<InternalOrdersPage />} />
          <Route path="/fe/production-batches" element={<ProductionBatchesPage />} />
          <Route path="/fe/users" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
