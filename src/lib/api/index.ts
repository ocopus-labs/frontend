export * from './business';
export * from './subscription';
export * from './admin';
export {
  getMenu,
  publishMenu,
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  getItems,
  getItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
  bulkUpdateAvailability,
  seedDefaultCategories,
  type CreateCategoryPayload,
  type CreateMenuItemPayload,
  type MenuItemModifier
} from './menu';
export {
  createOrder,
  getOrders,
  getActiveOrders,
  getOrderStats,
  getOrderById,
  getOrderByNumber,
  getOrdersByTable,
  updateOrderStatus,
  addItemsToOrder,
  updateItemQuantity,
  updateItemStatus,
  removeItemFromOrder,
  applyDiscount,
  deleteOrder,
  exportOrders,
  type Order,
  type OrderItem,
  type OrderPricing,
  type OrderDiscount,
  type OrderStats,
  type CreateOrderPayload,
  type CreateOrderItemPayload,
  type OrderItemModifier as OrderItemModifierType
} from './order';
export {
  createPayment,
  createSplitPayment,
  getPayments,
  getPaymentSummary,
  getPaymentsByOrder,
  getPaymentById,
  generateReceipt,
  processRefund,
  getRefunds,
  deletePayment,
  exportPayments,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
  type PaymentSummary,
  type Receipt,
  type RefundEntry,
  type Refund,
  type CreatePaymentPayload,
  type CreateSplitPaymentPayload,
  type SplitPaymentItem,
  type RefundPayload
} from './payment';
export * from './types';
export {
  getDashboardStats,
  getOrderStats as getDashboardOrderStats,
  getPaymentSummary as getDashboardPaymentSummary,
  getTopSellingItems,
  getPeakHours,
  getRevenueTrends,
  type DashboardStats,
  type TopSellingItem,
  type PeakHour,
  type RevenueTrend
} from './dashboard';

// Customer API
export {
  getCustomers,
  getCustomerStats,
  getCustomerById,
  getCustomerWithOrders,
  findCustomerByPhone,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  exportCustomers,
  type Customer,
  type CustomerAddress,
  type CustomerStats,
  type CustomerOrderStats,
  type CreateCustomerPayload,
  type UpdateCustomerPayload
} from './customer';

// Table API
export {
  getTables,
  getTableStats,
  getTableById,
  getTableByNumber,
  createTable,
  updateTable,
  updateTableStatus,
  deleteTable,
  startTableSession,
  endTableSession,
  addMaintenanceLog,
  type Table,
  type TableStatus,
  type TableShape,
  type TablePosition,
  type TableDimensions,
  type TableSettings,
  type TableSession,
  type MaintenanceLog,
  type TableStats,
  type CreateTablePayload,
  type UpdateTablePayload,
  type UpdateTableStatusPayload,
  type StartTableSessionPayload,
  type EndTableSessionPayload,
  type AddMaintenanceLogPayload
} from './table';

// Reservation API
export {
  getReservations,
  getReservationStats,
  getReservationById,
  createReservation,
  updateReservation,
  confirmReservation,
  cancelReservation,
  seatReservation,
  completeReservation,
  deleteReservation,
  type Reservation,
  type ReservationStatus,
  type ReservationStats,
  type CreateReservationPayload,
  type UpdateReservationPayload
} from './table';

// Inventory API
export {
  getInventoryItems,
  getInventoryStats,
  getLowStockItems,
  getExpiringItems,
  getInventoryItemById,
  getInventoryItemBySku,
  createInventoryItem,
  updateInventoryItem,
  processStockTransaction,
  deleteInventoryItem,
  exportInventory,
  getStockTransactions,
  type InventoryItem,
  type InventoryTransaction,
  type InventoryCategory,
  type InventoryUnit,
  type InventoryStatus,
  type InventoryStats,
  type StockTransactionType,
  type CreateInventoryItemPayload,
  type UpdateInventoryItemPayload,
  type StockTransactionPayload,
  // Supplier API
  getSuppliers,
  getSupplierStats,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type Supplier,
  type SupplierStatus,
  type SupplierStats,
  type CreateSupplierPayload,
  type UpdateSupplierPayload
} from './inventory';

// Expense API
export {
  getExpenseCategories,
  getExpenseCategoryById,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  getExpenses,
  getExpenseSummary,
  getPendingExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense,
  markExpenseAsPaid,
  exportExpenses,
  type Expense,
  type ExpenseCategory,
  type ExpenseStatus,
  type ExpenseSummary,
  type PaymentMethod as ExpensePaymentMethod,
  type RecurringFrequency,
  type CreateExpenseCategoryPayload,
  type UpdateExpenseCategoryPayload,
  type CreateExpensePayload,
  type UpdateExpensePayload,
  type ApproveExpensePayload,
  type RejectExpensePayload,
  type MarkAsPaidPayload
} from './expense';

// Analytics API
export {
  getAnalyticsDashboard,
  getSalesSummary,
  getPaymentMethodBreakdown,
  getTopSellingItemsAnalytics,
  getHourlyBreakdown,
  getStaffPerformance,
  getFullReport,
  getDailyAnalytics,
  generateDailyAnalytics,
  type AnalyticsPeriod,
  type DashboardAnalytics,
  type SalesSummary,
  type PaymentMethodBreakdown,
  type TopSellingItemAnalytics,
  type HourlyBreakdown,
  type StaffPerformance,
  type DailyTrend,
  type FullReport,
  type AnalyticsDaily,
  type AnalyticsPeriodParams
} from './analytics';

// Search API
export {
  globalSearch,
  type SearchResult,
  type SearchResponse
} from './search';

// Team API
export {
  getTeamMembers,
  getTeamStats,
  getAvailableRoles,
  getPermissionTree,
  getTeamMemberById,
  inviteTeamMember,
  addExistingUser,
  updateTeamMember,
  updateMemberRole,
  updateMemberPermissions,
  suspendTeamMember,
  reactivateTeamMember,
  removeTeamMember,
  exportTeamMembers,
  type TeamMember,
  type TeamMemberStatus,
  type TeamRole,
  type TeamStats,
  type RoleInfo,
  type TeamInvitation,
  type PermissionCategory,
  type PermissionTree,
  type InviteTeamMemberPayload,
  type AddExistingUserPayload,
  type UpdateTeamMemberPayload,
  type UpdateMemberRolePayload,
  type UpdateMemberPermissionsPayload,
  type SuspendMemberPayload
} from './team';

// Loyalty API
export {
  getLoyaltySettings,
  updateLoyaltySettings,
  getLoyaltyAccount,
  getLoyaltyTransactions,
  redeemLoyaltyPoints,
  adjustLoyaltyPoints,
  getLoyaltyLeaderboard,
  type LoyaltySettings,
  type LoyaltyAccount,
  type LoyaltyTransaction,
  type LoyaltyLeaderboardEntry
} from './loyalty';

// Tax API
export {
  getTaxSettings,
  updateTaxSettings,
  validateTaxNumber,
  getTaxRegimes,
  exportTaxReport,
  type TaxSettings,
  type TaxRegime,
  type TaxCategoryConfig,
  type RegimeInfo,
  type TaxComponent,
  type ItemTaxBreakdown,
  type TaxBreakdown,
  type GstConfig,
  type VatConfig,
  type SalesTaxConfig
} from './tax';

// API Keys
export {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  rotateApiKey,
  AVAILABLE_SCOPES,
  AVAILABLE_PERMISSIONS,
  type ApiKey,
  type CreateApiKeyPayload,
  type CreateApiKeyResponse,
} from './api-keys';
