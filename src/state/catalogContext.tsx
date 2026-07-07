import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface CatalogSelection {
	programId: string | null;
	evId: string | null;
	programName: string | null;
	eventName: string | null;
	walkInFormUrl: string | null;
	capacity: number | null;
}

interface CatalogContextValue extends CatalogSelection {
	setSelection: (selection: CatalogSelection) => void;
	clearSelection: () => void;
	/** Bumped when admin mutates catalog so navigation pickers refetch active tree. */
	catalogRevision: number;
	bumpCatalog: () => void;
}

const emptySelection: CatalogSelection = {
	programId: null,
	evId: null,
	programName: null,
	eventName: null,
	walkInFormUrl: null,
	capacity: null,
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
	const [selection, setSelectionState] = useState<CatalogSelection>(emptySelection);
	const [catalogRevision, setCatalogRevision] = useState(0);

	const setSelection = useCallback((next: CatalogSelection) => setSelectionState(next), []);
	const clearSelection = useCallback(() => setSelectionState(emptySelection), []);
	const bumpCatalog = useCallback(() => setCatalogRevision((revision) => revision + 1), []);

	const value = useMemo(
		() => ({
			...selection,
			setSelection,
			clearSelection,
			catalogRevision,
			bumpCatalog,
		}),
		[selection, setSelection, clearSelection, catalogRevision, bumpCatalog],
	);

	return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalogSelection(): CatalogContextValue {
	const context = useContext(CatalogContext);
	if (!context) {
		throw new Error('useCatalogSelection must be used within a CatalogProvider');
	}
	return context;
}
