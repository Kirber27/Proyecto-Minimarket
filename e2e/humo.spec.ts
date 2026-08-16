import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Desde el spec 02 (autenticacion-acceso), toda ruta salvo /ingresar,
// /recuperar y /restablecer exige sesion. Sin un backend de Supabase vivo no
// hay forma de autenticar en E2E, asi que el humo se corre contra la pantalla
// publica. Los recorridos que si requieren sesion viven en auth.spec.ts,
// gateados por E2E_LIVE_BACKEND (ver ese archivo).

test.describe('humo', () => {
  test('una ruta protegida sin sesion redirige a /ingresar conservando el destino', async ({
    page,
  }) => {
    await page.goto('/venta')
    await expect(page).toHaveURL(/\/ingresar\?destino=\/venta/)
  })

  test('la pantalla de ingreso carga sin violaciones de accesibilidad serias', async ({
    page,
  }) => {
    await page.goto('/ingresar')
    await expect(page.getByRole('heading', { name: 'Minimarket' })).toBeVisible()

    const resultados = await new AxeBuilder({ page }).analyze()
    const graves = resultados.violations.filter(v =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    )
    expect(graves, JSON.stringify(graves, null, 2)).toEqual([])
  })

  test('el ingreso es siempre por correo y contrasena, sin selector de PIN', async ({
    page,
  }) => {
    // El PIN no es una forma de "reabrir sesion" en /ingresar: bloquea una
    // sesion que sigue viva (ver PantallaBloqueo.vue), no reemplaza el
    // login. /ingresar solo tiene el formulario de contrasena.
    await page.goto('/ingresar')
    await expect(page.getByRole('tablist')).toHaveCount(0)
    await expect(page.getByLabel('Correo')).toBeVisible()
  })

  test('valida el correo en cliente antes de llamar al servidor', async ({ page }) => {
    await page.goto('/ingresar')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('alert')).toHaveText('Ingresa tu correo y contraseña.')
  })
})
