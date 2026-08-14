import { expect, test } from '@playwright/test'

test('renders the party list manager heading', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Party List Manager' })).toBeVisible()
})