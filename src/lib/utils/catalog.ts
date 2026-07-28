/**
 * The catalog is one thing with two names.
 *
 * A restaurant calls its catalog a Menu; a salon calls it Services. Underneath
 * they are the same rows — same pricing, tax, modifiers and inventory linkage —
 * so there is one implementation under `/menu` and one API. What changes is the
 * vocabulary and which feature slug gates it.
 *
 * This is the frontend counterpart to `getFeatureLabel()` in the backend
 * feature registry, which already relabels `menu` → `Catalog` for retail.
 */

/** Verticals that sell staff time rather than goods. */
const SERVICE_VERTICALS = new Set<string>(['salon', 'spa', 'clinic']);

export function isServiceVertical(businessType: string | null | undefined) {
	return SERVICE_VERTICALS.has(businessType ?? '');
}

/**
 * Which feature slug gates the catalog for this vertical.
 *
 * Service verticals enable `services`, not `menu` — a salon's default extras
 * are `appointments` + `services` (see the backend feature registry), so gating
 * its catalog on `menu` would 307 the owner to the dashboard with
 * `?feature_disabled=menu` for a feature their vertical cannot even enable.
 */
export function catalogFeatureSlug(businessType: string | null | undefined) {
	return isServiceVertical(businessType) ? 'services' : 'menu';
}

export interface CatalogVocabulary {
	/** Section name: "Menu" / "Services" / "Catalog". */
	section: string;
	/** Plural row noun, for list headings and tabs. */
	items: string;
	/** Singular row noun, for buttons and dialogs. */
	item: string;
}

export function catalogVocabulary(businessType: string | null | undefined): CatalogVocabulary {
	if (isServiceVertical(businessType)) {
		return { section: 'Services', items: 'Services', item: 'Service' };
	}
	if (businessType === 'retail') {
		return { section: 'Catalog', items: 'Products', item: 'Product' };
	}
	return { section: 'Menu', items: 'Items', item: 'Item' };
}

/**
 * Canonical catalog URL for a vertical. Service verticals get `/services`,
 * which redirects into the shared `/menu` implementation — the URL is part of
 * the vocabulary, so a salon owner never sees "menu" in their address bar.
 */
export function catalogPath(businessType: string, slug: string) {
	const segment = isServiceVertical(businessType) ? 'services' : 'menu';
	return `/${businessType}/${slug}/${segment}`;
}
