import { useState } from 'react'
import { Badge, Field, PageHeader, SectionCard, StatCard } from '../components/ui'

const productionByDays = {
  7: { planned: '1280', actual: '1214', batchesOpen: '4', batchesLate: '1' },
  30: { planned: '5180', actual: '5042', batchesOpen: '11', batchesLate: '2' },
  90: { planned: '15240', actual: '14872', batchesOpen: '17', batchesLate: '3' },
}

const orderBuckets = [
  { label: 'Chờ duyệt', value: 6, tone: 'amber' },
  { label: 'Đã duyệt', value: 15, tone: 'green' },
  { label: 'Từ chối', value: 2, tone: 'red' },
  { label: 'Hoàn tất', value: 19, tone: 'blue' },
]

const inventoryByLocation = {
  all: { lowStock: 12, transferReady: 6, storesAtRisk: 4 },
  store: { lowStock: 8, transferReady: 2, storesAtRisk: 4 },
  kitchen: { lowStock: 4, transferReady: 4, storesAtRisk: 0 },
}

const inventoryAlerts = [
  { item: 'Phô mai Mozzarella', place: 'Cửa hàng 101', stock: '3 kg', status: 'Sắp hết hàng' },
  { item: 'Sốt Burger', place: 'Cửa hàng 204', stock: '1 L', status: 'Có thể điều chuyển' },
  { item: 'Nền sốt cà chua', place: 'Bếp 2', stock: '18 L', status: 'Ổn định' },
]

export default function DashboardPage() {
  const [days, setDays] = useState('30')
  const [locationType, setLocationType] = useState('')

  const production = productionByDays[days]
  const inventory = inventoryByLocation[locationType || 'all']

  return (
    <div>
      <PageHeader
        pageKey="dashboard"
        aside={
          <div className="rounded-[1.5rem] border border-[#e6dccd] bg-[#fffdf8] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7858]">Bộ lọc truy vấn</p>
            <div className="mt-4 grid gap-4">
              <Field label="Số ngày">
                <select className="app-input" value={days} onChange={(event) => setDays(event.target.value)}>
                  <option value="7">7</option>
                  <option value="30">30</option>
                  <option value="90">90</option>
                </select>
              </Field>
              <Field label="Loại địa điểm">
                <select
                  className="app-input"
                  value={locationType}
                  onChange={(event) => setLocationType(event.target.value)}
                >
                  <option value="">Tất cả</option>
                  <option value="store">Cửa hàng</option>
                  <option value="kitchen">Bếp</option>
                </select>
              </Field>
            </div>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Tổng quan sản xuất"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard label="Số lượng kế hoạch" value={production.planned} tone="blue" />
            <StatCard label="Số lượng thực tế" value={production.actual} tone="green" />
            <StatCard label="Mẻ đang mở" value={production.batchesOpen} tone="amber" />
            <StatCard label="Mẻ trễ tiến độ" value={production.batchesLate} tone="red" />
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-[#e7dccd] bg-[#fffdf8] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#324334]">Sản lượng kế hoạch và thực tế</p>
              <Badge tone="stone">Chưa có API biểu đồ</Badge>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                { label: 'Bánh', planned: 92, actual: 88 },
                { label: 'Sốt', planned: 64, actual: 66 },
                { label: 'Sơ chế đông lạnh', planned: 70, actual: 63 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{row.label}</span>
                    <span className="text-slate-500">Thực tế {row.actual}%</span>
                  </div>
                  <div className="mt-3 rounded-full bg-[#ebe4d8] p-1">
                    <div className="h-3 rounded-full bg-[#d7d2c7]">
                      <div className="h-3 rounded-full bg-primary" style={{ width: `${row.actual}%` }} />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Kế hoạch {row.planned}%</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Tổng quan đơn hàng">
          <div className="grid gap-3">
            {orderBuckets.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-[1.4rem] border border-[#e6dccd] bg-[#fffdf8] px-4 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[#2f3d31]">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">Theo luồng nghiệp vụ đơn hàng nội bộ</p>
                </div>
                <Badge tone={item.tone}>{item.value}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Tổng quan tồn kho"
        className="mt-6"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Mặt hàng sắp hết" value={String(inventory.lowStock)} tone="red" />
          <StatCard label="Đơn sẵn sàng điều chuyển" value={String(inventory.transferReady)} tone="amber" />
          <StatCard label="Cửa hàng có rủi ro" value={String(inventory.storesAtRisk)} tone="blue" />
        </div>

        <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[#e7dccd]">
          <table className="app-table">
            <thead>
              <tr>
                <th className="app-th">Mặt hàng</th>
                <th className="app-th">Địa điểm</th>
                <th className="app-th">Tồn hiện tại</th>
                <th className="app-th">Cảnh báo</th>
              </tr>
            </thead>
            <tbody>
              {inventoryAlerts.map((row) => (
                <tr key={`${row.item}-${row.place}`} className="bg-[#fffdf8]">
                  <td className="app-td font-medium">{row.item}</td>
                  <td className="app-td">{row.place}</td>
                  <td className="app-td">{row.stock}</td>
                  <td className="app-td">
                    <Badge tone={row.status === 'Ổn định' ? 'green' : row.status === 'Sắp hết hàng' ? 'red' : 'amber'}>
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
