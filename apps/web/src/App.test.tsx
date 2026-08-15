import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
    afterEach(() => {
        window.localStorage.clear()
    })

    it('renders the landing page create action', () => {
        render(<App />)

        expect(screen.getByRole('heading', { name: 'ListCollab' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Create an event' })).toBeInTheDocument()
    })
})