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
          <Route path="/inventory" element={<BatchTraceabilityPage />} />
          <Route path="/organization/stores" element={<FranchiseNetworkPage />} />
          <Route path="/organization/kitchens" element={<KitchenManagementPage />} />
          <Route path="/network" element={<Navigate to="/organization/stores" replace />} />
          <Route path="/recipes" element={<RecipeBOMPage />} />
          <Route path="/delivery" element={<StoreDeliveryPage />} />
          <Route path="/dispatch" element={<SupplyDispatchPage />} />
          <Route path="/users" element={<UserRolesPage />} />
          {/* New pages */}
          <Route path="/store-orders" element={<StoreOrderPage />} />
          <Route path="/order-management" element={<OrderManagementPage />} />
          <Route path="/system-config" element={<SystemConfigPage />} />
          <Route path="/products" element={<ProductManagementPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
