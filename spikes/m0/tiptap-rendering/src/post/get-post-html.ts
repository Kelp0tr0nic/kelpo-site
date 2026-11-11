import { createServerFn } from '@tanstack/react-start'

import { renderPostHtml } from './render.server'

export const getPostHtml = createServerFn({ method: 'GET' }).handler(() => renderPostHtml())
