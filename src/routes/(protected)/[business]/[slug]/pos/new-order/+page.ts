import type { PageLoad } from './$types';
import { getMenu } from '$lib/api/menu';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, parent, fetch }) => {
  const { business } = await parent();

  try {
    const menuData = await getMenu(business.id, { fetch });

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
        image: item.image || 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400',
        available: item.isAvailable,
        isVegetarian: item.isVegetarian,
        isVegan: item.isVegan,
        isGlutenFree: item.isGlutenFree,
        preparationTime: item.preparationTime,
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
      menuVersion: menuData.menuVersion
    };
  } catch (e) {
    console.error('Failed to load menu:', e);
    // Return empty data if menu fetch fails
    return {
      categories: [{ id: 'all', name: 'All Items', count: 0 }],
      menuItems: [],
      menuVersion: 0
    };
  }
};
