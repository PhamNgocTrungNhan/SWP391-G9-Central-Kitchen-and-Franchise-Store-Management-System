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
import Layout from './components/Layout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inventory" element={<BatchTraceabilityPage />} />
          <Route path="/network" element={<FranchiseNetworkPage />} />
          <Route path="/recipes" element={<RecipeBOMPage />} />
          <Route path="/delivery" element={<StoreDeliveryPage />} />
          <Route path="/dispatch" element={<SupplyDispatchPage />} />
          <Route path="/users" element={<UserRolesPage />} />
          {/* New pages */}
          <Route path="/store-orders" element={<StoreOrderPage />} />
          <Route path="/order-management" element={<OrderManagementPage />} />
          <Route path="/system-config" element={<SystemConfigPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
