import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('humo', () => {
  test('la pantalla de resumen carga sin violaciones de accesibilidad serias', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible()

    const resultados = await new AxeBuilder({ page }).analyze()
    const graves = resultados.violations.filter(v =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    )
    expect(graves, JSON.stringify(graves, null, 2)).toEqual([])
  })

  test('la navegacion cambia de layout al cruzar 768px sin perder la ruta', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 767, height: 800 })
    await page.goto('/venta')
    await expect(page.locator('.mm-layout-movil__barra')).toBeVisible()

    await page.setViewportSize({ width: 768, height: 800 })
    await expect(page.locator('.mm-layout-escritorio__barra')).toBeVisible()
    await expect(page).toHaveURL(/\/venta$/)
  })

  test('la ruta activa se marca con aria-current', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/venta')
    await expect(
      page.locator('.mm-layout-escritorio__barra a[aria-current="page"]'),
    ).toHaveText('Registrar venta')
  })
})
