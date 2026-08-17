import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const APP_URL = process.env.LISTCOLLAB_E2E_APP_URL ?? 'http://127.0.0.1:4274'
const API_URL = process.env.LISTCOLLAB_E2E_API_URL ?? 'http://127.0.0.1:4302'

type CreatedEvent = {
    adminToken: string
    categoryId: number | null
    shareToken: string
}

async function waitForApiReady(request: APIRequestContext): Promise<void> {
    await expect
        .poll(async () => {
            try {
                const healthResponse = await request.get(`${API_URL}/api/health`)
                return healthResponse.status()
            } catch {
                return 0
            }
        }, { timeout: 20000 })
        .toBe(200)
}

async function createEventFixture(request: APIRequestContext, name: string): Promise<CreatedEvent> {
    const createEventResponse = await request.post(`${API_URL}/api/events`, {
        data: {
            name,
            categories: [{ name: 'Food', icon: 'F', sortOrder: 0 }],
        },
    })

    expect(createEventResponse.status()).toBe(201)

    const createEventBody = (await createEventResponse.json()) as {
        categories: Array<{ id: number }>
        event: { adminToken: string; shareToken: string }
    }

    return {
        adminToken: createEventBody.event.adminToken,
        categoryId: createEventBody.categories[0]?.id ?? null,
        shareToken: createEventBody.event.shareToken,
    }
}

async function createCategory(
    request: APIRequestContext,
    event: CreatedEvent,
    name: string,
    sortOrder: number
): Promise<number> {
    const createCategoryResponse = await request.post(`${API_URL}/api/categories`, {
        data: { name, sortOrder },
        headers: { 'X-Event-Token': event.adminToken },
    })

    expect(createCategoryResponse.status()).toBe(201)

    const createCategoryBody = (await createCategoryResponse.json()) as { id: number }

    return createCategoryBody.id
}

async function createRequirement(
    request: APIRequestContext,
    event: Pick<CreatedEvent, 'adminToken'>,
    categoryId: number | null,
    name: string,
    quantityRequired: number
): Promise<void> {
    const createItemResponse = await request.post(`${API_URL}/api/items`, {
        data: {
            categoryId,
            name,
            quantityRequired,
        },
        headers: { 'X-Event-Token': event.adminToken },
    })

    expect(createItemResponse.status()).toBe(201)
}

async function createParticipantAndClaim(page: Page, displayName: string, quantity: number): Promise<void> {
    await page.getByRole('button', { name: /Claim / }).first().click()
    await expect(page.getByRole('heading', { name: 'Who are you?' })).toBeVisible()
    await page.getByLabel('Add your name').fill(displayName)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Claim item' })).toBeVisible()
    await page.getByLabel('Quantity').fill(String(quantity))
    await page.getByRole('button', { name: 'Claim item' }).click()
    await expect(page.getByText('Claim saved.')).toBeVisible()
}

async function expectNoSeriousOrCriticalAxeViolations(page: Page): Promise<void> {
    const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()

    const blockingViolations = accessibilityScanResults.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical'
    )

    expect(blockingViolations).toEqual([])
}

test('completes the collaborative MVP flow and avoids horizontal scrolling at mobile widths', async ({ browser, page, request }) => {
    await waitForApiReady(request)
    const event = await createEventFixture(request, 'Collaboration Flow Event')
    await createRequirement(request, event, event.categoryId, 'Bread Rolls', 3)

    await page.goto(`${APP_URL}/e/${event.shareToken}`)

    await expect(page.getByRole('heading', { name: 'Collaboration Flow Event' })).toBeVisible()
    await expect(page.getByText('Read-only until you identify yourself')).toBeVisible()
    await expect(page.getByText('Bread Rolls')).toBeVisible()

    await createParticipantAndClaim(page, 'Taylor', 1)

    const secondContext = await browser.newContext()
    const secondPage = await secondContext.newPage()
    await secondPage.goto(`${APP_URL}/e/${event.shareToken}`)
    await expect(secondPage.getByRole('heading', { name: 'Collaboration Flow Event' })).toBeVisible()

    await createParticipantAndClaim(secondPage, 'Jordan', 2)
    await expect(secondPage.getByText('Closed · 0 left')).toBeVisible()

    await page.reload()
    await expect(page.getByText('Closed · 0 left')).toBeVisible()

    await secondPage.getByRole('button', { name: 'Add your contribution' }).click()
    await expect(secondPage.getByRole('heading', { name: 'Add your contribution' })).toBeVisible()
    await secondPage.getByLabel('Item name').fill('Ice bag')
    await secondPage.getByRole('button', { name: 'Save' }).click()
    await expect(secondPage.getByText('Contribution added.')).toBeVisible()

    await page.reload()
    await page.getByLabel('Search items or people').fill('Ice bag')
    await expect(page.getByText('Ice bag')).toBeVisible()

    for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 })
        await page.goto(`${APP_URL}/e/${event.shareToken}`)

        const eventPageHasHorizontalScroll = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )

        expect(eventPageHasHorizontalScroll).toBeFalsy()

        await page.goto(`${APP_URL}/create`)

        const createPageHasHorizontalScroll = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )

        expect(createPageHasHorizontalScroll).toBeFalsy()
    }

    await secondContext.close()
}, 60000)

test('regression: organiser page avoids horizontal scrolling with max-length item names on mobile', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile-only viewport assertion')

    await waitForApiReady(request)
    const event = await createEventFixture(request, 'Manage Layout Event')
    await createRequirement(request, event, event.categoryId, 'X'.repeat(120), 1)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${APP_URL}/e/${event.shareToken}/manage#k=${event.adminToken}`)
    await expect(page.getByRole('heading', { name: 'Manage Layout Event' })).toBeVisible()
    await expect(page.getByText('X'.repeat(120))).toBeVisible()
    await expect(page.getByLabel(`Edit ${'X'.repeat(120)}`)).toBeVisible()
    await expect(page.getByLabel(`Delete ${'X'.repeat(120)}`)).toBeVisible()

    await page.getByLabel(`Edit ${'X'.repeat(120)}`).click()
    await expect(page.getByRole('heading', { name: 'Edit item' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    await page.getByLabel(`Delete ${'X'.repeat(120)}`).click()
    await expect(page.getByRole('dialog', { name: 'Delete item' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    await page.getByRole('button', { name: `Open ${'X'.repeat(120)} details` }).click()
    await expect(page.getByRole('button', { name: 'Edit item' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete item' })).toBeVisible()
    await page.getByRole('button', { name: 'Close item details' }).click()

    const managePageHasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )

    expect(managePageHasHorizontalScroll).toBeFalsy()
}, 60000)

test('regression: share-link page keeps item edit and delete visible inline on mobile', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile-only viewport assertion')

    await waitForApiReady(request)
    const event = await createEventFixture(request, 'Guest Layout Event')
    await createRequirement(request, event, event.categoryId, 'Y'.repeat(120), 1)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${APP_URL}/e/${event.shareToken}`)
    await expect(page.getByRole('heading', { name: 'Guest Layout Event' })).toBeVisible()
    await expect(page.getByText('Y'.repeat(120))).toBeVisible()
    await expect(page.getByLabel(`Edit ${'Y'.repeat(120)}`)).toBeVisible()
    await expect(page.getByLabel(`Delete ${'Y'.repeat(120)}`)).toBeVisible()

    await page.getByLabel(`Edit ${'Y'.repeat(120)}`).click()
    await expect(page.getByRole('heading', { name: 'Edit item' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    await page.getByLabel(`Delete ${'Y'.repeat(120)}`).click()
    await expect(page.getByRole('dialog', { name: 'Delete item' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    await page.getByRole('button', { name: `Open ${'Y'.repeat(120)} details` }).click()
    await expect(page.getByRole('button', { name: 'Edit item' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete item' })).toBeVisible()
    await page.getByRole('button', { name: 'Close item details' }).click()

    const guestPageHasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )

    expect(guestPageHasHorizontalScroll).toBeFalsy()
}, 60000)

test('regression: Everything and Me filter claimed items on share-link and organiser mobile routes', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile-only viewport assertion')

    await waitForApiReady(request)
    const event = await createEventFixture(request, 'My Items Event')
    const drinksCategoryId = await createCategory(request, event, 'Drinks', 1)

    await createRequirement(request, event, event.categoryId, 'Bread Rolls', 3)
    await createRequirement(request, event, drinksCategoryId, 'Water bottles', 6)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${APP_URL}/e/${event.shareToken}`)

    const bottomBar = page.getByTestId('mobile-item-visibility-bar')

    await expect(bottomBar).toBeVisible()
    const initialBottomBarBox = await bottomBar.boundingBox()

    expect(initialBottomBarBox).not.toBeNull()
    expect(initialBottomBarBox!.y + initialBottomBarBox!.height).toBeGreaterThanOrEqual(780)

    await expect(page.getByRole('tab', { name: 'Me' })).toBeDisabled()

    await page.getByRole('button', { name: 'Claim Bread Rolls' }).click()
    await page.getByLabel('Add your name').fill('Taylor')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Claim item' })).toBeVisible()
    await page.getByLabel('Quantity').fill('1')
    await page.getByRole('button', { name: 'Claim item' }).click()
    await expect(page.getByText('Claim saved.')).toBeVisible()

    await expect(page.getByRole('tab', { name: 'Me' })).toBeEnabled()
    await page.getByRole('tab', { name: 'Me' }).click()
    await expect(page.getByText('Bread Rolls')).toBeVisible()
    await expect(page.getByText('Water bottles')).toHaveCount(0)

    await page.getByLabel('Search items or people').press('End')
    const scrolledBottomBarBox = await bottomBar.boundingBox()

    expect(scrolledBottomBarBox).not.toBeNull()
    expect(scrolledBottomBarBox!.y + scrolledBottomBarBox!.height).toBeGreaterThanOrEqual(780)

    await page.goto(`${APP_URL}/e/${event.shareToken}/manage#k=${event.adminToken}`)
    await expect(bottomBar).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Me' })).toBeEnabled()
    await page.getByRole('tab', { name: 'Me' }).click()
    await expect(page.getByText('Bread Rolls')).toBeVisible()
    await expect(page.getByText('Water bottles')).toHaveCount(0)
}, 60000)

test('regression: mobile category navigation shows one category at a time and keeps search global', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile-only viewport assertion')

    await waitForApiReady(request)
    const event = await createEventFixture(request, 'Mobile Category Event')
    const drinksCategoryId = await createCategory(request, event, 'Drinks', 1)

    await createRequirement(request, event, event.categoryId, 'Bread Rolls', 3)
    await createRequirement(request, event, drinksCategoryId, 'Water bottles', 6)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${APP_URL}/e/${event.shareToken}`)

    await expect(page.getByRole('tablist', { name: 'Category navigation' })).toBeVisible()
    await expect(page.getByText('Bread Rolls')).toBeVisible()
    await expect(page.getByText('Water bottles')).toHaveCount(0)

    await page.getByRole('tab', { name: 'Drinks' }).click()
    await expect(page.getByText('Water bottles')).toBeVisible()
    await expect(page.getByText('Bread Rolls')).toHaveCount(0)

    await page.getByLabel('Search items or people').fill('Water')
    await expect(page.getByText('Showing matches across all categories while search is active.')).toBeVisible()
    await expect(page.getByText('Water bottles')).toBeVisible()
}, 60000)

test('keeps the claim dialog submittable in a half-height mobile viewport', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile-only viewport assertion')

    await waitForApiReady(request)
    const event = await createEventFixture(request, 'Mobile Dialog Event')
    await createRequirement(request, event, event.categoryId, 'Water bottles', 2)

    await page.setViewportSize({ width: 390, height: 422 })
    await page.goto(`${APP_URL}/e/${event.shareToken}`)
    await page.getByRole('button', { name: 'Claim Water bottles' }).click()
    await page.getByLabel('Add your name').fill('Taylor')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Claim item' })).toBeVisible()

    const submitButton = page.getByRole('button', { name: 'Claim item' })
    const buttonBox = await submitButton.boundingBox()

    expect(buttonBox).not.toBeNull()
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(422)
}, 60000)

test('rejects over-claims visibly without writing a partial assignment', async ({ browser, page, request }) => {
    await waitForApiReady(request)
    const event = await createEventFixture(request, 'Overclaim Event')
    await createRequirement(request, event, event.categoryId, 'Napkins', 2)

    await page.goto(`${APP_URL}/e/${event.shareToken}`)

    const secondContext = await browser.newContext()
    const secondPage = await secondContext.newPage()
    await secondPage.goto(`${APP_URL}/e/${event.shareToken}`)

    await createParticipantAndClaim(page, 'Taylor', 2)

    await secondPage.getByRole('button', { name: 'Claim Napkins' }).click()
    await secondPage.getByLabel('Add your name').fill('Jordan')
    await secondPage.getByRole('button', { name: 'Continue' }).click()
    await expect(secondPage.getByRole('heading', { name: 'Claim item' })).toBeVisible()
    await secondPage.getByLabel('Quantity').fill('2')
    await secondPage.getByRole('button', { name: 'Claim item' }).click()

    await expect(secondPage.getByText('Someone else claimed that amount first. The list has been refreshed.')).toBeVisible()

    const aggregateResponse = await request.get(`${API_URL}/api/events/${event.shareToken}`, {
        headers: { 'X-Event-Token': event.shareToken },
    })
    expect(aggregateResponse.status()).toBe(200)

    const aggregateBody = (await aggregateResponse.json()) as {
        items: Array<{
            assignments: Array<{ participantId: number; quantity: number }>
            coverage: { claimed: number; remaining: number | null; required: number | null; status: string }
            name: string
        }>
        participants: Array<{ id: number; name: string }>
    }
    const napkins = aggregateBody.items.find((item) => item.name === 'Napkins')
    const taylor = aggregateBody.participants.find((participant) => participant.name === 'Taylor')

    expect(napkins).toBeDefined()
    expect(taylor).toBeDefined()
    expect(napkins?.coverage).toEqual({ claimed: 2, remaining: 0, required: 2, status: 'covered' })
    expect(napkins?.assignments).toEqual([expect.objectContaining({ participantId: taylor?.id, quantity: 2 })])

    await secondContext.close()
}, 60000)

test('rejects admin-only category creation when only the share token is supplied', async ({ request }) => {
    await waitForApiReady(request)
    const event = await createEventFixture(request, 'Admin Guard Event')

    const createCategoryResponse = await request.post(`${API_URL}/api/categories`, {
        data: {
            name: 'Should fail',
            sortOrder: 1,
        },
        headers: { 'X-Event-Token': event.shareToken },
    })

    expect(createCategoryResponse.status()).toBe(403)

    const responseBody = (await createCategoryResponse.json()) as {
        error: { code: string }
    }

    expect(responseBody.error.code).toBe('ADMIN_REQUIRED')
}, 60000)

test('passes axe checks on the landing, event, and manage routes', async ({ page, request }) => {
    await waitForApiReady(request)
    const event = await createEventFixture(request, 'Accessibility Audit Event')
    await createRequirement(request, event, event.categoryId, 'Crackers', 2)

    await page.goto(`${APP_URL}/`)
    await expect(page.getByRole('heading', { name: 'ListCollab' })).toBeVisible()
    await expectNoSeriousOrCriticalAxeViolations(page)

    await page.goto(`${APP_URL}/e/${event.shareToken}`)
    await expect(page.getByRole('heading', { name: 'Accessibility Audit Event' })).toBeVisible()
    await expectNoSeriousOrCriticalAxeViolations(page)

    await page.goto(`${APP_URL}/e/${event.shareToken}/manage#k=${event.adminToken}`)
    await expect(page.getByRole('heading', { name: 'Accessibility Audit Event' })).toBeVisible()
    await expect(page.getByText('Organiser mode')).toBeVisible()
    await expectNoSeriousOrCriticalAxeViolations(page)
}, 60000)