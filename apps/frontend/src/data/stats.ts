/** Mock aggregates powering the Statistics page, shaped for Recharts. */

export const statCards = [
  { label: 'Revenue', value: 'EGP 758,740', delta: '+24%', tone: 'success' as const },
  { label: 'Products Sold', value: '1,846', delta: '+16%', tone: 'success' as const },
  { label: 'Low Stock', value: '8 items', delta: '-3%', tone: 'warning' as const },
  { label: 'Active Users', value: '6', delta: '+2', tone: 'primary' as const },
]

export const revenueTrend = [
  { month: 'Dec', revenue: 38 },
  { month: 'Jan', revenue: 42 },
  { month: 'Feb', revenue: 45 },
  { month: 'Mar', revenue: 49 },
  { month: 'Apr', revenue: 52 },
  { month: 'May', revenue: 48 },
  { month: 'Jun', revenue: 56 },
  { month: 'Jul', revenue: 61 },
  { month: 'Aug', revenue: 58 },
  { month: 'Sep', revenue: 64 },
  { month: 'Oct', revenue: 70 },
  { month: 'Nov', revenue: 76 },
]

export const salesByCategory = [
  { name: 'Materials', value: 42 },
  { name: 'Machine Parts', value: 26 },
  { name: 'Laser Tubes', value: 18 },
  { name: 'Optics', value: 10 },
  { name: 'Safety', value: 4 },
]

export const weeklyBills = [
  { day: 'Sun', paid: 4, pending: 2, overdue: 1 },
  { day: 'Mon', paid: 6, pending: 1, overdue: 0 },
  { day: 'Tue', paid: 3, pending: 3, overdue: 1 },
  { day: 'Wed', paid: 7, pending: 2, overdue: 0 },
  { day: 'Thu', paid: 5, pending: 4, overdue: 1 },
  { day: 'Fri', paid: 2, pending: 1, overdue: 0 },
  { day: 'Sat', paid: 3, pending: 2, overdue: 0 },
]
