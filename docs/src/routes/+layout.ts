// Disable SSR for root layout to prevent OpenSeadragon from loading during SSR
// This is needed because some components in the layout might import from 'annota'
export const ssr = false;
