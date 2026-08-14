import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import App from './App'

const pendingRequest = new Promise(() => { })

vi.mock('./services/api', () => ({
    peopleAPI: { getAll: () => pendingRequest },
    categoriesAPI: { getAll: () => pendingRequest },
    itemsAPI: { getAll: () => pendingRequest },
    requiredItemsAPI: { getAll: () => pendingRequest },
}))

describe('App', () => {
    it('renders the loading state while startup data is still pending', () => {
        render(<App />)

        expect(screen.getByText('Loading data...')).toBeInTheDocument()
    })
})