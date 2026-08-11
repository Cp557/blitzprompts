import { forceLightTheme } from './theme.js'
import { existingStyles } from './base.js'
import { dragStyles } from './drag.js'
import { loadingStyles, startupLoaderStyles } from './loading.js'
import { placeholderStyles } from './modals.js'
import { collapsiblePromptStyles } from './prompts.js'
import { improvedDeleteConfirmationStyles } from './delete-confirmation.js'

// Combined styles that get injected into the page
export const styles = forceLightTheme + existingStyles + dragStyles + loadingStyles + placeholderStyles + collapsiblePromptStyles + startupLoaderStyles + improvedDeleteConfirmationStyles

// Re-export individual styles for components that need them separately
export { forceLightTheme } from './theme.js'
export { existingStyles } from './base.js'
export { dragStyles } from './drag.js'
export { loadingStyles, startupLoaderStyles } from './loading.js'
export { placeholderStyles } from './modals.js'
export { collapsiblePromptStyles } from './prompts.js'
export { improvedDeleteConfirmationStyles } from './delete-confirmation.js'
