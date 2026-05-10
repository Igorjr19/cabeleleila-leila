export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  finishedBookings: number;
  totalRevenue: number;
  topServices: TopServiceStat[];
}

export interface TopServiceStat {
  serviceId: string;
  name: string;
  count: number;
  revenue: number;
}

export interface WeeklyPerformanceResponse {
  stats: WeeklyStats;
}
