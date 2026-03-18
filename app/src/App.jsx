import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CategoriesPage from './pages/CategoriesPage'
import OrganizationPage from './pages/OrganizationPage'
import RecipesPage from './pages/RecipesPage'
import InventoryPage from './pages/InventoryPage'
import InternalOrdersPage from './pages/InternalOrdersPage'
import ProductionBatchesPage from './pages/ProductionBatchesPage'
import UsersPage from './pages/UsersPage'
import Layout from './components/Layout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/organization" element={<OrganizationPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/internal-orders" element={<InternalOrdersPage />} />
          <Route path="/production-batches" element={<ProductionBatchesPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
