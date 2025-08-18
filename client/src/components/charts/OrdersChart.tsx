import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrdersChart() {
  // Simple mock data for the chart
  const chartData = [
    { day: "Lun", orders: 45, percentage: 75 },
    { day: "Mar", orders: 36, percentage: 60 },
    { day: "Mié", orders: 54, percentage: 90 },
    { day: "Jue", orders: 27, percentage: 45 },
    { day: "Vie", orders: 51, percentage: 85 },
    { day: "Sáb", orders: 21, percentage: 35 },
    { day: "Dom", orders: 15, percentage: 25 },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Órdenes por Día</CardTitle>
          <span className="text-sm text-gray-500">Últimos 7 días</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {chartData.map((data) => (
            <div key={data.day} className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-600 w-12">
                {data.day}
              </span>
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-primary h-3 rounded-full transition-all duration-500"
                  style={{ width: `${data.percentage}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900 w-8">
                {data.orders}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}