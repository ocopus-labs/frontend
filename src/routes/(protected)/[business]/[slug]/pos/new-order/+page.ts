import type { PageLoad } from './$types';
import { getCachedMenu, getCachedTables } from '$lib/stores/pos-cache';
import { BUSINESS_TYPE_CONFIG } from '$lib/types/business';

export const load: PageLoad = async ({ parent, depends }) => {
  depends('app:menu');
  const { business } = await parent();

  // Check if this business type supports tables
  const businessConfig = BUSINESS_TYPE_CONFIG[business.type as keyof typeof BUSINESS_TYPE_CONFIG];
  const supportsTable = businessConfig?.features?.includes('tables') ?? false;

  try {
    // Load menu and tables in parallel (uses client-side cache if available)
    const [menuData, tablesData] = await Promise.all([
      getCachedMenu(business.id),
      supportsTable
        ? getCachedTables(business.id).catch((e) => {
            console.warn('Failed to load tables:', e);
            return { tables: [] };
          })
        : Promise.resolve({ tables: [] })
    ]);

    // Transform menu data for POS display
    const categories = menuData.categories
      .filter(c => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(category => ({
        id: category.id,
        name: category.name,
        count: menuData.items.filter(item => item.categoryId === category.id).length
      }));

    // Add "All Items" category at the beginning
    categories.unshift({
      id: 'all',
      name: 'All Items',
      count: menuData.items.length
    });

    // Build category requiresKitchen lookup
    const categoryMap = new Map<string, boolean>();
    for (const cat of menuData.categories) {
      categoryMap.set(cat.id, cat.requiresKitchen ?? true);
    }

    // Transform menu items
    const menuItems = menuData.items
      .filter(item => item.isAvailable)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(item => ({
        id: item.id,
        menuItemId: item.id,
        categoryId: item.categoryId,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image || '',
        available: item.isAvailable,
        isVegetarian: item.isVegetarian,
        isVegan: item.isVegan,
        isGlutenFree: item.isGlutenFree,
        preparationTime: item.preparationTime,
        requiresKitchen: item.requiresKitchen ?? categoryMap.get(item.categoryId) ?? true,
        modifiers: item.modifiers ? {
          sizes: item.modifiers.sizes?.map(s => ({
            id: s.id,
            name: s.name,
            price: s.price
          })),
          spiceLevels: item.modifiers.spiceLevels?.map(s => ({
            id: s.id,
            name: s.name,
            price: s.price
          })),
          preparation: item.modifiers.preparation,
          addOns: item.modifiers.addOns?.map(a => ({
            id: a.id,
            name: a.name,
            price: a.price
          })),
          removals: item.modifiers.removals
        } : undefined
      }));

    return {
      categories,
      menuItems,
      menuVersion: menuData.menuVersion,
      tables: tablesData.tables || [],
      supportsTable
    };
  } catch (e) {
    console.error('Failed to load menu:', e);
    // Return empty data if menu fetch fails
    return {
      categories: [{ id: 'all', name: 'All Items', count: 0 }],
      menuItems: [],
      menuVersion: 0,
      tables: [],
      supportsTable
    };
  }
};
