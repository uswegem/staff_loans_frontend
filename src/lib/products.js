// Product rules the screens share. The API holds the rules; these only decide what to show.

/** Whether the product asks for documents: any active required document (FR-09). */
export const needsDocuments = (product) => (product?.requiredDocuments || []).some((d) => d.active !== false);
