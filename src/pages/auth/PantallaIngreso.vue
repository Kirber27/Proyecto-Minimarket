<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useSesionStore } from '@/stores/sesion'
import { ErrorDominio } from '@/lib/errorDominio'
import { esCorreoValido } from '@/lib/validacion'
import BotonPrimario from '@/components/ui/BotonPrimario.vue'

const CARACTERISTICAS = [
  'Registra ventas en un toque',
  'Stock descontado automáticamente',
  'Reportes de ventas y flujo de caja',
]

const sesion = useSesionStore()
const route = useRoute()
const router = useRouter()

const correo = ref('')
const contrasena = ref('')
const recordarme = ref(true)
const mostrarContrasena = ref(false)
const cargando = ref(false)
const error = ref('')

const idCorreo = useId()
const idContrasena = useId()

const tipoContrasena = computed(() => (mostrarContrasena.value ? 'text' : 'password'))

onMounted(async () => {
  await sesion.esperarInicializacion()
  if (sesion.autenticado) {
    await irADestino()
  }
})

async function irADestino(): Promise<void> {
  const destino = typeof route.query.destino === 'string' ? route.query.destino : '/'
  await router.replace(destino)
}

async function ingresarConPassword(): Promise<void> {
  error.value = ''

  if (!correo.value || !contrasena.value) {
    error.value = 'Ingresa tu correo y contraseña.'
    return
  }
  if (!esCorreoValido(correo.value)) {
    error.value = 'El correo no tiene un formato válido.'
    return
  }

  cargando.value = true
  try {
    await sesion.iniciarConPassword(correo.value, contrasena.value, recordarme.value)
    await irADestino()
  } catch (err) {
    error.value =
      err instanceof ErrorDominio
        ? err.message
        : 'No se pudo iniciar sesión. Intenta de nuevo.'
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <div class="mm-ingreso">
    <div class="mm-ingreso__tarjeta">
      <div class="mm-ingreso__marca-panel">
        <span class="mm-ingreso__avatar" aria-hidden="true">M</span>
        <h1 class="mm-ingreso__marca-titulo">Minimarket</h1>
        <p class="mm-ingreso__marca-subtitulo">
          Ventas, inventario y caja del local en un solo lugar.
        </p>

        <ul class="mm-ingreso__caracteristicas list-unstyled">
          <li v-for="(caracteristica, indice) in CARACTERISTICAS" :key="caracteristica">
            <span class="mm-ingreso__caracteristica-num" aria-hidden="true">{{
              indice + 1
            }}</span>
            {{ caracteristica }}
          </li>
        </ul>
      </div>

      <div class="mm-ingreso__formulario-panel">
        <h2 class="mm-ingreso__formulario-titulo">Iniciar sesión</h2>
        <p class="mm-ingreso__formulario-subtitulo">
          Usa tu cuenta del local para entrar a la administración.
        </p>

        <form class="mm-ingreso__formulario" @submit.prevent="ingresarConPassword">
          <div class="mm-ingreso__campo">
            <label :for="idCorreo" class="mm-ingreso__etiqueta">Correo</label>
            <input
              :id="idCorreo"
              v-model="correo"
              type="email"
              placeholder="tu@correo.com"
              class="mm-ingreso__input"
            />
          </div>

          <div class="mm-ingreso__campo">
            <div class="mm-ingreso__etiqueta-fila">
              <label :for="idContrasena" class="mm-ingreso__etiqueta">Contraseña</label>
              <button
                type="button"
                class="mm-ingreso__alternar"
                :aria-label="
                  mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'
                "
                @click="mostrarContrasena = !mostrarContrasena"
              >
                {{ mostrarContrasena ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
            <input
              :id="idContrasena"
              v-model="contrasena"
              :type="tipoContrasena"
              class="mm-ingreso__input"
            />
          </div>

          <div class="mm-ingreso__fila-opciones">
            <label class="mm-ingreso__switch-etiqueta">
              <input
                v-model="recordarme"
                type="checkbox"
                class="mm-ingreso__switch-input"
              />
              <span class="mm-ingreso__switch" aria-hidden="true"></span>
              Mantener sesión
            </label>
            <RouterLink to="/recuperar" class="mm-ingreso__enlace">
              ¿Olvidaste tu contraseña?
            </RouterLink>
          </div>

          <p v-if="error" class="mm-ingreso__error" role="alert">{{ error }}</p>

          <BotonPrimario type="submit" :cargando="cargando" class="mm-ingreso__boton">
            Entrar
          </BotonPrimario>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/variables' as v;
@use '@/assets/scss/mixins' as m;

.mm-ingreso {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.mm-ingreso__tarjeta {
  width: 100%;
  max-width: 420px;
  background-color: v.$superficie;
  border-radius: v.$radio-xl;
  box-shadow: v.$sombra-2;
  overflow: hidden;
}

.mm-ingreso__marca-panel {
  padding: 34px 26px 28px;
  background-color: v.$acento;
  color: white;
}

.mm-ingreso__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: v.$radio-md;
  background-color: rgba(255, 255, 255, 0.18);
  font-weight: v.$peso-extra;
  font-size: 20px;
  margin-bottom: 16px;
}

.mm-ingreso__marca-titulo {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: v.$peso-extra;
}

.mm-ingreso__marca-subtitulo {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: v.$tam-cuerpo;
  line-height: 1.4;
}

.mm-ingreso__caracteristicas {
  display: none;
}

.mm-ingreso__formulario-panel {
  padding: 24px;
}

.mm-ingreso__formulario-titulo {
  display: none;
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: v.$peso-negrita;
  color: v.$tinta;
}

.mm-ingreso__formulario-subtitulo {
  display: none;
  margin: 0 0 20px;
  color: v.$tenue;
}

.mm-ingreso__formulario {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-ingreso__campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mm-ingreso__etiqueta-fila {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mm-ingreso__etiqueta {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 10.5px;
  font-weight: v.$peso-negrita;
  color: v.$tenue;
}

.mm-ingreso__alternar {
  background: none;
  border: none;
  color: v.$acento-hover;
  font-weight: v.$peso-semi;
  font-size: v.$tam-etiqueta;
  padding: 0;
  cursor: pointer;
}

.mm-ingreso__input {
  min-height: v.$objetivo-tactil-min;
  padding: 0 14px;
  border: 1px solid v.$borde;
  border-radius: v.$radio-md;
  background-color: v.$superficie;
  color: v.$tinta;
  font-size: v.$tam-cuerpo;

  &:focus {
    outline: none;
    border-color: v.$acento;
  }
}

.mm-ingreso__fila-opciones {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.mm-ingreso__switch-etiqueta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: v.$tam-cuerpo;
  color: v.$tinta;
  cursor: pointer;
}

.mm-ingreso__switch-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.mm-ingreso__switch {
  position: relative;
  flex-shrink: 0;
  width: 38px;
  height: 22px;
  border-radius: 11px;
  background-color: v.$borde;
  transition: background-color 0.15s ease;

  &::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.15s ease;
  }
}

.mm-ingreso__switch-input:checked + .mm-ingreso__switch {
  background-color: v.$acento;

  &::before {
    transform: translateX(16px);
  }
}

.mm-ingreso__switch-input:focus-visible + .mm-ingreso__switch {
  outline: 2px solid v.$acento;
  outline-offset: 2px;
}

.mm-ingreso__error {
  margin: 0;
  color: v.$error;
  font-size: v.$tam-etiqueta;
}

.mm-ingreso__boton {
  width: 100%;
}

.mm-ingreso__enlace {
  color: v.$acento-hover;
  font-size: v.$tam-etiqueta;
  font-weight: v.$peso-semi;
  text-decoration: none;
}

@include m.desde-escritorio {
  .mm-ingreso__tarjeta {
    max-width: 960px;
    display: grid;
    grid-template-columns: 380px 1fr;
    min-height: 560px;
  }

  .mm-ingreso__marca-panel {
    display: flex;
    flex-direction: column;
    padding: 48px 40px;
  }

  .mm-ingreso__caracteristicas {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: auto;
    padding-top: 40px;

    li {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13.5px;
      color: rgba(255, 255, 255, 0.92);
    }
  }

  .mm-ingreso__caracteristica-num {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: v.$radio-sm;
    background-color: rgba(255, 255, 255, 0.18);
    font-size: 11px;
    font-weight: v.$peso-extra;
  }

  .mm-ingreso__formulario-panel {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px 64px;
  }

  .mm-ingreso__formulario-titulo,
  .mm-ingreso__formulario-subtitulo {
    display: block;
  }

  .mm-ingreso__formulario {
    max-width: 380px;
  }
}
</style>
