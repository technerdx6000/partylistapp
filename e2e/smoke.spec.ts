import { expect, test } from '@playwright/test'

test('loads an event page and avoids horizontal scrolling at mobile widths', async ({ page, request }) => {
    await expect
        .poll(async () => {
            try {
                const healthResponse = await request.get('http://127.0.0.1:4301/api/health')
                return healthResponse.status()
            } catch {
                return 0
            }
        })
        .toBe(200)

    const createEventResponse = await request.post('http://127.0.0.1:4301/api/events', {
        data: {
            name: 'Smoke Test Event',
            categories: [{ name: 'Food', icon: '🍽️', sortOrder: 0 }],
        },
    })
    expect(createEventResponse.status()).toBe(201)
    const createEventBody = await createEventResponse.json() as {
        categories: Array<{ id: number }>
        event: { shareToken: string }
    }

    const createParticipantResponse = await request.post('http://127.0.0.1:4301/api/participants', {
        data: { name: 'Taylor' },
        headers: { 'X-Event-Token': createEventBody.event.shareToken },
    })
    expect(createParticipantResponse.status()).toBe(201)
    const participant = await createParticipantResponse.json() as { id: number }

    const createItemResponse = await request.post('http://127.0.0.1:4301/api/items', {
        data: {
            name: 'Bread Rolls',
            quantityRequired: 4,
            categoryId: createEventBody.categories[0]?.id ?? null,
            createdBy: participant.id,
        },
        headers: { 'X-Event-Token': createEventBody.event.shareToken },
    })
    expect(createItemResponse.status()).toBe(201)

    await page.goto(`/e/${createEventBody.event.shareToken}`)

    await expect(page.getByRole('heading', { name: 'Smoke Test Event' })).toBeVisible()
    await expect(page.getByText('Bread Rolls')).toBeVisible()

    for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 })
        await page.goto(`/e/${createEventBody.event.shareToken}`)

        const eventPageHasHorizontalScroll = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )

        expect(eventPageHasHorizontalScroll).toBeFalsy()

        await page.goto('/create')

        const createPageHasHorizontalScroll = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )

        expect(createPageHasHorizontalScroll).toBeFalsy()
    }
})