export * from './business';
export * from './subscription';
export * from './admin';
export {
  createFranchise,
  getUserFranchises,
  getFranchiseById,
  getFranchiseBySlug,
  updateFranchise,
  deleteFranchise,
  getFranchiseBusinesses,
  addBusinessToFranchise,
  createBusinessUnderFranchise,
  removeBusinessFromFranchise,
  getFranchiseStaff,
  inviteFranchiseStaff,
  updateFranchiseStaff,
  removeFranchiseStaff,
  getFranchiseAnalytics,
  updateFranchiseSettings,
  syncFranchiseSettings,
} from './franchise';
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
  bulkUpdatePrices,
  seedDefaultCategories,
  seedMenuTemplate,
  bulkImportMenuItems,
  getModifierGroups,
  getModifierGroupById,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  type CreateCategoryPayload,
  type CreateMenuItemPayload,
  type MenuItemModifier,
  type CreateModifierGroupPayload,
  type UpdateModifierGroupPayload,
  type ModifierGroupOptionPayload,
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getPOSLayout,
  savePOSLayout,
  getFavorites,
  addFavorite,
  removeFavorite,
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
  bulkUpdateItemStatuses,
  removeItemFromOrder,
  applyDiscount,
  deleteOrder,
  exportOrders,
  cancelItem,
  transferOrder,
  mergeOrders,
  splitOrder,
  reprintKot,
  acceptQrOrder,
  rejectQrOrder,
  type Order,
  type OrderItem,
  type OrderPricing,
  type OrderDiscount,
  type OrderStats,
  type CreateOrderPayload,
  type CreateOrderItemPayload,
  type OrderItemModifier as OrderItemModifierType,
  type CancellationReason
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
  getCustomerInsights,
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
  type CustomerInsights,
  type CustomerInsightsTopCustomer,
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
  bulkCreateTables,
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
  clockIn,
  clockOut,
  getCurrentShift,
  getShiftHistory,
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
  type SuspendMemberPayload,
  type StaffShift,
  type ClockOutPayload
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
  getGstSummary,
  type TaxSettings,
  type TaxRegime,
  type TaxCategoryConfig,
  type RegimeInfo,
  type TaxComponent,
  type ItemTaxBreakdown,
  type TaxBreakdown,
  type GstConfig,
  type VatConfig,
  type SalesTaxConfig,
  type GstSummary,
  type GstHsnSummaryEntry
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

// QR / UPI API
export {
  getUpiSettings,
  updateUpiSettings,
  generatePaymentQr,
  generateTableQr,
  generateAllTableQrs,
  getTableQr,
  type UpiSettings,
  type QrCodeResult,
  type TableQrCode
} from './qr';

// Cash Drawer API
export * from './cash-drawer';

// Kitchen Station API
export {
  getKitchenStations,
  createKitchenStation,
  updateKitchenStation,
  deleteKitchenStation,
  getUnassignedCategories,
  type KitchenStation
} from './kitchen-station';

// Features API
export {
  getBusinessFeatures,
  enableFeature,
  disableFeature,
  type FeatureInfo,
  type BusinessFeatures
} from './features';

// Customer Self-Ordering API
export {
  getPublicBusinessInfo,
  getPublicMenu,
  placeCustomerOrder,
  getOrderTracking,
  createCustomerPayment,
  generateCustomerPaymentQr,
  createDodoPaymentCheckout,
  getOrderingSettings,
  updateOrderingSettings,
  type PublicBusiness,
  type PublicMenuItem,
  type PublicMenuCategory,
  type CustomerOrderResult,
  type OrderTracking,
  type CustomerPlaceOrderPayload,
  type OrderingSettings,
  submitOrderFeedback
} from './customer-order';

// Notification API
export {
  registerDeviceToken,
  removeDeviceToken,
  getNotificationHistory
} from './notification';
