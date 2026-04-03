export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  finishedBookings: number;
  totalRevenue: number;
}

export interface WeeklyPerformanceResponse {
  stats: WeeklyStats;
}
