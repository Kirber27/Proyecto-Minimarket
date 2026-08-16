import { expect, test } from '@playwright/test'

// Recorridos de autenticacion que necesitan un backend de Supabase real:
// crear sesion, definir PIN, y verificar RLS por rol. No hay forma honesta
// de simularlos sin un Postgres detras (mockear supabase-js esconde
// exactamente los errores que importan: RLS, constraints - ver
// .claude/steering/testing.md).
//
// Para correrlos:
//   1. npx supabase start && npx supabase db reset
//   2. Crea a mano (o via seed) una duena y una mostradora de prueba.
//   3. Ajusta las constantes de abajo con esas credenciales.
//   4. E2E_LIVE_BACKEND=1 npm run test:e2e -- auth.spec.ts
test.describe('autenticacion (requiere backend en vivo)', () => {
  test.skip(
    !process.env.E2E_LIVE_BACKEND,
    'Requiere Supabase local corriendo; ver el comentario de este archivo.',
  )

  const DUENA = { email: 'duena@minimarket.test', password: 'clave-de-prueba-123' }
  const MOSTRADOR = {
    email: 'mostrador@minimarket.test',
    password: 'clave-de-prueba-123',
  }

  test('ingreso con contrasena -> definir PIN -> bloquear -> desbloquear con PIN', async ({
    page,
  }) => {
    // El PIN bloquea una sesion viva, no reemplaza el login (ver
    // src/pages/auth/PantallaBloqueo.vue): no hay "cerrar sesion" en este
    // recorrido, porque cerrar sesion revoca el refresh token y no queda
    // nada que un PIN pueda desbloquear.
    await page.goto('/ingresar')
    await page.getByLabel('Correo').fill(DUENA.email)
    await page.getByLabel('Contraseña').fill(DUENA.password)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page).toHaveURL('/')

    await page.goto('/ajustes')
    await page.getByRole('button', { name: 'Definir PIN' }).click()
    for (const digito of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: digito, exact: true }).click()
    }
    for (const digito of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: digito, exact: true }).click()
    }
    await expect(page.getByText('PIN guardado')).toBeVisible()

    await page.getByRole('button', { name: 'Bloquear ahora' }).click()
    await expect(page).toHaveURL('/bloqueado')

    for (const digito of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: digito, exact: true }).click()
    }
    await expect(page).toHaveURL('/')
  })

  test('un mostrador no ve Productos en la navegacion y no puede llegar por URL', async ({
    page,
  }) => {
    await page.goto('/ingresar')
    await page.getByLabel('Correo').fill(MOSTRADOR.email)
    await page.getByLabel('Contraseña').fill(MOSTRADOR.password)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page).toHaveURL('/')

    await expect(page.getByRole('link', { name: 'Productos' })).toHaveCount(0)

    await page.goto('/productos')
    await expect(page).toHaveURL('/')
    await expect(page.getByText('No tienes permiso para esa sección')).toBeVisible()
  })
})
